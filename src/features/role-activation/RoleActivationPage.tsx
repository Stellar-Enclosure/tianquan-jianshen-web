import {useResourcePermission} from '../../permissions/ResourceGuard'
import {useActiveRoles, useRbac3Authorization} from '@stellar-enclosure/stellar-enclosure-tianquan-jianshen-react-sdk'
import {useQuery, useQueryClient} from '@tanstack/react-query'
import {Alert, Button, Card, Descriptions, Modal, Space, Tag, Typography} from 'antd'
import {createContext, useContext, useMemo, useState} from 'react'
import {useFeatureApi} from '../shared/FeatureApi'
import {PageState, useEmbeddedWorkbench, useWorkbenchLeaveGuard} from '@stellar-enclosure/stellar-enclosure-web-shared'
import {findDsdConflict, RoleActivationSelector} from './RoleActivationSelector'
import {roleActivationApi} from './roleActivation.api'
import {gatewayAuth} from '../auth/gatewayAuth'
import {CurrentAuthorizationRefreshContext} from '../auth/CurrentAuthorizationProvider'

interface RoleActivationRequest {
    readonly roleIds: readonly string[]
    readonly expectedAuthVersion: number
}

export interface ActivationAttempt {
  readonly request: RoleActivationRequest
  readonly phase: 'writing' | 'reading' | 'review' | 'unavailable' | 'denied' | 'step-up'
  readonly reason?: string
}

export const RoleActivationAttemptContext = createContext<{
  readonly attempt: ActivationAttempt | null
  readonly setAttempt: (attempt: ActivationAttempt | null) => void
} | null>(null)

