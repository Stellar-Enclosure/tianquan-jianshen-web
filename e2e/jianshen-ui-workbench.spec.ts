import {readFileSync} from 'node:fs'
import {expect, test, type Page, type Route} from '@playwright/test'
import {about, appBase, approvePublicLogin, installAppFixture, permissionSnapshot} from './fixtures/publicOAuth'

const apiRoot = '/api/tianquan-jianshen/v1/iam'
const catalogRoot = '/api/v1/permission-catalogs'
const target = permissionSnapshot.catalogScope
const roleId = '9007199254740993'
const roleList = {
  roleId, applicationId: '71', roleCode: 'REVIEWER', roleName: '订单复核角色',
  roleType: 'POSITION', riskLevel: 'LOW', privileged: false, status: 'DISABLED', version: 23,
}
const roleDetails = {
  roleId, applicationId: '71', roleName: roleList.roleName, status: 'DISABLED',
  landingRouteId: '502', landingPriority: 8, maximumAssignmentDays: 60, version: 23,
}
const success = (route: Route, data: unknown) => route.fulfill({json: {success: true, code: 10000, data}})
const deny = (route: Route, status: number, code: string) => route.fulfill({status, json: {success: false, error: {code}}})

interface FieldDeclaration {
  readonly key: string
  readonly type: string
  readonly access: string
  readonly fieldPolicy?: {readonly write?: unknown}
}

const fieldsFromProducer = () => {
  const path = process.env.PAC_BACKEND_MANIFEST
  if (!path) throw new Error('PAC_BACKEND_MANIFEST must point to the Java producer FULL manifest')
  const manifest = JSON.parse(readFileSync(path, 'utf8')) as {resources: readonly FieldDeclaration[]}
  return new Map(manifest.resources.filter(item => item.type === 'FIELD').map(item => [item.key, item]))
}

async function openWithFixture(
  page: Page, path: string, permissionCodes: string[],
  handle: (route: Route, url: URL) => Promise<void>,
) {
  const fields = fieldsFromProducer()
  const login = await approvePublicLogin(page)
  await installAppFixture(page, async (route, url) => {
    login.checkBusinessRequest(route)
    switch (url.pathname) {
      case '/api/v1/authorization/effective-permissions':
        return success(route, {...permissionSnapshot, permissionCodes, snapshotExpiresAt: new Date(Date.now() + 600_000).toISOString()})
      case '/api/v1/auth/about':
        return success(route, {...about, currentApplicationCode: 'tianquan-jianshen'})
      case '/api/v1/authorization/field-catalog': {
        const projections = url.searchParams.getAll('keys').flatMap(key => {
          const field = fields.get(key)
          return field ? [[key, {access: field.access, fieldPolicy: field.fieldPolicy, inputBinding: Boolean(field.fieldPolicy?.write)}]] : []
        })
        return success(route, {catalogScope: target, catalogVersion: '1', fields: Object.fromEntries(projections)})
      }
      default:
        return handle(route, url)
    }
  })
  await page.goto(appBase + path)
  await login.complete()
}

test('edits only the role name and sends unchanged protected fields with the detail version', async ({page}) => {
  const writes: unknown[] = []
  let detailReads = 0
  await openWithFixture(page, 'iam/roles', ['system:role:read', 'system:role:update'], async (route, url) => {
    if (url.pathname === apiRoot + '/roles') {
      return success(route, [{...roleList, roleName: writes.length ? '复核角色（改名）' : roleList.roleName}])
    }
    expect(url.pathname).toBe(apiRoot + '/roles/' + roleId)
    if (route.request().method() === 'PUT') {
      writes.push(route.request().postDataJSON())
      return success(route, {roleId, version: 24})
    }
    detailReads++
    return success(route, roleDetails)
  })
  const row = page.getByRole('row').filter({hasText: roleList.roleName})
  await row.getByRole('button', {name: /^编\s*辑$/}).click()
  const dialog = page.getByRole('dialog')
  const name = dialog.getByLabel('角色名称')
  await expect(name).toHaveValue(roleDetails.roleName)
  await name.fill('复核角色（改名）')
  await dialog.getByRole('button', {name: /^保\s*存$/}).click()
  await expect(page.getByText('复核角色（改名）', {exact: true})).toBeVisible()
  expect(detailReads).toBe(1)
  expect(writes).toEqual([{
    roleName: '复核角色（改名）', status: 'DISABLED', landingRouteId: '502',
    landingPriority: 8, maximumAssignmentDays: 60, expectedRoleVersion: 23,
  }])
})

