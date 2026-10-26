import { expect, test, type Browser, type BrowserContext } from '@playwright/test'
import { closeSync, constants, fstatSync, openSync, readFileSync } from 'node:fs'
import { isAbsolute } from 'node:path'

type Scope = { catalogScopeId: string; tenantId: string; businessCode: string; applicationCode: string; namespaceCode: string; environment: string }
type App = { alias: string; uiUrl: string; fields: Array<{ key: string; inputBinding: boolean }> }
type Actor = { name: string; issuer: string; tenantId: string; subject: string; storageStateFile: string; targets: Record<string, Scope> }
type Operation = { owner: string; deniedActor: string; app: string; deniedApp: string; operationId: string }
type Fixture = { schemaVersion: 1; disposable: true; origin: string; apps: App[]; actors: Actor[]; refreshOperations: Operation[] }
type State = Awaited<ReturnType<BrowserContext['storageState']>>
const scopes = ['applicationCode', 'businessCode', 'catalogScopeId', 'environment', 'namespaceCode', 'tenantId']
const decimal = (value: unknown): value is string => typeof value === 'string' && /^[1-9][0-9]{0,18}$/.test(value)
const identifier = (value: unknown): value is string => typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,199}$/.test(value)
const fail = (): never => { throw new Error('External fixture, private state, or prepared dataset is invalid; no environment is started') }

function privateJson(path: string): unknown {
  if (!isAbsolute(path)) return fail()
  const descriptor = openSync(path, constants.O_RDONLY | constants.O_NOFOLLOW)
  try {
    const before = fstatSync(descriptor)
    if (!before.isFile() || before.uid !== process.getuid?.() || (before.mode & 0o077) !== 0 || before.size > 1024 * 1024) return fail()
    const body = readFileSync(descriptor, 'utf8')
    const after = fstatSync(descriptor)
    if (Buffer.byteLength(body) > 1024 * 1024 || before.ino !== after.ino || before.mtimeMs !== after.mtimeMs || before.size !== after.size || before.mode !== after.mode) return fail()
    return JSON.parse(body) as unknown
  } catch {
    // File contents can contain cookies. Never include parser messages or source payloads in diagnostics.
    return fail()
  } finally { closeSync(descriptor) }
}

function https(value: string): URL {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) return fail()
    return url
  } catch { return fail() }
}

function fixture(): Fixture {
  const path = process.env.STELLAR_PERMISSION_EXTERNAL_CONFIG_FILE
  if (process.env.STELLAR_PERMISSION_EXTERNAL_ENABLED !== 'true' || !path) return fail()
  const value = privateJson(path) as Fixture
  if (value?.schemaVersion !== 1 || value.disposable !== true || !Array.isArray(value.apps) || value.apps.length < 2 || value.apps.length > 6
    || !Array.isArray(value.actors) || value.actors.length < 2 || value.actors.length > 4 || !Array.isArray(value.refreshOperations) || !value.refreshOperations.length) return fail()
  const origin = https(value.origin).origin
  if (value.origin !== origin || new Set(value.apps.map(app => app.alias)).size !== value.apps.length
    || new Set(value.actors.map(actor => actor.name)).size !== value.actors.length
    || new Set(value.actors.map(actor => actor.tenantId)).size < 2) return fail()
  for (const app of value.apps) {
    if (!/^[A-Za-z0-9_-]{1,128}$/.test(app.alias) || https(app.uiUrl).origin !== origin || !Array.isArray(app.fields)
      || !app.fields.length || app.fields.length > 24 || new Set(app.fields.map(field => field.key)).size !== app.fields.length
      || app.fields.some(field => !identifier(field.key) || typeof field.inputBinding !== 'boolean')) return fail()
  }
  for (const actor of value.actors) {
    if (!identifier(actor.name) || !decimal(actor.tenantId) || !identifier(actor.subject) || !isAbsolute(actor.storageStateFile)) return fail()
    https(actor.issuer)
    for (const app of value.apps) {
      const target = actor.targets?.[app.alias]
      if (!target || Object.keys(target).sort().join() !== scopes.join() || !decimal(target.catalogScopeId) || target.tenantId !== actor.tenantId
        || ![target.businessCode, target.applicationCode, target.namespaceCode, target.environment].every(identifier)) return fail()
    }
  }
  const targets = value.actors.flatMap(actor => Object.values(actor.targets))
  if (new Set(targets.map(target => target.namespaceCode)).size < 2 || new Set(targets.map(target => target.environment)).size < 2) return fail()
  for (const operation of value.refreshOperations) {
    if (!value.actors.some(actor => actor.name === operation.owner) || !value.actors.some(actor => actor.name === operation.deniedActor)
      || operation.owner === operation.deniedActor || !value.apps.some(app => app.alias === operation.app)
      || !value.apps.some(app => app.alias === operation.deniedApp) || operation.app === operation.deniedApp
      || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(operation.operationId)) return fail()
  }
  return value
}

