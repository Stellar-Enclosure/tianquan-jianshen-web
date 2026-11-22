import {readFile} from 'node:fs/promises'
import {resolve} from 'node:path'
import {pathToFileURL} from 'node:url'

const requireValue = (condition) => {
  if (!condition) throw new Error('JIANSHEN_DEPLOYMENT_CONFIG_INVALID')
}

const fields = (value, allowed) => {
  requireValue(value !== null && typeof value === 'object' && !Array.isArray(value))
  requireValue(Object.keys(value).every(key => allowed.includes(key)))
}

const httpsEndpoint = (value) => {
  let url
  try { url = new URL(value) }
  catch { throw new Error('JIANSHEN_DEPLOYMENT_CONFIG_INVALID') }
  requireValue(url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash
    && value.length <= 2048 && (url.href === value || url.origin === value))
  return url
}

export function validateDeploymentConfig(environment) {
  const basePath = environment.VITE_BASE_PATH
  requireValue(typeof basePath === 'string' && /^\/(?:[A-Za-z0-9._~-]+\/)*$/.test(basePath)
    && !basePath.split('/').some(segment => segment === '.' || segment === '..'))
  const namespace = environment.VITE_PERMISSION_NAMESPACE
  const deploymentEnvironment = environment.VITE_PERMISSION_ENVIRONMENT
  requireValue([namespace, deploymentEnvironment].every(value => typeof value === 'string'
    && /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value)))
  let oauth
  try { oauth = JSON.parse(environment.VITE_TIANQUAN_JIANSHEN_OAUTH_CONFIG) }
  catch { throw new Error('JIANSHEN_DEPLOYMENT_CONFIG_INVALID') }
  fields(oauth, ['webOrigin', 'resource', 'apiBaseUrl', 'activeResource', 'registrations'])
  let webOrigin
  try { webOrigin = new URL(oauth.webOrigin) }
  catch { throw new Error('JIANSHEN_DEPLOYMENT_CONFIG_INVALID') }
  requireValue(webOrigin.protocol === 'https:' && webOrigin.origin === oauth.webOrigin)
  httpsEndpoint(oauth.resource)
  httpsEndpoint(oauth.apiBaseUrl)
  requireValue(Array.isArray(oauth.registrations) && oauth.registrations.length > 0
    && oauth.registrations.length <= 32
    && new Set(oauth.registrations.map(registration => registration.tenantId)).size === oauth.registrations.length
    && new Set(oauth.registrations.map(registration => registration.id)).size === oauth.registrations.length
    && oauth.registrations.some(registration => registration.id === oauth.activeResource))
  for (const registration of oauth.registrations) {
    fields(registration, ['id', 'clientId', 'tenantId', 'browserBound', 'issuer', 'authorizationEndpoint',
      'tokenEndpoint', 'jwksUri', 'redirectUri', 'popupRedirectUri', 'resource', 'scopes', 'apiBaseUrl',
    ])
    requireValue(/^[A-Za-z0-9._:-]{1,128}$/.test(registration.id)
      && /^[A-Za-z0-9._:-]{1,128}$/.test(registration.clientId)
      && /^[1-9][0-9]{0,18}$/.test(registration.tenantId) && typeof registration.browserBound === 'boolean')
    const issuer = httpsEndpoint(registration.issuer)
    requireValue(!registration.issuer.endsWith('/'))
    for (const endpoint of [registration.authorizationEndpoint, registration.tokenEndpoint, registration.jwksUri]) {
      requireValue(httpsEndpoint(endpoint).origin === issuer.origin && endpoint.startsWith(registration.issuer + '/'))
    }
    requireValue(new Set([registration.authorizationEndpoint, registration.tokenEndpoint, registration.jwksUri]).size === 3)
    requireValue(Array.isArray(registration.scopes) && registration.scopes.includes('openid')
      && registration.scopes.length <= 64 && new Set(registration.scopes).size === registration.scopes.length
      && registration.scopes.every(scope => typeof scope === 'string' && /^[A-Za-z0-9._:-]{1,128}$/.test(scope)))
    const callback = oauth.webOrigin + basePath + 'auth/oidc/'
    requireValue(registration.redirectUri === callback + 'callback/' + encodeURIComponent(registration.id)
      && (registration.popupRedirectUri === undefined
        || registration.popupRedirectUri === callback + 'popup/' + encodeURIComponent(registration.id))
      && registration.resource === oauth.resource && registration.apiBaseUrl === oauth.apiBaseUrl)
  }
  return {schemaVersion: 1, basePath, namespace, environment: deploymentEnvironment, oauth}
}

export function assertDeploymentTarget(deployment, profile) {
  requireValue(profile !== null && typeof profile === 'object' && profile.target && profile.authentication)
  requireValue(deployment.namespace === profile.target.namespaceCode && deployment.environment === profile.target.environment
    && deployment.oauth.resource === profile.authentication.resource
    && deployment.oauth.registrations.some(registration => registration.tenantId === profile.target.tenantId
      && registration.issuer === profile.authentication.issuer && registration.resource === profile.authentication.resource))
}

export async function verifyDeploymentArtifact(dist, profile) {
  const record = JSON.parse(await readFile(resolve(dist, 'deployment-config.json'), 'utf8'))
  fields(record, ['schemaVersion', 'basePath', 'namespace', 'environment', 'oauth'])
  requireValue(record.schemaVersion === 1)
  const validated = validateDeploymentConfig({
    VITE_BASE_PATH: record.basePath,
    VITE_PERMISSION_NAMESPACE: record.namespace,
    VITE_PERMISSION_ENVIRONMENT: record.environment,
    VITE_TIANQUAN_JIANSHEN_OAUTH_CONFIG: JSON.stringify(record.oauth),
  })
  const index = await readFile(resolve(dist, 'index.html'), 'utf8')
  requireValue(index.includes('src="' + validated.basePath + 'assets/'))
  if (profile !== undefined) assertDeploymentTarget(validated, profile)
  return validated
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  requireValue(process.argv.length === 3 || process.argv.length === 5)
  let profile
  if (process.argv.length === 5) {
    const targets = JSON.parse(await readFile(process.argv[3], 'utf8'))
    requireValue(targets.schemaVersion === 1 && targets.targets && Object.hasOwn(targets.targets, process.argv[4]))
    profile = targets.targets[process.argv[4]]
  }
  await verifyDeploymentArtifact(process.argv[2], profile)
  process.stdout.write('Deployment configuration verified in the static artifact\n')
}
