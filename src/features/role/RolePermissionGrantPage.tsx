import {useInfiniteQuery, useMutation, useQuery} from '@tanstack/react-query'
import {useRbac3Authorization} from '@stellar-enclosure/stellar-enclosure-tianquan-jianshen-react-sdk'
import {ApiError, PageState, useEmbeddedWorkbench, useWorkbenchLeaveGuard} from '@stellar-enclosure/stellar-enclosure-web-shared'
import {catalogScopeKey, evaluateRequirement, permissionContextKey, type CatalogScope} from '@stellar-enclosure/stellar-enclosure-web-shared/permissions'
import {Alert, Button, Card, Checkbox, Drawer, Flex, Grid, Input, Modal, Select, Space, Table, Tabs, Tag, Tree, Typography} from 'antd'
import {useEffect, useRef, useState} from 'react'
import {useWritableFields} from '../../permissions/FieldCatalog'
import {ResourceGuard, useResourcePermission} from '../../permissions/ResourceGuard'
import {useFeatureApi, useFeatureTenantContext} from '../shared/FeatureApi'
import {useCurrentAuthorizationRefresh} from '../auth/CurrentAuthorizationProvider'
import {CatalogScopePicker, useCatalogScope} from '../registration/CatalogScopePicker'
import {registrationApi, type DefinitionKind} from '../registration/registration.api'
import {roleApi, type RolePermissionGrantView, type RoleView} from './role.api'
import {
  grantChanges, grantWindow, hasCompleteGrantBaseline, permissionCodes, projectRoleResource, rebaseGrantCodes,
  requirementGroups, RESOURCE_DIMENSIONS, type GrantPeriodEdits, type GrantResource, type ResourceDimension,
} from './rolePermissionView'

const SAVE_RESOURCE = 'tianquan-jianshen.button.rolePermissions.save'
const DIMENSION_LABELS = {PAGE: '页面', MENU: '菜单', BUTTON: '按钮', FIELD: '字段', API: 'API', PERMISSION: '权限字符'} as const
const DETAIL_PAGE_SIZE = 16
const ALL_PAGES = 'all'
const UNCLASSIFIED = 'unclassified'
type Dimension = ResourceDimension | 'PERMISSION'
type Draft = {
  readonly baseline: RolePermissionGrantView
  readonly codes: readonly string[]
  readonly period: GrantPeriodEdits
  readonly replacePeriods: boolean
}

const active = (value: {state: string; activeProducerVersion: string | null}) =>
  value.state === 'ACTIVE' && Boolean(value.activeProducerVersion)
const matches = (value: {meaning: string | null; key: string}, term: string) =>
  !term || value.key.toLowerCase().includes(term) || Boolean(value.meaning?.toLowerCase().includes(term))

