vi.mock('../../permissions/FieldCatalog', () => ({useWritableFields: () => true, useWritableFieldKeys: () => true}))
import {cleanup, fireEvent, render, screen, waitFor, within} from '@testing-library/react'
import {ApiError} from '@stellar-enclosure/stellar-enclosure-web-shared'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {ManifestVersionsPage} from './ManifestVersionsPage'
import {candidate, catalogWrapper, codes, defaultCatalogResponse, descriptor, diff, target} from '../../test/catalog'
import type {ActivationCommand} from './registration.api'
afterEach(() => {cleanup(); window.sessionStorage.clear()})
const choose = async (producer: string) => {
  const input = await screen.findByLabelText('候选版本 ' + producer)
  fireEvent.mouseDown(input)
  await waitFor(() => expect(document.querySelectorAll('.ant-select-dropdown').length).toBeGreaterThan(0))
  const dropdown = Array.from(document.querySelectorAll('.ant-select-dropdown')).at(-1) as HTMLElement
  fireEvent.click(within(dropdown).getByText('1 · READY · 已有部署资格'))
}
const selectAll = async () => {await choose('java/api'); await choose('react-web'); await screen.findAllByText('METADATA_ONLY')}

describe('qualified catalog activation', () => {
  it('requires every enabled producer, matching current diffs and explicit review', async () => {
    const test = catalogWrapper((path, options) => path.endsWith('/activations') ? descriptor((options.body as ActivationCommand).operationId) : defaultCatalogResponse(path, options))
    render(<ManifestVersionsPage />, test)
    await choose('java/api')
    expect(screen.getByRole('button', {name: '激活完整版本集'})).toBeDisabled()
    await choose('react-web')
    await waitFor(() => expect(screen.getByRole('checkbox', {name: /我已检查/})).toBeEnabled())
    fireEvent.click(screen.getByRole('checkbox', {name: /我已检查/}))
    fireEvent.click(screen.getByRole('button', {name: '激活完整版本集'}))
    await waitFor(() => expect(test.request).toHaveBeenCalledWith('/api/v1/permission-catalogs/activations', {method: 'POST', body: {
      target, operationId: expect.stringMatching(/^[a-f0-9-]{36}$/), expectedActiveRevision: '2', producers: [
        {producerId: 'java/api', producerVersion: '1', qualificationId: '501'}, {producerId: 'react-web', producerVersion: '1', qualificationId: '501'},
      ],
    }}))
  })
  it('never treats READY without a trusted qualification as deployable', async () => {
    const test = catalogWrapper((path, options) => path.endsWith('/candidates')
      ? {...defaultCatalogResponse(path, options) as object, candidates: [{...candidate(), qualification: null}]} : defaultCatalogResponse(path, options))
    render(<ManifestVersionsPage />, test)
    fireEvent.mouseDown(await screen.findByLabelText('候选版本 java/api'))
    const value = await screen.findByText('1 · READY · 无部署资格')
    expect(value.closest('.ant-select-item-option')).toHaveClass('ant-select-item-option-disabled')
    expect(screen.getByRole('button', {name: '激活完整版本集'})).toBeDisabled()
  })
  it('requires governance permission for expansion even when activation permission exists', async () => {
    const test = catalogWrapper((path, options) => path.endsWith('/diff') ? diff(String(options.query?.producerId), true) : defaultCatalogResponse(path, options), codes.filter(value => value !== 'system:permission-catalog:manage'))
    render(<ManifestVersionsPage />, test)
    await choose('java/api'); await choose('react-web')
    await screen.findByText('本次选择会扩大授权')
    await waitFor(() => expect(screen.getByRole('checkbox', {name: /我已检查/})).toBeEnabled())
    fireEvent.click(screen.getByRole('checkbox', {name: /我已检查/}))
    expect(screen.getByRole('button', {name: '激活完整版本集'})).toBeDisabled()
  })
  it('queries the original operation after an unknown outcome without issuing another write', async () => {
    let request: ActivationCommand | undefined
    const test = catalogWrapper((path, options) => {
      if (path.endsWith('/activations')) {request = options.body as ActivationCommand; throw new ApiError('response lost', 503, 'UNAVAILABLE')}
      if (path.endsWith('/versions') && options.query?.operationId) return descriptor(String(options.query.operationId))
      return defaultCatalogResponse(path, options)
    })
    render(<ManifestVersionsPage />, test)
    await selectAll()
    await waitFor(() => expect(screen.getByRole('checkbox', {name: /我已检查/})).toBeEnabled())
    fireEvent.click(screen.getByRole('checkbox', {name: /我已检查/}))
    fireEvent.click(screen.getByRole('button', {name: '激活完整版本集'}))
    await screen.findByText('激活结果尚未确认')
    fireEvent.click(screen.getByRole('button', {name: '查询该操作'}))
    await waitFor(() => expect(test.request).toHaveBeenCalledWith('/api/v1/permission-catalogs/versions', {query: {...target, operationId: request!.operationId}}))
    expect(vi.mocked(test.request).mock.calls.filter(([path]) => path.endsWith('/activations'))).toHaveLength(1)
  })
})

it('keeps an unknown operation across page unmount and requires original lookup', async () => {
  let frozen: ActivationCommand | undefined
  const test = catalogWrapper((path, options) => {
    if (path.endsWith('/activations')) {frozen = options.body as ActivationCommand; throw new ApiError('lost', 503, 'UNAVAILABLE')}
    return defaultCatalogResponse(path, options)
  })
  const first = render(<ManifestVersionsPage />, test)
  await selectAll()
  await waitFor(() => expect(screen.getByRole('checkbox', {name: /我已检查/})).toBeEnabled())
  fireEvent.click(screen.getByRole('checkbox', {name: /我已检查/}))
  fireEvent.click(screen.getByRole('button', {name: '激活完整版本集'}))
  await screen.findByText('激活结果尚未确认')
  first.unmount()
  render(<ManifestVersionsPage />, test)
  await screen.findByText('激活结果尚未确认')
  expect(screen.getByText(new RegExp(frozen!.operationId))).toBeTruthy()
  expect(screen.getByRole('button', {name: '激活完整版本集'})).toBeDisabled()
  expect(vi.mocked(test.request).mock.calls.filter(([path]) => path.endsWith('/activations'))).toHaveLength(1)
})

it('invalidates the explicit review when current activation and diff evidence change', async () => {
  let revision = '2'
  const test = catalogWrapper((path, options) => {
    const result = defaultCatalogResponse(path, options)
    if (path.endsWith('/producers')) return {...result as object, activeRevision: revision}
    if (path.endsWith('/diff')) return {...result as object, expectedActiveRevision: revision}
    return result
  })
  render(<ManifestVersionsPage />, test)
  await selectAll()
  await waitFor(() => expect(screen.getByRole('checkbox', {name: /我已检查/})).toBeEnabled())
  fireEvent.click(screen.getByRole('checkbox', {name: /我已检查/}))
  expect(screen.getByRole('button', {name: '激活完整版本集'})).toBeEnabled()
  revision = '3'
  await test.queryClient.invalidateQueries({predicate: query => query.queryKey.includes('producers') || query.queryKey.includes('diff')})
  await screen.findByText('当前激活修订 3')
  expect(screen.getByRole('checkbox', {name: /我已检查/})).not.toBeChecked()
  expect(screen.getByRole('button', {name: '激活完整版本集'})).toBeDisabled()
})
