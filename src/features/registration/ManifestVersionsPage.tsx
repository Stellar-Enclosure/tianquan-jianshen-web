import {useRbac3Authorization} from '@stellar-enclosure/stellar-enclosure-tianquan-jianshen-react-sdk'
import {resources} from '../../permissions/resources'
import {gatewayAuth} from '../auth/gatewayAuth'
import {loadActivationIntent, storeActivationIntent, type ActivationIntent} from './activationIntent'
import {useMutation, useQueries, useQuery, useQueryClient} from '@tanstack/react-query'
import {PageState} from '@stellar-enclosure/stellar-enclosure-web-shared'
import {allowsSnapshotRequirement, catalogScopeKey} from '@stellar-enclosure/stellar-enclosure-web-shared/permissions'
import {Alert, Button, Card, Checkbox, Descriptions, Select, Space, Table, Tag, Typography} from 'antd'
import {useEffect, useState} from 'react'
import {useResourcePermission} from '../../permissions/ResourceGuard'
import {useFeatureApi} from '../shared/FeatureApi'
import {useCurrentAuthorizationRefresh} from '../auth/CurrentAuthorizationProvider'
import {CatalogScopePicker, useCatalogScope} from './CatalogScopePicker'
import {ManifestDiffView} from './ManifestDiffPage'
import {registrationApi, type ActivationCommand, type ActivationDescriptor, type Candidate, type CatalogScope} from './registration.api'

const eligible = (candidate: Candidate | undefined, now = Date.now()) => candidate?.state === 'READY' && candidate.qualification != null
  && Date.parse(candidate.qualification.expiresAt) > now
const unknownOutcome = (error: unknown) => !(error as {status?: number})?.status || ((error as {status?: number}).status ?? 0) >= 500