const RolePermissionsForScope = ({role, target, contextKey, scope}: {
  role: RoleView; target: CatalogScope; contextKey: string; scope: ReturnType<typeof useCatalogScope>
}) => {
  const roleId = role.roleId
  const {activeTabKey, embedded} = useEmbeddedWorkbench()
  const canManage = useResourcePermission(SAVE_RESOURCE)
  const canWrite = useWritableFields('ReplaceRolePermissionsRequestDTO') && canManage
  const client = useFeatureApi()
  const roles = roleApi(client)
  const catalog = registrationApi(client)
  const refreshAuthorization = useCurrentAuthorizationRefresh()
  const prefix = ['permission-catalogs', catalogScopeKey(target), contextKey, 'role-editor', roleId]
  const [dimension, setDimension] = useState<Dimension>('PAGE')
  const [pageKey, setPageKey] = useState(ALL_PAGES)
  const [search, setSearch] = useState('')
  const [detailLimit, setDetailLimit] = useState(DETAIL_PAGE_SIZE)
  const [selectedResource, setSelectedResource] = useState<string>()
  const [draft, setDraft] = useState<Draft | null>(null)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [clearConfirmed, setClearConfirmed] = useState(false)
  const [recovery, setRecovery] = useState(false)
  const [scopeChange, setScopeChange] = useState<string>()
  const lifecycle = useRef<AbortController | null>(null)
  useEffect(() => {
    const controller = new AbortController()
    lifecycle.current = controller
    return () => controller.abort()
  }, [])

  const grants = useQuery({queryKey: [...prefix, 'grants'], queryFn: async ({signal}) => {
    const value = await roles.permissions(roleId, target, signal)
    if (!hasCompleteGrantBaseline(value)) throw new Error('无法确认角色授予基线的完整性')
    return value
  }})
  const producers = useQuery({queryKey: [...prefix, 'producers'], queryFn: ({signal}) => catalog.producers(target, signal)})
  const revision = producers.data?.activeRevision
  const catalogCurrent = revision !== undefined && revision === grants.data?.catalogVersion && !producers.isError
  const producerVersions = new Map(producers.data?.producers.map(producer => [producer.producerId, producer.activeProducerVersion]))
  const indexQuery = (kind: DefinitionKind) => ({
    queryKey: [...prefix, 'definitions', revision, kind],
    initialPageParam: '0',
    queryFn: async ({pageParam, signal}: {pageParam: string; signal: AbortSignal}) => {
      const result = await catalog.definitions(target, kind, pageParam, signal)
      if (result.kind !== kind) throw new Error('目录返回了不同的定义类型')
      return result
    },
    getNextPageParam: (page: Awaited<ReturnType<typeof catalog.definitions>>) => page.nextAfterId ?? undefined,
    enabled: catalogCurrent,
  })
  const permissions = useInfiniteQuery(indexQuery('PERMISSION'))
  const resources = useInfiniteQuery({...indexQuery('RESOURCE'), enabled: catalogCurrent && dimension !== 'PERMISSION'})
  const permissionIndex = permissions.data?.pages.flatMap(page => page.definitions) ?? []
  const resourceIndex = resources.data?.pages.flatMap(page => page.definitions) ?? []
  const pageDefinitions = resourceIndex.filter(item => item.type === 'PAGE' && active(item))
  const pages = new Set(pageDefinitions.map(item => item.key))
  const term = search.trim().toLowerCase()
  const eligibleCodes = new Set(permissionIndex.filter(item => active(item)
    && producerVersions.get(item.producerId) === item.activeProducerVersion).map(item => item.key))
  const inactive = new Set(permissionIndex.filter(item => !eligibleCodes.has(item.key)).map(item => item.key))
  const inDimension = resourceIndex.filter(item => item.type === dimension && active(item) && matches(item, term))
  const requestedDetails = inDimension.slice(0, detailLimit)
  const details = useQuery({
    queryKey: [...prefix, 'detail', revision, dimension,
      requestedDetails.map(item => [item.id, item.version, item.activeProducerVersion])],
    queryFn: async ({signal}) => {
      const values = []
      for (let index = 0; index < requestedDetails.length; index += 4) {
        signal.throwIfAborted()
        values.push(...await Promise.all(requestedDetails.slice(index, index + 4).map(identity =>
          catalog.definition(target, 'RESOURCE', identity.id, signal))))
      }
      return values
    },
    enabled: catalogCurrent && dimension !== 'PERMISSION' && requestedDetails.length > 0,
  })
  const rows = (details.data ?? []).flatMap((detail, index) => {
    const identity = requestedDetails[index]
    const row = identity && projectRoleResource(identity, detail, producerVersions.get(identity.producerId), pages)
    return row ? [row] : []
  })
  const visibleResources = rows.filter(row => pageKey === ALL_PAGES
    || (pageKey === UNCLASSIFIED ? !row.pageKey : row.pageKey === pageKey))
  const inspected = visibleResources.find(row => row.identity.id === selectedResource)

  const baseline = draft?.baseline ?? grants.data
  const existing = baseline ? permissionCodes(baseline) : []
  const selected = draft?.codes ?? existing
  const codeSet = new Set(selected)
  const intervals = new Set(baseline?.permissions.map(value => JSON.stringify([value.validFrom, value.validTo])) ?? [])
  const heterogeneous = intervals.size > 1
  const originalPeriod = intervals.size === 1 ? baseline?.permissions[0] : undefined
  const period = grantWindow(originalPeriod, draft?.period ?? {})
  const invalidCodes = selected.filter(code => inactive.has(code))
  const latestVersionMatches = !draft || (draft.baseline.version === grants.data?.version
    && draft.baseline.catalogVersion === grants.data.catalogVersion)

  const changes = grantChanges(existing, selected)
  const modified = changes.added.length > 0 || changes.removed.length > 0
    || draft?.period.from !== undefined || draft?.period.to !== undefined || Boolean(draft?.replacePeriods)
  const canReview = Boolean(canWrite && draft && modified && period && catalogCurrent && !grants.isError && !grants.isFetching
    && !producers.isFetching && !permissions.isError && invalidCodes.length === 0 && latestVersionMatches
    && (!heterogeneous || draft.replacePeriods) && !recovery)
  const seenPermissions = new Map(permissionIndex.map(item => [item.key, item]))
  const characterCodes = [...new Set([...eligibleCodes, ...selected, ...existing])].sort()
    .filter(code => matches({key: code, meaning: seenPermissions.get(code)?.meaning ?? null}, term))

  const save = useMutation({
    mutationFn: async (value: Draft) => {
      const activeRequest = lifecycle.current?.signal
      if (!canReview || !period || !activeRequest) throw new Error('请重新复核当前授予和目录')
      const [grantResult, catalogResult] = await Promise.all([
        grants.refetch({throwOnError: true}), producers.refetch({throwOnError: true}),
      ])
      activeRequest.throwIfAborted()
      if (!grantResult.data || grantResult.data.version !== value.baseline.version
          || grantResult.data.catalogVersion !== value.baseline.catalogVersion
          || catalogResult.data?.activeRevision !== value.baseline.catalogVersion) {
        throw new ApiError('权限或目录版本已经变化', 409, 'ROLE_GRANT_VERSION_CHANGED')
      }
      return roles.replacePermissions(roleId, {
        target, permissionCodes: value.codes, expectedVersion: value.baseline.version, ...period,
      })
    },
    retry: false,
    onSuccess: async () => {
      setReviewOpen(false)
      setDraft(null)
      setRecovery(false)
      await Promise.all([grants.refetch(), refreshAuthorization()])
    },
    onError: async (failure) => {
      setReviewOpen(false)
      if (failure instanceof ApiError && failure.status !== 409 && !failure.retryable) return
      setRecovery(true)
      await Promise.all([grants.refetch(), producers.refetch()])
    },
  })
  const editing = canWrite && !save.isPending && !recovery && latestVersionMatches && catalogCurrent
  useWorkbenchLeaveGuard(activeTabKey ?? `jianshen:role-permissions:${roleId}:${catalogScopeKey(target)}`,
    {dirty: draft !== null, pendingMutation: save.isPending})
  useEffect(() => {
    if (embedded || (!draft && !save.isPending)) return
    const protect = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', protect)
    return () => window.removeEventListener('beforeunload', protect)
  }, [draft, embedded, save.isPending])

  const updateDraft = (update: (value: Draft) => Draft) => {
    if (!editing || !grants.data) return
    const server = grants.data
    setDraft(prior => update(prior ?? {baseline: server, codes: permissionCodes(server), period: {}, replacePeriods: false}))
  }
  const toggleCode = (code: string, checked: boolean) => {
    if (checked && !eligibleCodes.has(code)) return
    updateDraft(value => ({...value, codes: checked ? [...new Set([...value.codes, code])].sort()
      : value.codes.filter(item => item !== code)}))
  }
  const discard = () => {
    setRecovery(false)
    setReviewOpen(false)
    setDraft(null)
    save.reset()
    void Promise.all([grants.refetch(), producers.refetch()])
  }
  const rebase = () => {
    if (!grants.data || !draft || !catalogCurrent || grants.isError || grants.isFetching || !canWrite) return
    setDraft({baseline: grants.data, codes: rebaseGrantCodes(existing, selected, permissionCodes(grants.data)),
      period: draft.period, replacePeriods: false})
    setRecovery(false)
    save.reset()
  }
  const toggle = (code: string) => <Checkbox key={code} checked={codeSet.has(code)}
    disabled={!editing || (!eligibleCodes.has(code) && !codeSet.has(code))}
    onChange={event => toggleCode(code, event.target.checked)}>{code}</Checkbox>

  const compact = !Grid.useBreakpoint().md
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  const dateFormatter = new Intl.DateTimeFormat('zh-CN', {dateStyle: 'medium', timeStyle: 'medium', timeZone: timezone})
  const formatInstant = (value: string) => <span title={value}>{dateFormatter.format(new Date(value))}</span>
  const choiceList = [{value: ALL_PAGES, label: '全部页面'}, ...pageDefinitions.map(item =>
    ({value: item.key, label: item.meaning ?? item.key})), {value: UNCLASSIFIED, label: '未分类'}]
  const chooseScope = (id: string) => {
    if (save.isPending || id === scope.selected?.scope.catalogScopeId) return
    if (draft) setScopeChange(id)
    else scope.setSelectedId(id)
  }
  const allowExit = !(save.isPending || save.isSuccess && grants.isFetching)
  const decisionId = save.error instanceof ApiError ? save.error.decisionId : undefined

  return <Flex vertical gap={12}>
    <Card size="small">
      {!embedded && <Typography.Text strong>角色权限字符 · {role.roleName}</Typography.Text>}
      <CatalogScopePicker value={scope} onSelect={chooseScope} />
      <Space wrap>
        <Tag>授权版本 {grants.data?.version ?? '—'}</Tag><Tag>目录版本 {revision ?? '—'}</Tag>
        <Tag>{selected.length} 个已选字符</Tag>
      </Space>
    </Card>
    <PageState loading={grants.isPending || producers.isPending} error={grants.error ?? producers.error}
      empty={!grants.data} onRetry={() => {void Promise.all([grants.refetch(), producers.refetch()])}}>
      {!catalogCurrent && <Alert type="warning" showIcon title="授权与目录版本不一致，暂不可保存"
        action={<Button size="small" onClick={() => {void Promise.all([grants.refetch(), producers.refetch()])}}>刷新版本</Button>} />}
      <Flex gap={16} wrap>
        <Card size="small" style={{width: compact ? '100%' : 204, alignSelf: 'flex-start'}}>
          {compact
            ? <Select aria-label="按页面定位" style={{width: '100%'}} value={pageKey} options={choiceList} onChange={setPageKey} />
            : <Tree aria-label="按页面定位" selectedKeys={[pageKey]} onSelect={keys => {if (keys.length) setPageKey(String(keys[0]))}}
                treeData={choiceList.map(item => ({key: item.value, title: item.label}))} />}
        </Card>
        <div style={{flex: '1 1 0', minWidth: 0}}>
          <Tabs activeKey={dimension} items={[...RESOURCE_DIMENSIONS, 'PERMISSION' as const]
            .map(key => ({key, label: DIMENSION_LABELS[key]}))} onChange={key => {
              setDimension(key as Dimension)
              setDetailLimit(DETAIL_PAGE_SIZE)
              setSelectedResource(undefined)
            }} />
          <Input.Search aria-label="搜索资源或权限字符" allowClear onSearch={value => {
            setSearch(value)
            setDetailLimit(DETAIL_PAGE_SIZE)
          }} />
          {dimension === 'PERMISSION' ? (
            <PageState loading={permissions.isLoading} error={permissions.error} empty={!characterCodes.length}>
              <Table rowKey={code => code} dataSource={characterCodes} size="small" pagination={{pageSize: DETAIL_PAGE_SIZE}}
                columns={[
                  {title: '权限字符', render: (_value, code) => toggle(code)},
                  {title: '名称', render: (_value, code) => seenPermissions.get(code)?.meaning ?? '—'},
                  {title: '目录状态', render: (_value, code) => eligibleCodes.has(code) ? '有效'
                    : inactive.has(code) ? '当前定义不可授予' : '当前页未加载定义'},
                ]} />
              {permissions.hasNextPage && <Button loading={permissions.isFetchingNextPage}
                onClick={() => {void permissions.fetchNextPage()}}>加载更多权限字符</Button>}
            </PageState>
          ) : (
            <>
              <Typography.Text type="secondary">
                已加载 {rows.length}/{inDimension.length} 条当前索引详情{resources.hasNextPage ? '，目录还有未加载页' : ''}
              </Typography.Text>
              {(details.data?.length ?? 0) > rows.length && <Alert type="warning" showIcon
                title="部分定义与当前目录版本不一致"
                action={<Button size="small" onClick={() => {
                  void Promise.all([producers.refetch(), resources.refetch()]).then(() => details.refetch())
                }}>重读目录详情</Button>} />}
              <PageState loading={resources.isLoading || details.isLoading} error={resources.error ?? details.error}
                empty={!visibleResources.length} onRetry={() => {void Promise.all([resources.refetch(), details.refetch()])}}>
                <Table<GrantResource> rowKey={row => row.identity.id} dataSource={visibleResources} size="small"
                  pagination={false} scroll={{x: 'max-content'}} columns={[
                    {title: '资源', render: (_value, row) => row.identity.meaning ?? row.identity.key},
                    {title: '访问', dataIndex: 'access'},
                    {title: '关联权限字符', render: (_value, row) => <Space wrap>{row.codes.map(toggle)}</Space>},
                    {title: '条件', render: (_value, row) => row.rules.map(rule => (
                      <Tag key={rule.label}>{rule.label} {evaluateRequirement(rule.requirement, codeSet) ? '直接字符覆盖' : '待满足'}</Tag>
                    ))},
                    {title: '操作', render: (_value, row) => <Button type="link" onClick={() => setSelectedResource(row.identity.id)}>查看资源</Button>},
                  ]} />
              </PageState>
              <Space wrap>
                {requestedDetails.length < inDimension.length && <Button onClick={() => setDetailLimit(limit => limit + DETAIL_PAGE_SIZE)}>加载更多资源详情</Button>}
                {resources.hasNextPage && <Button loading={resources.isFetchingNextPage}
                  onClick={() => {void resources.fetchNextPage()}}>加载更多目录索引</Button>}
                {permissions.hasNextPage && <Button loading={permissions.isFetchingNextPage}
                  onClick={() => {void permissions.fetchNextPage()}}>加载更多关联字符</Button>}
              </Space>
            </>
          )}
        </div>
      </Flex>
      <Card size="small" title="直接授予草稿">
        <Space wrap>
          <label>开始时间<Input disabled={!editing} aria-label="授予开始时间" placeholder="UTC 或含时区偏移的 ISO 时间"
            value={draft?.period.from ?? originalPeriod?.validFrom ?? ''}
            onChange={event => {const from = event.target.value; updateDraft(value => ({...value, period: {...value.period, from}}))}} /></label>
          <label>结束时间<Input disabled={!editing} aria-label="授予结束时间" placeholder="留空表示不设截止"
            value={draft?.period.to ?? originalPeriod?.validTo ?? ''}
            onChange={event => {const to = event.target.value; updateDraft(value => ({...value, period: {...value.period, to}}))}} /></label>
        </Space>
        <Typography.Paragraph type="secondary">
          显示时区 {timezone}。提交开始 {period?.validFrom ? formatInstant(period.validFrom) : '由数据库取提交时间'}，
          结束 {period?.validTo ? formatInstant(period.validTo) : '不设截止'}。
        </Typography.Paragraph>
        {!period && <Alert type="warning" title="请输入含偏移的有效时间，结束须晚于开始" />}
        {heterogeneous && <Alert type="warning" showIcon title="现有权限使用不同有效期" description={(
          <Checkbox disabled={!editing} checked={draft?.replacePeriods ?? false}
            onChange={event => {const replacePeriods = event.target.checked; updateDraft(value => ({...value, replacePeriods}))}}>
            我确认用上述统一有效期替换全部所选授予时段
          </Checkbox>
        )} />}
        {invalidCodes.length > 0 && <Alert type="warning" showIcon title="所选字符含失活定义"
          description={`请在权限字符页移除或处理：${invalidCodes.join('、')}`} />}
        {!latestVersionMatches && <Alert type="warning" showIcon title="版本已变化，草稿未自动覆盖新版本" />}
        {(recovery || !latestVersionMatches) && <Alert type="warning" showIcon title="结果待核对，草稿已保留" description={(
          <Space direction="vertical">
            <span>当前直接授予：{grants.data ? permissionCodes(grants.data).join('、') || '空集合' : '未读取'}</span>
            <span>本次拟新增 {changes.added.join('、') || '无'}，拟移除 {changes.removed.join('、') || '无'}。</span>
            <Button disabled={!catalogCurrent || !grants.data || grants.isError || grants.isFetching || !canWrite}
              onClick={rebase}>按当前版本复核草稿</Button>
          </Space>
        )} />}
        {save.error && <Alert type="error" showIcon title={save.error.message}
          description={decisionId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(decisionId) ? `决策编号: ${decisionId}` : undefined} />}
        <Space wrap style={{marginTop: 12}}>
          <ResourceGuard resourceKey={SAVE_RESOURCE}>
            <Button type="primary" disabled={!canReview || save.isPending} onClick={() => {
              setClearConfirmed(false)
              setReviewOpen(true)
            }}>复核授权</Button>
          </ResourceGuard>
          <Button onClick={discard} disabled={save.isPending}>放弃草稿并重新加载</Button>
        </Space>
      </Card>
    </PageState>
    <Drawer title={inspected?.identity.key} open={inspected !== undefined} onClose={() => setSelectedResource(undefined)}>
      {inspected && <Space direction="vertical">
        <Typography.Text>{inspected.access} · {inspected.identity.type} · {inspected.pageKey ?? '未分类'}</Typography.Text>
        {inspected.rules.map(({label, requirement}) => (
          <div key={label}>
            <Typography.Text strong>{label}{'allOf' in requirement ? ' · allOf' : ''}</Typography.Text>
            <ul>{requirementGroups(requirement).map((group, index) => (
              <li key={index}>{'codes' in group ? `${group.mode} · ${group.codes.join('、')}` : 'PUBLIC'}</li>
            ))}</ul>
          </div>
        ))}
        {inspected.fieldPath && <span>字段 {inspected.fieldPath}</span>}
        {inspected.masker && <span>脱敏算法 {inspected.masker}</span>}
        {inspected.routes.length > 0 && <span>{inspected.methods.join('、')} {inspected.routes.join('、')}</span>}
        {inspected.principals.length > 0 && <span>主体 {inspected.principals.join('、')}</span>}
        {inspected.scopes.length > 0 && <span>OAuth Scope {inspected.scopes.join('、')}</span>}
      </Space>}
    </Drawer>
    <Modal open={reviewOpen} title="复核角色直接授予" onCancel={() => setReviewOpen(false)}
      onOk={() => {if (canReview && draft && (selected.length > 0 || clearConfirmed)) save.mutate(draft)}}
      okText="确认提交" confirmLoading={save.isPending}
      cancelButtonProps={{disabled: !allowExit}} closable={allowExit} keyboard={allowExit} mask={{closable: allowExit}}
      okButtonProps={{disabled: !canReview || (selected.length === 0 && !clearConfirmed)}}>
      <Space direction="vertical">
        <Typography.Text>角色 {role.roleName} · 租户 {target.tenantId} · 范围 {target.catalogScopeId} · {target.applicationCode} / {target.namespaceCode} / {target.environment}</Typography.Text>
        <Typography.Text>授权版本 {baseline?.version} · 目录版本 {baseline?.catalogVersion}</Typography.Text>
        <Typography.Text>新增 {changes.added.join('、') || '无'}，移除 {changes.removed.join('、') || '无'}。</Typography.Text>
        <Typography.Text>统一有效期 {period?.validFrom ?? '数据库提交时间'} 至 {period?.validTo ?? '不设截止'}。</Typography.Text>
        <Typography.Text strong>提交的完整权限字符集合</Typography.Text>
        <Space wrap>{selected.map(code => <Tag key={code}>{code}</Tag>)}</Space>
        {selected.length === 0 && <Checkbox checked={clearConfirmed} disabled={save.isPending}
          onChange={event => setClearConfirmed(event.target.checked)}>确认清空该角色在此范围的全部直接授予</Checkbox>}
      </Space>
    </Modal>
    <Modal open={scopeChange !== undefined} title="放弃当前草稿并切换范围"
      okText="确认切换" onCancel={() => setScopeChange(undefined)}
      onOk={() => {if (scopeChange) scope.setSelectedId(scopeChange)}} />
  </Flex>
}

