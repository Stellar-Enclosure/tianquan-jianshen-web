import {useRbac3Authorization} from '@stellar-enclosure/stellar-enclosure-tianquan-jianshen-react-sdk'
import {Result} from 'antd'
import {gatewayAuth} from '../features/auth/gatewayAuth'
import {
  EmbeddedWorkbench,
  EnterpriseLayout,
  type AppCatalogStatus,
  type EnterpriseLayoutConfig,
  type Presentation,
  type WorkbenchHost,
} from '@stellar-enclosure/stellar-enclosure-web-shared'
import {Navigate, Outlet, Route, RouterProvider, Routes, createMemoryRouter, useNavigate} from 'react-router-dom'
import {useCallback, useMemo, useState, type PropsWithChildren} from 'react'
import {version} from '../../package.json'
import {buildJianshenCatalogPages} from '../workbench/routes'
import {applicationRouteDescriptors, isRouteAllowed, resolveApplicationLanding, visibleNavigation} from './navigation'
import type {FeatureRouteDescriptor} from '../features/shared/RouteDescriptor'

export const ApplicationRouter = ({
  embedded = false,
  workbenchHost,
}: {
  readonly embedded?: boolean
  readonly workbenchHost?: WorkbenchHost
}) => {
  if (workbenchHost) {
    return <JianshenWorkbenchRouter workbenchHost={workbenchHost} />
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

const JianshenWorkbenchShell = ({ workbenchHost }: { readonly workbenchHost: WorkbenchHost }) => {
  const {status, about, snapshot, binding} = useRbac3Authorization()
  const navigate = useNavigate()

  const pages = useMemo(
    () => (about && snapshot && binding ? buildJianshenCatalogPages(snapshot, binding) : []),
    [about, snapshot, binding],
  )

  const catalogStatus: AppCatalogStatus = useMemo(() => {
    if (!about || !snapshot || !binding || status === 'UNINITIALIZED' || status === 'LOADING_ABOUT') {
      return 'authorizing'
    }
    if (status === 'ERROR_RETRYABLE' || status === 'ERROR_FATAL') return 'failed'
    if (status === 'FORBIDDEN_NO_ROUTE' || pages.length === 0) return 'denied'
    return 'ready'
  }, [about, snapshot, binding, status, pages.length])

  const handlePresent = useCallback(async (presentation: Presentation) => {
    if (presentation.mode !== 'show') {
      await navigate('/__workbench/idle', { replace: true })
      return { ok: true as const }
    }
    const nextPath = presentation.target.path + (presentation.target.search || '')
    await navigate(nextPath, { replace: true })
    return { ok: true as const }
  }, [navigate])

  return (
    <EmbeddedWorkbench
      host={workbenchHost}
      status={catalogStatus}
      pages={pages}
      onPresent={handlePresent}
    >
      <div className="tianquan-jianshen-workbench-outlet" style={{ width: '100%', minWidth: 0 }}>
        <Outlet />
      </div>
    </EmbeddedWorkbench>
  )
}

const JianshenWorkbenchRouter = ({ workbenchHost }: { readonly workbenchHost: WorkbenchHost }) => {
  const [router] = useState(() =>
    createMemoryRouter(
      [
        {
          path: '/',
          element: <JianshenWorkbenchShell workbenchHost={workbenchHost} />,
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
