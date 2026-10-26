vi.mock('../../permissions/FieldCatalog', () => ({useWritableFields: () => true, useWritableFieldKeys: () => true}))
import {cleanup, fireEvent, render, screen, waitFor} from '@testing-library/react'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {PermissionCatalogPage} from './PermissionCatalogPage'
import {catalogWrapper, defaultCatalogResponse, target} from '../../test/catalog'
afterEach(cleanup)
describe('code-owned permission definitions', () => {
  it('reads the server-provisioned scope and immutable definition without manual creation', async () => {
    const test = catalogWrapper()
    render(<PermissionCatalogPage />, test)
    fireEvent.click(await screen.findByText('order:read'))
    await screen.findByText('当前激活定义（只读）')
    expect(screen.queryByRole('button', {name: '新建权限'})).toBeNull()
    expect(test.request).toHaveBeenCalledWith('/api/v1/permission-catalogs/definitions', {query: {...target, kind: 'PERMISSION', afterId: '0', limit: 100}})
    expect(test.request).toHaveBeenCalledWith('/api/v1/permission-catalogs/definitions/PERMISSION/201', {query: {...target}})
  })
  it('submits a versioned governance command separately from the readonly source rule', async () => {
    const test = catalogWrapper((path, options) => path.endsWith('/governance') ? {policyVersion: '5'} : defaultCatalogResponse(path, options))
    render(<PermissionCatalogPage />, test)
    fireEvent.click(await screen.findByText('order:read'))
    await screen.findByText('当前激活定义（只读）')
    fireEvent.click(await screen.findByRole('button', {name: /停.*用/}))
    fireEvent.click(await screen.findByRole('button', {name: 'OK'}))
    await waitFor(() => expect(test.request).toHaveBeenCalledWith('/api/v1/permission-catalogs/governance', {method: 'POST', body: {target, kind: 'PERMISSION', identityId: '201', action: 'DISABLE', expectedVersion: '4'}}))
    await waitFor(() => expect(test.refresh).toHaveBeenCalledOnce())
  })
})

it('does not silently replace the version that was reviewed in an open governance dialog', async () => {
  let version = '4'
  const test = catalogWrapper((path, options) => {
    const result = defaultCatalogResponse(path, options)
    return path.includes('/definitions/PERMISSION/') ? {...result as object, identity: {...(result as {identity: object}).identity, version}} : result
  })
  render(<PermissionCatalogPage />, test)
  fireEvent.click(await screen.findByText('order:read'))
  await waitFor(() => expect(screen.getByRole('button', {name: /停.*用/})).toBeEnabled())
  fireEvent.click(screen.getByRole('button', {name: /停.*用/}))
  version = '5'
  await test.queryClient.invalidateQueries({predicate: query => query.queryKey.includes('definition')})
  await screen.findByText('定义或影响已变化，请关闭并重新审查')
  expect(screen.getByRole('button', {name: 'OK'})).toBeDisabled()
})
