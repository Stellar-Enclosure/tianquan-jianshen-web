import {definePermissionReferences, defineResourceReferences} from '@stellar-enclosure/stellar-enclosure-web-shared/permissions'
import {permissionSystemRolePermissionManage, permissionSystemRolePermissionRead,
  fieldReplaceRolePermissionsRequestDTOExpectedVersion, fieldReplaceRolePermissionsRequestDTOPermissionCodes,
  fieldReplaceRolePermissionsRequestDTOTarget, fieldReplaceRolePermissionsRequestDTOValidFrom,
  fieldReplaceRolePermissionsRequestDTOValidTo} from '../../../.generated/permissions/backend-references'

export const rolePermissionReferences = definePermissionReferences([
  permissionSystemRolePermissionManage, permissionSystemRolePermissionRead,
] as const)

const expectedVersionField = {key: fieldReplaceRolePermissionsRequestDTOExpectedVersion, usage: 'FORM_FIELD'} as const
const permissionCodesField = {key: fieldReplaceRolePermissionsRequestDTOPermissionCodes, usage: 'FORM_FIELD'} as const
const targetField = {key: fieldReplaceRolePermissionsRequestDTOTarget, usage: 'FORM_FIELD'} as const
const validFromField = {key: fieldReplaceRolePermissionsRequestDTOValidFrom, usage: 'FORM_FIELD'} as const
const validToField = {key: fieldReplaceRolePermissionsRequestDTOValidTo, usage: 'FORM_FIELD'} as const

export const rolePermissionFieldReferences = defineResourceReferences([
  expectedVersionField, permissionCodesField, targetField, validFromField, validToField,
] as const)

export const rolePermissionInputFields = {
  ReplaceRolePermissionsRequestDTO: [
    expectedVersionField.key, permissionCodesField.key, targetField.key, validFromField.key, validToField.key,
  ],
} as const

export const rolePermissionButtons = [{
  key: 'tianquan-jianshen.button.rolePermissions.save',
  type: 'BUTTON',
  target: {action: 'rolePermissions.save'},
  requirement: {mode: 'ALL', codes: [permissionSystemRolePermissionManage]},
  i18n: {pageCode: 'tianquan-jianshen.web.permissions', labelKey: 'tianquan-jianshen.button.rolePermissions.save'},
}] as const
