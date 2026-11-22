import {useQuery} from '@tanstack/react-query'
import {Alert, Button, Select, Space, Table, Tag, Typography} from 'antd'
import {useRbac3Authorization} from '@stellar-enclosure/stellar-enclosure-tianquan-jianshen-react-sdk'
import {useSearchParams} from 'react-router-dom'
import {WorkspaceList, useEmbeddedWorkbench} from '@stellar-enclosure/stellar-enclosure-web-shared'
import {catalogScopeKey, permissionContextKey} from '@stellar-enclosure/stellar-enclosure-web-shared/permissions'
import {useFeatureApi} from '../shared/FeatureApi'
import {CatalogScopePicker, useCatalogScope} from './CatalogScopePicker'
import {registrationApi, type DiffEntry, type ManifestDiff} from './registration.api'

export const ManifestDiffView = ({value}: {value: ManifestDiff}) => <Space orientation="vertical" style={{width: '100%'}}>
  <Space wrap><Tag>对比当前激活修订 {value.expectedActiveRevision}</Tag><Tag>{value.producerId} / {value.producerVersion}</Tag>
    <Tag color={value.diff.authorizationExpansion ? 'orange' : 'green'}>{value.diff.authorizationExpansion ? '包含授权扩大' : '无授权扩大'}</Tag>
    <Tag>{value.diff.absenceCompared ? '已比较缺失项' : '未推断缺失项删除'}</Tag></Space>
  {value.diff.conflicts.length > 0 && <Alert type="error" showIcon title="存在冲突" description={value.diff.conflicts.join('、')} />}
  <Table<DiffEntry> rowKey={row => `${row.kind}:${row.domain}:${row.key}`} dataSource={value.diff.entries} pagination={false} scroll={{x: 'max-content'}} columns={[
    {title: '变化', dataIndex: 'kind'}, {title: '对象', dataIndex: 'domain'}, {title: '稳定 Key', dataIndex: 'key'},
    {title: '影响说明', dataIndex: 'reason'}, {title: '授权扩大', dataIndex: 'authorizationExpansion', render: (value: boolean) => value ? <Tag color="orange">是</Tag> : '否'},
  ]} />
</Space>

export const ManifestDiffPage = () => {
  const {embedded} = useEmbeddedWorkbench()
  const {status, binding} = useRbac3Authorization()
  const contextKey = status === 'READY' && binding ? permissionContextKey(binding) : undefined
  const [location, setLocation] = useSearchParams()
  const scope = useCatalogScope(undefined, contextKey !== undefined, contextKey)
  const requestedScope = location.get('catalogScopeId')
  const selectedScope = requestedScope
    ? scope.scopes.find(item => item.scope.catalogScopeId === requestedScope)
    : scope.selected
  const target = selectedScope?.scope
  const api = registrationApi(useFeatureApi())
  const base = ['permission-catalogs', target ? catalogScopeKey(target) : null, contextKey]
  const producers = useQuery({queryKey: [...base, 'producers'],
    queryFn: ({signal}) => api.producers(target!, signal), enabled: Boolean(target && contextKey)})
  const requestedProducer = location.get('producerId')
  const selected = requestedProducer
    ? producers.data?.producers.find(item => item.producerId === requestedProducer)
    : producers.data?.producers[0]
  const candidates = useQuery({
    queryKey: [...base, 'candidates', selected?.producerId],
    queryFn: () => api.candidates(target!, selected!.producerId),
    enabled: Boolean(target && contextKey && selected),
  })
  const requestedVersion = location.get('producerVersion')
  const validVersion = requestedProducer === selected?.producerId && requestedVersion
    && /^[1-9][0-9]{0,18}$/.test(requestedVersion) ? requestedVersion : undefined
  const version = validVersion ?? candidates.data?.candidates[0]?.producerVersion
  const diff = useQuery({
    queryKey: [...base, 'diff', selected?.producerId, version],
    queryFn: async () => {
      const value = await api.diff(target!, selected!.producerId, version!)
      if (value.producerId !== selected!.producerId || value.producerVersion !== version) {
        throw new Error('差异结果与当前选择不一致')
      }
      return value
    },
    enabled: Boolean(target && contextKey && selected && version),
  })
  const update = (name: string, value: string, ...clear: string[]) => {
    const next = new URLSearchParams(location)
    next.set(name, value)
    clear.forEach(key => next.delete(key))
    setLocation(next, {replace: true})
  }
  const candidateOptions = candidates.data?.candidates.map(candidate => ({
    value: candidate.producerVersion, label: `${candidate.producerVersion} · ${candidate.state}`,
  })) ?? []
  if (validVersion && !candidateOptions.some(item => item.value === validVersion)) {
    candidateOptions.push({value: validVersion, label: validVersion})
  }
  const retry = () => {
    if (scope.query.isError) void scope.query.refetch()
    else if (producers.isError) void producers.refetch()
    else if (candidates.isError) void candidates.refetch()
    else if (diff.isError) void diff.refetch()
  }
  return <WorkspaceList
    ariaLabel="Manifest 差异与权限影响"
    filters={<Space wrap>
      <CatalogScopePicker value={{...scope, selected: selectedScope}} onSelect={id => update('catalogScopeId', id, 'producerId', 'producerVersion')} />
      <Select aria-label="生产者" style={{minWidth: 180}} value={selected?.producerId}
        options={producers.data?.producers.map(value => ({value: value.producerId, label: value.producerId}))}
        onChange={value => update('producerId', value, 'producerVersion')} />
      <Select aria-label="候选版本" style={{minWidth: 180}} value={version} options={candidateOptions}
        onChange={value => {
          if (!selected) return
          const next = new URLSearchParams(location)
          next.set('producerId', selected.producerId)
          next.set('producerVersion', value)
          setLocation(next, {replace: true})
        }} />
    </Space>}
    toolbar={<Space wrap>
      {!embedded && <Typography.Text strong>Manifest 差异与权限影响</Typography.Text>}
      <Button disabled={!version || diff.isFetching} onClick={() => {void diff.refetch()}}>刷新差异</Button>
    </Space>}
    pageState={{
      loading: scope.query.isPending || producers.isLoading || candidates.isLoading || diff.isLoading,
      error: scope.query.error ?? producers.error ?? candidates.error ?? diff.error,
      empty: !diff.data,
      emptyDescription: requestedScope && !target ? '当前加载范围未找到该目录' : '当前没有可比较版本',
      onRetry: retry,
    }}
    table={diff.data && <ManifestDiffView value={diff.data} />}
  />
}
