import {act, fireEvent, render, screen, waitFor} from '@testing-library/react'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {Rbac3RequestError} from '@stellar-enclosure/stellar-enclosure-tianquan-jianshen-react-sdk'
import {AuthRequestContext, type AppCatalogUpdate, type WorkbenchHost, type WorkbenchPort} from '@stellar-enclosure/stellar-enclosure-web-shared'
import type {PermissionSnapshot} from '@stellar-enclosure/stellar-enclosure-web-shared/permissions'
import type {AdminApiClients} from '../api/adminApiClient'
import {notifyAuthorizationFailure} from '../features/auth/gatewayAuth'
import {createAuthorizationFixtureClient, permissionSnapshotFixture} from '../test/authorization'

const clientState = vi.hoisted(() => ({current: null as AdminApiClients | null}))
vi.mock('../api/adminApiClient', () => ({
  createAdminApiClients: () => new Proxy({}, {get: (_, key) => Reflect.get(clientState.current!, key)}),
}))
import {App} from './App'

const deferred = <T,>() => {
  let resolve!: (value: T) => void
  let reject!: (reason: Error) => void
  const promise = new Promise<T>((done, fail) => {resolve = done; reject = fail})
  return {promise, resolve, reject}
}

function fixture() {
  vi.stubEnv('VITE_PERMISSION_NAMESPACE', 'default')
  vi.stubEnv('VITE_PERMISSION_ENVIRONMENT', 'test')
  const snapshot = permissionSnapshotFixture({permissionCodes: ['system:organization:read']})
  const context = new AuthRequestContext()
  const bootstrap = deferred<PermissionSnapshot>()
  const sdk = createAuthorizationFixtureClient({permissionCodes: ['system:organization:read']})
  const about = deferred<Awaited<ReturnType<typeof sdk.getAbout>>>()
  const getPermissionSnapshot = vi.fn().mockReturnValueOnce(bootstrap.promise).mockResolvedValue(snapshot)
  const getAbout = vi.fn().mockReturnValue(about.promise)
  const featureRequest = vi.fn().mockResolvedValue([])
  clientState.current = {
    authClient: {context, identity: async () => ({issuer: snapshot.issuer, subject: snapshot.subject,
      tenantId: snapshot.catalogScope.tenantId, clientId: 'fixture', accessExpiresAt: Date.now() + 60_000,
      resource: 'https://jianshen.example.invalid/resource'}), authority: () => {throw new Error('Unused authority')}},
    rbac3Client: {...sdk, getPermissionSnapshot, getAbout} as unknown as AdminApiClients['rbac3Client'],
    featureClient: {request: featureRequest},
  }
  const ports: WorkbenchPort[] = [], catalogs: AppCatalogUpdate[] = []
  const host: WorkbenchHost = {
    attach: vi.fn(port => {ports.push(port); return {ok: true as const}}),
    reportCatalog: vi.fn(update => {catalogs.push(update); return {ok: true as const}}),
    requestNavigation: vi.fn(() => ({ok: true as const})),
  }
  return {snapshot, context, bootstrap, about, sdk, featureRequest, getPermissionSnapshot, getAbout, ports, catalogs, host}
}

afterEach(() => {vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.useRealTimers()})

