import { Alert, Descriptions, Drawer, Space, Tag, Typography } from 'antd'
import type { AuditView } from './audit.api'

const sensitiveKey = /password|secret|token|hash|private.?key|credential/i

export const redactAuditSnapshot = (value: unknown, key = ''): unknown => {
  if (sensitiveKey.test(key)) return '[REDACTED]'
  if (Array.isArray(value)) return value.map((item) => redactAuditSnapshot(item))
  if (typeof value === 'object' && value !== null) {
    return Object.fromEntries(Object.entries(value).map(([childKey, child]) => [childKey, redactAuditSnapshot(child, childKey)]))
  }
  return value
}

export interface AuditDetailDrawerProps {
  readonly audit: AuditView | null
  readonly onClose: () => void
}

const Snapshot = ({ title, value }: { readonly title: string; readonly value: Readonly<Record<string, unknown>> }) => (
  <div>
    <Typography.Title level={5}>{title}</Typography.Title>
    <Descriptions bordered size="small" column={1}>
      {Object.entries(redactAuditSnapshot(value) as Record<string, unknown>).map(([key, item]) => (
        <Descriptions.Item key={key} label={key}>{typeof item === 'object' ? JSON.stringify(item) : String(item)}</Descriptions.Item>
      ))}
    </Descriptions>
  </div>
)

const display = (value: unknown): string => {
  if (value === undefined || value === null) return '不可用'
  if (typeof value === 'object') return JSON.stringify(value)
  return String(value)
}

