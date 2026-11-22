import {describe, expect, it} from 'vitest'
import {definition} from '../../test/catalog'
import {
  canonicalGrantInstant, grantChanges, grantWindow,
  projectRoleResource, rebaseGrantCodes, type GrantPeriod,
} from './rolePermissionView'

describe('role permission projection', () => {
  const field = {...definition, id: '220', type: 'FIELD', key: 'order.field.customer', meaning: '客户'}
  const detail = {
    identity: field,
    activeProducerVersion: '1',
    activeDefinition: {
      key: field.key, type: 'FIELD', access: 'PROTECTED', target: {pageKey: 'order.page.detail'},
      fieldPolicy: {
        plainRead: {allOf: [{mode: 'ALL', codes: ['order:read']}, {mode: 'ANY', codes: ['customer:read', 'order:manage']}]},
        maskedRead: {mode: 'ALL', codes: ['order:read']},
        write: {mode: 'ANY', codes: ['order:manage', 'order:write']}, masker: 'FIXED',
      },
    },
  }

  it('keeps field effects and requirement groups explicit while deduplicating the linked codes', () => {
    const row = projectRoleResource(field, detail, '1', new Set(['order.page.detail']))
    expect(row).toMatchObject({pageKey: 'order.page.detail', masker: 'FIXED'})
    expect(row?.rules.map(rule => rule.label)).toEqual(['明文读', '脱敏读', '写入'])
    expect(row?.codes).toEqual(['customer:read', 'order:manage', 'order:read', 'order:write'])
    expect(row?.rules[0].requirement).toHaveProperty('allOf')
    expect(projectRoleResource(field, detail, '1', new Set())?.pageKey).toBeNull()
    expect(projectRoleResource(field, {...detail, activeProducerVersion: '2'}, '1', new Set())).toBeNull()
  })

  it.each(['PUBLIC', 'INTERNAL'])('treats %s as classification without grant shortcuts', access => {
    const row = projectRoleResource(field, {...detail, activeDefinition: {...detail.activeDefinition, access}}, '1', new Set())
    expect(row?.codes).toEqual([])
  })

  it('preserves all existing codes and rebases only the original draft changes', () => {
    expect(grantChanges(['order:hidden', 'order:read'], ['order:hidden', 'order:write'])).toEqual({
      added: ['order:write'], removed: ['order:read'],
    })
    expect(rebaseGrantCodes(['order:hidden', 'order:read'], ['order:hidden', 'order:write'],
      ['order:hidden', 'order:read', 'order:concurrent'])).toEqual(['order:concurrent', 'order:hidden', 'order:write'])
  })

  it('retains fractional precision, requires an offset, and distinguishes DST overlap instants', () => {
    expect(canonicalGrantInstant('2030-04-07T01:02:03.123456789+05:30')).toBe('2030-04-06T19:32:03.123456789Z')
    expect(canonicalGrantInstant('2026-11-01T01:30:00-04:00')).toBe('2026-11-01T05:30:00Z')
    expect(canonicalGrantInstant('2026-11-01T01:30:00-05:00')).toBe('2026-11-01T06:30:00Z')
    expect(canonicalGrantInstant('2026-11-01T01:30:00')).toBeUndefined()
    expect(canonicalGrantInstant('2026-02-31T01:30:00Z')).toBeUndefined()
  })

  it('preserves unchanged UTC bounds and checks interval order below millisecond precision', () => {
    const original: GrantPeriod = {
      validFrom: '2030-01-02T03:04:05.123456Z', validTo: '2030-01-02T03:04:05.123457Z',
    }
    expect(grantWindow(original, {})).toEqual(original)
    expect(grantWindow(original, {to: '2030-01-02T03:04:05.123455Z'})).toBeUndefined()
    expect(grantWindow(original, {to: ''})).toEqual({validFrom: original.validFrom, validTo: null})
    expect(grantWindow(undefined, {}, Date.parse('2030-01-01T00:00:00Z'))).toEqual({validFrom: null, validTo: null})
    expect(grantWindow(undefined, {to: '2029-12-31T23:59:59Z'}, Date.parse('2030-01-01T00:00:00Z'))).toBeUndefined()
  })
})
