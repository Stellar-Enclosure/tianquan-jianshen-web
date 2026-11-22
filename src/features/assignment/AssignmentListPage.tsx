import {useWritableFields} from '../../permissions/FieldCatalog'
import {ResourceGuard, useResourcePermission} from '../../permissions/ResourceGuard'
import {useRbac3Authorization} from '@stellar-enclosure/stellar-enclosure-tianquan-jianshen-react-sdk'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {Alert, Button, Popconfirm, Space, Table, Tag, Typography} from 'antd'
import {useRef, useState} from 'react'
import {useFeatureApi, useFeatureTenantContext} from '../shared/FeatureApi'
import {ApiError, useEmbeddedWorkbench, useWorkbenchLeaveGuard, WorkspaceList} from '@stellar-enclosure/stellar-enclosure-web-shared'
import {permissionContextKey} from '@stellar-enclosure/stellar-enclosure-web-shared/permissions'
import {AssignmentEditor} from './AssignmentEditor'
import {directoryApi} from '../directory/directory.api'
import {managementPolicyApi} from '../management-policy/managementPolicy.api'
import {
  assignmentApi, type AssignmentOperation, type AssignmentView,
  type ChangeAssignmentCommand, type CreateAssignmentCommand,
} from './assignment.api'

const CREATE_PERMISSION = 'tianquan-jianshen.button.AssignmentListPage.manage1'
const CHANGE_PERMISSION = 'tianquan-jianshen.button.AssignmentListPage.manage2'
const PAGE_SIZE = 20
const safeVersion = (value: unknown): value is number =>
  typeof value === 'number' && Number.isSafeInteger(value) && value >= 0

type Command = {kind: 'create'; body: CreateAssignmentCommand}
  | {kind: 'change'; assignmentId: string; operation: AssignmentOperation; body: ChangeAssignmentCommand}
type Attempt = Command & {idempotencyKey: string}

export interface AssignmentListPageProps {readonly userId: string}

export const AssignmentListPage = ({userId}: AssignmentListPageProps) => {
  const {status, binding} = useRbac3Authorization()
  const contextKey = status === 'READY' && binding ? permissionContextKey(binding) : null
  return <Assignments key={JSON.stringify([contextKey, userId])} contextKey={contextKey} userId={userId} />
}