export const RoleActivationPage = () => {
  const {embedded, activeTabKey} = useEmbeddedWorkbench()
  const authorization = useRbac3Authorization()
  const canActivateAfterAbout = useResourcePermission('tianquan-jianshen.button.RoleActivationPage.use')
  const { replaceActiveRoles } = useActiveRoles()
  const continuation = useContext(RoleActivationAttemptContext)
  const refreshAuthorization = useContext(CurrentAuthorizationRefreshContext)
  const attempt = continuation?.attempt ?? null
  const setAttempt = continuation?.setAttempt
  const queryScope = [authorization.inputBindingKey, authorization.requestEpoch]
  const api = roleActivationApi(useFeatureApi())
  const queryClient = useQueryClient()
  const enabled = ['READY', 'ACTIVATION_REQUIRED'].includes(authorization.status)
  const busy = attempt?.phase === 'writing' || attempt?.phase === 'reading'
  const candidates = useQuery({
      queryKey: ['tianquan-jianshen', 'activation-candidates', ...queryScope],
    queryFn: api.candidates,
    enabled,
  })
  const current = useQuery({
    queryKey: ['tianquan-jianshen', 'active-roles', ...queryScope],
    queryFn: api.current,
    enabled,
  })
  const currentIds = useMemo(
    () => current.data?.activeRoles.flatMap((application) => application.rootRoleIds) ?? [],
    [current.data],
  )
  const [selectionOverride, setSelectionOverride] = useState<readonly string[] | null>(null)
  const stepUpRequest = attempt?.phase === 'step-up' ? attempt.request : null
  const [stepUpError, setStepUpError] = useState<unknown>(null)
  const [stepUpSubmitting, setStepUpSubmitting] = useState(false)
  const selectedRoleIds = attempt?.request.roleIds ?? selectionOverride ?? currentIds
  const selectionReady = current.data !== undefined
  const conflict = candidates.data ? findDsdConflict(candidates.data, selectedRoleIds) : null
  const canView = enabled || (attempt !== null && authorization.status !== 'FORBIDDEN_NO_ROUTE')
  const canSubmit = enabled && !attempt && !stepUpRequest && !current.isFetching && !candidates.isFetching
    && !current.isError && !candidates.isError && Boolean(candidates.data) && Boolean(current.data)
    && Number.isSafeInteger(current.data?.authVersion) && (current.data?.authVersion ?? -1) >= 0 && !conflict
  const recover = async (request: RoleActivationRequest, reason: string) => {
    const capture = gatewayAuth.context.capture()
    setAttempt?.({request, phase: 'reading', reason})
    const [currentResult, candidatesResult] = await Promise.all([current.refetch(), candidates.refetch()])
    if (!capture.signal.aborted) setAttempt?.({
      request, phase: currentResult.isSuccess && candidatesResult.isSuccess ? 'review' : 'unavailable', reason,
    })
  }
  const submit = async () => {
    if (!canSubmit || (!canActivateAfterAbout && authorization.status !== 'ACTIVATION_REQUIRED') || !current.data || !setAttempt) return
    const capture = gatewayAuth.context.capture()
    const request = {roleIds: [...selectedRoleIds], expectedAuthVersion: current.data.authVersion}
    setAttempt({request, phase: 'writing'})
    try {
      const result = await replaceActiveRoles(request)
      capture.assertCurrent()
      if (result === null) {
        await recover(request, 'ROLE_ACTIVATION_VERSION_CONFLICT')
        return
      }
      setSelectionOverride(null)
      await Promise.all([
        queryClient.invalidateQueries({queryKey: ['tianquan-jianshen', 'active-roles', ...queryScope]}),
        queryClient.invalidateQueries({queryKey: ['tianquan-jianshen', 'activation-candidates', ...queryScope]}),
      ])
      setAttempt(null)
    } catch (error) {
      if (capture.signal.aborted) return
      if (isStepUpRequired(error)) {
        setAttempt({request, phase: 'step-up'})
        setStepUpError(null)
        return
      }
      const status = (error as {status?: number} | null)?.status
      const reason = typeof error === 'object' && error && 'code' in error ? String(error.code) : 'NETWORK_ERROR'
      if (reason === 'APP_ROLE_ACTIVATION_MUTEX_VIOLATION' || (status && status >= 400 && status < 500 && status !== 408 && status !== 409)) {
        setAttempt({request, phase: 'denied', reason})
        return
      }
      await recover(request, reason)
    }
  }
  const acknowledge = () => {
    setSelectionOverride(null)
    setAttempt?.(null)
    if (!enabled) void (refreshAuthorization ?? authorization.retry)()
  }
  const confirmStepUp = async () => {
    if (stepUpRequest === null) return
    setStepUpSubmitting(true)
    setStepUpError(null)
    try {
      await gatewayAuth.login('/', {reauthenticate: true})
    } catch (error) {
      setStepUpError(error)
    } finally {
      setStepUpSubmitting(false)
    }
  }
  const cancelStepUp = () => {
    if (stepUpSubmitting) return
    setAttempt?.(null)
    setStepUpError(null)
  }
  const standaloneUrl = stepUpRequest ? gatewayAuth.standaloneUrl(true) : undefined
  useWorkbenchLeaveGuard(
    activeTabKey ?? 'jianshen:role-activation',
    {
      dirty: selectionOverride !== null,
      pendingMutation: stepUpSubmitting || busy,
    },
  )
  return (
    <div style={{width: '100%'}}>
        <Card title={!embedded ? '激活当前用户角色' : undefined}>
        <Typography.Paragraph type="secondary">
            选择当前用户需要的一个或多个激活根角色。提交的是完整 Root Set；服务端按用户授权版本原子替换并返回权威集合。
        </Typography.Paragraph>
        {canView && current.data && (
          <Descriptions bordered size="small" column={3} style={{ marginBottom: 16 }}>
            <Descriptions.Item label="Auth Version">{current.data.authVersion}</Descriptions.Item>
            <Descriptions.Item label="Policy Version">{current.data.policyVersion}</Descriptions.Item>
          </Descriptions>
        )}
        {canView && (candidates.data?.configurationErrors.length ?? 0) > 0 && (
          <Alert
            type="error"
            showIcon
            message="角色配置无法安全归一"
            description={candidates.data?.configurationErrors.map((error) => `${error.reasonCode}: ${error.evidenceIds.join(', ')}`).join('；')}
          />
        )}
        {attempt && attempt.phase !== 'writing' && attempt.phase !== 'step-up' && (
          <Alert style={{marginBottom: 16}} type={attempt.phase === 'denied' ? 'error' : 'warning'} showIcon
            title={attempt.phase === 'denied' ? '服务端拒绝角色激活' : '请核对服务端当前激活集合'}
            description={`${attempt.reason ?? ''} · 本次提交根角色 ${attempt.request.roleIds.join(', ') || '空集合'}`}
            action={attempt.phase === 'reading' ? undefined : attempt.phase === 'unavailable'
              ? <Button size="small" onClick={() => void recover(attempt.request, attempt.reason ?? 'NETWORK_ERROR')}>重读当前集合</Button>
              : <Button size="small" onClick={acknowledge}>{attempt.phase === 'denied' ? '返回' : '确认已核对当前集合'}</Button>}
          />
        )}
        {canView && <PageState
          loading={candidates.isPending || current.isPending || !selectionReady}
          error={candidates.error ?? current.error}
          empty={candidates.data?.applications.length === 0}
          emptyDescription="当前没有可安全激活的候选根角色"
        >
          {candidates.data && selectionReady && (
            <RoleActivationSelector
              candidates={candidates.data}
              selectedRoleIds={selectedRoleIds}
              disabled={Boolean(attempt)}
              onChange={setSelectionOverride}
            />
          )}
        </PageState>}
        <Space style={{ marginTop: 16 }}>
            {(authorization.status === 'ACTIVATION_REQUIRED' || canActivateAfterAbout || attempt) && (
            <Button
              type="primary"
              disabled={!canSubmit}
              loading={attempt?.phase === 'writing'}
              onClick={() => void submit()}
            >
              激活所选角色
            </Button>
          )}
          {canView && current.data?.activeRoles.map((application) => <Tag key={application.applicationCode}>{application.applicationCode}: {application.rootRoleIds.join(', ')}</Tag>)}
        </Space>
      </Card>
      <Modal
        open={stepUpRequest !== null}
        title="关键角色需要强认证"
        onCancel={cancelStepUp}
        footer={[
          <Button key="cancel" disabled={stepUpSubmitting} onClick={cancelStepUp}>取消</Button>,
          <Button
            key="confirm"
            type="primary"
            loading={stepUpSubmitting}
            disabled={stepUpSubmitting}
            href={standaloneUrl}
            target={standaloneUrl ? "_blank" : undefined}
            rel={standaloneUrl ? "noopener" : undefined}
            onClick={standaloneUrl ? undefined : () => void confirmStepUp()}
          >
            {standaloneUrl ? '打开独立鉴身入口' : '重新认证'}
          </Button>,
        ]}
      >
        <Typography.Paragraph type="secondary">
          所选角色包含高风险或关键权限。继续后将跳转到统一身份平台重新认证，返回后请重新选择角色并确认提交；不会自动重放本次授权变更。重新认证不代表已满足服务端要求的认证强度。
        </Typography.Paragraph>
        {standaloneUrl && <Typography.Paragraph>请在独立鉴身入口完成强认证，再重新选择和提交角色。</Typography.Paragraph>}
        {stepUpError !== null && (
          <Alert
            type="error"
            showIcon
            message="强认证失败"
            description={stepUpError instanceof Error ? stepUpError.message : 'AUTHENTICATION_FAILED'}
            style={{ marginBottom: 16 }}
          />
        )}
      </Modal>
    </div>
  )
}

const isStepUpRequired = (error: unknown): boolean => typeof error === 'object'
  && error !== null
  && 'code' in error
  && error.code === 'STEP_UP_REQUIRED'
