import {useWritableFieldKeys} from '../../permissions/FieldCatalog'
import {inputFields} from '../../permissions/fieldReferences'
import {useQuery, useMutation, useQueryClient} from '@tanstack/react-query'
import {PageState} from '@stellar-enclosure/stellar-enclosure-web-shared'
import {catalogScopeKey} from '@stellar-enclosure/stellar-enclosure-web-shared/permissions'
import {Alert, Button, Card, Descriptions, Drawer, Modal, Select, Space, Table, Tag, Typography} from 'antd'
import {useState} from 'react'
import {ResourceGuard} from '../../permissions/ResourceGuard'
import {useFeatureApi} from '../shared/FeatureApi'
import {CatalogScopePicker, useCatalogScope} from './CatalogScopePicker'
import {registrationApi, type CatalogScope, type Definition, type DefinitionKind, type GovernanceCommand} from './registration.api'
import {ManifestDiffView} from './ManifestDiffPage'
import {useCurrentAuthorizationRefresh} from '../auth/CurrentAuthorizationProvider'

const CatalogForScope = ({target, kind, type}: {target: CatalogScope; kind: DefinitionKind; type?: string}) => {
  const api = registrationApi(useFeatureApi())
  const refreshAuthorization = useCurrentAuthorizationRefresh()
  const queryClient = useQueryClient()
  const key = ['permission-catalogs', catalogScopeKey(target)]
  const [afterId, setAfterId] = useState('0')
  const [selectedId, setSelectedId] = useState<string>()
  const [review, setReview] = useState<{action: GovernanceCommand['action']; identityId: string; version: string; key: string; impact: string} | null>(null)
  const action = review?.action
  const fieldsWritable = useWritableFieldKeys(inputFields.CatalogGovernanceCommandDTO.filter(key => action === 'TRANSFER' || !key.endsWith('.targetProducerId')))
  const [destination, setDestination] = useState<string>()
  const definitions = useQuery({queryKey: [...key, 'definitions', kind, afterId], queryFn: () => api.definitions(target, kind, afterId)})
  const detail = useQuery({queryKey: [...key, 'definition', kind, selectedId], queryFn: () => api.definition(target, kind, selectedId!), enabled: Boolean(selectedId)})
  const producers = useQuery({queryKey: [...key, 'producers'], queryFn: () => api.producers(target), enabled: Boolean(selectedId)})
  const active = detail.data?.activeProducerVersion
  const diff = useQuery({queryKey: [...key, 'diff', detail.data?.identity.producerId, active],
    queryFn: () => api.diff(target, detail.data!.identity.producerId, active!), enabled: Boolean(selectedId && active)})
  const impact = detail.data ? JSON.stringify({identity: detail.data.identity, activeProducerVersion: active, diff: diff.data ?? null}) : ''
  const canReview = Boolean(detail.data && !detail.isFetching && (!active || (diff.data && !diff.isFetching && !diff.error)))
  const reviewCurrent = review !== null && review.impact === impact
  const openReview = (action: GovernanceCommand['action']) => {
    if (detail.data && canReview) setReview({action, identityId: detail.data.identity.id, version: detail.data.identity.version, key: detail.data.identity.key, impact})
  }
  const governance = useMutation({mutationFn: () => {
    if (!fieldsWritable || !review || !action || !detail.data || detail.isFetching || diff.isFetching || !reviewCurrent) throw new Error('请重新读取当前定义后再提交')
    return api.govern({target, kind, identityId: review.identityId, action, expectedVersion: review.version,
      ...(action === 'TRANSFER' ? {targetProducerId: destination} : {})})
  }, onSuccess: async () => {
    setReview(null)
    await queryClient.invalidateQueries({queryKey: key})
    await refreshAuthorization()
  }, onError: async error => {
    if ((error as {status?: number}).status === 409) {
      setReview(null)
      await queryClient.invalidateQueries({queryKey: key})
    }
  }})
  const rows = (definitions.data?.definitions ?? []).filter(value => !type || value.type === type)
  const currentProducerKind = producers.data?.producers.find(value => value.producerId === detail.data?.identity.producerId)?.kind
  return <>
    <Alert type="info" showIcon title="定义与策略由代码生成，只读展示" description="注册不会自动授予角色；停用、退场和所有权转移使用独立的版本校验命令。" style={{marginBottom: 16}} />
    {governance.error && <Alert type="error" showIcon title={governance.error instanceof Error ? governance.error.message : '治理操作失败'}
      description={(governance.error as {status?: number}).status === 409 ? '版本已变化，已重新加载。请重新检查影响并提交。' : undefined} />}
    <PageState loading={definitions.isPending} error={definitions.error} empty={rows.length === 0} emptyDescription="当前页没有匹配定义"
      onRetry={() => void definitions.refetch()}>
      <Table<Definition> rowKey="id" dataSource={rows} pagination={false} onRow={value => ({onClick: () => setSelectedId(value.id), style: {cursor: 'pointer'}})} columns={[
        {title: kind === 'PERMISSION' ? '权限字符' : '稳定 Key', dataIndex: 'key'}, {title: '类型', dataIndex: 'type'},
        {title: '固定语义', dataIndex: 'meaning'}, {title: '生产者', dataIndex: 'producerId'}, {title: '治理状态', dataIndex: 'state', render: value => <Tag>{value}</Tag>},
        {title: '版本', dataIndex: 'version'}, {title: '当前激活来源', dataIndex: 'activeProducerVersion', render: value => value ?? '未激活'},
      ]} />
    </PageState>
    <Space style={{marginTop: 16}}><Button disabled={afterId === '0'} onClick={() => setAfterId('0')}>首页</Button>
      <Button disabled={!definitions.data?.nextAfterId} onClick={() => setAfterId(definitions.data!.nextAfterId!)}>下一页</Button></Space>
    <Drawer title={detail.data?.identity.key ?? '定义详情'} open={Boolean(selectedId)} onClose={() => {setSelectedId(undefined); setReview(null)}} size="large">
      <PageState loading={detail.isPending} error={detail.error} empty={!detail.data} onRetry={() => void detail.refetch()}>
        {detail.data && <Space orientation="vertical" style={{width: '100%'}}>
          <Descriptions column={1} bordered size="small"><Descriptions.Item label="稳定 ID">{detail.data.identity.id}</Descriptions.Item>
            <Descriptions.Item label="治理版本">{detail.data.identity.version}</Descriptions.Item><Descriptions.Item label="来源">{detail.data.identity.producerId}</Descriptions.Item>
            <Descriptions.Item label="激活来源版本">{active ?? '未激活'}</Descriptions.Item></Descriptions>
          <Typography.Title level={5}>当前激活定义（只读）</Typography.Title>
          <pre style={{whiteSpace: 'pre-wrap', overflowWrap: 'anywhere'}}>{JSON.stringify(detail.data.activeDefinition, null, 2)}</pre>
          {diff.data && <ManifestDiffView value={diff.data} />}
          {diff.error && <Alert type="error" title="当前来源影响读取失败" />}
          <Space wrap>
            <ResourceGuard resourceKey="tianquan-jianshen.button.catalog.disable"><Button disabled={!canReview || detail.data.identity.state !== 'ACTIVE'} onClick={() => openReview('DISABLE')}>停用</Button></ResourceGuard>
            <ResourceGuard resourceKey="tianquan-jianshen.button.catalog.retire"><Button danger disabled={!canReview || detail.data.identity.state === 'RETIRED'} onClick={() => openReview('RETIRE')}>退场</Button></ResourceGuard>
            <ResourceGuard resourceKey="tianquan-jianshen.button.catalog.transfer"><Button disabled={!canReview || detail.data.identity.state === 'RETIRED'} onClick={() => {setDestination(undefined); openReview('TRANSFER')}}>转移所有权</Button></ResourceGuard>
          </Space>
        </Space>}
      </PageState>
    </Drawer>
    <Modal title={action === 'TRANSFER' ? '转移定义所有权' : action === 'RETIRE' ? '确认定义退场' : '确认停用定义'} open={Boolean(action)}
      onCancel={() => setReview(null)} confirmLoading={governance.isPending} onOk={() => governance.mutate()}
      okButtonProps={{disabled: !fieldsWritable || !reviewCurrent || detail.isFetching || Boolean(active && (!diff.data || diff.isFetching || diff.error)) || (action === 'TRANSFER' && !destination)}}>
      <Alert type="warning" showIcon title={action === 'DISABLE' ? '停用立即覆盖所有激活定义，对依赖该定义的访问生效。'
        : action === 'RETIRE' ? '退场不可恢复；存在目录引用或角色授予时服务端会拒绝。' : '保留稳定 ID、Key 和固定语义；不会移动角色授予，旧注册计划将失效。'} />
      {review && !reviewCurrent && <Alert type="warning" title="定义或影响已变化，请关闭并重新审查" />}
      <Typography.Paragraph>当前定义：{review?.key}；提交版本：{review?.version}</Typography.Paragraph>
      {action === 'TRANSFER' && <Select disabled={!fieldsWritable} aria-label="目标生产者" style={{width: '100%'}} value={destination} onChange={setDestination}
        options={producers.data?.producers.filter(value => value.kind === currentProducerKind && value.producerId !== detail.data?.identity.producerId)
          .map(value => ({value: value.producerId, label: value.producerId}))} />}
    </Modal>
  </>
}
export const DefinitionCatalogPage = ({title, kind, type}: {title: string; kind: DefinitionKind; type?: string}) => {
  const scope = useCatalogScope()
  return <Card title={title}><CatalogScopePicker value={scope} />
    {scope.selected && <CatalogForScope key={catalogScopeKey(scope.selected.scope)} target={scope.selected.scope} kind={kind} type={type} />}</Card>
}
