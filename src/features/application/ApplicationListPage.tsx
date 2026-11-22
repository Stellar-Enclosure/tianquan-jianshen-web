import {useWritableFields} from '../../permissions/FieldCatalog'
import {ResourceGuard} from '../../permissions/ResourceGuard'
import {useRbac3Authorization} from '@stellar-enclosure/stellar-enclosure-tianquan-jianshen-react-sdk'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {Alert, Button, Descriptions, Drawer, Form, Input, InputNumber, Popconfirm, Space, Table, Tag, Typography} from 'antd'
import {useState} from 'react'
import {useFeatureApi, useFeatureTenantContext} from '../shared/FeatureApi'
import {PageState, WorkspaceList, useEmbeddedWorkbench} from '@stellar-enclosure/stellar-enclosure-web-shared'
import {permissionContextKey} from '@stellar-enclosure/stellar-enclosure-web-shared/permissions'
import {applicationApi, type TenantApplicationView} from './application.api'

const APPLICATION_PAGE_SIZE = 20

export const ApplicationListPage = () => {
  const {status, binding} = useRbac3Authorization()
  const contextKey = status === 'READY' && binding ? permissionContextKey(binding) : null
  return <ApplicationList key={contextKey} contextKey={contextKey} />
}

const ApplicationList = ({contextKey}: {contextKey: string | null}) => {
  const {embedded} = useEmbeddedWorkbench()
  const {effectiveTenantId} = useFeatureTenantContext()
  const api = applicationApi(useFeatureApi())
  const queryClient = useQueryClient()
  const [filterText, setFilterText] = useState('')
  const [page, setPage] = useState(1)
  const [selectedApplication, setSelectedApplication] = useState<TenantApplicationView | null>(null)
  const queryKey = ['tianquan-jianshen', 'tenant-applications', contextKey, effectiveTenantId ?? 'none']
  const detailKey = ['tianquan-jianshen', 'tenant-application', contextKey, effectiveTenantId ?? 'none', selectedApplication?.applicationId ?? 'none']
  const query = useQuery({
    queryKey,
    queryFn: api.tenantApplications,
    enabled: contextKey !== null,
  })
  const detail = useQuery({
    queryKey: detailKey,
    queryFn: () => api.application(selectedApplication!.applicationId),
    enabled: contextKey !== null && selectedApplication !== null,
  })
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({queryKey}),
      queryClient.invalidateQueries({queryKey: ['tianquan-jianshen', 'tenant-application']}),
    ])
  }
  const admitWritable = useWritableFields('AdmitApplicationAuthorizationScopeCommand')
  const statusWritable = useWritableFields('ChangeApplicationAuthorizationScopeStatusCommand')
  const admit = useMutation({
    mutationFn: (values: {ddcApplicationId: string; displayPriority: number}) => api.admitTenantApplication(values.ddcApplicationId.trim(), values.displayPriority),
    onSuccess: refresh,
  })
  const changeStatus = useMutation({
    mutationFn: (application: TenantApplicationView) => api.changeTenantApplicationStatus(
      application.applicationId,
      application.status === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE',
      application.version,
    ),
    onSuccess: refresh,
  })
  const remove = useMutation({
    mutationFn: (application: TenantApplicationView) => api.removeTenantApplication(application.applicationId, application.version),
    onSuccess: async () => {
      setSelectedApplication(null)
      await refresh()
    },
  })
  const mutationError = admit.error ?? changeStatus.error ?? remove.error
  const available = query.data ?? []
  const filtered = available.filter(row => !filterText || [row.applicationName, row.applicationCode, row.businessCode]
    .some(value => value.toLowerCase().includes(filterText)))
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / APPLICATION_PAGE_SIZE)))

  return (
    <>
      <WorkspaceList
        ariaLabel="租户应用授权"
        filters={<Input.Search aria-label="租户应用搜索" placeholder="应用名称、应用编码或业务编码" allowClear
          onSearch={value => {setFilterText(value.trim().toLowerCase()); setPage(1)}} />}
        toolbar={
          <Space direction="vertical" size={8} style={{width: '100%'}}>
            {!embedded && <Typography.Text strong>租户应用授权</Typography.Text>}
            <Space wrap>
              <Button onClick={() => {void refresh()}} disabled={!contextKey || query.isFetching}>刷新应用</Button>
              {query.data && <Typography.Text type="secondary">当前匹配 {filtered.length} / 已加载 {available.length}</Typography.Text>}
            </Space>
            <ResourceGuard resourceKey="tianquan-jianshen.button.ApplicationListPage.manage1">
              <Form disabled={!admitWritable} layout="inline" onFinish={(values) => admitWritable && admit.mutate(values)}>
                <Form.Item name="ddcApplicationId" rules={[{required: true, whitespace: true}]}>
                  <Input placeholder="Tianshu Application ID" />
                </Form.Item>
                <Form.Item name="displayPriority" initialValue={0}>
                  <InputNumber min={0} precision={0} />
                </Form.Item>
                <Button type="primary" htmlType="submit" loading={admit.isPending}>纳入租户授权</Button>
              </Form>
            </ResourceGuard>
            {mutationError && (
              <Alert
                type="error"
                showIcon
                title={mutationError instanceof Error ? mutationError.message : '租户应用操作失败'}
                action={<Button size="small" onClick={() => {void query.refetch()}}>刷新</Button>}
              />
            )}
          </Space>
        }
        pageState={{
          loading: query.isPending,
          error: query.error,
          empty: filtered.length === 0,
          onRetry: () => void query.refetch(),
        }}
        pagination={{mode: 'page', current: currentPage, pageSize: APPLICATION_PAGE_SIZE, total: filtered.length, onChange: setPage}}
        table={
          <Table<TenantApplicationView>
            rowKey="applicationId"
            dataSource={filtered.slice((currentPage - 1) * APPLICATION_PAGE_SIZE, currentPage * APPLICATION_PAGE_SIZE)}
            pagination={false}
            scroll={{x: 'max-content'}}
            columns={[
              {title: '业务编码', dataIndex: 'businessCode'},
              {title: '应用编码', dataIndex: 'applicationCode'},
              {title: '应用名称', dataIndex: 'applicationName'},
              {title: '状态', dataIndex: 'status', render: (value: string) => <Tag>{value}</Tag>},
              {title: '优先级', dataIndex: 'displayPriority'},
              {title: '版本', dataIndex: 'version'},
              {
                title: '操作',
                render: (_value: unknown, application: TenantApplicationView) => (
                  <Space>
                    <Button size="small" onClick={() => setSelectedApplication(application)}>查看详情</Button>
                    <ResourceGuard resourceKey="tianquan-jianshen.button.ApplicationListPage.manage2">
                      <Button size="small" disabled={!statusWritable} loading={changeStatus.isPending} onClick={() => changeStatus.mutate(application)}>
                        {application.status === 'ACTIVE' ? '暂停' : '启用'}
                      </Button>
                      <Popconfirm title="确认移除租户应用授权？" okText="确认移除" cancelText="取消" onConfirm={() => remove.mutate(application)}>
                        <Button size="small" danger loading={remove.isPending}>移除</Button>
                      </Popconfirm>
                    </ResourceGuard>
                  </Space>
                ),
              },
            ]}
          />
        }
      />
      <Drawer
        title={selectedApplication ? `租户应用：${selectedApplication.applicationName}` : ''}
        open={selectedApplication !== null}
        onClose={() => setSelectedApplication(null)}
        size="large"
      >
        <PageState
          loading={detail.isPending}
          error={detail.error}
          empty={!detail.data}
          emptyDescription="租户应用详情不存在"
          onRetry={() => {void detail.refetch()}}
        >
          {detail.data && (
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="应用 ID">{detail.data.applicationId}</Descriptions.Item>
              <Descriptions.Item label="Tianshu 业务 ID">{detail.data.ddcBusinessId}</Descriptions.Item>
              <Descriptions.Item label="Tianshu 应用 ID">{detail.data.ddcApplicationId}</Descriptions.Item>
              <Descriptions.Item label="业务编码">{detail.data.businessCode}</Descriptions.Item>
              <Descriptions.Item label="应用编码">{detail.data.applicationCode}</Descriptions.Item>
              <Descriptions.Item label="应用名称">{detail.data.applicationName}</Descriptions.Item>
              <Descriptions.Item label="状态">{detail.data.status}</Descriptions.Item>
              <Descriptions.Item label="显示优先级">{detail.data.displayPriority}</Descriptions.Item>
              <Descriptions.Item label="版本">{detail.data.version}</Descriptions.Item>
            </Descriptions>
          )}
        </PageState>
      </Drawer>
    </>
  )
}