const VersionsForScope = ({target}: {target: CatalogScope}) => {
  const api = registrationApi(useFeatureApi())
  const refreshAuthorization = useCurrentAuthorizationRefresh()
  const queryClient = useQueryClient()
  const key = ['permission-catalogs', catalogScopeKey(target)]
  const [selected, setSelected] = useState<Record<string, Candidate>>({})
  const [before, setBefore] = useState<Record<string, string>>({})
  const authorization = useRbac3Authorization()
  const issuer = authorization.binding!.issuer
  const subject = authorization.binding!.subject
  const [now, setNow] = useState(Date.now)
  const [reviewedKey, setReviewedKey] = useState<string | null>(null)
  const [pending, setPending] = useState<ActivationIntent | null>(() => loadActivationIntent(issuer, subject, target))
  const retain = (value: ActivationIntent | null) => {storeActivationIntent(issuer, subject, target, value); setPending(value)}
  const [canRetry, setCanRetry] = useState(false)
  const [beforeHistory, setBeforeHistory] = useState('0')
  const canActivate = useResourcePermission('tianquan-jianshen.button.catalog.activate')
  const canApproveExpansion = useResourcePermission('tianquan-jianshen.button.catalog.approveExpansion')
  const producers = useQuery({queryKey: [...key, 'producers'], queryFn: () => api.producers(target)})
  const members = producers.data?.producers ?? []
  const candidates = useQueries({queries: members.map(producer => ({queryKey: [...key, 'candidates', producer.producerId, before[producer.producerId] ?? '0'],
    queryFn: () => api.candidates(target, producer.producerId, before[producer.producerId] ?? '0')}))})
  const diffs = useQueries({queries: members.map(producer => ({queryKey: [...key, 'diff', producer.producerId, selected[producer.producerId]?.producerVersion],
    queryFn: () => api.diff(target, producer.producerId, selected[producer.producerId].producerVersion), enabled: Boolean(selected[producer.producerId])}))})
  const history = useQuery({queryKey: [...key, 'versions', beforeHistory], queryFn: () => api.versions(target, beforeHistory)})
  const checkOperation = useMutation({mutationFn: () => {
    if (!pending) throw new Error('没有待确认操作')
    return api.operation(target, pending.command.operationId)
  }, onSuccess: async () => {retain(null); setCanRetry(false); await queryClient.invalidateQueries({queryKey: key}); await refreshAuthorization()},
  onError: error => {setCanRetry((error as {status?: number}).status === 404)}})
  const activate = useMutation({mutationFn: (command: ActivationCommand) => api.activate(command),
    onSuccess: async () => {retain(null); setCanRetry(false); setSelected({}); setReviewedKey(null); await queryClient.invalidateQueries({queryKey: key}); await refreshAuthorization()},
    onError: async (error) => {
      setReviewedKey(null)
      if (unknownOutcome(error)) {setCanRetry(false)}
      else {retain(null); setSelected({}); await queryClient.invalidateQueries({queryKey: key})}
    }})
  const expansion = diffs.some(value => value.data?.diff.authorizationExpansion)
  const ready = members.length > 0 && members.every((member, index) => eligible(selected[member.producerId], now)
    && !diffs[index].isFetching && !diffs[index].error && diffs[index].data?.expectedActiveRevision === producers.data?.activeRevision
    && diffs[index].data?.producerVersion === selected[member.producerId]?.producerVersion && diffs[index].data?.diff.conflicts.length === 0)
  const reviewKey = ready ? JSON.stringify({expectedActiveRevision: producers.data!.activeRevision,
    producers: members.map((member, index) => ({producerId: member.producerId, producerRevision: member.producerRevision, ownerVersion: member.ownerVersion,
      candidate: selected[member.producerId], diff: diffs[index].data}))}) : null
  const reviewed = reviewKey !== null && reviewedKey === reviewKey
  const qualificationTimes = Object.values(selected).map(value => Date.parse(value.qualification?.expiresAt ?? '')).filter(Number.isFinite)
  const nextExpiry = Math.min(...qualificationTimes.filter(value => value > now), Date.parse(authorization.snapshot?.snapshotExpiresAt ?? ''))
  useEffect(() => {
    if (!Number.isFinite(nextExpiry) || nextExpiry <= Date.now()) return
    const timer = setTimeout(() => setNow(Date.now()), Math.min(nextExpiry - Date.now() + 1, 2_147_483_647))
    return () => clearTimeout(timer)
  }, [nextExpiry])
  const permittedNow = (resourceKey: string) => {
    const resource = resources.find(value => value.key === resourceKey)
    return authorization.status === 'READY' && authorization.binding?.requestEpoch === gatewayAuth.context.epoch
      && resource && 'requirement' in resource && allowsSnapshotRequirement(authorization.snapshot, authorization.binding, resource.requirement)
  }
  const submit = () => {
    if (!ready || !reviewed || !producers.data || pending || !permittedNow('tianquan-jianshen.button.catalog.activate')
      || (expansion && !permittedNow('tianquan-jianshen.button.catalog.approveExpansion'))
      || members.some(member => !eligible(selected[member.producerId]))) {setNow(Date.now()); return}
    const command: ActivationCommand = {target, operationId: crypto.randomUUID(), expectedActiveRevision: producers.data.activeRevision,
      producers: members.map(member => ({producerId: member.producerId, producerVersion: selected[member.producerId].producerVersion,
        qualificationId: selected[member.producerId].qualification!.qualificationId}))}
    retain({command, requiresManage: expansion, qualificationsExpireAt: members.map(member => selected[member.producerId].qualification!.expiresAt)})
    activate.mutate(command)
  }
  const retryOriginal = () => {
    if (!pending || !canRetry || !permittedNow('tianquan-jianshen.button.catalog.activate')
      || (pending.requiresManage && !permittedNow('tianquan-jianshen.button.catalog.approveExpansion'))
      || pending.qualificationsExpireAt.some(value => Date.parse(value) <= Date.now())) return
    activate.mutate(pending.command)
  }
  return <Space orientation="vertical" size="middle" style={{width: '100%'}}>
    <Alert type="info" showIcon title="候选注册与激活分开执行" description="只能选择已有有效部署资格的 READY 版本；必须包含全部启用生产者。回退也创建新的激活修订。" />
    <PageState loading={producers.isPending} error={producers.error} empty={members.length === 0} onRetry={() => void producers.refetch()}>
      <Tag>当前激活修订 {producers.data?.activeRevision}</Tag>
      {members.map((producer, index) => <Card key={producer.producerId} size="small" title={producer.producerId} style={{marginTop: 12}}>
        <Descriptions size="small" column={2}><Descriptions.Item label="生产者修订">{producer.producerRevision}</Descriptions.Item>
          <Descriptions.Item label="当前来源版本">{producer.activeProducerVersion ?? '未激活'}</Descriptions.Item></Descriptions>
        <Space wrap><Select aria-label={`候选版本 ${producer.producerId}`} style={{minWidth: 340}} loading={candidates[index].isPending}
          value={selected[producer.producerId]?.producerVersion} placeholder="选择已有部署资格的版本" onChange={version => {
            const candidate = candidates[index].data?.candidates.find(value => value.producerVersion === version)
            if (candidate) {setSelected(value => ({...value, [producer.producerId]: candidate})); setReviewedKey(null)}
          }} options={candidates[index].data?.candidates.map(value => ({value: value.producerVersion,
            label: `${value.producerVersion} · ${value.state}${value.qualification ? ' · 已有部署资格' : ' · 无部署资格'}`, disabled: !eligible(value)}))} />
          <Button disabled={!candidates[index].data?.nextBeforeVersion} onClick={() => setBefore(value => ({...value, [producer.producerId]: candidates[index].data!.nextBeforeVersion!}))}>更早候选</Button>
          <Button disabled={!before[producer.producerId] || before[producer.producerId] === '0'} onClick={() => setBefore(value => ({...value, [producer.producerId]: '0'}))}>最新候选</Button>
        </Space>
        {candidates[index].error && <Alert type="error" title="候选读取失败" />}
        {selected[producer.producerId] && <Typography.Paragraph type="secondary" style={{marginTop: 12}}>
          构建 {selected[producer.producerId].buildId} · commit {selected[producer.producerId].commit} · 部署 {selected[producer.producerId].qualification?.deploymentId}
          · 资格到期 {selected[producer.producerId].qualification?.expiresAt}</Typography.Paragraph>}
        {diffs[index].data && <ManifestDiffView value={diffs[index].data!} />}
        {diffs[index].error && <Alert type="error" title="当前差异读取失败，不能激活" />}
      </Card>)}
    </PageState>
    {expansion && <Alert type="warning" showIcon title="本次选择会扩大授权" description={canApproveExpansion ? '提交将按当前用户的治理权限确认该变化。' : '当前用户缺少治理权限，不能确认扩权激活。'} />}
    <Checkbox checked={reviewed} disabled={!ready || Boolean(pending)} onChange={event => setReviewedKey(event.target.checked ? reviewKey : null)}>我已检查全部生产者、当前差异和部署资格</Checkbox>
    <Button type="primary" loading={activate.isPending} disabled={!ready || !reviewed || !canActivate || Boolean(pending) || (expansion && !canApproveExpansion)} onClick={submit}>激活完整版本集</Button>
    {activate.error && <Alert type="error" title={activate.error instanceof Error ? activate.error.message : '激活失败'}
      description={(activate.error as {status?: number}).status === 409 ? '当前修订或资格已变化，请重新加载并检查差异。' : undefined} />}
    {pending && <Alert type="warning" showIcon title="激活结果尚未确认" description={<Space orientation="vertical">
      <Typography.Text>操作 ID：{pending.command.operationId}。先查询原操作，不新建操作覆盖未知结果。</Typography.Text>
      <Button loading={checkOperation.isPending} onClick={() => checkOperation.mutate()}>查询该操作</Button>
      {canRetry && <Button loading={activate.isPending} disabled={!canActivate || (pending.requiresManage && !canApproveExpansion) || pending.qualificationsExpireAt.some(value => Date.parse(value) <= now)} onClick={retryOriginal}>重试原激活请求</Button>}
    </Space>} />}
    <Card size="small" title="激活历史"><PageState loading={history.isPending} error={history.error} empty={history.data?.versions.length === 0} onRetry={() => void history.refetch()}>
      <Table<ActivationDescriptor> rowKey="activationVersion" dataSource={history.data?.versions} pagination={false} expandable={{expandedRowRender: value => <pre style={{whiteSpace: 'pre-wrap'}}>{JSON.stringify(value.producers, null, 2)}</pre>}} columns={[
        {title: '激活修订', dataIndex: 'activationVersion'}, {title: '策略版本', dataIndex: 'policyVersion'}, {title: '时间', dataIndex: 'createdAt'}, {title: '操作 ID', dataIndex: 'operationId'},
      ]} />
      <Space style={{marginTop: 12}}><Button disabled={beforeHistory === '0'} onClick={() => setBeforeHistory('0')}>最新历史</Button>
        <Button disabled={!history.data?.versions.length} onClick={() => setBeforeHistory(history.data!.versions.at(-1)!.activationVersion)}>更早历史</Button></Space>
    </PageState></Card>
  </Space>
}
export const ManifestVersionsPage = () => {
  const scope = useCatalogScope()
  return <Card title="Manifest 候选与激活历史"><CatalogScopePicker value={scope} />
    {scope.selected && <VersionsForScope key={catalogScopeKey(scope.selected.scope)} target={scope.selected.scope} />}</Card>
}
