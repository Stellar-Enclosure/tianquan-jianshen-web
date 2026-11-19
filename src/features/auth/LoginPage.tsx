import {Alert, Button, Card, Typography} from 'antd'
import {useEffect, useRef, useState} from 'react'
import {useLocation} from 'react-router-dom'
import {gatewayAuth} from './gatewayAuth'

interface LoginPageProps {
  readonly notice?: string
  readonly onAuthorized?: () => Promise<void>
  readonly startAuthorization?: (signal: AbortSignal) => Promise<boolean>
}
export const LoginPage = ({notice, onAuthorized, startAuthorization}: LoginPageProps) => {
  const {pathname} = useLocation()
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const pending = useRef<AbortController | undefined>(undefined)
  useEffect(() => () => pending.current?.abort(), [])
  const login = async () => {
    if (pending.current && !pending.current.signal.aborted) return
    const operation = new AbortController()
    pending.current = operation
    setBusy(true)
    setError(undefined)
    try {
      const authorized = startAuthorization
        ? await startAuthorization(operation.signal)
        : await gatewayAuth.login(pathname, {signal: operation.signal})
      if (authorized) await onAuthorized?.()
    } catch (failure) {
      if (!operation.signal.aborted) setError(failure instanceof Error ? failure.message : '统一身份登录失败')
    } finally {
      if (pending.current === operation) pending.current = undefined
      if (!operation.signal.aborted) setBusy(false)
    }
  }
  const standaloneUrl = gatewayAuth.standaloneUrl()

  return (
    <main className="tianquan-jianshen-auth-page">
      <Card title="Tianquan-Jianshen 权限平台" className="tianquan-jianshen-login-card">
        <Typography.Paragraph type="secondary">
          使用统一身份平台登录鉴身。
        </Typography.Paragraph>
        {notice && <Alert type="warning" showIcon message={notice} style={{marginBottom: 16}} />}
        {error && <Alert type="error" showIcon message={error} style={{marginBottom: 16}} />}
        <Button type="primary" block loading={busy} onClick={() => void login()}>
          使用统一身份登录
        </Button>
        {standaloneUrl && <Button type="link" href={standaloneUrl} target="_blank" rel="noopener">打开独立鉴身入口</Button>}
      </Card>
    </main>
  )
}
