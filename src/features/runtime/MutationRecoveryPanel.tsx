import {ResourceGuard} from '../../permissions/ResourceGuard'
import { Button, Card, Popconfirm, Select, Table, Tag, Typography } from 'antd'
import type { MutationView } from './runtime.api'

const statusLabels = {
  PREPARING: '准备中',
  COMMITTED: '已提交，待传播',
  PROJECTED: '已投影，待确认完成',
  COMPLETED: '已完成',
  ABORTED: '已终止',
  RECOVERY_REQUIRED: '待恢复',
} as const

export interface MutationRecoveryPanelProps {
  readonly mutations: readonly MutationView[]
  readonly status?: string
  readonly retrying: boolean
  readonly onStatusChange: (status?: string) => void
  readonly onRetry: (mutationId: string) => void
}

export const MutationRecoveryPanel = ({ mutations, status, retrying, onStatusChange, onRetry }: MutationRecoveryPanelProps) => (
  <Card
    title="Mutation Journal 与受控恢复"
    extra={<Select allowClear placeholder="状态过滤" value={status} onChange={onStatusChange} options={Object.entries(statusLabels).map(([value, label]) => ({value, label: `${value} · ${label}`}))} />}
  >
    <Typography.Paragraph type="secondary">手动恢复只接受服务端标为 RECOVERY_REQUIRED 的 Mutation ID。</Typography.Paragraph>
    <Table<MutationView>
      rowKey="mutationId"
      dataSource={mutations}
      pagination={false}
      columns={[
        { title: 'Mutation ID', dataIndex: 'mutationId' },
        { title: 'Scope', render: (_value, row) => `${row.scopeType}:${row.scopeId}` },
        { title: '状态', dataIndex: 'status', render: (value: string) => <Tag>{value}{Object.hasOwn(statusLabels, value) ? ` · ${statusLabels[value as keyof typeof statusLabels]}` : ''}</Tag> },
        { title: 'Attempt', dataIndex: 'attempt' },
        { title: 'Last Error', dataIndex: 'lastErrorCode', render: (value: string | null) => value ?? '-' },
        { title: 'Updated At', dataIndex: 'updatedAt' },
        {
          title: '操作', render: (_value, row) => row.status === 'RECOVERY_REQUIRED' && (
            <ResourceGuard resourceKey="tianquan-jianshen.button.MutationRecoveryPanel.operate1">
              <Popconfirm title={`再次读取后重试 Mutation ${row.mutationId}？`} onConfirm={() => onRetry(row.mutationId)}>
                <Button size="small" loading={retrying} aria-label={`重试 ${row.mutationId}`}>重试</Button>
              </Popconfirm>
            </ResourceGuard>
          ),
        },
      ]}
    />
  </Card>
)