async function context(browser: Browser, actor: Actor): Promise<BrowserContext> {
  const state = privateJson(actor.storageStateFile) as State
  if (!state || !Array.isArray(state.cookies) || !Array.isArray(state.origins)) return fail()
  try { return await browser.newContext({ storageState: state, ignoreHTTPSErrors: false, serviceWorkers: 'block' }) } catch { return fail() }
}
const url = (data: Fixture, app: App, path: string): string => `${data.origin}/apps/${app.alias}${path}`
const data = (body: unknown): Record<string, unknown> => {
  const result = body as { data?: Record<string, unknown> }
  if (!result || typeof result.data !== 'object' || !result.data || Array.isArray(result.data)) return fail()
  return result.data
}

test('anonymous application identity and authorization views fail closed', async ({ browser }) => {
  const input = fixture()
  const anonymous = await browser.newContext({ ignoreHTTPSErrors: false })
  try {
    for (const app of input.apps) for (const path of ['/auth/identity', '/api/v1/authorization/effective-permissions']) {
      const response = await anonymous.request.get(url(input, app, path), { maxRedirects: 0 })
      expect(response.status()).toBe(401)
    }
  } finally { await anonymous.close() }
})

test('prepared browser identities remain bound to each application and tenant', async ({ browser }) => {
  const input = fixture()
  for (const actor of input.actors) {
    const current = await context(browser, actor)
    try {
      for (const app of input.apps) {
        const response = await current.request.get(url(input, app, '/auth/identity'), { maxRedirects: 0 })
        expect(response.status()).toBe(200)
        expect(response.headers()['cache-control']).toContain('no-store')
        const identity = await response.json() as Record<string, unknown>
        expect(identity.issuer === actor.issuer && identity.tenantId === actor.tenantId && identity.subject === actor.subject && identity.appAlias === app.alias).toBe(true)
        expect(['accessToken', 'refreshToken', 'authorizationId', 'sid'].some(key => Object.hasOwn(identity, key))).toBe(false)
      }
    } finally { await current.close() }
  }
})

test('two prepared application sessions work through existing browser pages', async ({ browser }) => {
  const input = fixture()
  for (const actor of input.actors) {
    const current = await context(browser, actor)
    try {
      for (const app of input.apps) {
        const page = await current.newPage()
        await page.goto(app.uiUrl, { waitUntil: 'domcontentloaded' })
        const result = await page.evaluate(async endpoint => {
          const response = await fetch(endpoint, { credentials: 'include', redirect: 'manual' })
          return { status: response.status, json: response.headers.get('content-type')?.includes('application/json') === true }
        }, url(input, app, '/auth/identity'))
        expect(result.status).toBe(200)
        expect(result.json).toBe(true)
        await page.close()
      }
    } finally { await current.close() }
  }
})

test('current permission views have exact complete targets and no caller-selected scope', async ({ browser }) => {
  const input = fixture()
  for (const actor of input.actors) {
    const current = await context(browser, actor)
    try {
      for (const app of input.apps) {
        const endpoint = url(input, app, '/api/v1/authorization/effective-permissions')
        const response = await current.request.get(endpoint, { maxRedirects: 0 })
        expect(response.status()).toBe(200)
        expect(response.headers()['cache-control']).toContain('no-store')
        const view = data(await response.json())
        expect(view.catalogScope).toEqual(actor.targets[app.alias])
        expect(view.issuer === actor.issuer && view.subject === actor.subject).toBe(true)
        expect(['catalogVersion', 'authVersion', 'policyVersion'].every(key => typeof view[key] === 'string' && /^\d+$/.test(view[key] as string))).toBe(true)
        expect(Array.isArray(view.permissionCodes)).toBe(true)
        const rejected = await current.request.get(`${endpoint}?tenantId=0`, { maxRedirects: 0 })
        expect(rejected.status()).toBe(400)
      }
    } finally { await current.close() }
  }
})

