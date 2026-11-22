vi.mock('../../permissions/FieldCatalog', () => ({useWritableFields: () => true, useWritableFieldKeys: () => true}))
import {cleanup, fireEvent, render, screen, waitFor, within} from '@testing-library/react'
import {ApiError} from '@stellar-enclosure/stellar-enclosure-web-shared'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {RolePermissionGrantPage} from './RolePermissionGrantPage'
import {catalogWrapper, defaultCatalogResponse as defaultResponse, definition, target} from '../../test/catalog'
afterEach(cleanup)

const defaultCatalogResponse: typeof defaultResponse = (path, options) => {
  const response = defaultResponse(path, options)
  return path.endsWith('/producers') ? {...response as object, activeRevision: '1'} : response
}

const showCharacters = async () => fireEvent.click(await screen.findByRole('tab', {name: '权限字符'}))
const reviewGrants = () => fireEvent.click(screen.getByRole('button', {name: '复核授权'}))
const confirmGrants = async () => {
  const dialog = await screen.findByRole('dialog')
  fireEvent.click(within(dialog).getByRole('button', {name: '确认提交'}))
}

it('synchronizes one permission code between button and API resource dimensions', async () => {
  const resources = [
    {...definition, id: '211', key: 'order.page.detail', type: 'PAGE', meaning: '订单详情'},
    {...definition, id: '212', key: 'order.button.view', type: 'BUTTON', meaning: '查看按钮'},
    {...definition, id: '213', key: 'order.api.detail', type: 'API', meaning: '详情接口'},
  ]
  const test = catalogWrapper((path, options) => {
    if (path.endsWith('/definitions') && options.query?.kind === 'RESOURCE') {
      return {target, kind: 'RESOURCE', definitions: resources, nextAfterId: null}
    }
    if (path.includes('/definitions/RESOURCE/')) {
      const identity = resources.find(row => path.endsWith('/' + row.id))!
      return {identity, activeProducerVersion: '1', activeDefinition: {
        key: identity.key, type: identity.type, access: 'PROTECTED',
        target: {pageKey: 'order.page.detail', paths: ['/orders/{id}'], methods: ['GET']},
        requirement: {mode: 'ALL', codes: ['order:read']},
      }}
    }
    return defaultCatalogResponse(path, options)
  })
  render(<RolePermissionGrantPage roleId="301" />, test)
  fireEvent.click(await screen.findByRole('tab', {name: '按钮'}))
  fireEvent.click(await screen.findByRole('checkbox', {name: /order:read/}))
  fireEvent.click(screen.getByRole('tab', {name: 'API'}))
  expect(await screen.findByRole('checkbox', {name: /order:read/})).toBeChecked()
  reviewGrants()
  const dialog = await screen.findByRole('dialog')
  expect(within(dialog).getByText('order:read')).toBeInTheDocument()
  expect(vi.mocked(test.request).mock.calls.filter(([, options]) => options?.method === 'PUT')).toHaveLength(0)
})

