import {usePlainReadFields, useWritableFields} from '../../permissions/FieldCatalog'
import {ResourceGuard, useResourcePermission} from '../../permissions/ResourceGuard'
import {roleEditReferences} from '../../permissions/resources'
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query'
import {Alert, Button, Descriptions, Drawer, Form, Input, InputNumber, Modal, Select, Space, Table, Tag, Typography} from 'antd'
import {useEffect, useRef, useState} from 'react'
import {Link} from 'react-router-dom'
import {useRbac3Authorization} from '@stellar-enclosure/stellar-enclosure-tianquan-jianshen-react-sdk'
import {ApiError, PageState, WorkspaceList, useEmbeddedWorkbench} from '@stellar-enclosure/stellar-enclosure-web-shared'
import {permissionContextKey} from '@stellar-enclosure/stellar-enclosure-web-shared/permissions'
import {useFeatureApi, useFeatureTenantContext} from '../shared/FeatureApi'
import {roleApi, type CreateRoleCommand, type RoleEditDetailView, type RoleView, type UpdateRoleCommand} from './role.api'

export interface RoleGraphPageProps {
  readonly applicationId?: string
}

const EDIT_ROLE_BUTTON = 'tianquan-jianshen.button.RoleGraphPage.update1'
const CREATE_ROLE_BUTTON = 'tianquan-jianshen.button.RoleGraphPage.create1'
const PAGE_SIZE = 20
const roleEditDetailFieldKeys = roleEditReferences.filter(reference => reference.usage === 'DETAIL_FIELD')
  .map(reference => reference.key)

type RoleFormValues = {
  applicationId?: string
  roleCode?: string
  roleName: string
  roleType: string
  riskLevel: string
  privileged: boolean
  status: string
  landingRouteId?: string | null
  landingPriority: number
  maximumAssignmentDays?: number | null
}

type RoleFilters = {applicationId?: string; search?: string; status?: string}
type EditValues = Omit<UpdateRoleCommand, 'expectedRoleVersion'>
type RoleEditor = {kind: 'create'} | {kind: 'edit'; role: RoleView; session: number}
type RoleSave = {kind: 'create'; command: CreateRoleCommand}
  | {kind: 'edit'; original: RoleEditDetailView; values: EditValues}

const editValues = (detail: RoleEditDetailView): EditValues => ({
  roleName: detail.roleName,
  status: detail.status,
  landingRouteId: detail.landingRouteId,
  landingPriority: detail.landingPriority,
  maximumAssignmentDays: detail.maximumAssignmentDays,
})

const editLabels = {
  roleName: '角色名称',
  status: '状态',
  landingRouteId: '落地路由 ID',
  landingPriority: '落地优先级',
  maximumAssignmentDays: '最长任职天数',
} satisfies Record<keyof EditValues, string>
const editKeys = Object.keys(editLabels) as Array<keyof EditValues>

type InheritanceFormValues = {
  applicationId: string
  juniorRoleId: string
  expectedRoleVersion: number
}

const roleTypes = [
  {value: 'PUBLIC', label: '公共角色'},
  {value: 'POSITION', label: '岗位角色'},
  {value: 'MANAGEMENT', label: '管理角色'},
  {value: 'TEMPORARY', label: '临时角色'},
  {value: 'EMERGENCY', label: '应急角色'},
]

const riskLevels = [
  {value: 'LOW', label: '低风险'},
  {value: 'MEDIUM', label: '中风险'},
  {value: 'HIGH', label: '高风险'},
]

const statusOptions = [
  {value: 'ACTIVE', label: '启用'},
  {value: 'DISABLED', label: '停用'},
  {value: 'ARCHIVED', label: '归档'},
]

export const RoleGraphPage = (props: RoleGraphPageProps) => {
  const {binding, status} = useRbac3Authorization()
  const contextKey = status === 'READY' && binding ? permissionContextKey(binding) : null
  return <RoleGraph key={JSON.stringify([contextKey, props.applicationId])} {...props} contextKey={contextKey} />
}

