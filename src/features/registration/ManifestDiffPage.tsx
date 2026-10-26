import {useQuery} from '@tanstack/react-query'
import {Alert, Card, Select, Space, Table, Tag} from 'antd'
import {useState} from 'react'
import {PageState} from '@stellar-enclosure/stellar-enclosure-web-shared'
import {catalogScopeKey} from '@stellar-enclosure/stellar-enclosure-web-shared/permissions'
import {useFeatureApi} from '../shared/FeatureApi'
import {CatalogScopePicker, useCatalogScope} from './CatalogScopePicker'
import {registrationApi, type CatalogScope, type DiffEntry, type ManifestDiff} from './registration.api'

export const ManifestDiffView = ({value}: {value: ManifestDiff}) => <Space orientation="vertical" style={{width: '100%'}}>
  <Space wrap><Tag>对比当前激活修订 {value.expectedActiveRevision}</Tag><Tag>{value.producerId} / {value.producerVersion}</Tag>
    <Tag color={value.diff.authorizationExpansion ? 'orange' : 'green'}>{value.diff.authorizationExpansion ? '包含授权扩大' : '无授权扩大'}</Tag>
    <Tag>{value.diff.absenceCompared ? '已比较缺失项' : '未推断缺失项删除'}</Tag></Space>
  {value.diff.conflicts.length > 0 && <Alert type="error" showIcon title="存在冲突" description={value.diff.conflicts.join('、')} />}
  <Table<DiffEntry> rowKey={row => `${row.kind}:${row.domain}:${row.key}`} dataSource={value.diff.entries} pagination={false} columns={[
    {title: '变化', dataIndex: 'kind'}, {title: '对象', dataIndex: 'domain'}, {title: '稳定 Key', dataIndex: 'key'},
    {title: '影响说明', dataIndex: 'reason'}, {title: '授权扩大', dataIndex: 'authorizationExpansion', render: (value: boolean) => value ? <Tag color="orange">是</Tag> : '否'},
  ]} />
</Space>

const DiffForScope = ({target}: {target: CatalogScope}) => {
  const api = registrationApi(useFeatureApi())
  const [producerId, setProducerId] = useState('')
  const [version, setVersion] = useState('')
  const producers = useQuery({queryKey: ['permission-catalogs', catalogScopeKey(target), 'producers'], queryFn: () => api.producers(target)})
  const selected = producerId || producers.data?.producers[0]?.producerId || ''
  const candidates = useQuery({queryKey: ['permission-catalogs', catalogScopeKey(target), 'candidates', selected],
    queryFn: () => api.candidates(target, selected), enabled: Boolean(selected)})
  const selectedVersion = version || candidates.data?.candidates[0]?.producerVersion || ''
  const diff = useQuery({queryKey: ['permission-catalogs', catalogScopeKey(target), 'diff', selected, selectedVersion],
    queryFn: () => api.diff(target, selected, selectedVersion), enabled: Boolean(selected && selectedVersion)})
  return <><Space wrap style={{marginBottom: 16}}>
    <Select aria-label="生产者" style={{minWidth: 220}} value={selected || undefined} options={producers.data?.producers.map(value => ({value: value.producerId, label: value.producerId}))}
      onChange={value => {setProducerId(value); setVersion('')}} />
    <Select aria-label="候选版本" style={{minWidth: 220}} value={selectedVersion || undefined} options={candidates.data?.candidates.map(value => ({value: value.producerVersion, label: `${value.producerVersion} · ${value.state}`}))} onChange={setVersion} />
  </Space><PageState loading={producers.isPending || candidates.isPending || diff.isPending} error={producers.error ?? candidates.error ?? diff.error}
    empty={!selectedVersion} onRetry={() => void diff.refetch()}>{diff.data && <ManifestDiffView value={diff.data} />}</PageState></>
}
export const ManifestDiffPage = () => {
  const scope = useCatalogScope()
  return <Card title="Manifest 差异与权限影响"><CatalogScopePicker value={scope} />
    {scope.selected && <DiffForScope key={catalogScopeKey(scope.selected.scope)} target={scope.selected.scope} />}</Card>
}
