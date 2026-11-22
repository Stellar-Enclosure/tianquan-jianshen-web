import {QueryClient, QueryClientProvider} from '@tanstack/react-query'
import {render, screen} from '@testing-library/react'
import {MemoryRouter} from 'react-router-dom'
import {describe, expect, it, vi} from 'vitest'
import {createAuthorizationFixtureClient, TestAuthorizationProvider} from '../../test/authorization'
import {FeatureApiProvider} from '../shared/FeatureApi'
import {OverviewPage} from './OverviewPage'

describe('governance overview', () => {
  it('offers only permitted workbench destinations and keeps session facts independent of runtime access', async () => {
    const sdk = createAuthorizationFixtureClient({permissionCodes: ['system:runtime:read', 'system:role:read'], authVersion: 42, policyVersion: 86})
    const request = vi.fn()
    render(<MemoryRouter><QueryClientProvider client={new QueryClient({defaultOptions: {queries: {retry: false}}})}>
      <TestAuthorizationProvider client={sdk}><FeatureApiProvider client={{request}}><OverviewPage /></FeatureApiProvider></TestAuthorizationProvider>
    </QueryClientProvider></MemoryRouter>)
    expect(await screen.findByRole('link', {name: '角色管理'})).toHaveAttribute('href', '/iam/roles')
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('86')).toBeInTheDocument()
    expect(screen.queryByRole('link', {name: '运行状态'})).not.toBeInTheDocument()
    expect(request).not.toHaveBeenCalled()
  })
})
