import {useRbac3Authorization} from '@stellar-enclosure/stellar-enclosure-tianquan-jianshen-react-sdk'
import {Result} from 'antd'
import {gatewayAuth} from '../features/auth/gatewayAuth'
import {
  EmbeddedWorkbench,
  EnterpriseLayout,
  type AppCatalogStatus,
  type AppPageDescriptor,
  type EnterpriseLayoutConfig,
  type Presentation,
  type WorkbenchHost,
} from '@stellar-enclosure/stellar-enclosure-web-shared'
import {Navigate, Outlet, Route, RouterProvider, Routes, createMemoryRouter, useNavigate} from 'react-router-dom'
import {createContext, useCallback, useContext, useLayoutEffect, useMemo, useState, type ComponentType, type PropsWithChildren} from 'react'
import {version} from '../../package.json'
import {buildJianshenCatalogPages} from '../workbench/routes'
import {applicationRouteDescriptors, isRouteAllowed, resolveApplicationLanding, visibleNavigation} from './navigation'
import type {FeatureRouteDescriptor} from '../features/shared/RouteDescriptor'

export const ApplicationRouter = ({
  embedded = false,
  workbenchHost,
  authorizationBoundary,
}: {
  readonly embedded?: boolean
  readonly workbenchHost?: WorkbenchHost
  readonly authorizationBoundary?: ComponentType<PropsWithChildren>
}) => {
  if (workbenchHost) {
    return <JianshenWorkbenchRouter workbenchHost={workbenchHost} authorizationBoundary={authorizationBoundary} />
  }
  return <StandardApplicationRouter embedded={embedded} />
}

const StandardApplicationRouter = ({ embedded = false }: { readonly embedded?: boolean }) => {
  const {about, snapshot, binding} = useRbac3Authorization()
  if (!about) return null
  const landing = resolveApplicationLanding(snapshot, binding)
  const fallback = landing === null
    ? <Result status="403" title="没有可访问页面" subTitle="当前激活角色没有可用的本地路由。" />
    : <Navigate to={landing} replace />
  return (
    <AdminLayout embedded={embedded}>
      <Routes>
        {applicationRouteDescriptors.map((route) => (
          <Route key={route.key} path={route.path} element={<RouteAccessGuard route={route}><route.component /></RouteAccessGuard>} />
        ))}
        <Route path="*" element={fallback} />
      </Routes>
    </AdminLayout>
  )
}

const JianshenFallbackRoute = () => {
  const {about, snapshot, binding} = useRbac3Authorization()
  if (!about) return null
  const landing = resolveApplicationLanding(snapshot, binding)
  return landing === null
    ? <Result status="403" title="没有可访问页面" subTitle="当前激活角色没有可用的本地路由。" />
    : <Navigate to={landing} replace />
}

interface WorkbenchCatalog {
  readonly status: AppCatalogStatus
  readonly pages: readonly AppPageDescriptor[]
}
const emptyPages: readonly AppPageDescriptor[] = []
const WorkbenchCatalogContext = createContext<(catalog: WorkbenchCatalog) => void>(() => undefined)

/** The authorization gates clear the host catalog before replacing protected content. */
export const useWorkbenchCatalogReset = () => {
  const publish = useContext(WorkbenchCatalogContext)
  return useCallback((status: 'authorizing' | 'denied' | 'failed') => {
    publish({status, pages: emptyPages})
  }, [publish])
}

export const JianshenCatalogReporter = () => {
  const {status, errorCode, about, snapshot, binding} = useRbac3Authorization()
  const publish = useContext(WorkbenchCatalogContext)
  const pages = useMemo(
    () => (status === 'READY' && about && snapshot && binding ? buildJianshenCatalogPages(snapshot, binding) : emptyPages),
    [status, about, snapshot, binding],
  )
  // An expired snapshot clears routes while renewal can still recover on the attached port.
  const recoveringSnapshot = status === 'ERROR_RETRYABLE' && errorCode === 'PERMISSION_SNAPSHOT_EXPIRED'
  const catalogStatus: AppCatalogStatus = recoveringSnapshot ? 'authorizing'
    : status === 'ERROR_RETRYABLE' || status === 'ERROR_FATAL'
    ? 'failed'
    : status === 'FORBIDDEN_NO_ROUTE'
      ? 'denied'
      : status !== 'READY' || !about || !snapshot || !binding
        ? 'authorizing'
        : pages.length === 0 ? 'denied' : 'ready'

  useLayoutEffect(() => {publish({status: catalogStatus, pages})}, [publish, catalogStatus, pages])
  return null
}

