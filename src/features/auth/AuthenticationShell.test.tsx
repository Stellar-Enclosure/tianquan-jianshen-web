vi.mock('../../permissions/FieldCatalog', () => ({useWritableFields: () => true, useWritableFieldKeys: () => true}))
import {TestAuthorizationProvider} from '../../test/authorization'
import {type Rbac3Client, Rbac3RequestError} from '@stellar-enclosure/stellar-enclosure-tianquan-jianshen-react-sdk'
import {fireEvent, render, screen} from '@testing-library/react'
import {MemoryRouter} from 'react-router-dom'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {AuthenticationShell} from './AuthenticationShell'
import {gatewayAuth} from './gatewayAuth'

describe('authentication shell', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('offers unified SSO without local username, password, or token fields', async () => {
    const client = {
        getAbout: async () => {
        throw new Rbac3RequestError({
          status: 401,
          code: 'AUTHENTICATION_REQUIRED',
          message: 'login',
          retryable: false,
        })
      },
    } as unknown as Rbac3Client
    render(
      <MemoryRouter>
          <TestAuthorizationProvider client={client}>
          <AuthenticationShell><div>READY CONTENT</div></AuthenticationShell>
        </TestAuthorizationProvider>
      </MemoryRouter>,
    )

    expect(await screen.findByRole('button', { name: '使用统一身份登录' }))
      .toBeInTheDocument()
    expect(screen.queryByLabelText('Username')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('用户名')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('密码')).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Token/)).not.toBeInTheDocument()
  })

  it('starts the configured OIDC flow from the sign-in action', async () => {
    const client = {
      getAbout: async () => {
        throw new Rbac3RequestError({
          status: 401,
          code: 'AUTHENTICATION_REQUIRED',
          message: 'login',
          retryable: false,
        })
      },
    } as unknown as Rbac3Client
    const login = vi.spyOn(gatewayAuth, 'login').mockImplementation(() => {})
    render(
      <MemoryRouter>
        <TestAuthorizationProvider client={client}>
          <AuthenticationShell><div>READY CONTENT</div></AuthenticationShell>
        </TestAuthorizationProvider>
      </MemoryRouter>,
    )

    fireEvent.click(await screen.findByRole('button', {name: '使用统一身份登录'}))

    expect(login).toHaveBeenCalledWith()
  })
})


describe('fixed deployment registration', () => {
  it('passes the configured alias to the installed client without tenant or issuer selectors', async () => {
    const navigate = vi.fn()
    vi.stubEnv('VITE_OAUTH_APP_ALIAS', 'edge-deployment-child')
    vi.stubEnv('VITE_YUHENG_ORIGIN', '')
    vi.resetModules()
    vi.doUnmock('./gatewayAuth')
    vi.doMock('@stellar-enclosure/stellar-enclosure-web-shared', async () => {
      const actual = await vi.importActual<typeof import('@stellar-enclosure/stellar-enclosure-web-shared')>('@stellar-enclosure/stellar-enclosure-web-shared')
      return {...actual, createGatewayAuthClient: (options: Parameters<typeof actual.createGatewayAuthClient>[0]) =>
        actual.createGatewayAuthClient({...options, navigate})}
    })
    try {
      const {gatewayAuth: configured} = await import('./gatewayAuth')
      configured.login()
      expect(navigate.mock.calls[0]?.[0]).toBe('/apps/edge-deployment-child/auth/login')
      expect(String(navigate.mock.calls[0]?.[0])).not.toMatch(/tenant|issuer|resource/)
    } finally {
      vi.doUnmock('@stellar-enclosure/stellar-enclosure-web-shared')
      vi.unstubAllEnvs()
    }
  })
})
