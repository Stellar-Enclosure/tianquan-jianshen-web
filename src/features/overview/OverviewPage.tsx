import {useQuery} from '@tanstack/react-query'
import {Alert, Card, Col, Row, Space, Statistic, Tag, Typography} from 'antd'
import {useRbac3Authorization} from '@stellar-enclosure/stellar-enclosure-tianquan-jianshen-react-sdk'
import {Link} from 'react-router-dom'
import {useFeatureApi} from '../shared/FeatureApi'
import {overviewApi} from './overview.api'
import {PageState, useEmbeddedWorkbench} from '@stellar-enclosure/stellar-enclosure-web-shared'
import {permissionContextKey} from '@stellar-enclosure/stellar-enclosure-web-shared/permissions'
import {ResourceGuard, useResourcePermission} from '../../permissions/ResourceGuard'

const destinations = [
  {resource: 'tianquan-jianshen.page.roles', path: '/iam/roles', label: '角色管理'},
  {resource: 'tianquan-jianshen.page.directory-users', path: '/iam/users', label: '用户目录'},
  {resource: 'tianquan-jianshen.page.manifest-versions', path: '/iam/manifests', label: '候选与激活'},
  {resource: 'tianquan-jianshen.page.simulation', path: '/iam/diagnostics/simulation', label: '授权模拟'},
  {resource: 'tianquan-jianshen.page.audit', path: '/iam/diagnostics/audit', label: '授权审计'},
  {resource: 'tianquan-jianshen.page.runtime', path: '/iam/diagnostics/runtime', label: '运行状态'},
] as const

const stateValue = (value: unknown, key: string): string | undefined => {
  const state = typeof value === 'object' && value !== null ? (value as Record<string, unknown>)[key] : undefined
  return typeof state === 'string' && state.length > 0 ? state : undefined
}

export const OverviewPage = () => {
  const {embedded} = useEmbeddedWorkbench()
  const {status, about, binding} = useRbac3Authorization()
  const runtimeAllowed = useResourcePermission('tianquan-jianshen.page.runtime')
  const api = overviewApi(useFeatureApi())
  const context = status === 'READY' && binding ? permissionContextKey(binding) : null
  const query = useQuery({
    queryKey: ['tianquan-jianshen', 'overview', context],
    queryFn: api.runtime,
    enabled: runtimeAllowed && context !== null,
  })
  const signals = [
    {name: '配置客户端', value: stateValue(query.data?.ddcConfigClient, 'state')},
    {name: '定义', value: stateValue(query.data?.definition, 'status')},
    {name: '网关发布', value: stateValue(query.data?.gatewayRelease, 'status')},
    {name: '事务传播', value: stateValue(query.data?.outbox, 'state')},
  ]
  return (
    <Card title={!embedded ? '权限治理概览' : undefined} style={{width: '100%'}}>
      <Space orientation="vertical" size="large" style={{width: '100%'}}>
        <Space wrap size="middle">
          {destinations.map(destination => <ResourceGuard key={destination.resource} resourceKey={destination.resource}>
            <Link to={destination.path}>{destination.label}</Link>
          </ResourceGuard>)}
        </Space>
        <Row gutter={16}>
          <Col span={8}><Statistic title="Auth Version" value={about?.authVersion ?? '未返回'} /></Col>
          <Col span={8}><Statistic title="Policy Version" value={about?.policyVersion ?? '未返回'} /></Col>
        </Row>
        {runtimeAllowed && <Card size="small" title="运行摘要">
          <PageState loading={query.isPending} error={query.error} empty={!query.data}
            emptyDescription="服务端未返回运行摘要" onRetry={() => {void query.refetch()}}>
            <Space wrap>
              {signals.map(signal => <span key={signal.name}>{signal.name} <Tag>{signal.value ?? '未返回'}</Tag></span>)}
            </Space>
            {typeof query.data?.checkedAt === 'string' && <Typography.Paragraph type="secondary" style={{margin: '12px 0 0'}}>
              观测时点 {query.data.checkedAt}
            </Typography.Paragraph>}
          </PageState>
        </Card>}
        {context && !runtimeAllowed && <Alert type="info" title="当前权限范围未包含运行摘要" />}
      </Space>
    </Card>
  )
}
