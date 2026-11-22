import assert from 'node:assert/strict'
import {mkdtemp, mkdir, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {spawnSync} from 'node:child_process'
import test from 'node:test'
import {assertDeploymentTarget, validateDeploymentConfig, verifyDeploymentArtifact} from './deployment-config.mjs'

const origin = 'https://workbench.example'
const issuer = 'https://identity.example/tenants/1001'
const oauth = () => ({
  webOrigin: origin, resource: origin + '/resource/jianshen', apiBaseUrl: origin, activeResource: 'jianshen',
  registrations: [{id: 'jianshen', tenantId: '1001', issuer, clientId: 'jianshen-public', browserBound: false,
    resource: origin + '/resource/jianshen', apiBaseUrl: origin, scopes: ['openid', 'system:role:read'],
    authorizationEndpoint: issuer + '/oauth2/authorize', tokenEndpoint: issuer + '/oauth2/token',
    jwksUri: issuer + '/.well-known/jwks.json', redirectUri: origin + '/children/jianshen/auth/oidc/callback/jianshen',
    popupRedirectUri: origin + '/children/jianshen/auth/oidc/popup/jianshen'}],
})
const environment = (config = oauth()) => ({
  VITE_BASE_PATH: '/children/jianshen/', VITE_PERMISSION_NAMESPACE: 'default', VITE_PERMISSION_ENVIRONMENT: 'test',
  VITE_TIANQUAN_JIANSHEN_OAUTH_CONFIG: JSON.stringify(config),
})

test('accepts a complete public deployment and exact subpath callbacks', () => {
  const result = validateDeploymentConfig(environment())
  assert.equal(result.basePath, '/children/jianshen/')
  assert.equal(result.oauth.activeResource, 'jianshen')
})

test('rejects absent OAuth, scope and base deployment inputs', () => {
  for (const key of Object.keys(environment())) {
    const input = environment()
    delete input[key]
    assert.throws(() => validateDeploymentConfig(input), /CONFIG_INVALID/)
  }
})

test('rejects a wrong callback, HTTPS endpoint, tenant and active registration', () => {
  for (const change of [
    config => { config.registrations[0].redirectUri = origin + '/auth/oidc/callback/jianshen' },
    config => { config.registrations[0].tokenEndpoint = 'http://identity.example/oauth2/token' },
    config => { config.registrations[0].jwksUri = 'https://other.example/jwks' },
    config => { config.registrations.push({...config.registrations[0], id: 'another'}) },
    config => { config.activeResource = 'unknown' },
    config => { config.registrations[0].scopes = ['system:role:read'] },
  ]) {
    const config = oauth()
    change(config)
    assert.throws(() => validateDeploymentConfig(environment(config)), /CONFIG_INVALID/)
  }
})

test('rejects credentials in a public configuration without echoing their value', () => {
  const config = oauth()
  config.registrations[0].clientSecret = 'private-test-sentinel'
  assert.throws(() => validateDeploymentConfig(environment(config)), error =>
    error.message === 'JIANSHEN_DEPLOYMENT_CONFIG_INVALID' && !error.message.includes('sentinel'))
})

test('binds release inputs to the actual delivery scope, tenant, issuer and resource', () => {
  const deployment = validateDeploymentConfig(environment())
  const profile = {target: {namespaceCode: 'default', environment: 'test', tenantId: '1001'},
    authentication: {issuer, resource: origin + '/resource/jianshen'}}
  assertDeploymentTarget(deployment, profile)
  for (const target of [{namespaceCode: 'other'}, {environment: 'production'}, {tenantId: '1002'}]) {
    assert.throws(() => assertDeploymentTarget(deployment, {...profile, target: {...profile.target, ...target}}), /CONFIG_INVALID/)
  }
  for (const authentication of [{issuer: 'https://other.example/tenants/1001'}, {resource: origin + '/wrong-resource'}]) {
    assert.throws(() => assertDeploymentTarget(deployment,
      {...profile, authentication: {...profile.authentication, ...authentication}}), /CONFIG_INVALID/)
  }
})

test('the real release entry rejects missing config and clears stale success evidence', async () => {
  const root = await mkdtemp(join(tmpdir(), 'jianshen-release-entry-'))
  try {
    await mkdir(join(root, 'dist'))
    await mkdir(join(root, '.generated', 'permissions'), {recursive: true})
    for (const file of ['dist/deployment-config.json', 'dist/permission-build.json', '.generated/permissions/artifact-record.json']) {
      await writeFile(join(root, file), '{}')
    }
    const env = {...process.env}
    for (const name of Object.keys(env)) if (name.startsWith('VITE_')) delete env[name]
    const result = spawnSync(process.execPath, [fileURLToPath(new URL('build.mjs', import.meta.url)), '--release'],
      {cwd: root, env, encoding: 'utf8'})
    assert.equal(result.status, 1)
    assert.match(result.stderr, /JIANSHEN_DEPLOYMENT_CONFIG_INVALID/)
    await assert.rejects(verifyDeploymentArtifact(join(root, 'dist')), /ENOENT/)
  } finally { await rm(root, {recursive: true, force: true}) }
})

test('a postbuild deployment check failure clears the resulting success records', async () => {
  const root = await mkdtemp(join(tmpdir(), 'jianshen-release-output-'))
  try {
    const sdk = join(root, 'sdk')
    await mkdir(join(sdk, 'scripts', 'permissions'), {recursive: true})
    await writeFile(join(sdk, 'scripts', 'permissions', 'build-consumer.mjs'), `
      import {mkdir, writeFile} from 'node:fs/promises'
      export async function buildConsumer() {
        await mkdir('dist', {recursive:true})
        await mkdir('.generated/permissions', {recursive:true})
        for (const file of ['dist/deployment-config.json','dist/permission-build.json',
          '.generated/permissions/artifact-record.json','.generated/permissions/build-evidence.json']) {
          await writeFile(file, '{}')
        }
        return {artifact:{buildId:'failed-output'}}
      }
    `)
    const result = spawnSync(process.execPath, [fileURLToPath(new URL('build.mjs', import.meta.url)), '--release'],
      {cwd: root, env: {...process.env, ...environment(), PAC_SDK_DIR: sdk}, encoding: 'utf8'})
    assert.equal(result.status, 1)
    assert.match(result.stderr, /JIANSHEN_DEPLOYMENT_CONFIG_INVALID/)
    await assert.rejects(verifyDeploymentArtifact(join(root, 'dist')), /ENOENT/)
  } finally { await rm(root, {recursive: true, force: true}) }
})

test('requires deployment evidence in the exact dist and checks its asset base', async () => {
  const root = await mkdtemp(join(tmpdir(), 'jianshen-deployment-'))
  const dist = join(root, 'dist')
  try {
    await mkdir(dist)
    await assert.rejects(verifyDeploymentArtifact(dist), /ENOENT/)
    await writeFile(join(dist, 'deployment-config.json'), JSON.stringify(validateDeploymentConfig(environment())))
    await writeFile(join(dist, 'index.html'), '<script type="module" src="/assets/app.js"></script>')
    await assert.rejects(verifyDeploymentArtifact(dist), /CONFIG_INVALID/)
    await writeFile(join(dist, 'index.html'), '<script type="module" src="/children/jianshen/assets/app.js"></script>')
    assert.equal((await verifyDeploymentArtifact(dist)).environment, 'test')
  } finally { await rm(root, {recursive: true, force: true}) }
})
