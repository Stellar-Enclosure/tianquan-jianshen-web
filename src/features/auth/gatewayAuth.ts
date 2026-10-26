import {createGatewayAuthClient} from '@stellar-enclosure/stellar-enclosure-web-shared'

/** Browser authentication stays in the fixed application's HttpOnly cookies. */
export const gatewayAuth = createGatewayAuthClient({
  appAlias: import.meta.env.VITE_OAUTH_APP_ALIAS ?? 'edge-jianshen',
  baseUrl: import.meta.env.VITE_YUHENG_ORIGIN ?? import.meta.env.VITE_TIANQUAN_JIANSHEN_API_BASE ?? '',
  fetch: (...args) => globalThis.fetch(...args),
})
const failures = new Set<(status: 401 | 403) => void>()
export const notifyAuthorizationFailure = (status: 401 | 403) => failures.forEach(listener => listener(status))
export const subscribeAuthorizationFailure = (listener: (status: 401 | 403) => void) => {
  failures.add(listener)
  return () => {failures.delete(listener)}
}
