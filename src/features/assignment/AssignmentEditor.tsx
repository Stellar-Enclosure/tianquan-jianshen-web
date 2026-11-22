import type {ReactNode} from 'react'
import {Alert, Button, Form, Input, InputNumber, Modal, Select, Space} from 'antd'
import {useWritableFields} from '../../permissions/FieldCatalog'
import type {ManageableRoleView} from '../management-policy/managementPolicy.api'
import {canonicalUtcInstant, utcInstantNanos} from '../shared/utcInstants'
import type {AssignmentView, CreateAssignmentCommand} from './assignment.api'

interface AssignmentForm {
  readonly roleId: string
  readonly validFrom: string
  readonly validTo?: string
  readonly assignmentType: string
  readonly reason?: string
  readonly ticketNo?: string
}

export interface AssignmentEditorProps {
  readonly open: boolean
  readonly saving: boolean
  readonly blocked: boolean
  readonly expectedUserAuthVersion: number
  readonly assignments: readonly AssignmentView[]
  readonly roles: readonly ManageableRoleView[]
  readonly rolesLoading: boolean
  readonly rolesError?: unknown
  readonly error?: unknown
  readonly recovery?: ReactNode
  readonly onSearchRoles: (value: string) => void
  readonly onCancel: () => void
  readonly onSave: (command: CreateAssignmentCommand) => void
}

const blocksOverlap = new Set(['PENDING', 'ACTIVE', 'SUSPENDED'])
const overlaps = (assignments: readonly AssignmentView[], roleId: string, from: string, to: string | null) =>
  assignments.some(assignment => {
    if (assignment.roleId !== roleId || !blocksOverlap.has(assignment.status)) return false
    const existingFrom = canonicalUtcInstant(assignment.validFrom)
    const existingTo = assignment.validTo === null ? null : canonicalUtcInstant(assignment.validTo)
    if (!existingFrom || existingTo === undefined) return true
    return (!to || utcInstantNanos(existingFrom) < utcInstantNanos(to))
      && (!existingTo || utcInstantNanos(existingTo) > utcInstantNanos(from))
  })

export const AssignmentEditor = ({
  open, saving, blocked, error, expectedUserAuthVersion, assignments, roles, rolesLoading, rolesError, recovery,
  onSearchRoles, onCancel, onSave,
}: AssignmentEditorProps) => {
  const fieldsWritable = useWritableFields('AssignRequestDTO')
  const [form] = Form.useForm<AssignmentForm>()
  const disabled = !fieldsWritable || blocked || saving
  const handleSubmit = (values: AssignmentForm) => {
    if (disabled || !roles.some(role => role.roleId === values.roleId)) return
    const from = canonicalUtcInstant(values.validFrom)
    const to = values.validTo?.trim() ? canonicalUtcInstant(values.validTo) : null
    if (!from || to === undefined || (to !== null && utcInstantNanos(to) <= utcInstantNanos(from))) return
    if (overlaps(assignments, values.roleId, from, to)) {
      form.setFields([{name: 'validFrom', errors: ['同一角色已有重叠的任职时段']}])
      return
    }
    onSave({
      roleId: values.roleId,
      validFrom: from,
      validTo: to,
      assignmentType: values.assignmentType,
      reason: values.reason?.trim() || null,
      ticketNo: values.ticketNo?.trim() || null,
      expectedUserAuthVersion,
    })
  }
  return (
    <Modal title="新增任职资格" open={open} footer={null}
      closable={!saving} keyboard={!saving} mask={{closable: !saving}} onCancel={onCancel} destroyOnHidden>
      {error instanceof Error && <Alert type="error" showIcon title={error.message} />}
      {recovery}
      {rolesError instanceof Error && <Alert type="error" showIcon title="可管理角色读取失败" />}
      <Form<AssignmentForm> disabled={disabled} form={form} preserve={false} layout="vertical"
        initialValues={{assignmentType: 'DIRECT'}} onFinish={handleSubmit}>
        <Form.Item label="查找可管理角色">
          <Input.Search aria-label="查找可管理角色" placeholder="角色名称、编码或 ID" onSearch={onSearchRoles} allowClear />
        </Form.Item>
        <Form.Item name="roleId" label="角色" rules={[{required: true}]}>
          <Select loading={rolesLoading} disabled={rolesLoading || Boolean(rolesError)}
            options={roles.map(role => ({value: role.roleId, label: `${role.roleName} · ${role.roleCode}`}))} />
        </Form.Item>
        <Form.Item name="assignmentType" label="资格类型" rules={[{required: true}]}>
          <Select options={[
            {value: 'DIRECT', label: 'DIRECT'}, {value: 'TEMPORARY', label: 'TEMPORARY'},
            {value: 'EMERGENCY', label: 'EMERGENCY'},
          ]} />
        </Form.Item>
        <Form.Item name="validFrom" label="生效时间" rules={[{required: true}, {
          validator: (_rule, value: string | undefined) => !value || canonicalUtcInstant(value)
            ? Promise.resolve() : Promise.reject(new Error('请输入 UTC 或含时区偏移的 ISO 时间')),
        }]}>
          <Input placeholder="2030-10-01T09:00:00+08:00" />
        </Form.Item>
        <Form.Item name="validTo" label="失效时间" dependencies={['validFrom']} rules={[({getFieldValue}) => ({
          validator: (_rule, value: string | undefined) => {
            if (!value?.trim()) return Promise.resolve()
            const to = canonicalUtcInstant(value)
            const from = canonicalUtcInstant(String(getFieldValue('validFrom') ?? ''))
            return to && (!from || utcInstantNanos(to) > utcInstantNanos(from)) ? Promise.resolve()
              : Promise.reject(new Error('请输入带偏移并晚于生效时间的值'))
          },
        })]}>
          <Input placeholder="留空表示不设截止" />
        </Form.Item>
        <Form.Item name="reason" label="原因"><Input.TextArea rows={2} /></Form.Item>
        <Form.Item name="ticketNo" label="外部工单号"><Input /></Form.Item>
        <Form.Item label="目标用户授权版本">
          <InputNumber aria-label="目标用户授权版本" value={expectedUserAuthVersion} readOnly style={{width: '100%'}} />
        </Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" disabled={disabled || rolesLoading || Boolean(rolesError)} loading={saving}>保存资格</Button>
          <Button disabled={saving} onClick={onCancel}>关闭</Button>
        </Space>
      </Form>
    </Modal>
  )
}
