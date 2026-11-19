import {FieldCatalogProvider} from '../permissions/FieldCatalog'
import {CurrentAuthorizationProvider} from '../features/auth/CurrentAuthorizationProvider'
import {QueryClientProvider} from '@tanstack/react-query'
import {BrowserRouter, Link, Route, Routes, useNavigate, useParams, useSearchParams} from 'react-router-dom'
import {Result} from 'antd'
import {useEffect, useState} from 'react'
import {AppErrorBoundary} from '@stellar-enclosure/stellar-enclosure-web-shared'
import {createAdminApiClients} from '../api/adminApiClient'
import {gatewayAuth, LOGIN_CALLBACK, POPUP_CALLBACK, STANDALONE_LOGIN} from '../features/auth/gatewayAuth'
import {AuthenticationShell} from '../features/auth/AuthenticationShell'
import {LoginPage} from '../features/auth/LoginPage'
import {FeatureApiProvider} from '../features/shared/FeatureApi'
import {createAdminQueryClient} from './queryClient'
import {ApplicationRouter} from './router'

const queryClient = createAdminQueryClient()
const clients = createAdminApiClients()

function OAuthCallback({popup = false}: {readonly popup?: boolean}) {
  const [url] = useState(() => window.location.href)
  const [status, setStatus] = useState<'pending' | 'done' | 'failed'>('pending')
  const navigate = useNavigate()
  useEffect(() => {
    let active = true
    void gatewayAuth.completeCallback(url, popup).then(returnTo => {
      if (!active) return
      if (returnTo) void navigate(returnTo, {replace: true})
      else setStatus('done')
    }, () => { if (active) setStatus('failed') })
    return () => { active = false }
  }, [url, popup, navigate])
  const title = status === 'failed' ? '统一身份回调失败' : status === 'done' ? '授权完成，可以关闭此窗口' : '正在完成统一身份授权'
  return <Result status={status === 'failed' ? 'error' : 'info'} title={title}
    extra={status === 'failed' && !popup ? <Link to="/">返回鉴身</Link> : undefined} />
}

function StandaloneLogin() {
  const {registrationId = ''} = useParams()
  const [params] = useSearchParams()
  return <LoginPage startAuthorization={() => gatewayAuth.loginStandalone(registrationId, params.get('reauthenticate') === '1')} />
}

export const App = ({embedded = false}: {readonly embedded?: boolean}) => (
  <BrowserRouter basename={import.meta.env.BASE_URL}>
    <AppErrorBoundary onError={(error, info) => {
      console.error('[Tianquan-Jianshen] Unhandled error:', error, info.componentStack)
    }}>
      <Routes>
        <Route caseSensitive path={LOGIN_CALLBACK} element={<OAuthCallback />} />
        <Route caseSensitive path={POPUP_CALLBACK} element={<OAuthCallback popup />} />
        <Route caseSensitive path={STANDALONE_LOGIN} element={<StandaloneLogin />} />
        <Route path="*" element={
          <QueryClientProvider client={queryClient}>
            <CurrentAuthorizationProvider clients={clients}>
              <FeatureApiProvider client={clients.featureClient}>
                <FieldCatalogProvider>
                  <AuthenticationShell>
                    <ApplicationRouter embedded={embedded} />
                  </AuthenticationShell>
                </FieldCatalogProvider>
              </FeatureApiProvider>
            </CurrentAuthorizationProvider>
          </QueryClientProvider>
        } />
      </Routes>
    </AppErrorBoundary>
  </BrowserRouter>
)