const DecisionDiagnostic = ({ audit }: { readonly audit: AuditView }) => {
  const details = redactAuditSnapshot(audit.afterSnapshot) as Record<string, unknown>
  const facts = Array.isArray(details.permissionFacts) ? details.permissionFacts : []
  const roles = typeof details.rolesByPermission === 'object' && details.rolesByPermission !== null
    ? details.rolesByPermission as Record<string, unknown> : {}
  const sourceStatus = display(details.permissionSourceStatus)
  const kind = typeof details.decisionKind === 'string' ? details.decisionKind : 'API'
  const decisionDetails = typeof details.decisionDetails === 'object' && details.decisionDetails !== null
    ? details.decisionDetails as Record<string, unknown> : {}
  return (
    <div>
      <Typography.Title level={5}>拒绝诊断</Typography.Title>
      {kind === 'DATA_SCOPE_POLICY' && <Alert type="info" showIcon title="数据范围策略判定"
        description="这是范围策略返回的拒绝，不代表已经执行逐对象数据范围检查或最终拒绝了业务请求。" />}
      {sourceStatus !== 'VERIFIED' && sourceStatus !== 'NOT_EVALUATED' && <Alert type="warning" showIcon title="权限来源未核实"
        description={`来源状态：${sourceStatus}。授权版本可能已变化，不能用当前角色授予推断历史来源。`} />}
      <Descriptions bordered size="small" column={1}>
        <Descriptions.Item label="诊断类型">{kind}</Descriptions.Item>
        <Descriptions.Item label="资源 Key">{display(details.resourceKey)}</Descriptions.Item>
        {kind !== 'DEPLOYMENT_BINDING' && kind !== 'RUNTIME_BINDING' && kind !== 'FIELD_INPUT' && <Descriptions.Item label={kind === 'FIELD_WRITE' ? '字段写入规则' : '权限规则'}>{display(details.requirement)}</Descriptions.Item>}
        {(kind === 'API' || kind === 'FIELD_WRITE') && <Descriptions.Item label="缺少的资源 OAuth scope">{display(details.missingResourceScopes)}</Descriptions.Item>}
        {kind === 'FIELD_WRITE' && <Descriptions.Item label="实际输入绑定可写">{display(decisionDetails.inputBindingWritable)}</Descriptions.Item>}
        {kind === 'FIELD_INPUT' && <Descriptions.Item label="字段绑定阶段">未能确认具体声明字段；记录未包含提交的字段名称或值。</Descriptions.Item>}
        {kind === 'DATA_SCOPE_POLICY' && <Descriptions.Item label="数据范围策略">{display(decisionDetails)}</Descriptions.Item>}
        {kind === 'DATA_SCOPE_POLICY' && <Descriptions.Item label="快照时间匹配的数据规则（无对象引用）">
          {sourceStatus === 'VERIFIED' ? display(details.dataScopeRules) : '未核实'}
        </Descriptions.Item>}
        {(kind === 'DEPLOYMENT_BINDING' || kind === 'RUNTIME_BINDING') && <>
          <Descriptions.Item label="未通过的绑定检查">{display(decisionDetails.failedChecks)}</Descriptions.Item>
          <Descriptions.Item label={kind === 'RUNTIME_BINDING' ? 'Runtime 配置的生产者与制品' : '执行中的制品'}>
            {display(kind === 'RUNTIME_BINDING' ? decisionDetails.configuredProducer : decisionDetails.executingProducer)}
          </Descriptions.Item>
        </>}
        <Descriptions.Item label={kind === 'RUNTIME_BINDING' ? '诊断时间（未生成快照）' : '快照时间'}>{display(details.snapshotAt)}</Descriptions.Item>
        <Descriptions.Item label="目录 / 账号 / 策略版本">{[details.catalogVersion, details.authVersion, details.policyVersion].map(display).join(' / ')}</Descriptions.Item>
        <Descriptions.Item label="Runtime 选定的生产者与制品">{display(details.producer)}</Descriptions.Item>
        {sourceStatus !== 'NOT_EVALUATED' && <Descriptions.Item label="根角色 / 生效角色">{display(details.rootRoleIds)} / {display(details.effectiveRoleIds)}</Descriptions.Item>}
        <Descriptions.Item label="来源状态">{sourceStatus}</Descriptions.Item>
        {facts.map((value, index) => {
          if (typeof value !== 'object' || value === null) return null
          const fact = value as Record<string, unknown>
          const code = display(fact.code)
          return <Descriptions.Item key={`${code}-${index}`} label={`权限 ${code}`}>
            已授予：{display(fact.granted)}；
            {kind !== 'DATA_SCOPE_POLICY' && <>进入 scope 限定后的权限集合：{display(fact.scopeQualified)}；scope 映射存在：{display(fact.scopeMappingConfigured)}；
              缺少 scope：{display(fact.missingScopes)}；</>}
            直接授予角色：{sourceStatus === 'VERIFIED' ? display(roles[code] ?? []) : '未核实'}
          </Descriptions.Item>
        })}
      </Descriptions>
    </div>
  )
}

export const AuditDetailDrawer = ({ audit, onClose }: AuditDetailDrawerProps) => (
  <Drawer title="审计详情" open={audit !== null} width={720} onClose={onClose} destroyOnHidden>
    {audit && (
      <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
        <Descriptions bordered column={2}>
          <Descriptions.Item label="Event"><Tag>{audit.eventType}</Tag></Descriptions.Item>
          <Descriptions.Item label="Outcome"><Tag>{audit.outcome}</Tag></Descriptions.Item>
          <Descriptions.Item label="Reason">{audit.reasonCode}</Descriptions.Item>
          <Descriptions.Item label="Created At">{audit.createdAt}</Descriptions.Item>
          <Descriptions.Item label="Request ID">{audit.requestId}</Descriptions.Item>
          <Descriptions.Item label="Trace ID">{audit.traceId}</Descriptions.Item>
          <Descriptions.Item label="Payload Checksum" span={2}>{audit.payloadChecksum}</Descriptions.Item>
        </Descriptions>
        {audit.eventType === 'AUTHORIZATION_DENIED_DIAGNOSTIC' && <DecisionDiagnostic audit={audit} />}
        <Snapshot title="Before（结构化且脱敏）" value={audit.beforeSnapshot} />
        <Snapshot title="After（结构化且脱敏）" value={audit.afterSnapshot} />
      </Space>
    )}
  </Drawer>
)