const Assignments = ({userId, contextKey}: AssignmentListPageProps & {contextKey: string | null}) => {
  const {embedded, activeTabKey} = useEmbeddedWorkbench()
  const canCreate = useResourcePermission(CREATE_PERMISSION)
  const canChange = useResourcePermission(CHANGE_PERMISSION)
  const {effectiveTenantId} = useFeatureTenantContext()
  const client = useFeatureApi()
  const api = assignmentApi(client)
  const users = directoryApi(client)
  const delegation = managementPolicyApi(client)
  const queryClient = useQueryClient()
  const [editorOpen, setEditorOpen] = useState(false)
  const [roleSearch, setRoleSearch] = useState('')
  const [page, setPage] = useState(1)
  const [unknown, setUnknown] = useState<Attempt | null>(null)
  const keys = useRef(new Map<string, string>())
  const ready = contextKey !== null && effectiveTenantId !== null
  const queryKey = ['tianquan-jianshen', 'assignments', contextKey, effectiveTenantId, userId]
  const userQueryKey = ['tianquan-jianshen', 'directory-user', contextKey, effectiveTenantId, userId]
  const query = useQuery({queryKey, queryFn: () => api.list(userId), enabled: ready})
  const targetUser = useQuery({queryKey: userQueryKey, queryFn: () => users.user(userId),
    enabled: ready && (canCreate || canChange)})
  const manageableUser = useQuery({
    queryKey: ['tianquan-jianshen', 'assignments-manageable-user', contextKey, effectiveTenantId, userId],
    queryFn: () => delegation.manageableUsers(userId),
    enabled: ready && (canCreate || canChange) && targetUser.data?.userId === userId,
  })
  const targetAllowed = manageableUser.data?.some(user => user.userId === userId) === true && !manageableUser.isError && !manageableUser.isFetching
  const manageableRoles = useQuery({
    queryKey: ['tianquan-jianshen', 'assignments-manageable-roles', contextKey, effectiveTenantId, roleSearch],
    queryFn: () => delegation.manageableRoles(roleSearch),
    enabled: ready && canCreate && targetAllowed && editorOpen,
  })
  const userVersion = targetUser.data?.userId === userId ? targetUser.data.authVersion : undefined
  const usableVersion = safeVersion(userVersion) && !targetUser.isError && !targetUser.isFetching
  const createFields = useWritableFields('AssignRequestDTO')
  const changeFields = useWritableFields('RoleAssignmentChangeRequestDTO')
  const createAllowed = ready && canCreate && createFields && targetAllowed
  const changeAllowed = ready && canChange && changeFields && targetAllowed
  const refresh = async () => {
    await Promise.all([
      queryClient.invalidateQueries({queryKey}),
      queryClient.invalidateQueries({queryKey: userQueryKey}),
      queryClient.invalidateQueries({queryKey: ['tianquan-jianshen', 'directory-users']}),
    ])
  }
  const mutate = useMutation({
    mutationFn: (attempt: Attempt) => {
      if (attempt.kind === 'create' && createAllowed) return api.create(userId, attempt.body, attempt.idempotencyKey)
      if (attempt.kind === 'change' && changeAllowed) {
        return api.change(userId, attempt.assignmentId, attempt.operation, attempt.body, attempt.idempotencyKey)
      }
      throw new ApiError('当前授权范围不可执行该任职操作', 403, 'AUTHORIZATION_DENIED')
    },
    retry: false,
    onSuccess: async (_result, attempt) => {
      setUnknown(null)
      if (attempt.kind === 'create') setEditorOpen(false)
      await refresh()
    },
    onError: async (error, attempt) => {
      if (!(error instanceof ApiError) || error.retryable) setUnknown(attempt)
      else setUnknown(null)
      if (!(error instanceof ApiError) || error.retryable || error.status === 409) await refresh()
    },
  })
  const start = (command: Command) => {
    if (unknown || mutate.isPending) return
    const fingerprint = JSON.stringify(command)
    const idempotencyKey = keys.current.get(fingerprint) ?? crypto.randomUUID()
    keys.current.set(fingerprint, idempotencyKey)
    mutate.mutate({...command, idempotencyKey})
  }
  const retryUnknown = () => {
    if (unknown && !mutate.isPending && (unknown.kind === 'create' ? createAllowed : changeAllowed)) mutate.mutate(unknown)
  }
  const beginChange = (assignment: AssignmentView, operation: AssignmentOperation) => {
    if (!changeAllowed || !usableVersion || !safeVersion(userVersion) || !safeVersion(assignment.version)) return
    start({kind: 'change', assignmentId: assignment.assignmentId, operation, body: {
      reason: 'console state change', ticketNo: null, expectedAssignmentVersion: assignment.version,
      expectedUserAuthVersion: userVersion,
    }})
  }
  const inFlight = mutate.isPending || unknown !== null
  useWorkbenchLeaveGuard(activeTabKey ?? `jianshen:assignments:${userId}`, {dirty: editorOpen || Boolean(unknown),
    pendingMutation: mutate.isPending})

  const rows = query.data ?? []
  const current = Math.min(page, Math.max(1, Math.ceil(rows.length / PAGE_SIZE)))
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  const formatter = new Intl.DateTimeFormat('zh-CN', {dateStyle: 'short', timeStyle: 'medium', timeZone: zone})
  const showTime = (value: string | null) => {
    if (value === null) return '长期'
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? value : <span title={value}>{formatter.format(parsed)}</span>
  }

  return <>
    <WorkspaceList ariaLabel="角色任职"
      toolbar={<Space wrap>
        {!embedded && <Typography.Text strong>用户 {userId} 的角色任职</Typography.Text>}
        <Typography.Text type="secondary">任职只定义授权资格 · 显示时区 {zone}</Typography.Text>
        <Button onClick={() => {void refresh()}}>刷新任职</Button>
        <ResourceGuard resourceKey={CREATE_PERMISSION}>
          <Button type="primary" disabled={!createAllowed || !usableVersion || inFlight || query.isError || query.isPending}
            onClick={() => {mutate.reset(); setEditorOpen(true)}}>新增任职资格</Button>
        </ResourceGuard>
      </Space>}
      pageState={{
        loading: query.isPending,
        error: query.error,
        empty: rows.length === 0,
        emptyDescription: '该用户没有角色任职记录',
        onRetry: () => {void query.refetch()},
      }}
      footer={<Space direction="vertical" style={{width: '100%'}}>
        {targetUser.isError && <Alert type="error" showIcon title="无法读取目标用户授权版本，请刷新后重试" />}
        {!targetUser.isError && (canCreate || canChange) && manageableUser.isFetched && !targetAllowed &&
          <Alert type="warning" showIcon title="当前委托范围未确认可以管理该用户" />}
        {mutate.error instanceof Error && !editorOpen && <Alert type="error" showIcon title={mutate.error.message} />}
        {unknown && !editorOpen && <Recovery pending={mutate.isPending} canRetry={unknown.kind === 'create' ? createAllowed : changeAllowed}
          onRetry={retryUnknown} onResolve={() => {setUnknown(null); void refresh()}} />}
      </Space>}
      pagination={{mode: 'page', current, pageSize: PAGE_SIZE, total: rows.length, onChange: setPage}}
      table={<Table<AssignmentView> rowKey="assignmentId" dataSource={rows.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE)}
        pagination={false} scroll={{x: 'max-content'}} columns={[
          {title: '任职 ID', dataIndex: 'assignmentId'}, {title: '角色 ID', dataIndex: 'roleId'},
          {title: '类型', dataIndex: 'assignmentType'},
          {title: '状态', dataIndex: 'status', render: (value: string) => <Tag>{value}</Tag>},
          {title: '来源', render: (_value, row) => [row.sourceType, row.sourceId].filter(Boolean).join(' / ') || '—'},
          {title: '版本', dataIndex: 'version'},
          {title: '生效时间', dataIndex: 'validFrom', render: showTime},
          {title: '失效时间', dataIndex: 'validTo', render: showTime},
          {title: '操作', render: (_value, row) => {
            const disabled = !changeAllowed || !usableVersion || !safeVersion(row.version) || inFlight
            return <ResourceGuard resourceKey={CHANGE_PERMISSION}>
              <Space>
                {row.status === 'ACTIVE' && <ChangeButton label="暂停" disabled={disabled} onConfirm={() => beginChange(row, 'suspend')} />}
                {row.status === 'SUSPENDED' && <ChangeButton label="恢复" disabled={disabled} onConfirm={() => beginChange(row, 'resume')} />}
                {!['REVOKED', 'EXPIRED'].includes(row.status) &&
                  <ChangeButton label="撤销" danger disabled={disabled} onConfirm={() => beginChange(row, 'revoke')} />}
              </Space>
            </ResourceGuard>
          }},
        ]} />}
    />
    {editorOpen && safeVersion(userVersion) && <AssignmentEditor
      open={editorOpen}
      saving={mutate.isPending}
      blocked={!createAllowed || !usableVersion || Boolean(unknown) || query.isError}
      error={mutate.error}
      expectedUserAuthVersion={userVersion}
      assignments={rows}
      roles={manageableRoles.data ?? []}
      rolesLoading={manageableRoles.isLoading}
      rolesError={manageableRoles.error}
      onSearchRoles={value => setRoleSearch(value.trim())}
      onCancel={() => setEditorOpen(false)}
      onSave={body => {
        if (createAllowed && usableVersion && body.expectedUserAuthVersion === userVersion
          && manageableRoles.data?.some(role => role.roleId === body.roleId)) start({kind: 'create', body})
      }}
      recovery={unknown && <Recovery pending={mutate.isPending} canRetry={createAllowed}
        onRetry={retryUnknown} onResolve={() => {setUnknown(null); void refresh()}} />}
    />}
  </>
}

const Recovery = ({pending, canRetry, onRetry, onResolve}: {
  pending: boolean; canRetry: boolean; onRetry: () => void; onResolve: () => void
}) => <Alert type="warning" showIcon title="请求结果待核对"
  description={<Space wrap>
    <Button disabled={!canRetry || pending} onClick={onRetry}>重试原任职请求</Button>
    <Button disabled={pending} onClick={onResolve}>已核对，结束等待</Button>
  </Space>} />

const ChangeButton = ({label, disabled, danger, onConfirm}: {
  label: string; disabled: boolean; danger?: boolean; onConfirm: () => void
}) => <Popconfirm title={`确认${label}此任职资格？`} disabled={disabled} onConfirm={onConfirm}>
  <Button size="small" danger={danger} disabled={disabled}>{label}</Button>
</Popconfirm>
