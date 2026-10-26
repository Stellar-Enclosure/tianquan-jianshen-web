import {useWritableFields} from '../../permissions/FieldCatalog'
import {useInfiniteQuery, useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {useRbac3Authorization} from '@stellar-enclosure/stellar-enclosure-tianquan-jianshen-react-sdk'
import {PageState} from '@stellar-enclosure/stellar-enclosure-web-shared'
import {catalogScopeKey, type CatalogScope} from '@stellar-enclosure/stellar-enclosure-web-shared/permissions'
import {Alert, Button, Card, Checkbox, Input, Space, Table, Tag, Typography} from 'antd'
import {useState} from 'react'
import {ResourceGuard} from '../../permissions/ResourceGuard'
import {useFeatureApi} from '../shared/FeatureApi'
import {useCurrentAuthorizationRefresh} from '../auth/CurrentAuthorizationProvider'
import {CatalogScopePicker, useCatalogScope} from '../registration/CatalogScopePicker'
import {registrationApi} from '../registration/registration.api'
import {roleApi} from './role.api'

const RolePermissionsForScope = ({roleId, target}: {roleId: string; target: CatalogScope}) => {
  const fieldsWritable = useWritableFields('ReplaceRolePermissionsRequestDTO')
  const client = useFeatureApi()
  const roles = roleApi(client)
  const catalog = registrationApi(client)
  const queryClient = useQueryClient()
  const refreshAuthorization = useCurrentAuthorizationRefresh()
  const key = ['permission-catalogs', catalogScopeKey(target), 'role-permissions', roleId]
  const grants = useQuery({queryKey: key, queryFn: () => roles.permissions(roleId, target)})
  const definitions = useInfiniteQuery({queryKey: ['permission-catalogs', catalogScopeKey(target), 'grantable-permissions'], initialPageParam: '0',
    queryFn: ({pageParam}) => catalog.definitions(target, 'PERMISSION', pageParam), getNextPageParam: page => page.nextAfterId ?? undefined})
  const [draft, setDraft] = useState<{codes: string[]; version: string; catalogVersion: string} | null>(null)
  const [validFrom, setValidFrom] = useState<string>()
  const [validTo, setValidTo] = useState<string>()
  const [replacePeriods, setReplacePeriods] = useState(false)
  const intervals = new Set(grants.data?.permissions.map(value => JSON.stringify([value.validFrom, value.validTo])) ?? [])
  const heterogeneous = intervals.size > 1
  const originalPeriod = intervals.size === 1 ? grants.data?.permissions[0] : undefined
  const from = validFrom === undefined ? originalPeriod?.validFrom ?? null : validFrom ? new Date(validFrom).toISOString() : null
  const to = validTo === undefined ? originalPeriod?.validTo ?? null : validTo ? new Date(validTo).toISOString() : null
  const selected = draft?.codes ?? grants.data?.permissions.map(value => value.permissionCode) ?? []
  const current = !draft || (draft.version === grants.data?.version && draft.catalogVersion === grants.data?.catalogVersion)
  const options = definitions.data?.pages.flatMap(page => page.definitions).filter(value => value.state === 'ACTIVE' && value.activeProducerVersion != null) ?? []
  const knownCodes = new Set(options.map(value => value.key))
  const update = (codes: string[]) => {
    if (!grants.data) return
    setDraft({codes: [...new Set(codes)].sort(), version: draft?.version ?? grants.data.version, catalogVersion: draft?.catalogVersion ?? grants.data.catalogVersion})
  }
  const save = useMutation({mutationFn: () => {
    if (!fieldsWritable || !draft || !current || (heterogeneous && !replacePeriods)) throw new Error('请重新检查角色权限版本和全部授予时段')
    if (to && Date.parse(to) <= (from ? Date.parse(from) : Date.now())) throw new Error('结束时间必须晚于开始时间')
    return roles.replacePermissions(roleId, {target, permissionCodes: draft.codes, expectedVersion: draft.version, validFrom: from, validTo: to})
  }, onSuccess: async () => {setDraft(null); await queryClient.invalidateQueries({queryKey: key}); await refreshAuthorization()},
  onError: async error => {if ((error as {status?: number}).status === 409) await queryClient.invalidateQueries({queryKey: key})}})
  return <Space orientation="vertical" style={{width: '100%'}}>
    <Alert type="info" showIcon title="角色显式授予权限字符" description="资源只解释权限的使用位置，不作为授予记录。保存会替换当前范围下该角色的全部直接授予；空选择明确清空。" />
    <PageState loading={grants.isPending || definitions.isPending} error={grants.error ?? definitions.error} empty={!grants.data} onRetry={() => void grants.refetch()}>
      <Space><Tag>权限版本 {grants.data?.version}</Tag><Tag>目录版本 {grants.data?.catalogVersion}</Tag></Space>
      <Table rowKey="permissionCode" size="small" dataSource={grants.data?.permissions} pagination={false} columns={[
        {title: '现有直接授予', dataIndex: 'permissionCode'}, {title: '开始时间', dataIndex: 'validFrom'},
        {title: '结束时间', dataIndex: 'validTo', render: value => value ?? '不设到期'},
      ]} />
      <Checkbox.Group disabled={!fieldsWritable} style={{display: 'flex', flexDirection: 'column', gap: 8, margin: '16px 0'}} value={selected}
        options={[...options.map(value => ({value: value.key, label: <><Typography.Text code>{value.key}</Typography.Text> {value.meaning}</>})),
          ...selected.filter(code => !knownCodes.has(code)).map(code => ({value: code, label: `${code}（已有授予，当前页未列出或不可再次授予）`}))]}
        onChange={values => update(values.map(String))} />
      {definitions.hasNextPage && <Button onClick={() => void definitions.fetchNextPage()} loading={definitions.isFetchingNextPage}>加载更多权限字符</Button>}
      <Space wrap><label>开始时间<Input disabled={!fieldsWritable} aria-label="授予开始时间" type="datetime-local" value={validFrom ?? localDateTime(originalPeriod?.validFrom)} onChange={event => {setValidFrom(event.target.value); update(selected)}} /></label>
        <label>结束时间<Input disabled={!fieldsWritable} aria-label="授予结束时间" type="datetime-local" value={validTo ?? localDateTime(originalPeriod?.validTo)} onChange={event => {setValidTo(event.target.value); update(selected)}} /></label></Space>
      <Typography.Paragraph type="secondary">所选权限统一使用该有效期。开始：{from ?? '数据库提交时间'}；结束：{to ?? '不设到期'}。原授予时段未编辑时保留其精确值。</Typography.Paragraph>
      {heterogeneous && <Alert type="warning" showIcon title="现有权限使用不同有效期" description={<Checkbox disabled={!fieldsWritable} checked={replacePeriods} onChange={event => {setReplacePeriods(event.target.checked); update(selected)}}>我确认用上述统一有效期替换全部所选授予时段</Checkbox>} />}
      {!current && <Alert type="warning" showIcon title="版本已变化，草稿未自动覆盖新版本" description="请保留需要的修改，再放弃草稿并重新读取当前授予。" />}
      {save.error && <Alert type="error" showIcon title={save.error instanceof Error ? save.error.message : '保存角色权限失败'} />}
      <Space><ResourceGuard resourceKey="tianquan-jianshen.button.rolePermissions.save"><Button type="primary" disabled={!fieldsWritable || !draft || !current || grants.isFetching || (heterogeneous && !replacePeriods)} loading={save.isPending} onClick={() => save.mutate()}>保存权限字符</Button></ResourceGuard>
        <Button disabled={save.isPending} onClick={() => {setDraft(null); setValidFrom(undefined); setValidTo(undefined); setReplacePeriods(false); void grants.refetch()}}>放弃草稿并重新加载</Button></Space>
    </PageState>
  </Space>
}
export const RolePermissionGrantPage = ({roleId}: {roleId: string}) => {
  const {status} = useRbac3Authorization()
  const api = roleApi(useFeatureApi())
  const roles = useQuery({queryKey: ['tianquan-jianshen', 'roles-for-permission-scope', roleId], queryFn: () => api.roles(), enabled: status === 'READY'})
  const role = roles.data?.find(value => value.roleId === roleId)
  const scope = useCatalogScope(role?.applicationId)
  return <Card title={`角色权限字符${role ? ' · ' + role.roleName : ''}`}><CatalogScopePicker value={scope} />
    <PageState loading={roles.isPending} error={roles.error} empty={!role} emptyDescription="角色不存在或不可访问" onRetry={() => void roles.refetch()}>
      {role && scope.selected && <RolePermissionsForScope key={roleId + ':' + catalogScopeKey(scope.selected.scope)} roleId={roleId} target={scope.selected.scope} />}
    </PageState></Card>
}

const localDateTime = (value: string | null | undefined) => {
  if (!value) return ''
  const time = new Date(value)
  return new Date(time.getTime() - time.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}
