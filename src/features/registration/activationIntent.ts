import {catalogScopeKey, isCatalogScope, type CatalogScope} from '@stellar-enclosure/stellar-enclosure-web-shared/permissions'
import type {ActivationCommand} from './registration.api'

export interface ActivationIntent {
  readonly command: ActivationCommand
  readonly requiresManage: boolean
  readonly qualificationsExpireAt: readonly string[]
}
const storageKey = (issuer: string, subject: string, target: CatalogScope) =>
  'egon.permission-activation.' + encodeURIComponent(JSON.stringify([issuer, subject, catalogScopeKey(target)]))
const decimal = (value: unknown) => typeof value === 'string' && /^(?:0|[1-9][0-9]{0,18})$/.test(value)
  && BigInt(value) <= 9_223_372_036_854_775_807n

/** Recovery metadata only; it carries no credential and is never replayed automatically. */
export const storeActivationIntent = (issuer: string, subject: string, target: CatalogScope, intent: ActivationIntent | null) => {
  const key = storageKey(issuer, subject, target)
  if (intent === null) window.sessionStorage.removeItem(key)
  else window.sessionStorage.setItem(key, JSON.stringify(intent))
}
export const loadActivationIntent = (issuer: string, subject: string, target: CatalogScope): ActivationIntent | null => {
  const serialized = window.sessionStorage.getItem(storageKey(issuer, subject, target))
  if (serialized === null) return null
  if (serialized.length > 128_000) throw new Error('本地激活恢复记录过大，请核对原操作历史')
  let value: ActivationIntent
  try {value = JSON.parse(serialized) as ActivationIntent} catch {throw new Error('本地激活恢复记录无效，请核对原操作历史')}
  const command = value?.command
  if (!command || !isCatalogScope(command.target) || catalogScopeKey(command.target) !== catalogScopeKey(target)
    || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(command.operationId)
    || !decimal(command.expectedActiveRevision) || !Array.isArray(command.producers) || command.producers.length < 1 || command.producers.length > 256
    || command.producers.some(member => typeof member?.producerId !== 'string' || member.producerId.length > 128 || !member.producerId.trim()
      || !decimal(member.producerVersion) || member.producerVersion === '0' || !decimal(member.qualificationId) || member.qualificationId === '0')
    || new Set(command.producers.map(member => member.producerId)).size !== command.producers.length
    || typeof value.requiresManage !== 'boolean' || !Array.isArray(value.qualificationsExpireAt)
    || value.qualificationsExpireAt.length !== command.producers.length || value.qualificationsExpireAt.some(time => !Number.isFinite(Date.parse(time)))) {
    throw new Error('本地激活恢复记录与当前范围不一致，请核对原操作历史')
  }
  return value
}
