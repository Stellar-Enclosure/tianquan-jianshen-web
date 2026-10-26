import {Rbac3ApiClient} from '@stellar-enclosure/stellar-enclosure-tianquan-jianshen-react-sdk'
import {ApiError, createGatewayAuthClient, createHttpClient, type GatewayAuthClient} from '@stellar-enclosure/stellar-enclosure-web-shared'
import type {FeatureApiClient, FeatureApiRequest} from '../features/shared/FeatureApi'
import {gatewayAuth, notifyAuthorizationFailure} from '../features/auth/gatewayAuth'

export interface AdminApiClients {
  readonly authClient: GatewayAuthClient
  readonly rbac3Client: Rbac3ApiClient
  readonly featureClient: FeatureApiClient
}

export const createAdminApiClients = (basePath = '', fetcher: typeof globalThis.fetch = (...args) => globalThis.fetch(...args)): AdminApiClients => {
  const authClient = createGatewayAuthClient({baseUrl: basePath, appAlias: import.meta.env.VITE_OAUTH_APP_ALIAS ?? 'edge-jianshen',
    context: gatewayAuth.context, fetch: fetcher})
  const transport = createHttpClient({baseUrl: authClient.applicationBaseUrl, credentials: 'include', context: authClient.context,
    getCsrf: signal => authClient.csrf(signal), fetch: fetcher, onAuthError: notifyAuthorizationFailure})
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