test('keeps legacy role rows available and blocks save when role details return 404', async ({page}) => {
  const methods: string[] = []
  await openWithFixture(page, 'iam/roles', ['system:role:read', 'system:role:update'], async (route, url) => {
    if (url.pathname === apiRoot + '/roles') return success(route, [roleList])
    expect(url.pathname).toBe(apiRoot + '/roles/' + roleId)
    methods.push(route.request().method())
    return deny(route, 404, 'RESOURCE_NOT_FOUND')
  })
  await page.getByRole('row').filter({hasText: roleList.roleName}).getByRole('button', {name: /^编\s*辑$/}).click()
  await expect(page.getByText('角色详情不可用于编辑')).toBeVisible()
  await expect(page.getByRole('dialog').getByRole('button', {name: /^保\s*存$/})).toBeDisabled()
  await expect(page.getByRole('row').filter({hasText: roleList.roleName})).toBeVisible()
  expect(methods).toEqual(['GET'])
})

test('shares a selected code between button and API and reviews an actual conflict without replay', async ({page}) => {
  await page.setViewportSize({width: 560, height: 780})
  const grantPath = '/api/v1/roles/' + roleId + '/permissions'
  const writes: unknown[] = []
  let readsAfterConflict = 0
  const definition = {id: '201', key: 'orders:read', producerId: 'orders-java/api', state: 'ACTIVE',
    version: '4', type: null, meaning: '读取订单', activeProducerVersion: '1'}
  const declared = [
    {...definition, id: '211', key: 'orders.page.detail', type: 'PAGE', meaning: '订单详情页'},
    {...definition, id: '212', key: 'orders.button.view', type: 'BUTTON', meaning: '查看订单'},
    {...definition, id: '213', key: 'orders.api.detail', type: 'API', meaning: '订单详情接口'},
  ]
  await openWithFixture(page, 'iam/roles/' + roleId + '/permissions', [
    'system:role:read', 'system:permission-catalog:read', 'system:role-permission:read', 'system:role-permission:manage',
  ], async (route, url) => {
    if (url.pathname === apiRoot + '/roles') return success(route, [roleList])
    if (url.pathname === grantPath) {
      if (route.request().method() === 'PUT') {
        writes.push(route.request().postDataJSON())
        return deny(route, 409, 'AUTH_MUTATION_CONFLICT')
      }
      if (writes.length) readsAfterConflict++
      return success(route, {target, roleId, version: writes.length ? '8' : '7', catalogVersion: '1', permissions: []})
    }
    switch (url.pathname) {
      case catalogRoot + '/scopes':
        return success(route, {scopes: [{scope: target, applicationId: '71', producerCount: 1}], nextAfterId: null})
      case catalogRoot + '/producers':
        return success(route, {target, activeRevision: '1', producers: [{
          producerId: definition.producerId, kind: 'JAVA', activeProducerVersion: '1',
        }]})
      case catalogRoot + '/definitions': {
        const kind = url.searchParams.get('kind')
        return success(route, {target, kind, definitions: kind === 'RESOURCE' ? declared : [definition], nextAfterId: null})
      }
      default: {
        const identity = declared.find(item => url.pathname === catalogRoot + '/definitions/RESOURCE/' + item.id)
        if (!identity) throw new Error('Unexpected catalog read: ' + url.pathname)
        return success(route, {identity, activeProducerVersion: '1', activeDefinition: {
          key: identity.key, type: identity.type, access: 'PROTECTED',
          target: {pageKey: 'orders.page.detail', paths: ['/orders/{id}'], methods: ['GET']},
          requirement: {mode: 'ALL', codes: ['orders:read']},
        }})
      }
    }
  })
  await expect(page).toHaveURL(new RegExp('/iam/roles/' + roleId + '/permissions$'))
  await page.getByRole('tab', {name: '按钮'}).click()
  const checkbox = page.getByRole('checkbox', {name: /orders:read/})
  await expect(checkbox).toBeEnabled()
  await checkbox.press('Space')
  await expect(checkbox).toBeChecked()
  await page.getByRole('tab', {name: 'API', exact: true}).click()
  await expect(checkbox).toBeChecked()
  const review = page.getByRole('button', {name: '复核授权'})
  await review.press('Enter')
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByText('orders:read', {exact: true})).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  expect(writes).toEqual([])
  await review.press('Enter')
  await dialog.getByRole('button', {name: '确认提交'}).press('Enter')
  await expect(page.getByText('版本已变化，草稿未自动覆盖新版本')).toBeVisible()
  await expect(review).toBeDisabled()
  await expect(checkbox).toBeChecked()
  await expect.poll(() => readsAfterConflict).toBeGreaterThan(0)
  expect(writes).toEqual([{target, permissionCodes: ['orders:read'], expectedVersion: '7', validFrom: null, validTo: null}])
})

test('refuses a direct role-grant route before requesting role or catalog data', async ({page}) => {
  const extraReads: string[] = []
  await openWithFixture(page, 'iam/roles/' + roleId + '/permissions', ['system:role:read'], async (route, url) => {
    extraReads.push(url.pathname)
    return deny(route, 403, 'PERMISSION_DENIED')
  })
  await expect(page.getByText('无权访问此页面', {exact: true})).toBeVisible()
  expect(extraReads).toEqual([])
})
