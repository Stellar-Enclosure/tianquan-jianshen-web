import {useRbac3Authorization} from '@stellar-enclosure/stellar-enclosure-tianquan-jianshen-react-sdk'
import {useQuery} from '@tanstack/react-query'
import {Alert, Button, Col, Form, Input, Row, Select, Table, Tag, Typography} from 'antd'
import {useState} from 'react'
import {useFeatureApi} from '../shared/FeatureApi'
import {permissionContextKey} from '@stellar-enclosure/stellar-enclosure-web-shared/permissions'
import {canonicalUtcInstant, utcInstantNanos} from '../shared/utcInstants'
import {WorkspaceList, useEmbeddedWorkbench} from '@stellar-enclosure/stellar-enclosure-web-shared'
import {AuditDetailDrawer} from './AuditDetailDrawer'
import {auditApi, type AuditFilter, type AuditView} from './audit.api'

const MAX_WINDOW_NANOS = 31n * 24n * 60n * 60n * 1_000_000_000n
const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
const auditFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit',
})

const makeInitialFilter = (): AuditFilter => {
  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  return { from: yesterday.toISOString(), to: now.toISOString(), limit: 50 }
}

export const AuditLogPage = () => {
  const {embedded} = useEmbeddedWorkbench()
  const {status, binding} = useRbac3Authorization()
  const context = status === 'READY' && binding ? permissionContextKey(binding) : null
  const api = auditApi(useFeatureApi())
  const [form] = Form.useForm<AuditFilter>()
  const [search, setSearch] = useState<AuditFilter>(makeInitialFilter)
  const [cursors, setCursors] = useState<readonly string[]>([])
  const [filterError, setFilterError] = useState<string>()
  const filter = {...search, cursor: cursors.at(-1)}
  const submitFilter = (values: AuditFilter) => {
    const from = canonicalUtcInstant(values.from)
    const to = canonicalUtcInstant(values.to)
    if (from === undefined || to === undefined) {
      setFilterError('开始和结束时点须含 UTC Z 或时区偏移')
      return
    }
    const duration = utcInstantNanos(to) - utcInstantNanos(from)
    if (duration < 0n || duration > MAX_WINDOW_NANOS) {
      setFilterError(duration < 0n ? '开始时点必须早于或等于结束时点' : '审计查询时间跨度最多 31 天')
      return
    }
    setFilterError(undefined)
    setSelected(null)
    setCursors([])
    setSearch({...values, from, to, limit: 50})
  }
  const [selected, setSelected] = useState<AuditView | null>(null)
  const query = useQuery({
    queryKey: ['tianquan-jianshen', 'audit', context, filter],
    queryFn: () => api.list(filter),
    enabled: context !== null,
  })
  return (
    <>
      <WorkspaceList
        ariaLabel="授权审计"
        filters={
          <Form<AuditFilter> form={form} layout="vertical" initialValues={search} onFinish={submitFilter}>
            {filterError && <Alert type="error" showIcon title={filterError} style={{marginBottom: 12}} />}
            <Row gutter={12}>
              <Col span={6}><Form.Item name="from" label="From" rules={[{ required: true }]}><Input placeholder="UTC Z 或偏移" /></Form.Item></Col>
              <Col span={6}><Form.Item name="to" label="To" rules={[{ required: true }]}><Input placeholder="UTC Z 或偏移" /></Form.Item></Col>
              <Col span={4}><Form.Item name="actorId" label="Actor ID"><Input /></Form.Item></Col>
              <Col span={4}><Form.Item name="outcome" label="Outcome"><Select allowClear options={['SUCCESS', 'DENIED', 'FAILED', 'PENDING_PROPAGATION'].map((value) => ({ value }))} /></Form.Item></Col>
              <Col span={4}><Form.Item name="reasonCode" label="Reason Code"><Input /></Form.Item></Col>
            </Row>
            <Row gutter={12}>
              <Col span={6}><Form.Item name="eventType" label="Event Type"><Input /></Form.Item></Col>
              <Col span={6}><Form.Item name="traceId" label="Trace ID"><Input /></Form.Item></Col>
              <Col span={6}><Form.Item name="requestId" label="决策编号"><Input allowClear /></Form.Item></Col>
              <Col span={6}><Form.Item label="查询"><Button type="primary" htmlType="submit">应用服务端过滤</Button></Form.Item></Col>
            </Row>
          </Form>
        }
        toolbar={
          <div style={{width: '100%'}}>
            {!embedded && <Typography.Text strong style={{display: 'block', marginBottom: 4}}>授权审计</Typography.Text>}
            <Typography.Text type="secondary">
              按决策编号查询已写入的授权诊断。时间范围包含起止时点。显示时区 {zone}，原始时点可在详情查看。
            </Typography.Text>
          </div>
        }
        pageState={{
          loading: query.isPending,
          error: query.error,
          empty: query.data?.items.length === 0,
          onRetry: () => {void query.refetch()},
          emptyDescription: filter.requestId ? '未找到该编号，请确认租户、时间范围和诊断是否已写入。' : '暂无审计记录',
        }}
        table={
          <Table<AuditView>
            rowKey="id"
            dataSource={query.data?.items ?? []}
            pagination={false}
            columns={[
              {title: `时间（${zone}）`, dataIndex: 'createdAt', render: (value: string) => {
                const timestamp = Date.parse(value)
                return Number.isFinite(timestamp) ? <time dateTime={value} title={value}>{auditFormatter.format(timestamp)}</time> : '未返回'
              }},
              { title: '事件', dataIndex: 'eventType' },
              { title: 'Outcome', dataIndex: 'outcome', render: (value: string) => <Tag>{value}</Tag> },
              { title: 'Actor', render: (_value, row) => `${row.actorType}:${row.actorId}` },
              { title: 'Target', render: (_value, row) => `${row.targetType}:${row.targetId}` },
              { title: 'Reason', dataIndex: 'reasonCode' },
              { title: 'Trace', dataIndex: 'traceId' },
              { title: '操作', render: (_value, row) => <Button size="small" onClick={() => setSelected(row)}>查看详情</Button> },
            ]}
          />
        }
        pagination={
          query.data?.nextCursor || filter.cursor
            ? {
                mode: 'cursor',
                hasMore: Boolean(query.data?.nextCursor),
                loadingMore: query.isFetching,
                hasPrevious: cursors.length > 0,
                onFirst: cursors.length > 0 ? () => setCursors([]) : undefined,
                onPrevious: cursors.length > 0 ? () => setCursors(current => current.slice(0, -1)) : undefined,
                onNext: () => {
                  const next = query.data?.nextCursor
                  if (next && !cursors.includes(next)) setCursors(current => [...current, next])
                },
              }
            : undefined
        }
      />
      <AuditDetailDrawer audit={selected} onClose={() => setSelected(null)} />
    </>
  )
}
