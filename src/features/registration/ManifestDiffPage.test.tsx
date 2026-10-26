vi.mock('../../permissions/FieldCatalog', () => ({useWritableFields: () => true, useWritableFieldKeys: () => true}))
import {cleanup, render, screen} from '@testing-library/react'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {ManifestDiffPage} from './ManifestDiffPage'
import {catalogWrapper, defaultCatalogResponse, diff, target} from '../../test/catalog'
afterEach(cleanup)
describe('live candidate diff', () => {
  it('keeps producer ids in query parameters and shows current expansion evidence', async () => {
    const test = catalogWrapper((path, options) => path.endsWith('/diff') ? diff(String(options.query?.producerId), true) : defaultCatalogResponse(path, options))
    render(<ManifestDiffPage />, test)
    await screen.findByText('ALL_TO_ANY')
    expect(screen.getByText('包含授权扩大')).toBeTruthy()
    expect(test.request).toHaveBeenCalledWith('/api/v1/permission-catalogs/diff', {query: {...target, producerId: 'java/api', producerVersion: '1'}})
    expect(screen.queryByRole('button', {name: /修改策略|编辑规则/})).toBeNull()
  })
})
