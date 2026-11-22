import {isPermissionRequirement, type PermissionRequirement} from '@stellar-enclosure/stellar-enclosure-web-shared/permissions'
import type {Definition, DefinitionDetail} from '../registration/registration.api'
import type {RolePermissionGrantView} from './role.api'

export const RESOURCE_DIMENSIONS = ['PAGE', 'MENU', 'BUTTON', 'FIELD', 'API'] as const
export type ResourceDimension = typeof RESOURCE_DIMENSIONS[number]

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

const tokens = (value: unknown): string[] => Array.isArray(value)
  ? value.filter((item): item is string => typeof item === 'string')
  : []

export interface GrantResource {
  readonly identity: Definition
  readonly access: string
  readonly pageKey: string | null
  readonly rules: readonly {label: string; requirement: PermissionRequirement}[]
  readonly codes: readonly string[]
  readonly routes: readonly string[]
  readonly methods: readonly string[]
  readonly principals: readonly string[]
  readonly scopes: readonly string[]
  readonly fieldPath: string
  readonly masker: string | null
}

export const requirementGroups = (requirement: PermissionRequirement) =>
  'allOf' in requirement ? requirement.allOf : [requirement]

/** Projects only a stable index/detail pair from the currently active producer. */
export const projectRoleResource = (
  identity: Definition,
  detail: DefinitionDetail,
  activeProducerVersion: string | null | undefined,
  pages: ReadonlySet<string>,
): GrantResource | null => {
  const value = detail.activeDefinition
  if (!value || identity.state !== 'ACTIVE' || !activeProducerVersion
      || identity.activeProducerVersion !== activeProducerVersion
      || detail.identity.id !== identity.id || detail.identity.key !== identity.key
      || detail.identity.producerId !== identity.producerId || detail.identity.version !== identity.version
      || detail.activeProducerVersion !== activeProducerVersion
      || value.key !== identity.key || value.type !== identity.type) return null
  const target = isRecord(value.target) ? value.target : {}
  const policy = isRecord(value.fieldPolicy) ? value.fieldPolicy : {}
  const access = typeof value.access === 'string' ? value.access : 'UNKNOWN'
  const rules: GrantResource['rules'][number][] = []
  if (access === 'PROTECTED') {
    const candidates = identity.type === 'FIELD'
      ? [['明文读', policy.plainRead], ['脱敏读', policy.maskedRead], ['写入', policy.write]] as const
      : [['匹配条件', value.requirement]] as const
    for (const [label, requirement] of candidates) {
      if (isPermissionRequirement(requirement)) rules.push({label, requirement})
    }
  }
  const explicitPage = [target.pageKey, target.parentKey]
    .find((key): key is string => typeof key === 'string' && pages.has(key))
  return {
    identity, access, rules,
    pageKey: identity.type === 'PAGE' ? identity.key : explicitPage ?? null,
    codes: [...new Set(rules.flatMap(({requirement}) => requirementGroups(requirement)
      .flatMap(group => 'codes' in group ? group.codes : [])))].sort(),
    routes: tokens(target.paths),
    methods: tokens(target.methods),
    principals: tokens(value.allowedPrincipals),
    scopes: tokens(value.oauthScopes),
    fieldPath: [target.dto, target.property].filter(value => typeof value === 'string').join('.'),
    masker: typeof policy.masker === 'string' ? policy.masker : null,
  }
}

export const permissionCodes = (grants: RolePermissionGrantView) =>
  grants.permissions.map(permission => permission.permissionCode).sort()

export const grantChanges = (baseline: readonly string[], intended: readonly string[]) => {
  const original = new Set(baseline)
  const selected = new Set(intended)
  return {
    added: [...selected].filter(code => !original.has(code)).sort(),
    removed: [...original].filter(code => !selected.has(code)).sort(),
  }
}

export const rebaseGrantCodes = (baseline: readonly string[], intended: readonly string[], current: readonly string[]) => {
  const {added, removed} = grantChanges(baseline, intended)
  const next = new Set(current)
  removed.forEach(code => next.delete(code))
  added.forEach(code => next.add(code))
  return [...next].sort()
}

export interface GrantPeriod {readonly validFrom: string | null; readonly validTo: string | null}
export interface GrantPeriodEdits {readonly from?: string; readonly to?: string}

const ISO_WITH_OFFSET = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(\.\d{1,9})?(Z|([+-])(\d{2}):(\d{2}))$/

/** Moves whole seconds to UTC and keeps the supplied fractional digits. */
export const canonicalGrantInstant = (value: string): string | undefined => {
  const match = ISO_WITH_OFFSET.exec(value.trim())
  if (!match) return undefined
  const [, local, fraction, , offsetSign, hours, minutes] = match
  const localMillis = Date.parse(local + 'Z')
  if (!Number.isFinite(localMillis) || new Date(localMillis).toISOString().slice(0, 19) !== local) return undefined
  const hoursNumber = Number(hours ?? 0)
  const minutesNumber = Number(minutes ?? 0)
  if (hoursNumber > 18 || minutesNumber >= 60 || (hoursNumber === 18 && minutesNumber > 0)) return undefined
  const offset = (hoursNumber * 60 + minutesNumber) * (offsetSign === '-' ? -1 : 1)
  const utc = new Date(localMillis - offset * 60_000).toISOString()
  return /^\d{4}-/.test(utc) ? utc.slice(0, 19) + (fraction ?? '') + 'Z' : undefined
}

const instantNanos = (utc: string): bigint => {
  const fractional = utc.slice(19, -1).replace(/^\./, '').padEnd(9, '0')
  return BigInt(Date.parse(utc.slice(0, 19) + 'Z')) * 1_000_000n + BigInt(fractional)
}

export const grantWindow = (original: GrantPeriod | undefined, edits: GrantPeriodEdits, now = Date.now()): GrantPeriod | undefined => {
  const from = edits.from ?? original?.validFrom ?? ''
  const to = edits.to ?? original?.validTo ?? ''
  const utcFrom = from.trim() ? canonicalGrantInstant(from) : null
  const utcTo = to.trim() ? canonicalGrantInstant(to) : null
  if (utcFrom === undefined || utcTo === undefined) return undefined
  if (utcTo && instantNanos(utcTo) <= (utcFrom ? instantNanos(utcFrom) : BigInt(now) * 1_000_000n)) return undefined
  return {
    validFrom: edits.from === undefined ? original?.validFrom ?? null : utcFrom,
    validTo: edits.to === undefined ? original?.validTo ?? null : utcTo,
  }
}

export const hasCompleteGrantBaseline = (value: RolePermissionGrantView): boolean => {
  if (typeof value.version !== 'string' || typeof value.catalogVersion !== 'string'
      || !/^(0|[1-9]\d*)$/.test(value.version) || !/^(0|[1-9]\d*)$/.test(value.catalogVersion)
      || !Array.isArray(value.permissions)) return false
  const seen = new Set<string>()
  return value.permissions.every(permission => {
    if (typeof permission.permissionCode !== 'string' || !/^[A-Za-z][A-Za-z0-9_.:-]{0,127}$/.test(permission.permissionCode)
        || seen.has(permission.permissionCode) || typeof permission.validFrom !== 'string'
        || !canonicalGrantInstant(permission.validFrom)
        || (permission.validTo !== null && (typeof permission.validTo !== 'string'
          || !grantWindow(permission, {})))) return false
    seen.add(permission.permissionCode)
    return true
  })
}