const RoleGraph = ({applicationId, contextKey}: RoleGraphPageProps & {contextKey: string | null}) => {
  const {embedded} = useEmbeddedWorkbench()
  const {effectiveTenantId} = useFeatureTenantContext()
  const api = roleApi(useFeatureApi())
  const queryClient = useQueryClient()
  const [editor, setEditor] = useState<RoleEditor | null>(null)
  const nextSession = useRef(0)
  const [inheritanceRole, setInheritanceRole] = useState<RoleView | null>(null)
  const [impactRole, setImpactRole] = useState<RoleView | null>(null)
  const [filters, setFilters] = useState<RoleFilters>({applicationId})
  const [page, setPage] = useState(1)
  const [review, setReview] = useState<Extract<RoleSave, {kind: 'edit'}> | null>(null)
  const [roleForm] = Form.useForm<RoleFormValues>()
  const [inheritanceForm] = Form.useForm<InheritanceFormValues>()
  const editingRole = editor?.kind === 'edit' ? editor.role : null
  const ready = contextKey !== null && effectiveTenantId !== null
  const canEdit = useResourcePermission(EDIT_ROLE_BUTTON)
  const canCreate = useResourcePermission(CREATE_ROLE_BUTTON)
  const detailReadable = usePlainReadFields(roleEditDetailFieldKeys)
  const fieldsWritable = useWritableFields(editingRole ? 'UpdateRoleRequestDTO' : 'CreateRoleRequestDTO')
  const inheritanceWritable = useWritableFields('InheritanceRequestDTO')

  const roles = useQuery({
    queryKey: ['tianquan-jianshen', 'roles', contextKey, effectiveTenantId, filters.applicationId ?? 'all'],
    queryFn: () => api.roles(filters.applicationId),
    enabled: ready,
  })
  const impact = useQuery({
    queryKey: ['tianquan-jianshen', 'role-impact', contextKey, effectiveTenantId, impactRole?.roleId],
    queryFn: () => api.impact(impactRole!.roleId),
    enabled: ready && impactRole !== null,
  })
  const detail = useQuery({
    queryKey: ['tianquan-jianshen', 'role-edit-detail', contextKey, effectiveTenantId,
      editingRole?.applicationId, editingRole?.roleId, editor?.kind === 'edit' ? editor.session : null],
    queryFn: ({signal}) => api.roleEditDetail(editingRole!.roleId, editingRole!.applicationId, signal),
    enabled: ready && canEdit && detailReadable && editingRole !== null,
    gcTime: 0,
    staleTime: Infinity,
    retry: false,
  })
  const original = detail.data
  const detailAvailable = editingRole !== null && original !== undefined && detailReadable && canEdit
    && !detail.isFetching && !detail.isError
  const editorWritable = ready && fieldsWritable && (editingRole ? detailAvailable && !review : canCreate)

  useEffect(() => {
    if (editingRole && detailReadable && canEdit && original) roleForm.setFieldsValue(editValues(original))
  }, [canEdit, detailReadable, editingRole, original, roleForm])

  const refreshRoles = async () => {
    await Promise.all([
      queryClient.invalidateQueries({queryKey: ['tianquan-jianshen', 'roles']}),
      queryClient.invalidateQueries({queryKey: ['tianquan-jianshen', 'role-impact']}),
    ])
  }

  const saveRole = useMutation({
    mutationFn: (change: RoleSave) => change.kind === 'edit'
      ? api.update(change.original.roleId, {...change.values, expectedRoleVersion: change.original.version})
      : api.create(change.command),
    retry: false,
    onSuccess: async () => {
      setEditor(null)
      setReview(null)
      await refreshRoles()
    },
    onError: async (error, change) => {
      if (change.kind === 'edit' && (!(error instanceof ApiError) || error.status === 409 || error.retryable)) {
        setReview(change)
        await detail.refetch()
      }
    },
  })

  const applyReviewedChanges = () => {
    if (!review || !original || !detailAvailable || !fieldsWritable) return
    const changed = Object.fromEntries(editKeys.filter(key => review.values[key] !== review.original[key])
      .map(key => [key, review.values[key]]))
    roleForm.setFieldsValue({...editValues(original), ...changed})
    setReview(null)
    saveRole.reset()
  }

  const addInheritance = useMutation({
    mutationFn: (values: InheritanceFormValues) => {
      if (!inheritanceRole) throw new Error('ROLE_REQUIRED')
      return api.addInheritance(inheritanceRole.roleId, {
        applicationId: values.applicationId.trim(),
        juniorRoleId: values.juniorRoleId.trim(),
        expectedRoleVersion: values.expectedRoleVersion,
      })
    },
    onSuccess: async () => {
      setInheritanceRole(null)
      await refreshRoles()
    },
  })

  const removeInheritance = useMutation({
    mutationFn: (values: InheritanceFormValues) => {
      if (!inheritanceRole) throw new Error('ROLE_REQUIRED')
      return api.removeInheritance(inheritanceRole.roleId, values.juniorRoleId.trim(), {
        applicationId: values.applicationId.trim(),
        expectedRoleVersion: values.expectedRoleVersion,
      })
    },
    onSuccess: async () => {
      setInheritanceRole(null)
      await refreshRoles()
    },
  })

  const closeEditor = () => {
    setEditor(null)
    setReview(null)
    saveRole.reset()
  }

  const openCreate = () => {
    saveRole.reset()
    roleForm.resetFields()
    roleForm.setFieldsValue({
      applicationId: filters.applicationId ?? '',
      roleType: 'PUBLIC',
      riskLevel: 'LOW',
      privileged: false,
      status: 'ACTIVE',
      landingPriority: 0,
      maximumAssignmentDays: null,
    })
    setEditor({kind: 'create'})
  }

  const openEdit = (role: RoleView) => {
    if (!ready || !canEdit) return
    saveRole.reset()
    setReview(null)
    roleForm.resetFields()
    setEditor({kind: 'edit', role, session: ++nextSession.current})
  }

  const openInheritance = (role: RoleView) => {
    setInheritanceRole(role)
    inheritanceForm.setFieldsValue({
      applicationId: role.applicationId,
      juniorRoleId: '',
      expectedRoleVersion: role.version,
    })
  }

  const submitRole = (values: RoleFormValues) => {
    if (!editorWritable || saveRole.isPending || saveDenied || editor === null) return
    const roleValues = {
      roleName: values.roleName.trim(),
      landingRouteId: values.landingRouteId?.trim() || null,
      landingPriority: values.landingPriority,
      maximumAssignmentDays: values.maximumAssignmentDays ?? null,
    }
    if (editor.kind === 'edit' && original) {
      saveRole.mutate({kind: 'edit', original, values: {...roleValues, status: values.status}})
    } else if (editor.kind === 'create') {
      saveRole.mutate({kind: 'create', command: {
        ...roleValues,
        applicationId: values.applicationId!.trim(),
        roleCode: values.roleCode!.trim(),
        roleType: values.roleType,
        riskLevel: values.riskLevel,
        privileged: values.privileged,
      }})
    }
  }

  const submitInheritance = async () => {
    try {
      if (inheritanceWritable) addInheritance.mutate(await inheritanceForm.validateFields())
    } catch {
      return
    }
  }

  const submitRemoveInheritance = async () => {
    try {
      if (inheritanceWritable) removeInheritance.mutate(await inheritanceForm.validateFields())
    } catch {
      return
    }
  }

  const search = filters.search?.trim().toLocaleLowerCase()
  const filtered = (roles.data ?? []).filter(role => (!filters.status || role.status === filters.status)
    && (!search || role.roleName.toLocaleLowerCase().includes(search) || role.roleCode.toLocaleLowerCase().includes(search)))
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / PAGE_SIZE)))
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const relationError = addInheritance.error ?? removeInheritance.error
  const impactSummary = impact.data?.roleId === impactRole?.roleId ? impact.data : undefined
  const editFailed = detail.isError ? detail.error : null
  const saveDenied = saveRole.error instanceof ApiError && (saveRole.error.status === 401 || saveRole.error.status === 403)

  return (
    <>
      <WorkspaceList
        ariaLabel="角色管理"
        filters={(
          <Form<RoleFilters> layout="inline" initialValues={{applicationId}} onFinish={values => {
            setFilters({...values, applicationId: values.applicationId?.trim() || undefined})
            setPage(1)
          }}>
            <Form.Item label="应用 ID" name="applicationId"><Input allowClear /></Form.Item>
            <Form.Item label="角色名称或编码" name="search"><Input allowClear /></Form.Item>
            <Form.Item label="状态" name="status"><Select allowClear options={statusOptions} style={{minWidth: 112}} /></Form.Item>
            <Button type="primary" htmlType="submit">查询</Button>
          </Form>
        )}
        toolbar={(
          <>
            {!embedded && <Typography.Text strong>角色管理</Typography.Text>}
            <Space wrap>
              <Button onClick={() => {void refreshRoles()}} disabled={!ready}>刷新</Button>
              <ResourceGuard resourceKey={CREATE_ROLE_BUTTON}>
                <Button type="primary" onClick={openCreate}>新建角色</Button>
              </ResourceGuard>
            </Space>
            {relationError && <Alert type="error" showIcon title={relationError.message} />}
          </>
        )}
        pageState={{loading: !ready || roles.isPending, error: roles.error, empty: filtered.length === 0}}
        pagination={{mode: 'page', current: currentPage, pageSize: PAGE_SIZE, total: filtered.length, onChange: setPage}}
        table={(
          <Table<RoleView> rowKey="roleId" dataSource={visible} pagination={false} scroll={{x: 'max-content'}}
            columns={[
              {title: '角色名称', dataIndex: 'roleName'},
              {title: '角色编码', dataIndex: 'roleCode'},
              {title: '应用 ID', dataIndex: 'applicationId'},
              {title: '类型', dataIndex: 'roleType',
                render: (value: string) => roleTypes.find(type => type.value === value)?.label ?? value},
              {title: '状态', dataIndex: 'status',
                render: (value: string) => <Tag>{statusOptions.find(option => option.value === value)?.label ?? value}</Tag>},
              {title: '风险', dataIndex: 'riskLevel'},
              {title: '版本', dataIndex: 'version'},
              {title: '操作', render: (_value: unknown, role: RoleView) => (
                <Space size="small" wrap>
                  <Button size="small" onClick={() => setImpactRole(role)}>角色关系</Button>
                  <ResourceGuard resourceKey={EDIT_ROLE_BUTTON}>
                    <Button size="small" onClick={() => openEdit(role)}>编辑</Button>
                  </ResourceGuard>
                  <ResourceGuard resourceKey="tianquan-jianshen.button.RoleGraphPage.manage1">
                    <Button size="small" onClick={() => openInheritance(role)}>继承管理</Button>
                  </ResourceGuard>
                  <ResourceGuard resourceKey="tianquan-jianshen.button.RoleGraphPage.read1">
                    <Link to={`/iam/roles/${encodeURIComponent(role.roleId)}/permissions`}>权限字符授权</Link>
                  </ResourceGuard>
                </Space>
              )},
            ]} />
        )}
      />

      <Modal
        open={editor !== null}
        title={editingRole ? '编辑角色' : '新建角色'}
        okButtonProps={{disabled: !editorWritable || saveDenied}}
        cancelButtonProps={{disabled: saveRole.isPending}}
        closable={!saveRole.isPending}
        keyboard={!saveRole.isPending}
        mask={{closable: !saveRole.isPending}}
        onCancel={closeEditor}
        onOk={() => roleForm.submit()}
        okText="保存"
        confirmLoading={saveRole.isPending}
        destroyOnHidden
      >
        {editingRole && (
          <>
            {(!canEdit || !detailReadable) &&
              <Alert type="warning" showIcon title="角色详情字段当前不可读取，暂不能保存" />}
            {canEdit && detailReadable && detail.isFetching &&
              <Typography.Paragraph role="status">正在读取角色原配置…</Typography.Paragraph>}
            {editFailed && <Alert type="error" showIcon title="角色详情不可用于编辑"
              description={editFailed instanceof ApiError ? editFailed.message : undefined}
              action={<Button size="small" disabled={!canEdit || !detailReadable || detail.isFetching}
                onClick={() => {void detail.refetch()}}>重新读取</Button>} />}
          </>
        )}
        {saveRole.error && !review &&
          <Alert type="error" showIcon title="角色变更失败"
            description={saveRole.error.message} />}
        {review && <Alert type="warning" showIcon title="提交结果需要复核"
          description={(
            <>
              <p>已保留本次修改。核对当前配置后再决定是否提交。</p>
              {detailAvailable && original && (
                <ul>
                  {editKeys.filter(key => review.values[key] !== review.original[key]).map(key => (
                    <li key={key}>{editLabels[key]}：当前 {original[key] ?? '未设置'}，本次 {review.values[key] ?? '未设置'}</li>
                  ))}
                </ul>
              )}
              <Button size="small" onClick={applyReviewedChanges}
                disabled={!detailAvailable || !fieldsWritable}>确认后继续编辑</Button>
            </>
          )} />}
        <Form disabled={!editorWritable || saveRole.isPending || saveDenied} form={roleForm}
          layout="vertical" onFinish={submitRole}
          style={editingRole && (!detailAvailable || saveDenied) ? {display: 'none'} : undefined}>
          {!editingRole && (
            <>
              <Form.Item name="applicationId" label="应用 ID" rules={[{required: true, whitespace: true}]}>
                <Input />
              </Form.Item>
              <Form.Item name="roleCode" label="角色编码" rules={[{required: true, whitespace: true}]}>
                <Input />
              </Form.Item>
              <Form.Item name="roleType" label="角色类型" rules={[{required: true}]}>
                <Select options={roleTypes} />
              </Form.Item>
              <Form.Item name="riskLevel" label="风险等级" rules={[{required: true}]}>
                <Select options={riskLevels} />
              </Form.Item>
              <Form.Item name="privileged" label="特权角色" rules={[{required: true}]}>
                <Select options={[{value: false, label: '普通'}, {value: true, label: '特权'}]} />
              </Form.Item>
            </>
          )}
          <Form.Item name="roleName" label="角色名称" rules={[{required: true, whitespace: true, max: 200}]}>
            <Input />
          </Form.Item>
          {editingRole && (
            <Form.Item name="status" label="状态" rules={[{required: true}]}>
              <Select options={statusOptions} />
            </Form.Item>
          )}
          <Form.Item name="landingRouteId" label="落地路由 ID" rules={[{pattern: /^[1-9][0-9]{0,18}$/}]}>
            <Input allowClear />
          </Form.Item>
          <Form.Item name="landingPriority" label="落地优先级"
            rules={[{required: true, type: 'integer', min: 0, max: 2_147_483_647}]}>
            <InputNumber min={0} max={2_147_483_647} precision={0} style={{width: '100%'}} />
          </Form.Item>
          <Form.Item name="maximumAssignmentDays" label="最长任职天数"
            rules={[{type: 'integer', min: 1, max: 2_147_483_647}]}>
            <InputNumber min={1} max={2_147_483_647} precision={0} style={{width: '100%'}} />
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        open={inheritanceRole !== null} okButtonProps={{disabled: !inheritanceWritable}}
        title={inheritanceRole ? `继承管理：${inheritanceRole.roleName}` : ''}
        onCancel={() => setInheritanceRole(null)}
        onOk={() => { void submitInheritance() }}
        okText="添加继承"
        confirmLoading={addInheritance.isPending}
        destroyOnHidden
        footer={(_, {OkBtn, CancelBtn}) => (
          <Space>
            <Button danger disabled={!inheritanceWritable} loading={removeInheritance.isPending} onClick={() => { void submitRemoveInheritance() }}>
              删除继承
            </Button>
            <CancelBtn />
            <OkBtn />
          </Space>
        )}
      >
        <Form disabled={!inheritanceWritable} form={inheritanceForm} layout="vertical">
          <Form.Item name="applicationId" label="应用 ID" rules={[{required: true}]}>
            <Input />
          </Form.Item>
          <Form.Item name="juniorRoleId" label="下级角色 ID" rules={[{required: true}]}>
            <Input />
          </Form.Item>
          <Form.Item name="expectedRoleVersion" label="期望角色版本" rules={[{required: true, type: 'number', min: 0}]}>
            <InputNumber min={0} precision={0} style={{width: '100%'}} />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        open={impactRole !== null}
        title={impactRole ? `角色关系：${impactRole.roleName}` : ''}
        onClose={() => setImpactRole(null)}
        size="large"
      >
        <PageState loading={impact.isPending} error={impact.error} empty={!impactSummary}>
          {impactSummary && (
            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="层级">
                {impactSummary.activationRoots.includes(impactSummary.roleId) ? 'Root' :
                  impactSummary.activationRoots.length > 0 ? 'Child' : '未返回激活根'}
              </Descriptions.Item>
              <Descriptions.Item label="角色族">{impactSummary.roleFamily.join(', ') || '-'}</Descriptions.Item>
              <Descriptions.Item label="激活根">{impactSummary.activationRoots.join(', ') || '-'}</Descriptions.Item>
              <Descriptions.Item label="有效族风险">{impactSummary.effectiveFamilyRisk}</Descriptions.Item>
              <Descriptions.Item label="权限数">{impactSummary.permissionCount}</Descriptions.Item>
              <Descriptions.Item label="冲突">{impactSummary.conflicts.join(', ') || '-'}</Descriptions.Item>
            </Descriptions>
          )}
        </PageState>
      </Drawer>
    </>
  )
}
