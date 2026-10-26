import {useInfiniteQuery} from '@tanstack/react-query'
import {useRbac3Authorization} from '@stellar-enclosure/stellar-enclosure-tianquan-jianshen-react-sdk'
import {Alert, Button, Select, Space, Typography} from 'antd'
import {useState} from 'react'
import {useFeatureApi, useFeatureTenantContext} from '../shared/FeatureApi'
import {registrationApi} from './registration.api'

export const useCatalogScope = (applicationId?: string, enabled = true) => {
  const {status} = useRbac3Authorization()
  const {effectiveTenantId} = useFeatureTenantContext()
  const api = registrationApi(useFeatureApi())
  const [selectedId, setSelectedId] = useState<string>()
  const query = useInfiniteQuery({queryKey: ['permission-catalogs', 'scopes', effectiveTenantId], initialPageParam: '0',
    queryFn: ({pageParam}) => api.scopes(pageParam), getNextPageParam: page => page.nextAfterId ?? undefined, enabled: enabled && status === 'READY'})
  const scopes = (query.data?.pages.flatMap(page => page.scopes) ?? [])
    .filter(value => value.scope.tenantId === effectiveTenantId && (!applicationId || value.applicationId === applicationId))
  const selected = scopes.find(value => value.scope.catalogScopeId === selectedId) ?? scopes[0]
  return {query, scopes, selected, setSelectedId}
}
export const CatalogScopePicker = ({value}: {value: ReturnType<typeof useCatalogScope>}) => <Space wrap style={{marginBottom: 16}}>
  <Select aria-label="权限目录范围" placeholder="选择服务端已配置的范围" style={{minWidth: 380}} loading={value.query.isPending}
    value={value.selected?.scope.catalogScopeId} onChange={value.setSelectedId}
    options={value.scopes.map(entry => ({value: entry.scope.catalogScopeId,
      label: `${entry.scope.businessCode} / ${entry.scope.applicationCode} / ${entry.scope.namespaceCode} / ${entry.scope.environment}`}))} />
  {value.query.hasNextPage && <Button onClick={() => void value.query.fetchNextPage()} loading={value.query.isFetchingNextPage}>更多范围</Button>}
  {value.selected && <Typography.Text type="secondary">租户 {value.selected.scope.tenantId} · 范围 {value.selected.scope.catalogScopeId}</Typography.Text>}
  {value.query.error && <Alert type="error" title="权限范围加载失败" action={<Button onClick={() => void value.query.refetch()}>重试</Button>} />}
</Space>