describe('explicit role permission grants', () => {
  it('sends permission characters and a scope-local decimal version without resource ids', async () => {
    const test = catalogWrapper((path, options) => options.method === 'PUT' ? {version: '8', permissionCodes: ['order:read']} : defaultCatalogResponse(path, options))
    render(<RolePermissionGrantPage roleId="301" />, test)
    await showCharacters()
    fireEvent.click(await screen.findByRole('checkbox', {name: /order:read/}))
    reviewGrants()
    await confirmGrants()
    await waitFor(() => expect(test.request).toHaveBeenCalledWith('/api/v1/roles/301/permissions', {method: 'PUT', body: {
      target, permissionCodes: ['order:read'], expectedVersion: '7', validFrom: null, validTo: null,
    }}))
    await waitFor(() => expect(test.refresh).toHaveBeenCalledOnce())
  })
  it('does not offer identities that are absent from the current activation', async () => {
    const test = catalogWrapper((path, options) => path.endsWith('/definitions')
      ? {target, kind: 'PERMISSION', definitions: [{...definition, activeProducerVersion: null}], nextAfterId: null} : defaultCatalogResponse(path, options))
    render(<RolePermissionGrantPage roleId="301" />, test)
    await showCharacters()
    await waitFor(() => expect(test.request).toHaveBeenCalledWith('/api/v1/permission-catalogs/definitions', expect.anything()))
    expect(screen.queryByRole('checkbox', {name: /order:read/})).toBeNull()
  })
  it('permits an explicit empty replacement to clear direct grants', async () => {
    const test = catalogWrapper((path, options) => path === '/api/v1/roles/301/permissions'
      ? options.method === 'PUT' ? {version: '8', permissionCodes: []} : {target, roleId: '301', version: '7', catalogVersion: '1', permissions: [{permissionCode: 'order:read', validFrom: '2026-01-01T00:00:00Z', validTo: null}]}
      : defaultCatalogResponse(path, options))
    render(<RolePermissionGrantPage roleId="301" />, test)
    await showCharacters()
    const checkbox = await screen.findByRole('checkbox', {name: /order:read/})
    expect(checkbox).toBeChecked()
    fireEvent.click(checkbox)
    reviewGrants()
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('button', {name: '确认提交'})).toBeDisabled()
    fireEvent.click(within(dialog).getByRole('checkbox', {name: /确认清空/}))
    await confirmGrants()
    await waitFor(() => expect(test.request).toHaveBeenCalledWith('/api/v1/roles/301/permissions', expect.objectContaining({method: 'PUT', body: expect.objectContaining({permissionCodes: []})})))
  })
  it('retains a conflict draft but prevents silently overwriting the reloaded version', async () => {
    let version = '7'
    const test = catalogWrapper((path, options) => {
      if (path === '/api/v1/roles/301/permissions') {
        if (options.method === 'PUT') {version = '8'; throw new ApiError('revision changed', 409, 'AUTH_MUTATION_CONFLICT')}
        return {target, roleId: '301', version, catalogVersion: '1', permissions: []}
      }
      return defaultCatalogResponse(path, options)
    })
    render(<RolePermissionGrantPage roleId="301" />, test)
    await showCharacters()
    fireEvent.click(await screen.findByRole('checkbox', {name: /order:read/}))
    reviewGrants()
    await confirmGrants()
    await screen.findByText('版本已变化，草稿未自动覆盖新版本')
    expect(screen.getByRole('button', {name: '复核授权'})).toBeDisabled()
    expect(screen.getByRole('checkbox', {name: /order:read/})).toBeChecked()
    expect(test.refresh).not.toHaveBeenCalled()
  })
  it('keeps hidden grants and does not automatically replay a timed-out replacement', async () => {
    const hidden = {permissionCode: 'order:hidden', validFrom: '2030-01-01T00:00:00Z', validTo: null}
    const test = catalogWrapper((path, options) => {
      if (path === '/api/v1/roles/301/permissions') {
        if (options.method === 'PUT') throw new ApiError('timeout', 0, 'REQUEST_TIMEOUT')
        return {target, roleId: '301', version: '7', catalogVersion: '1', permissions: [hidden]}
      }
      return defaultCatalogResponse(path, options)
    })
    render(<RolePermissionGrantPage roleId="301" />, test)
    await showCharacters()
    fireEvent.click(await screen.findByRole('checkbox', {name: /order:read/}))
    reviewGrants()
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('order:hidden')).toBeInTheDocument()
    await confirmGrants()
    expect(await screen.findByText('结果待核对，草稿已保留')).toBeInTheDocument()
    expect(screen.getByRole('button', {name: '复核授权'})).toBeDisabled()
    const writes = vi.mocked(test.request).mock.calls.filter(([, options]) => options?.method === 'PUT')
    expect(writes).toHaveLength(1)
    expect(writes[0][1]?.body).toMatchObject({permissionCodes: ['order:hidden', 'order:read']})
    expect(test.refresh).not.toHaveBeenCalled()
  })

  it('keeps grants readable and blocks editing while the directory revision differs', async () => {
    const test = catalogWrapper((path, options) => path === '/api/v1/roles/301/permissions'
      ? {target, roleId: '301', version: '7', catalogVersion: '1', permissions: [
          {permissionCode: 'order:read', validFrom: '2026-01-01T00:00:00Z', validTo: null},
        ]}
      : defaultResponse(path, options))
    render(<RolePermissionGrantPage roleId="301" />, test)
    await showCharacters()
    expect(await screen.findByText('授权与目录版本不一致，暂不可保存')).toBeInTheDocument()
    expect(await screen.findByRole('checkbox', {name: /order:read/})).toBeDisabled()
    expect(screen.getByRole('button', {name: '复核授权'})).toBeDisabled()
  })

  it('shows the opaque decision identifier when saving is denied', async () => {
    const id = '12345678-1234-4234-8234-123456789abc'
    const test = catalogWrapper((path, options) => {
      if (options.method === 'PUT') throw Object.assign(new ApiError('denied', 403, 'AUTHORIZATION_DENIED'), {decisionId: id})
      return defaultCatalogResponse(path, options)
    })
    render(<RolePermissionGrantPage roleId="301" />, test)
    await showCharacters()
    fireEvent.click(await screen.findByRole('checkbox', {name: /order:read/}))
    reviewGrants()
    await confirmGrants()
    expect(await screen.findByText(`决策编号: ${id}`)).toBeInTheDocument()
  })
})