const AuthorizedWorkbenchBoundary = ({children}: PropsWithChildren) => <>
  <JianshenCatalogReporter />
  {children}
</>

const JianshenWorkbenchShell = ({workbenchHost, authorizationBoundary: AuthorizationBoundary = AuthorizedWorkbenchBoundary}: {
  readonly workbenchHost: WorkbenchHost
  readonly authorizationBoundary?: ComponentType<PropsWithChildren>
}) => {
  const navigate = useNavigate()
  const [catalog, setCatalog] = useState<WorkbenchCatalog>({status: 'authorizing', pages: emptyPages})
  const handlePresent = useCallback(async (presentation: Presentation) => {
    if (presentation.mode !== 'show') {
      await navigate('/__workbench/idle', {replace: true})
      return {ok: true as const}
    }
    await navigate(presentation.target.path + (presentation.target.search || ''), {replace: true})
    return {ok: true as const}
  }, [navigate])

  return (
    <EmbeddedWorkbench host={workbenchHost} status={catalog.status} pages={catalog.pages} onPresent={handlePresent}>
      <WorkbenchCatalogContext.Provider value={setCatalog}>
        <AuthorizationBoundary>
          <div className="tianquan-jianshen-workbench-outlet" style={{width: '100%', minWidth: 0}}>
            <Outlet />
          </div>
        </AuthorizationBoundary>
      </WorkbenchCatalogContext.Provider>
    </EmbeddedWorkbench>
  )
}

const JianshenWorkbenchRouter = ({workbenchHost, authorizationBoundary}: {
  readonly workbenchHost: WorkbenchHost
  readonly authorizationBoundary?: ComponentType<PropsWithChildren>
}) => {
  const [router] = useState(() =>
    createMemoryRouter(
      [
        {
          path: '/',
          element: <JianshenWorkbenchShell workbenchHost={workbenchHost} authorizationBoundary={authorizationBoundary} />,
          children: [
            { path: '__workbench/idle', element: null },
            ...applicationRouteDescriptors.map((route) => ({
              path: route.path.replace(/^\//, ''),
              element: (
                <RouteAccessGuard route={route}>
                  <route.component />
                </RouteAccessGuard>
              ),
            })),
            { path: '*', element: <JianshenFallbackRoute /> },
          ],
        },
      ],
      { initialEntries: ['/__workbench/idle'] },
    ),
  )

  return <RouterProvider router={router} />
}

const RouteAccessGuard = ({ route, children }: PropsWithChildren<{ readonly route: FeatureRouteDescriptor }>) => {
    const {about, snapshot, binding} = useRbac3Authorization()
  if (!about || !isRouteAllowed(snapshot, binding, route)) return <Result status="403" title="无权访问此页面" subTitle="路由已在客户端隐藏，服务端仍会独立执行授权校验。" />
  return children
}

const AdminLayout = ({ children, embedded = false }: PropsWithChildren<{ readonly embedded?: boolean }>) => {
    const {about, snapshot, binding} = useRbac3Authorization()
  if (!about) return null
  // 导航由 SDK 的 visibleNavigation 提供（含权限过滤），shared 只负责渲染与高亮。
  const config: EnterpriseLayoutConfig = {
    platformName: 'Tianquan-Jianshen 权限平台',
    navigation: visibleNavigation(snapshot, binding),
    user: {
        name: about.user.subject,
        menu: [
            {key: 'local-logout', label: '退出鉴身', onClick: () => gatewayAuth.logout()},
            {key: 'sso-logout', label: '退出统一身份', onClick: () => gatewayAuth.logout(true)},
        ],
    },
    footer: { version },
  }
  const layoutConfig: EnterpriseLayoutConfig = embedded
    ? {...config, hideHeader: true, hideFooter: true}
    : config
  return <EnterpriseLayout config={layoutConfig}>{children}</EnterpriseLayout>
}
