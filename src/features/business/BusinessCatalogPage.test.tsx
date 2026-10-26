vi.mock('../../permissions/FieldCatalog', () => ({useWritableFields: () => true, useWritableFieldKeys: () => true}))
import {TestAuthorizationProvider, createAuthorizationFixtureClient} from '../../test/authorization'
import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import {fireEvent, render, screen, waitFor} from '@testing-library/react'
import type {PropsWithChildren} from 'react'
import {type Rbac3Client} from '@stellar-enclosure/stellar-enclosure-tianquan-jianshen-react-sdk'
import {describe, expect, it, vi} from 'vitest'
import {FeatureApiProvider, type FeatureApiClient, type FeatureApiRequest} from '../shared/FeatureApi'
import {BusinessCatalogPage} from './BusinessCatalogPage'

const wrapper = (request: FeatureApiClient['request']) => ({children}: PropsWithChildren) => {
  const sdk = createAuthorizationFixtureClient({subject:'business-test',tenantId:'42',permissionCodes:['system:business:read', 'system:application:read'],authVersion:1,policyVersion:1}, {}) as unknown as Rbac3Client
  return (
    <QueryClientProvider client={new QueryClient({defaultOptions: {queries: {retry: false}}})}>
      <TestAuthorizationProvider client={sdk}>
        <FeatureApiProvider client={{request}}>{children}</FeatureApiProvider>
      </TestAuthorizationProvider>
    </QueryClientProvider>
  )
}

describe('business catalog page', () => {
  it('loads Tianshu businesses and applications through the RBAC catalog controller', async () => {
    const request = vi.fn<FeatureApiClient['request']>(async <T,>(path: string, requestOptions?: FeatureApiRequest): Promise<T> => {
      void requestOptions
      if (path === '/api/tianquan-jianshen/v1/iam/catalog/businesses') {
        return [{ddcBusinessId: 'business-1', bizCode: 'trade', bizName: '交易域', enabled: true}] as T
      }
      return [{ddcApplicationId: 'application-1', ddcBusinessId: 'business-1', bizCode: 'trade', appCode: 'orders', appName: '订单应用', applicationEnabled: true, businessEnabled: true}] as T
    })
    render(<BusinessCatalogPage />, {wrapper: wrapper(request as unknown as FeatureApiClient['request'])})

    await waitFor(() => expect(screen.getByText('交易域')).toBeInTheDocument())
    fireEvent.click(screen.getByText('交易域'))
    await waitFor(() => expect(screen.getByText('订单应用')).toBeInTheDocument())
    expect(request).toHaveBeenCalledWith('/api/tianquan-jianshen/v1/iam/catalog/businesses/business-1/applications', expect.anything())
  })
})
