import {useRbac3Authorization} from '@stellar-enclosure/stellar-enclosure-tianquan-jianshen-react-sdk'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {Alert, Button, Card, Descriptions, Space, Tag} from 'antd'
import {useState} from 'react'
import {useFeatureApi} from '../shared/FeatureApi'
import {permissionContextKey} from '@stellar-enclosure/stellar-enclosure-web-shared/permissions'
import {PageState, useEmbeddedWorkbench} from '@stellar-enclosure/stellar-enclosure-web-shared'
import {ControlPlaneStatusCards} from './ControlPlaneStatusCards'
import {MutationRecoveryPanel} from './MutationRecoveryPanel'
import {runtimeApi} from './runtime.api'

export const RuntimeStatusPage = () => {
  const {embedded} = useEmbeddedWorkbench()
  const {status: authorizationStatus, binding} = useRbac3Authorization()
  const context = authorizationStatus === 'READY' && binding ? permissionContextKey(binding) : null
  const api = runtimeApi(useFeatureApi())
  const queryClient = useQueryClient()
  const [mutationStatus, setMutationStatus] = useState<string>()
  const enabled = context !== null
  const status = useQuery({ queryKey: ['tianquan-jianshen', 'runtime-status', context], queryFn: api.status, enabled })
  const gatewayDdcStatus = useQuery({
    queryKey: ['tianquan-jianshen', 'runtime-yuheng-tianshu-status', context],
    queryFn: api.gatewayDdcStatus,
    enabled,
  })
  const mutationKey = ['tianquan-jianshen', 'runtime-mutations', context, mutationStatus ?? 'all']
  const mutations = useQuery({ queryKey: mutationKey, queryFn: () => api.mutations(mutationStatus), enabled })
  const retry = useMutation({
    mutationFn: async (mutationId: string) => {
      const current = await api.mutations(mutationStatus)
      if (!current.items.some((item) => item.mutationId === mutationId && item.status === 'RECOVERY_REQUIRED')) throw new Error('MUTATION_STATE_CHANGED')
      return api.retryMutation(mutationId)
    },
    onSuccess: async () => queryClient.invalidateQueries({queryKey: ['tianquan-jianshen', 'runtime-mutations', context]}),
  })
  return (
    <div style={{width: '100%'}}>
    <Card title={!embedded ? 'Tianquan-Jianshen 运行状态' : undefined}>
      <Space orientation="vertical" size="large" style={{width: '100%'}}>
        <Card size="small" title="本服务运行与传播"
          extra={<Button loading={status.isFetching} onClick={() => {void status.refetch()}}>刷新运行状态</Button>}>
          <PageState loading={status.isPending} error={status.error} empty={!status.data}
            emptyDescription="服务端未返回运行状态" onRetry={() => {void status.refetch()}}>
            {status.data && <ControlPlaneStatusCards status={status.data} />}
          </PageState>
        </Card>
        {retry.error && <Alert type="error" showIcon title="恢复请求失败" description={retry.error.message} />}
        {retry.data && <Alert type="info" showIcon title={`恢复回执 ${retry.data.mutationId}`}
          description={`服务端返回 ${retry.data.status}。传播以运行态和 Mutation Journal 的后续读数为准。`} />}
        <PageState loading={mutations.isPending} error={mutations.error} empty={!mutations.data} onRetry={() => {void mutations.refetch()}}>
          <MutationRecoveryPanel mutations={mutations.data?.items ?? []} status={mutationStatus} retrying={retry.isPending}
            onStatusChange={setMutationStatus} onRetry={retry.mutate} />
        </PageState>
        <Card
          size="small"
          title="Yuheng / Tianshu 聚合状态"
          extra={<Button loading={gatewayDdcStatus.isFetching} onClick={() => { void gatewayDdcStatus.refetch() }}>刷新聚合状态</Button>}
        >
          <PageState
            loading={gatewayDdcStatus.isPending}
            error={gatewayDdcStatus.error}
            empty={!gatewayDdcStatus.data}
            emptyDescription="尚未返回 Yuheng / Tianshu 聚合状态"
            onRetry={() => { void gatewayDdcStatus.refetch() }}
          >
            {gatewayDdcStatus.data && (
              <Descriptions bordered size="small" column={3}>
                <Descriptions.Item label="Definition">
                  <Tag>{gatewayDdcStatus.data.definition?.status ?? '未返回'}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Provider Lease">
                  <Tag>{gatewayDdcStatus.data.providerLease?.state ?? '未返回'}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Yuheng Release">
                  <Tag>{gatewayDdcStatus.data.gatewayRelease?.status ?? '未返回'}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Checked At" span={3}>{gatewayDdcStatus.data.checkedAt ?? '未返回'}</Descriptions.Item>
              </Descriptions>
            )}
          </PageState>
        </Card>
      </Space>
    </Card>
    </div>
  )
}