describe('App workbench authorization handshake', () => {
  it('attaches before a delayed bootstrap, then authorizes through the same port and clears on logout', async () => {
    vi.useFakeTimers({toFake: ['Date']})
    const f = fixture()
    render(<App embedded workbenchHost={f.host} />)
    await waitFor(() => expect(f.getPermissionSnapshot).toHaveBeenCalledOnce())
    expect(f.ports).toHaveLength(1)
    expect(f.catalogs.at(-1)).toMatchObject({status: 'authorizing', pages: []})
    expect(f.featureRequest).not.toHaveBeenCalled()
    const port = f.ports[0]!
    await act(async () => {
      vi.setSystemTime(Date.now() + 11_000)
      await port.present({mode: 'show', navigationId: 1, tabKey: 'organizations',
        target: {path: '/iam/organizations', search: ''}, signal: new AbortController().signal})
    })
    expect(f.catalogs.every(update => update.status !== 'ready' && update.pages.length === 0)).toBe(true)
    expect(f.featureRequest).not.toHaveBeenCalled()
    expect(screen.queryByRole('heading', {name: '组织'})).not.toBeInTheDocument()

    await act(async () => {f.bootstrap.resolve(f.snapshot)})
    await waitFor(() => expect(f.getAbout).toHaveBeenCalledOnce())
    expect(f.ports).toEqual([port])
    expect(f.catalogs.at(-1)).toMatchObject({status: 'authorizing', pages: []})
    expect(f.featureRequest).not.toHaveBeenCalled()
    await act(async () => {f.about.resolve(await f.sdk.getAbout())})
    await waitFor(() => expect(f.catalogs.at(-1)?.status).toBe('ready'))
    expect(f.ports).toEqual([port])
    expect(f.catalogs.at(-1)?.pages.map(page => page.pattern)).toEqual(['/iam/organizations'])
    await waitFor(() => expect(f.featureRequest).toHaveBeenCalledWith(
      '/api/tianquan-jianshen/v1/iam/organizations', expect.anything()))
    expect(screen.queryByRole('navigation', {name: '主菜单'})).not.toBeInTheDocument()

    await act(async () => {f.context.invalidate()})
    await waitFor(() => expect(screen.getByRole('button', {name: '使用统一身份登录'})).toBeInTheDocument())
    expect(f.catalogs.at(-1)).toMatchObject({status: 'authorizing', pages: []})
    expect(f.ports).toEqual([port])
  })

  it('keeps the port and clears the catalog when SDK authorization is unavailable', async () => {
    const f = fixture()
    render(<App embedded workbenchHost={f.host} />)
    await waitFor(() => expect(f.getPermissionSnapshot).toHaveBeenCalledOnce())
    const port = f.ports[0]
    await act(async () => {f.bootstrap.resolve(f.snapshot)})
    await waitFor(() => expect(f.getAbout).toHaveBeenCalledOnce())
    await act(async () => {f.about.reject(new Rbac3RequestError({status: 503,
      code: 'NETWORK_ERROR', message: 'Unavailable', retryable: true}))})
    expect(await screen.findByText('授权状态暂不可用')).toBeInTheDocument()
    expect(f.catalogs.at(-1)).toMatchObject({status: 'failed', pages: []})
    expect(f.ports).toEqual([port])
    expect(f.featureRequest).not.toHaveBeenCalled()
  })

  it('clears expired routes without terminating the attached workbench and reports READY after recovery', async () => {
    vi.useFakeTimers({toFake: ['Date', 'setTimeout', 'clearTimeout']})
    const f = fixture()
    const snapshot = {...f.snapshot, snapshotExpiresAt: new Date(Date.now() + 30_000).toISOString()}
    const renewed = deferred<PermissionSnapshot>()
    f.getPermissionSnapshot.mockReset().mockReturnValueOnce(f.bootstrap.promise)
      .mockResolvedValueOnce(snapshot).mockReturnValue(renewed.promise)
    render(<App embedded workbenchHost={f.host} />)
    await act(async () => {f.bootstrap.resolve(snapshot); f.about.resolve(await f.sdk.getAbout())})
    expect(f.catalogs.at(-1)).toMatchObject({status: 'ready'})
    const port = f.ports[0]

    await act(async () => {await vi.advanceTimersByTimeAsync(30_001)})
    expect(screen.getByText('PERMISSION_SNAPSHOT_EXPIRED')).toBeInTheDocument()
    expect(f.catalogs.at(-1)).toMatchObject({status: 'authorizing', pages: []})

    await act(async () => {
      fireEvent.click(screen.getByRole('button', {name: /^重\s*试$/}))
      renewed.resolve({...snapshot, snapshotExpiresAt: new Date(Date.now() + 30_000).toISOString()})
    })
    expect(f.ports).toEqual([port])
    expect(f.catalogs.at(-1)).toMatchObject({status: 'ready'})
    expect(f.catalogs.at(-1)?.pages.map(page => page.pattern)).toEqual(['/iam/organizations'])
  })

  it('clears a ready catalog and reports denied after a native 403', async () => {
    const f = fixture()
    render(<App embedded workbenchHost={f.host} />)
    await waitFor(() => expect(f.getPermissionSnapshot).toHaveBeenCalledOnce())
    const port = f.ports[0]
    await act(async () => {f.bootstrap.resolve(f.snapshot); f.about.resolve(await f.sdk.getAbout())})
    await waitFor(() => expect(f.catalogs.at(-1)?.status).toBe('ready'))
    expect(f.catalogs.at(-1)?.pages.length).toBeGreaterThan(0)
    await act(async () => {notifyAuthorizationFailure(403)})
    expect(await screen.findByText('当前身份无权访问')).toBeInTheDocument()
    expect(f.catalogs.at(-1)).toMatchObject({status: 'denied', pages: []})
    expect(f.ports).toEqual([port])
    expect(f.featureRequest.mock.calls.filter(([path]) => String(path).includes('/iam/'))).toHaveLength(0)
  })

  it.each(['binding', 'forbidden'] as const)('keeps the attached port but publishes no catalog on %s rejection', async rejection => {
    const f = fixture()
    render(<App embedded workbenchHost={f.host} />)
    await waitFor(() => expect(f.getPermissionSnapshot).toHaveBeenCalledOnce())
    expect(f.ports).toHaveLength(1)
    if (rejection === 'binding') {
      await act(async () => {f.bootstrap.resolve({...f.snapshot, subject: 'another-subject'})})
      expect(await screen.findByText('权限快照与当前身份或部署范围不一致')).toBeInTheDocument()
      expect(f.catalogs.at(-1)).toMatchObject({status: 'failed', pages: []})
    } else {
      await act(async () => {f.bootstrap.reject(Object.assign(new Error('Forbidden'), {status: 403}))})
      expect(await screen.findByText('当前身份无权访问')).toBeInTheDocument()
      expect(f.catalogs.at(-1)).toMatchObject({status: 'denied', pages: []})
    }
    expect(f.ports).toHaveLength(1)
    expect(f.featureRequest.mock.calls.filter(([path]) => String(path).includes('/iam/'))).toHaveLength(0)
  })
})