test('field catalogs match the current view and real input bindings', async ({ browser }) => {
  const input = fixture()
  for (const actor of input.actors) {
    const current = await context(browser, actor)
    try {
      for (const app of input.apps) {
        const currentView = await current.request.get(url(input, app, '/api/v1/authorization/effective-permissions'))
        expect(currentView.status()).toBe(200)
        const view = data(await currentView.json())
        const query = new URLSearchParams()
        for (const field of app.fields) query.append('keys', field.key)
        const response = await current.request.get(`${url(input, app, '/api/v1/authorization/field-catalog')}?${query}`)
        expect(response.status()).toBe(200)
        const projection = data(await response.json())
        expect(projection.catalogScope).toEqual(actor.targets[app.alias])
        expect(projection.catalogVersion).toBe(view.catalogVersion)
        const fields = projection.fields as Record<string, { inputBinding?: boolean; access?: string }>
        expect(Object.keys(fields).sort()).toEqual(app.fields.map(field => field.key).sort())
        for (const expected of app.fields) expect(fields[expected.key].inputBinding).toBe(expected.inputBinding)
        expect(app.fields.some(field => !field.inputBinding)).toBe(true)
      }
    } finally { await current.close() }
  }
})

test('application credential cookies retain secure private application paths', async ({ browser }) => {
  const input = fixture()
  for (const actor of input.actors) {
    const current = await context(browser, actor)
    try {
      const credentials = (await current.cookies()).filter(cookie => /^__Secure-egon_(access|refresh)_/.test(cookie.name))
      expect(credentials.length >= input.apps.length * 2).toBe(true)
      expect(credentials.every(cookie => cookie.secure && cookie.httpOnly && input.apps.some(app => cookie.path === `/apps/${app.alias}`))).toBe(true)
    } finally { await current.close() }
  }
})

test('credential-bound writes without the CSRF proof cannot log a user out', async ({ browser }) => {
  const input = fixture()
  for (const actor of input.actors) {
    const current = await context(browser, actor)
    try {
      await current.clearCookies({ name: /csrf/i })
      for (const app of input.apps) {
        const response = await current.request.post(url(input, app, '/auth/logout'), { maxRedirects: 0 })
        expect(response.status()).toBe(403)
        const identity = await current.request.get(url(input, app, '/auth/identity'))
        expect(identity.status()).toBe(200)
      }
    } finally { await current.close() }
  }
})

test('an existing refresh operation cannot cross an application or tenant boundary', async ({ browser }) => {
  const input = fixture()
  for (const sample of input.refreshOperations) {
    const owner = input.actors.find(actor => actor.name === sample.owner)!
    const denied = input.actors.find(actor => actor.name === sample.deniedActor)!
    const app = input.apps.find(app => app.alias === sample.app)!
    const other = input.apps.find(app => app.alias === sample.deniedApp)!
    const current = await context(browser, owner)
    const foreign = await context(browser, denied)
    try {
      const path = `/auth/refresh-operations/${sample.operationId}`
      const owned = await current.request.get(url(input, app, path))
      expect(owned.status()).toBe(200)
      const status = await owned.json() as Record<string, unknown>
      expect(status.operationId === sample.operationId).toBe(true)
      expect(Object.keys(status).every(key => ['operationId', 'status', 'accessExpiresAt', 'authorizationExpiresAt', 'failureCode'].includes(key))).toBe(true)
      expect((await current.request.get(url(input, other, path))).status()).toBe(404)
      expect((await foreign.request.get(url(input, app, path))).status()).toBe(404)
    } finally { await current.close(); await foreign.close() }
  }
})
