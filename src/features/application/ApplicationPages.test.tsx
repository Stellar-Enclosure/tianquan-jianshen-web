vi.mock('../../permissions/FieldCatalog', () => ({useWritableFields: () => true, useWritableFieldKeys: () => true}))
import {fireEvent, render, screen, cleanup} from '@testing-library/react'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {FieldDefinitionPage} from './FieldDefinitionPage'
import {ResourceCatalogPage} from './ResourceCatalogPage'
import {applicationApi} from './application.api'
import {catalogWrapper, defaultCatalogResponse, definition, target} from '../../test/catalog'
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
  it('reports the current FIELD index and follows only the provided cursor', async () => {
    const test = catalogWrapper((path, options) => {
      if (path.endsWith('/definitions')) return {target, kind: 'RESOURCE', definitions: options.query?.afterId === '0'
        ? [{...definition, key: 'order.field.email', type: 'FIELD'}] : [], nextAfterId: options.query?.afterId === '0' ? '44' : null}
      return defaultCatalogResponse(path, options)
    })
    render(<FieldDefinitionPage />, test)
    expect(await screen.findByText('本页匹配 1 条，索引返回 1 条，后续还有目录页')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', {name: '下一页'}))
    expect(await screen.findByText('当前页没有匹配定义')).toBeInTheDocument()
    expect(test.request).toHaveBeenCalledWith('/api/v1/permission-catalogs/definitions',
      expect.objectContaining({query: expect.objectContaining({afterId: '44'})}))
    expect(screen.getByRole('button', {name: '上一页'})).toBeEnabled()
  })
  it('retains the existing tenant application detail endpoint', async () => {
    const request = vi.fn().mockResolvedValue({})
    await applicationApi({request}).application('71')
    expect(request).toHaveBeenCalledWith('/api/tianquan-jianshen/v1/iam/tenant-applications/71')
  })
})
