import {Rbac3Provider} from '@stellar-enclosure/stellar-enclosure-tianquan-jianshen-react-sdk'
import {snapshotContext, type PermissionSnapshotContext} from '@stellar-enclosure/stellar-enclosure-web-shared/permissions'
import {Button, Result, Spin} from 'antd'
import {createContext, type PropsWithChildren, useCallback, useContext, useEffect, useRef, useState} from 'react'
import type {AdminApiClients} from '../../api/adminApiClient'
import {resources, resourceReferences} from '../../permissions/resources'
import {subscribeAuthorizationFailure} from './gatewayAuth'
import {LoginPage} from './LoginPage'

export const CurrentAuthorizationRefreshContext = createContext<(() => Promise<void>) | null>(null)
export const useCurrentAuthorizationRefresh = () => {
  const refresh = useContext(CurrentAuthorizationRefreshContext)
  if (!refresh) throw new Error('CurrentAuthorizationProvider is required')
  return refresh
}

/** Host checks identity and the complete deployment scope before the SDK accepts a permission view. */
export const CurrentAuthorizationProvider = ({clients, children}: PropsWithChildren<{clients: AdminApiClients}>) => {
  const [binding, setBinding] = useState<PermissionSnapshotContext | null>(null)
  const [phase, setPhase] = useState<'LOADING' | 'READY' | 'LOGIN' | 'FORBIDDEN' | 'FAILED'>('LOADING')
  const [error, setError] = useState<string>()
  const pending = useRef<AbortController | null>(null)
  const serial = useRef(0)
  const acceptedEpoch = useRef<number | null>(null)
  const clear = useCallback((next: 'LOGIN' | 'FORBIDDEN') => {
    serial.current += 1
    pending.current?.abort()
    acceptedEpoch.current = null
    setBinding(null)
    setPhase(next)
  }, [])
  const load = useCallback(async () => {
    pending.current?.abort()
    const controller = new AbortController()
    pending.current = controller
    const attempt = ++serial.current
    setBinding(null)
    setPhase('LOADING')
    try {
      const identity = await clients.authClient.identity(controller.signal)
      if (attempt !== serial.current) return
      const capture = clients.authClient.context.capture(controller.signal)
      const snapshot = await clients.rbac3Client.getPermissionSnapshot(capture.signal)
      capture.assertCurrent()
      if (attempt !== serial.current) return
      if (snapshot.issuer !== identity.issuer || snapshot.subject !== identity.subject || snapshot.catalogScope.tenantId !== identity.tenantId
        || snapshot.catalogScope.businessCode !== 'xingyuan' || snapshot.catalogScope.applicationCode !== 'tianquan-jianshen'
        || snapshot.catalogScope.namespaceCode !== import.meta.env.VITE_PERMISSION_NAMESPACE
        || snapshot.catalogScope.environment !== import.meta.env.VITE_PERMISSION_ENVIRONMENT
        || Date.parse(snapshot.snapshotExpiresAt) <= Date.now()) throw new Error('权限快照与当前身份或部署范围不一致')
      acceptedEpoch.current = capture.epoch
      setBinding(snapshotContext(snapshot, capture.epoch))
      setPhase('READY')
    } catch (failure) {
      if (attempt !== serial.current) return
      const status = (failure as {status?: number}).status
      setPhase(status === 401 ? 'LOGIN' : status === 403 ? 'FORBIDDEN' : 'FAILED')
      setError(failure instanceof Error ? failure.message : '授权服务暂不可用')
    }
  }, [clients])
  useEffect(() => {
    const unsubscribeFailure = subscribeAuthorizationFailure(status => clear(status === 401 ? 'LOGIN' : 'FORBIDDEN'))
    const unsubscribeEpoch = clients.authClient.context.subscribe(() => {
      if (acceptedEpoch.current !== null && acceptedEpoch.current !== clients.authClient.context.epoch) clear('LOGIN')
    })
    let active = true
    queueMicrotask(() => { if (active) void load() })
    return () => {active = false; pending.current?.abort(); serial.current += 1; unsubscribeFailure(); unsubscribeEpoch()}
  }, [clients, clear, load])
  if (phase === 'LOADING') return <Spin fullscreen description="加载当前身份与权限范围" />
  if (phase === 'LOGIN') return <LoginPage notice={error} />
  if (phase === 'FORBIDDEN' || phase === 'FAILED') return <Result status={phase === 'FORBIDDEN' ? '403' : 'warning'}
    title={phase === 'FORBIDDEN' ? '当前身份无权访问' : '授权服务暂不可用'} subTitle={error}
    extra={<Button onClick={() => void load()}>重新加载</Button>} />
  return <CurrentAuthorizationRefreshContext.Provider value={load}>
    <Rbac3Provider client={clients.rbac3Client} binding={binding} requestContext={clients.authClient.context}
      resources={resources} resourceReferences={resourceReferences} onContextChange={setBinding}>{children}</Rbac3Provider>
  </CurrentAuthorizationRefreshContext.Provider>
}
