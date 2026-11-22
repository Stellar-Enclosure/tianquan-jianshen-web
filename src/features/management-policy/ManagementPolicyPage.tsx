import {ResourceGuard} from '../../permissions/ResourceGuard'
import {useRbac3Authorization} from '@stellar-enclosure/stellar-enclosure-tianquan-jianshen-react-sdk'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {Alert, Button, Card, Descriptions, Drawer, Input, Popconfirm, Select, Space, Table, Tag, Typography} from 'antd'
import {useState} from 'react'
import {useFeatureApi, useFeatureTenantContext} from '../shared/FeatureApi'
import {PageState, useEmbeddedWorkbench, useWorkbenchLeaveGuard} from '@stellar-enclosure/stellar-enclosure-web-shared'
import {ManagementPolicyEditor} from './ManagementPolicyEditor'
import {managementPolicyApi, type ManagementPolicyView, type SaveManagementPolicyCommand} from './managementPolicy.api'

export const ManagementPolicyPage = () => {
  const {embedded, activeTabKey} = useEmbeddedWorkbench()
  const {status} = useRbac3Authorization()
  const {effectiveTenantId} = useFeatureTenantContext()
  const api = managementPolicyApi(useFeatureApi())
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>()
  const [selected, setSelected] = useState<ManagementPolicyView | null>(null)
  const [editBaseline, setEditBaseline] = useState<ManagementPolicyView | null>(null)
  const queryKey = ['tianquan-jianshen', 'management-policies', effectiveTenantId ?? 'none']
  const query = useQuery({ queryKey, queryFn: api.list, enabled: status === 'READY' })
  const capabilities = useQuery({
    queryKey: ['tianquan-jianshen', 'management-capabilities', effectiveTenantId ?? 'none'],
    queryFn: api.capabilities,
    enabled: status === 'READY',
  })
  const detail = useQuery({
    queryKey: ['tianquan-jianshen', 'management-policy', effectiveTenantId ?? 'none', selected?.policyId ?? 'none'],
    queryFn: () => api.get(selected!.policyId),
    enabled: status === 'READY' && selected !== null && !open,
  })
  const manageableUsers = useQuery({
    queryKey: ['tianquan-jianshen', 'manageable-users', effectiveTenantId ?? 'none'],
    queryFn: () => api.manageableUsers(),
    enabled: status === 'READY' && open,
  })
  const manageableRoles = useQuery({
    queryKey: ['tianquan-jianshen', 'manageable-roles', effectiveTenantId ?? 'none'],
    queryFn: () => api.manageableRoles(),
    enabled: status === 'READY' && open,
  })
  const refreshPolicyViews = () => Promise.all([
    'management-policies', 'management-capabilities', 'manageable-users',
    'manageable-roles', 'management-policy',
  ].map((key) => queryClient.invalidateQueries({
    queryKey: ['tianquan-jianshen', key, effectiveTenantId ?? 'none'],
  })))
  const loadEdit = useMutation({mutationFn: (policyId: string) => api.get(policyId)})
  const loadEditBaseline = (policyId: string) => loadEdit.mutate(policyId, {
    onSuccess: response => {
      if (response.policyId === policyId && isPolicyVersion(response.version)) setEditBaseline(response)
    },
  })
  const save = useMutation({
    mutationFn: (command: SaveManagementPolicyCommand) => selected
      ? api.update(requirePolicyVersion(editBaseline), command, crypto.randomUUID())
      : api.create(command, crypto.randomUUID()),
    onSuccess: async () => { await refreshPolicyViews(); close() },
  })
  const disable = useMutation({
    mutationFn: (policy: ManagementPolicyView) => api.disable(requirePolicyVersion(policy), crypto.randomUUID()),
    onSuccess: refreshPolicyViews,
  })
  const close = () => {setOpen(false); setSelected(null); setEditBaseline(null); loadEdit.reset()}
  const edit = (policy: ManagementPolicyView | null) => {
    setSelected(policy)
    setOpen(true)
    setEditBaseline(null)
    if (policy) loadEditBaseline(policy.policyId)
  }
  const mutationError = save.error ?? disable.error
  const policies = query.data ?? []
  const searchTerm = search.trim().toLowerCase()
  const filtered = policies.filter(row => (!filterStatus || row.status === filterStatus)
    && (!searchTerm || [row.policyCode, row.name].some(value => value.toLowerCase().includes(searchTerm))))
  useWorkbenchLeaveGuard(
    activeTabKey ?? 'jianshen:management-policies',
    {dirty: open, pendingMutation: save.isPending || disable.isPending},
  )
  return (
    <div style={{width: '100%'}}>
    <Card
      title={!embedded ? '委托管理策略' : undefined}
      extra={<ResourceGuard resourceKey="tianquan-jianshen.button.ManagementPolicyPage.manage1"><Button type="primary" onClick={() => edit(null)}>新增完整策略</Button></ResourceGuard>}
    >
      <Typography.Paragraph type="secondary">
        每次授权必须由同一条策略同时满足 Subject、Scope、激活根角色与 Operation；平台不会拼接多条策略的局部授权。
      </Typography.Paragraph>
      {capabilities.error && <Alert type="warning" showIcon title="当前操作者委托能力读取失败" style={{marginBottom: 16}} />}
      {capabilities.data && (
        <Card size="small" title="当前操作者能力" style={{marginBottom: 16}}>
          <Space wrap>
            <Tag color="blue">可用策略 {capabilities.data.policyIds?.length ?? 0}</Tag>
            <Tag color="blue">可用操作 {capabilities.data.operations?.length ?? 0}</Tag>
            <Tag color="blue">激活根角色 {capabilities.data.activationRootRoleIds?.length ?? 0}</Tag>
            {(capabilities.data.operations ?? []).map((operation) => <Tag key={operation}>{operation}</Tag>)}
          </Space>
        </Card>
      )}
      {mutationError && (
        <Alert
          type="error"
          showIcon
          title={mutationError instanceof Error ? mutationError.message : '委托策略操作失败'}
          style={{marginBottom: 16}}
        />
      )}
      <Space wrap style={{marginBottom: 16}}>
        <Input.Search allowClear value={search} onChange={event => setSearch(event.target.value)} aria-label="搜索策略" placeholder="按策略编码或名称筛选" />
        <Select allowClear value={filterStatus} onChange={setFilterStatus} aria-label="策略状态" placeholder="全部状态"
          style={{minWidth: 140}} options={[...new Set(policies.map(row => row.status))].map(status => ({value: status, label: status}))} />
        {query.isSuccess && <Typography.Text type="secondary">匹配 {filtered.length} / {policies.length} 条策略</Typography.Text>}
      </Space>
      <PageState loading={query.isPending} error={query.error} empty={filtered.length === 0} emptyDescription="没有匹配的委托策略" onRetry={() => {void query.refetch()}}>
        <Table<ManagementPolicyView>
          rowKey="policyId"
          dataSource={filtered}
          pagination={{pageSize: 20}}
          scroll={{x: 'max-content'}}
          columns={[
            { title: '编码', dataIndex: 'policyCode' },
            { title: '名称', dataIndex: 'name' },
            { title: 'Subject', render: (_value, row) => row.subjects.map((item) => `${item.type}:${item.id}`).join(', ') },
            { title: 'Scope', render: (_value, row) => row.scopes.map((item) => `${item.type}:${item.referenceId ?? ''}`).join(', ') },
            { title: '激活根角色', render: (_value, row) => row.activationRootRoleIds.join(', ') },
            { title: 'Operation', render: (_value, row) => row.operations.join(', ') },
            { title: '状态', dataIndex: 'status', render: (value: string) => <Tag>{value}</Tag> },
            {
              title: '操作', render: (_value, row) => (
                <Space>
                  <Button size="small" onClick={() => setSelected(row)}>查看详情</Button>
                  <ResourceGuard resourceKey="tianquan-jianshen.button.ManagementPolicyPage.manage2">
                    <Button size="small" onClick={() => edit(row)}>编辑</Button>
                    {row.status === 'ACTIVE' && <Popconfirm disabled={!isPolicyVersion(row.version) || disable.isPending} title="确认禁用并保留历史？" onConfirm={() => disable.mutate(row)}><Button disabled={!isPolicyVersion(row.version) || disable.isPending} danger size="small">禁用</Button></Popconfirm>}
                  </ResourceGuard>
                </Space>
              ),
            },
          ]}
        />
      </PageState>
      {open && (
        <Alert
          type={manageableUsers.isError || manageableRoles.isError ? "warning" : "info"}
          showIcon
          title="当前操作者的管理对象"
          description={<Space wrap>
            <span>{manageableUsers.isError ? '可管理用户读取失败' : manageableUsers.data ? `可管理用户 ${manageableUsers.data.length} 个` : '正在读取可管理用户'}</span>
            <span>{manageableRoles.isError ? '可管理角色读取失败' : manageableRoles.data ? `可管理角色 ${manageableRoles.data.length} 个` : '正在读取可管理角色'}</span>
          </Space>}
          style={{marginTop: 16}}
        />
      )}
      {open && selected && !editBaseline && <Alert type={loadEdit.isPending ? 'info' : 'error'}
        title={loadEdit.isPending ? '正在读取委托策略详情' : '委托策略详情或版本无法读取'}
        action={!loadEdit.isPending && <Button size="small" onClick={() => loadEditBaseline(selected.policyId)}>重试</Button>}
        closable onClose={close} />}
      <ManagementPolicyEditor open={open && (!selected || Boolean(editBaseline))} policy={editBaseline} saving={save.isPending} onCancel={close} onSave={save.mutate} />
      <Drawer
        title={selected ? `委托策略：${selected.policyCode}` : ''}
        open={selected !== null && !open}
        onClose={() => setSelected(null)}
        size="large"
      >
        <PageState
          loading={detail.isPending}
          error={detail.error}
          empty={!detail.data}
          emptyDescription="委托策略详情不存在"
          onRetry={() => {void detail.refetch()}}
        >
          {detail.data && (
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="策略 ID">{detail.data.policyId}</Descriptions.Item>
              <Descriptions.Item label="策略编码">{detail.data.policyCode}</Descriptions.Item>
              <Descriptions.Item label="名称">{detail.data.name}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.data.status}</Descriptions.Item>
              <Descriptions.Item label="Subject">{detail.data.subjects.map((item) => `${item.type}:${item.id}`).join(', ')}</Descriptions.Item>
              <Descriptions.Item label="Scope">{detail.data.scopes.map((item) => `${item.type}:${item.referenceId ?? ''}`).join(', ')}</Descriptions.Item>
              <Descriptions.Item label="激活根角色">{detail.data.activationRootRoleIds.join(', ')}</Descriptions.Item>
              <Descriptions.Item label="Operation">{detail.data.operations.join(', ')}</Descriptions.Item>
              <Descriptions.Item label="生效时点">{detail.data.validFrom}</Descriptions.Item>
              <Descriptions.Item label="截止时点">{detail.data.validTo ?? '无截止'}</Descriptions.Item>
              <Descriptions.Item label="版本">{detail.data.version}</Descriptions.Item>
            </Descriptions>
          )}
        </PageState>
      </Drawer>
    </Card>
    </div>
  )
}


const isPolicyVersion = (version: number): boolean => Number.isSafeInteger(version) && version >= 0

const requirePolicyVersion = (policy: ManagementPolicyView | null): ManagementPolicyView => {
  if (!policy || !isPolicyVersion(policy.version)) throw new Error('请重新读取委托策略版本')
  return policy
}
