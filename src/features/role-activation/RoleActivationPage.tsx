import {useResourcePermission} from '../../permissions/ResourceGuard'
import {useActiveRoles, useRbac3Authorization} from '@stellar-enclosure/stellar-enclosure-tianquan-jianshen-react-sdk'
import {useQuery, useQueryClient} from '@tanstack/react-query'
import {Alert, Button, Card, Descriptions, Modal, Space, Tag, Typography} from 'antd'
import {useMemo, useState} from 'react'
import {useFeatureApi, useFeatureTenantContext} from '../shared/FeatureApi'
import {PageState} from '@stellar-enclosure/stellar-enclosure-web-shared'
import {findDsdConflict, RoleActivationSelector} from './RoleActivationSelector'
import {roleActivationApi} from './roleActivation.api'
import {gatewayAuth} from '../auth/gatewayAuth'

interface RoleActivationRequest {
    readonly roleIds: readonly string[]
    readonly expectedAuthVersion: number
}

export const RoleActivationPage = () => {
    const authorization = useRbac3Authorization()
  const canActivateAfterAbout = useResourcePermission('tianquan-jianshen.button.RoleActivationPage.use')
  const { replaceActiveRoles } = useActiveRoles()
  const { effectiveTenantId } = useFeatureTenantContext()
  const api = roleActivationApi(useFeatureApi())
  const queryClient = useQueryClient()
    const enabled = ['READY', 'ACTIVATION_REQUIRED'].includes(authorization.status)
  const candidates = useQuery({
      queryKey: ['tianquan-jianshen', 'activation-candidates', effectiveTenantId ?? 'none', authorization.about?.authVersion ?? 'none'],
    queryFn: api.candidates,
    enabled,
  })
  const current = useQuery({
    queryKey: ['tianquan-jianshen', 'active-roles', effectiveTenantId ?? 'none'],
    queryFn: api.current,
    enabled,
  })
  const currentIds = useMemo(
    () => current.data?.activeRoles.flatMap((application) => application.rootRoleIds) ?? [],
    [current.data],
  )
  const [selectionOverride, setSelectionOverride] = useState<readonly string[] | null>(null)
  const [submitError, setSubmitError] = useState<unknown>(null)
  const [stepUpRequest, setStepUpRequest] = useState<RoleActivationRequest | null>(null)
  const [stepUpError, setStepUpError] = useState<unknown>(null)
  const [stepUpSubmitting, setStepUpSubmitting] = useState(false)
  const selectedRoleIds = selectionOverride ?? currentIds
  const selectionReady = current.data !== undefined
  const conflict = candidates.data ? findDsdConflict(candidates.data, selectedRoleIds) : null
  const submit = async () => {
    if (!current.data || conflict) return
    setSubmitError(null)
    const request = {
      roleIds: selectedRoleIds,
        expectedAuthVersion: current.data.authVersion,
    }
    try {
      await replaceActiveRoles(request)
      setSelectionOverride(null)
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tianquan-jianshen', 'active-roles'] }),
        queryClient.invalidateQueries({ queryKey: ['tianquan-jianshen', 'activation-candidates'] }),
      ])
    } catch (error) {
      if (isStepUpRequired(error)) {
        setStepUpRequest(request)
        setStepUpError(null)
        return
      }
      setSelectionOverride(null)
      setSubmitError(error)
    }
  }
  const confirmStepUp = () => {
    if (stepUpRequest === null) return
    setStepUpSubmitting(true)
    setStepUpError(null)
    try {
      gatewayAuth.login(undefined, {reauthenticate: true})
      setStepUpSubmitting(false)
    } catch (error) {
      setStepUpError(error)
      setStepUpSubmitting(false)
    }
  }
  const cancelStepUp = () => {
    if (stepUpSubmitting) return
    setStepUpRequest(null)
    setStepUpError(null)
  }
  return (
    <>
        <Card title="激活当前用户角色">
        <Typography.Paragraph type="secondary">
            选择当前用户需要的一个或多个激活根角色。提交的是完整 Root Set；服务端按用户授权版本原子替换并返回权威集合。
        </Typography.Paragraph>
        {current.data && (
          <Descriptions bordered size="small" column={3} style={{ marginBottom: 16 }}>
            <Descriptions.Item label="Auth Version">{current.data.authVersion}</Descriptions.Item>
            <Descriptions.Item label="Policy Version">{current.data.policyVersion}</Descriptions.Item>
          </Descriptions>
        )}
        {(candidates.data?.configurationErrors.length ?? 0) > 0 && (
          <Alert
            type="error"
            showIcon
            message="角色配置无法安全归一"
            description={candidates.data?.configurationErrors.map((error) => `${error.reasonCode}: ${error.evidenceIds.join(', ')}`).join('；')}
          />
        )}
        <PageState
          loading={candidates.isPending || current.isPending || !selectionReady}
          error={candidates.error ?? current.error ?? submitError}
          empty={candidates.data?.applications.length === 0}
          emptyDescription="当前没有可安全激活的候选根角色"
        >
          {candidates.data && selectionReady && (
            <RoleActivationSelector
              candidates={candidates.data}
              selectedRoleIds={selectedRoleIds}
              disabled={authorization.status === 'REPLACING_ACTIVE_ROLES'}
              onChange={setSelectionOverride}
            />
          )}
        </PageState>
        <Space style={{ marginTop: 16 }}>
            {(authorization.status === 'ACTIVATION_REQUIRED' || canActivateAfterAbout) && (
            <Button
              type="primary"
              disabled={!current.data || Boolean(conflict) || authorization.status === 'REPLACING_ACTIVE_ROLES'}
              loading={authorization.status === 'REPLACING_ACTIVE_ROLES'}
              onClick={() => void submit()}
            >
              激活所选角色
            </Button>
          )}
          {current.data?.activeRoles.map((application) => <Tag key={application.applicationCode}>{application.applicationCode}: {application.rootRoleIds.join(', ')}</Tag>)}
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
            onClick={() => void confirmStepUp()}
          >
            重新认证
          </Button>,
        ]}
      >
        <Typography.Paragraph type="secondary">
          所选角色包含高风险或关键权限。继续后将跳转到统一身份平台重新认证，返回后请重新选择角色并确认提交；不会自动重放本次授权变更。重新认证不代表已满足服务端要求的认证强度。
        </Typography.Paragraph>
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
    </>
  )
}

const isStepUpRequired = (error: unknown): boolean => typeof error === 'object'
  && error !== null
  && 'code' in error
  && error.code === 'STEP_UP_REQUIRED'
