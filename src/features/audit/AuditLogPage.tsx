import {useRbac3Authorization} from '@stellar-enclosure/stellar-enclosure-tianquan-jianshen-react-sdk'
import {useQuery} from '@tanstack/react-query'
import {Button, Col, Form, Input, Row, Select, Table, Tag, Typography} from 'antd'
import {useState} from 'react'
import {useFeatureApi, useFeatureTenantContext} from '../shared/FeatureApi'
import {WorkspaceList, useEmbeddedWorkbench} from '@stellar-enclosure/stellar-enclosure-web-shared'
import {AuditDetailDrawer} from './AuditDetailDrawer'
import {auditApi, type AuditFilter, type AuditView} from './audit.api'

const makeInitialFilter = (): AuditFilter => {
  const now = new Date()
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
  return { from: yesterday.toISOString(), to: now.toISOString(), limit: 50 }
}

export const AuditLogPage = () => {
  const {embedded} = useEmbeddedWorkbench()
  const {status} = useRbac3Authorization()
  const { effectiveTenantId } = useFeatureTenantContext()
  const api = auditApi(useFeatureApi())
  const [filter, setFilter] = useState<AuditFilter>(makeInitialFilter)
  const [selected, setSelected] = useState<AuditView | null>(null)
  const query = useQuery({
    queryKey: ['tianquan-jianshen', 'audit', effectiveTenantId ?? 'none', filter],
    queryFn: () => api.list(filter),
    enabled: status === 'READY',
  })
  return (
    <>
      <WorkspaceList
        ariaLabel="授权审计"
        filters={
          <Form<AuditFilter> layout="vertical" initialValues={makeInitialFilter()} onFinish={(values) => setFilter({ ...values, limit: 50 })}>
            <Row gutter={12}>
              <Col span={6}><Form.Item name="from" label="From" rules={[{ required: true }]}><Input /></Form.Item></Col>
              <Col span={6}><Form.Item name="to" label="To" rules={[{ required: true }]}><Input /></Form.Item></Col>
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
              可按决策编号查询建申本机可核实的 USER API、字段写入、数据范围策略和制品绑定诊断。请确认时间范围；其他拒绝或诊断写入失败时可能没有记录。
            </Typography.Text>
          </div>
        }
        pageState={{
          loading: query.isPending,
          error: query.error,
          empty: query.data?.items.length === 0,
          emptyDescription: filter.requestId ? '未找到该编号，请确认租户、时间范围和诊断是否已写入。' : '暂无审计记录',
        }}
        table={
          <Table<AuditView>
            rowKey="id"
            dataSource={query.data?.items ?? []}
            pagination={false}
            columns={[
              { title: '时间', dataIndex: 'createdAt' },
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
                onFirst: filter.cursor ? () => setFilter((current) => ({ ...current, cursor: undefined })) : undefined,
                onNext: () => {
                  if (query.data?.nextCursor) {
                    setFilter((current) => ({ ...current, cursor: query.data?.nextCursor ?? undefined }))
                  }
                },
              }
            : undefined
        }
      />
      <AuditDetailDrawer audit={selected} onClose={() => setSelected(null)} />
    </>
  )
}