it('preserves an existing scheduled validity window when another permission is selected', async () => {
  const validFrom = '2030-01-02T03:04:05.123456Z'
  const validTo = '2031-01-02T03:04:05.123456Z'
  const test = catalogWrapper((path, options) => {
    if (path.endsWith('/definitions')) return {target, kind: 'PERMISSION', definitions: [definition, {...definition, id: '202', key: 'order:write'}], nextAfterId: null}
    if (path === '/api/v1/roles/301/permissions') return options.method === 'PUT' ? {version: '8'} : {target, roleId: '301', version: '7', catalogVersion: '1', permissions: [{permissionCode: 'order:read', validFrom, validTo}]}
    return defaultCatalogResponse(path, options)
  })
  render(<RolePermissionGrantPage roleId="301" />, test)
  await showCharacters()
  fireEvent.click(await screen.findByRole('checkbox', {name: /order:write/}))
  reviewGrants()
  await confirmGrants()
  await waitFor(() => expect(test.request).toHaveBeenCalledWith('/api/v1/roles/301/permissions', {method: 'PUT', body: {
    target, permissionCodes: ['order:read', 'order:write'], expectedVersion: '7', validFrom, validTo,
  }}))
})

it('requires explicit confirmation before replacing heterogeneous existing validity windows', async () => {
  const test = catalogWrapper((path, options) => {
    if (path.endsWith('/definitions')) return {target, kind: 'PERMISSION', definitions: [definition, {...definition, id: '202', key: 'order:write'}], nextAfterId: null}
    if (path === '/api/v1/roles/301/permissions') return {target, roleId: '301', version: '7', catalogVersion: '1', permissions: [
      {permissionCode: 'order:read', validFrom: '2030-01-01T00:00:00Z', validTo: '2031-01-01T00:00:00Z'},
      {permissionCode: 'order:write', validFrom: '2032-01-01T00:00:00Z', validTo: null},
    ]}
    return defaultCatalogResponse(path, options)
  })
  render(<RolePermissionGrantPage roleId="301" />, test)
  await showCharacters()
  await screen.findByText('现有权限使用不同有效期')
  fireEvent.click(screen.getByRole('checkbox', {name: /order:write/}))
  expect(screen.getByRole('button', {name: '复核授权'})).toBeDisabled()
  fireEvent.click(screen.getByRole('checkbox', {name: /我确认用上述统一有效期/}))
  expect(screen.getByRole('button', {name: '复核授权'})).toBeEnabled()
})
