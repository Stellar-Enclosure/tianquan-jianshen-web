vi.mock('../../permissions/FieldCatalog', () => ({useWritableFields: () => true, useWritableFieldKeys: () => true}))
import {render, screen, cleanup} from '@testing-library/react'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {FieldDefinitionPage} from './FieldDefinitionPage'
import {ResourceCatalogPage} from './ResourceCatalogPage'
import {applicationApi} from './application.api'
import {catalogWrapper} from '../../test/catalog'
afterEach(cleanup)
describe('application code catalogs', () => {
  it('shows backend FIELD definitions without manual write forms', async () => {
    render(<FieldDefinitionPage />, catalogWrapper())
    await screen.findByText('order.field.email')
    expect(screen.queryByRole('button', {name: /新增字段|维护字段/})).toBeNull()
    expect(screen.getByText('定义与策略由代码生成，只读展示')).toBeTruthy()
  })
  it('shows resources without resource-to-permission mapping editors', async () => {
    render(<ResourceCatalogPage />, catalogWrapper())
    await screen.findByText('order.field.email')
    expect(screen.queryByRole('button', {name: /映射|归档/})).toBeNull()
  })
  it('retains the existing tenant application detail endpoint', async () => {
    const request = vi.fn().mockResolvedValue({})
    await applicationApi({request}).application('71')
    expect(request).toHaveBeenCalledWith('/api/tianquan-jianshen/v1/iam/tenant-applications/71')
  })
})
