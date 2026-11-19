import {Rbac3ApiClient} from '@stellar-enclosure/stellar-enclosure-tianquan-jianshen-react-sdk'
import {ApiError, createHttpClient} from '@stellar-enclosure/stellar-enclosure-web-shared'
import type {FeatureApiClient, FeatureApiRequest} from '../features/shared/FeatureApi'
import {gatewayAuth, notifyAuthorizationFailure, type JianshenAuth} from '../features/auth/gatewayAuth'

export interface AdminApiClients {
  readonly authClient: Pick<JianshenAuth, 'identity' | 'authority' | 'context'>
  readonly rbac3Client: Rbac3ApiClient
  readonly featureClient: FeatureApiClient
}

export const createAdminApiClients = (
  authClient: AdminApiClients['authClient'] = gatewayAuth,
  fetcher: typeof globalThis.fetch = (...args) => globalThis.fetch(...args),
): AdminApiClients => {
  const transport = {
    async request<T>(path: string, init: RequestInit = {}): Promise<T> {
      const authority = authClient.authority()
      const roleActivation = path === '/api/tianquan-jianshen/v1/auth/role-activations' && init.method === 'PUT'
      const fetchWithStepUp: typeof fetch = async (input, options) => {
        const response = await fetcher(input, options)
        if (response.status === 401) {
          const body = await response.clone().json().catch(() => undefined)
          options?.signal?.throwIfAborted()
          // The role API uses 401 for additional authentication with a still-valid grant.
          if (body?.error?.code === 'STEP_UP_REQUIRED' || body?.status === 'STEP_UP_REQUIRED' || body?.code === 'STEP_UP_REQUIRED') {
            void response.body?.cancel()
            throw new ApiError('角色激活需要重新认证', 401, 'STEP_UP_REQUIRED', {retryable: false})
          }
        }
        return response
      }
      return createHttpClient({baseUrl: authority.apiBaseUrl, authority,
        fetch: roleActivation ? fetchWithStepUp : fetcher, onAuthError: notifyAuthorizationFailure}).request<T>(path, init)
    },
  }
  const request = async <T,>(path: string, options: FeatureApiRequest = {}): Promise<T> => {
    const parameters = new URLSearchParams()
    Object.entries(options.query ?? {}).forEach(([key, value]) => {
      if (value !== null && value !== undefined) parameters.set(key, String(value))
    })
    const suffix = parameters.size ? '?' + parameters.toString() : ''
    const envelope = await transport.request<ResultRecord<T> | LegacyDataEnvelope<T>>(path + suffix, {
      method: options.method ?? 'GET', headers: options.headers, signal: options.signal,
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
    })
    if (envelope && typeof envelope === 'object' && 'data' in envelope && 'meta' in envelope && !('success' in envelope)) return envelope.data
    if (!envelope || typeof envelope !== 'object' || !('success' in envelope) || envelope.success !== true || envelope.data === null) {
      throw new ApiError('Tianquan-Jianshen response envelope is invalid', 200, 'INVALID_RESPONSE', {retryable: false})
    }
    return envelope.data
  }
  return {authClient, rbac3Client: new Rbac3ApiClient({transport}), featureClient: {request}}
}
interface ResultRecord<T> {readonly success: boolean; readonly code: number; readonly message: string; readonly data: T | null}
interface LegacyDataEnvelope<T> {readonly data: T; readonly meta: Readonly<Record<string, unknown>>}