export const RolePermissionGrantPage = ({roleId}: {roleId: string}) => {
  const {status, binding} = useRbac3Authorization()
  const {effectiveTenantId} = useFeatureTenantContext()
  const contextKey = status === 'READY' && binding ? permissionContextKey(binding) : undefined
  const api = roleApi(useFeatureApi())
  const ready = contextKey !== undefined && effectiveTenantId !== null
  const roles = useQuery({queryKey: ['tianquan-jianshen', 'roles-for-permission-scope', contextKey, effectiveTenantId, roleId],
    queryFn: ({signal}) => api.roles(undefined, signal), enabled: ready})
  const role = roles.data?.find(value => value.roleId === roleId)
  const scope = useCatalogScope(role?.applicationId, ready && role !== undefined, contextKey)
  const target = scope.selected?.scope
  return <PageState loading={!ready || roles.isPending || (role !== undefined && scope.query.isPending)}
    error={roles.error ?? scope.query.error} empty={!role} emptyDescription="角色不存在或不可访问" onRetry={() => {void roles.refetch()}}>
    {role && target && contextKey
      ? <RolePermissionsForScope key={JSON.stringify([contextKey, roleId, catalogScopeKey(target)])}
          contextKey={contextKey} role={role} target={target} scope={scope} />
      : role && <Card size="small"><CatalogScopePicker value={scope} /></Card>}
  </PageState>
}
