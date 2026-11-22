import {useRbac3Authorization} from '@stellar-enclosure/stellar-enclosure-tianquan-jianshen-react-sdk'
import {Button, Result, Space, Spin} from 'antd'
import {type PropsWithChildren, useContext, useState} from 'react'
import {RoleActivationAttemptContext, RoleActivationPage, type ActivationAttempt} from '../role-activation/RoleActivationPage'
import {LoginPage} from './LoginPage'
import {gatewayAuth} from './gatewayAuth'

export const SessionExit = () => (
  <Space wrap>
    <Button onClick={() => gatewayAuth.logout()}>退出鉴身</Button>
    <Button onClick={() => gatewayAuth.logout(true)}>退出统一身份</Button>
  </Space>
)

export const AuthenticationShell = ({children}: PropsWithChildren) => {
  const authorization = useRbac3Authorization()
  return <ActivationBoundary key={JSON.stringify([authorization.inputBindingKey, authorization.requestEpoch])}>
    {children}
  </ActivationBoundary>
}

const ActivationBoundary = ({children}: PropsWithChildren) => {
  const [attempt, setAttempt] = useState<ActivationAttempt | null>(null)
  return <RoleActivationAttemptContext.Provider value={{attempt, setAttempt}}>
    <AuthorizedContent>{children}</AuthorizedContent>
  </RoleActivationAttemptContext.Provider>
}

const AuthorizedContent = ({children}: PropsWithChildren) => {
  const authorization = useRbac3Authorization()
  const attempt = useContext(RoleActivationAttemptContext)?.attempt
  if (['UNINITIALIZED', 'LOADING_ABOUT'].includes(authorization.status)) {
    return <main className="tianquan-jianshen-centered">
      <Spin size="large" description="正在加载授权上下文"/>
    </main>
  }
  if (authorization.status === 'AUTHENTICATION_REQUIRED') return <LoginPage onAuthorized={authorization.retry} />
  if (['ACTIVATION_REQUIRED', 'REPLACING_ACTIVE_ROLES'].includes(authorization.status)
    || (attempt && ['ERROR_RETRYABLE', 'FORBIDDEN_NO_ROUTE'].includes(authorization.status))) {
    return <main className="tianquan-jianshen-activation-page">
      <RoleActivationPage/>
      <Space style={{marginTop: 16}}><SessionExit /></Space>
    </main>
  }
  if (authorization.status === 'FORBIDDEN_NO_ROUTE') {
    return <Result status="403" title="没有可访问页面" subTitle={authorization.errorCode} extra={<SessionExit />} />
  }
  if (authorization.status === 'ERROR_RETRYABLE') {
    return <Result status="warning" title="授权状态暂不可用" subTitle={authorization.errorCode}
      extra={<Button onClick={() => void authorization.retry()}>重试</Button>} />
  }
  if (authorization.status === 'ERROR_FATAL') {
    return <Result status="error" title="授权状态无法恢复" subTitle={authorization.errorCode} extra={<SessionExit />} />
  }
  return <>{children}</>
}
