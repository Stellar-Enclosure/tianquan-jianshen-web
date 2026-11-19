import {ApiError, AuthRequestContext, createPublicOAuthClient, PublicOAuthError, relayPublicOAuthPopupCode,
  type PublicOAuthClientOptions, type PublicOAuthRegistration, type ResourceRequestAuthority} from '@stellar-enclosure/stellar-enclosure-web-shared'

export const LOGIN_CALLBACK = '/auth/oidc/callback/:registrationId'
export const POPUP_CALLBACK = '/auth/oidc/popup/:registrationId'
export const STANDALONE_LOGIN = '/auth/standalone/:registrationId'

interface JianshenOAuthConfig {
  readonly webOrigin: string
  readonly resource: string
  readonly apiBaseUrl: string
  readonly activeResource: string
  readonly registrations: readonly PublicOAuthRegistration[]
}

type PortalProps = {readonly embedded?: boolean; readonly resourceContext?: {readonly resource: string; readonly issuer: string; readonly tenantId: string}}
type Runtime = Window & {$wujie?: {props?: PortalProps}; __POWERED_BY_WUJIE__?: boolean}

const invalid = () => new PublicOAuthError('INVALID_CONFIGURATION')
const required = <T,>(value: T | undefined): T => {
  if (value === undefined) throw invalid()
  return value
}

function readConfig(text: string | undefined, base: string): JianshenOAuthConfig | undefined {
  if (!text) return undefined
  try {
    const config = JSON.parse(text) as JianshenOAuthConfig
    const {webOrigin, resource, apiBaseUrl, registrations, activeResource} = config
    const origin = new URL(webOrigin)
    if (origin.origin !== webOrigin || origin.protocol !== 'https:' || !Array.isArray(registrations)
      || !registrations.some(registration => registration.id === activeResource)
      || new Set(registrations.map(registration => registration.tenantId)).size !== registrations.length) throw invalid()
    const path = (route: string, id: string) => webOrigin + base + route.slice(1).replace(':registrationId', encodeURIComponent(id))
    for (const registration of registrations) {
      if (registration.resource !== resource || registration.apiBaseUrl !== apiBaseUrl
        || registration.redirectUri !== path(LOGIN_CALLBACK, registration.id)
        || (registration.popupRedirectUri !== undefined && registration.popupRedirectUri !== path(POPUP_CALLBACK, registration.id))) throw invalid()
    }
    return config
  } catch { throw invalid() }
}

export function createJianshenAuth(text: string | undefined, base: string,
  browser: Runtime, options: Omit<PublicOAuthClientOptions, 'registrations' | 'activeResource'> = {}) {
  const config = readConfig(text, base)
  const context = new AuthRequestContext()
  const client = config && createPublicOAuthClient({...options, registrations: config.registrations, activeResource: config.activeResource,
    browserWindow: options.browserWindow ?? browser})
  let selected = config?.activeResource
  let callback: {readonly url: string; readonly result: Promise<string | undefined>} | undefined
  for (const registration of config?.registrations ?? []) {
    client?.authority(registration.id).context.subscribe(() => context.invalidate())
  }

  const embedded = () => browser.__POWERED_BY_WUJIE__ === true || browser.$wujie?.props?.embedded === true
  const selection = () => {
    if (!config) return undefined
    if (!embedded()) return browser.location.origin === config.webOrigin ? selected : undefined
    const hint = browser.$wujie?.props?.resourceContext
    return hint?.resource === config.resource
      ? config.registrations.find(registration => registration.issuer === hint.issuer && registration.tenantId === hint.tenantId)?.id
      : undefined
  }
  const identity = () => {
    const id = selection()
    return id ? client?.identity(id) : undefined
  }
  return {
    context,
    identity: async () => identity(),
    authority: (): ResourceRequestAuthority => {
      const id = selection()
      if (!client || !id || !identity()) {
        throw new ApiError('需要鉴身资源授权', 401, 'AUTHENTICATION_REQUIRED', {retryable: false})
      }
      const grant = client.authority(id)
      return {...grant, context}
    },
    standaloneUrl: (reauthenticate = false) => {
      const id = selection()
      if (!embedded() || !config || !id) return undefined
      const path = STANDALONE_LOGIN.slice(1).replace(':registrationId', encodeURIComponent(id))
      return config.webOrigin + base + path + (reauthenticate ? '?reauthenticate=1' : '')
    },
    loginStandalone: async (registrationId: string, reauthenticate: boolean) => {
      if (embedded() || !config || browser.location.origin !== config.webOrigin
        || !config.registrations.some(registration => registration.id === registrationId)) throw invalid()
      const oauth = required(client)
      selected = registrationId
      oauth.selectResource(registrationId)
      await oauth.login('/', {reauthenticate})
      return false
    },
    login: async (returnTo = '/', options?: {readonly reauthenticate?: boolean; readonly signal?: AbortSignal}): Promise<boolean> => {
      const id = required(selection())
      const oauth = required(client)
      if (embedded() && (options?.reauthenticate || browser.origin !== config?.webOrigin)) {
        throw new PublicOAuthError('POPUP_UNAVAILABLE')
      }
      selected = id
      oauth.selectResource(id)
      if (embedded()) {
        await oauth.authorizeInPopup(id, options?.signal)
        return true
      }
      await oauth.login(returnTo, options)
      return false
    },
    completeCallback: (url: string, popup: boolean): Promise<string | undefined> => {
      if (callback?.url === url) return callback.result
      const result = (async () => {
        if (embedded() || !config || browser.location.origin !== config.webOrigin) throw invalid()
        if (popup) {
          const address = new URL(url)
          const reply = config.registrations.find(reg => reg.popupRedirectUri === address.origin + address.pathname)?.popupRedirectUri
          relayPublicOAuthPopupCode(required(reply), browser)
          return undefined
        }
        const completed = await required(client).completeRedirect(url)
        selected = required(config.registrations.find(registration => registration.tenantId === completed.identity.tenantId
          && registration.issuer === completed.identity.issuer && registration.clientId === completed.identity.clientId)).id
        return completed.returnTo
      })()
      callback = {url, result}
      const release = () => { if (callback?.result === result) callback = undefined }
      void result.then(release, release)
      return result
    },
    logout: (sso = false) => {
      callback = undefined
      if (client) client.logout({sso})
      else context.invalidate()
    },
  }
}

export const gatewayAuth = createJianshenAuth(import.meta.env.VITE_TIANQUAN_JIANSHEN_OAUTH_CONFIG, import.meta.env.BASE_URL, window, {
  fetch: (...args) => globalThis.fetch(...args),
  replaceLocation: url => window.history.replaceState(window.history.state, '', url),
})

export type JianshenAuth = ReturnType<typeof createJianshenAuth>

const failures = new Set<(status: 401 | 403) => void>()
export const notifyAuthorizationFailure = (status: 401 | 403) => failures.forEach(listener => listener(status))
export const subscribeAuthorizationFailure = (listener: (status: 401 | 403) => void) => {
  failures.add(listener)
  return () => {failures.delete(listener)}
}
