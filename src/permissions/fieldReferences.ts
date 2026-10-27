import {defineResourceReferences} from '@stellar-enclosure/stellar-enclosure-web-shared/permissions'
import {rolePermissionInputFields} from '../features/role/rolePermissionResources'

export const fieldReferences = defineResourceReferences([
  {
    "key": "tianquan-jianshen.field.authorization.catalog.domain.dto.CatalogGovernanceCommandDTO.action",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.catalog.domain.dto.CatalogGovernanceCommandDTO.expectedVersion",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.catalog.domain.dto.CatalogGovernanceCommandDTO.identityId",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.catalog.domain.dto.CatalogGovernanceCommandDTO.kind",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.catalog.domain.dto.CatalogGovernanceCommandDTO.target",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.catalog.domain.dto.CatalogGovernanceCommandDTO.targetProducerId",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.grant.roleinheritance.domain.dto.InheritanceRequestDTO.applicationId",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.grant.roleinheritance.domain.dto.InheritanceRequestDTO.expectedRoleVersion",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.grant.roleinheritance.domain.dto.InheritanceRequestDTO.juniorRoleId",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.grant.userrole.domain.dto.AssignRequestDTO.assignmentType",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.grant.userrole.domain.dto.AssignRequestDTO.expectedUserAuthVersion",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.grant.userrole.domain.dto.AssignRequestDTO.reason",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.grant.userrole.domain.dto.AssignRequestDTO.roleId",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.grant.userrole.domain.dto.AssignRequestDTO.ticketNo",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.grant.userrole.domain.dto.AssignRequestDTO.validFrom",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.grant.userrole.domain.dto.AssignRequestDTO.validTo",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.grant.userrole.domain.dto.RoleAssignmentChangeRequestDTO.expectedAssignmentVersion",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.grant.userrole.domain.dto.RoleAssignmentChangeRequestDTO.expectedUserAuthVersion",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.grant.userrole.domain.dto.RoleAssignmentChangeRequestDTO.reason",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.grant.userrole.domain.dto.RoleAssignmentChangeRequestDTO.ticketNo",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.policy.domain.dto.CardinalityRequestDTO.expectedVersion",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.policy.domain.dto.CardinalityRequestDTO.maximumActive",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.policy.domain.dto.CardinalityRequestDTO.scopeType",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.policy.domain.dto.CardinalityRequestDTO.validFrom",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.policy.domain.dto.CardinalityRequestDTO.validTo",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.policy.domain.dto.DataRuleRequestDTO.applicationId",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.policy.domain.dto.DataRuleRequestDTO.directorySnapshotVersion",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.policy.domain.dto.DataRuleRequestDTO.expectedVersion",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.policy.domain.dto.DataRuleRequestDTO.permissionId",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.policy.domain.dto.DataRuleRequestDTO.references",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.policy.domain.dto.DataRuleRequestDTO.roleId",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.policy.domain.dto.DataRuleRequestDTO.scopeType",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.policy.domain.dto.DataRuleRequestDTO.target",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.policy.domain.dto.DataRuleRequestDTO.validFrom",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.policy.domain.dto.DataRuleRequestDTO.validTo",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.policy.domain.dto.OperationSodRuleRequestDTO.applicationCode",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.policy.domain.dto.OperationSodRuleRequestDTO.businessResource",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.policy.domain.dto.OperationSodRuleRequestDTO.expectedVersion",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.policy.domain.dto.OperationSodRuleRequestDTO.forbiddenLaterActionCode",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.policy.domain.dto.OperationSodRuleRequestDTO.lookbackFrom",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.policy.domain.dto.OperationSodRuleRequestDTO.priorActionCode",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.policy.domain.dto.OperationSodRuleRequestDTO.validFrom",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.policy.domain.dto.OperationSodRuleRequestDTO.validTo",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.policy.domain.dto.PrerequisiteGroupRequestDTO.expectedRoleVersion",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.policy.domain.dto.PrerequisiteGroupRequestDTO.groupCode",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.policy.domain.dto.PrerequisiteGroupRequestDTO.matchMode",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.policy.domain.dto.PrerequisiteGroupRequestDTO.prerequisiteRoleIds",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.policy.domain.dto.SodSetRequestDTO.applicationId",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.policy.domain.dto.SodSetRequestDTO.constraintType",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.policy.domain.dto.SodSetRequestDTO.expectedVersion",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.policy.domain.dto.SodSetRequestDTO.maximumActiveRoles",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.policy.domain.dto.SodSetRequestDTO.memberRoleIds",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.policy.domain.dto.SodSetRequestDTO.setCode",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.policy.domain.dto.SodSetRequestDTO.validFrom",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.policy.domain.dto.SodSetRequestDTO.validTo",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.policy.domain.vo.RuleReferenceVO.referenceId",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.policy.domain.vo.RuleReferenceVO.referenceType",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.policy.management.domain.dto.ManagementPolicyRestrictionsDTO.includeInheritedSubjectRoles",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.policy.management.domain.dto.ManagementPolicyRestrictionsDTO.maximumAssignmentDays",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.policy.management.domain.dto.ManagementPolicyRestrictionsDTO.maximumRiskLevel",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.policy.management.domain.dto.ManagementPolicyRestrictionsDTO.requireAllAffiliationsInScope",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.policy.management.domain.dto.ManagementPolicyRestrictionsDTO.requireReason",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.policy.management.domain.dto.ManagementPolicyRestrictionsDTO.requireTicket",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.policy.management.domain.dto.ManagementPolicyRestrictionsDTO.requiredAuthenticationStrength",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.policy.management.domain.dto.ManagementPolicyScopeDTO.referenceId",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.policy.management.domain.dto.ManagementPolicyScopeDTO.type",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.policy.management.domain.dto.ManagementPolicySubjectDTO.id",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.policy.management.domain.dto.ManagementPolicySubjectDTO.type",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.policy.management.domain.dto.PolicyRequestDTO.activationRootRoleIds",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.policy.management.domain.dto.PolicyRequestDTO.name",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.policy.management.domain.dto.PolicyRequestDTO.operations",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.policy.management.domain.dto.PolicyRequestDTO.policyCode",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.policy.management.domain.dto.PolicyRequestDTO.restrictions",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.policy.management.domain.dto.PolicyRequestDTO.scopes",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.policy.management.domain.dto.PolicyRequestDTO.subjects",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.policy.management.domain.dto.PolicyRequestDTO.validFrom",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.policy.management.domain.dto.PolicyRequestDTO.validTo",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.runtime.decision.domain.dto.DecisionRequestDTO.permissionCode",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.runtime.decision.domain.dto.DecisionRequestDTO.requestedDecisions",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.runtime.decision.domain.dto.DecisionRequestDTO.resource",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.runtime.decision.domain.dto.DecisionRequestDTO.subject",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.runtime.decision.domain.dto.DecisionRequestDTO.tokenVersions",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.runtime.decision.domain.vo.AuthorizationDecisionResourceVO.applicationCode",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.runtime.decision.domain.vo.AuthorizationDecisionResourceVO.resourceCode",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.runtime.decision.domain.vo.AuthorizationDecisionSubjectVO.identitySub",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.runtime.decision.domain.vo.AuthorizationDecisionSubjectVO.tenantId",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.runtime.decision.domain.vo.AuthorizationDecisionSubjectVO.userId",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.runtime.decision.domain.vo.TokenVersionsVO.authVersion",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.runtime.decision.domain.vo.TokenVersionsVO.policyVersion",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.simulation.domain.dto.AuthorizationRoleChangeImpactRequestDTO.at",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.simulation.domain.dto.AuthorizationRoleChangeImpactRequestDTO.roleId",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.simulation.domain.dto.AuthorizationSimulationRequestDTO.at",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.simulation.domain.dto.AuthorizationSimulationRequestDTO.decisionRequest",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.simulation.domain.dto.AuthorizationSimulationRequestDTO.hypothesis",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.simulation.domain.dto.HypothesisDTO.addedPermissions",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.authorization.simulation.domain.dto.HypothesisDTO.removedPermissions",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.application.domain.command.AdmitApplicationAuthorizationScopeCommand.ddcApplicationId",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.application.domain.command.AdmitApplicationAuthorizationScopeCommand.displayPriority",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.application.domain.command.ChangeApplicationAuthorizationScopeStatusCommand.expectedVersion",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.application.domain.command.ChangeApplicationAuthorizationScopeStatusCommand.status",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.organization.service.OrganizationFacade.CreateCommand.code",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.organization.service.OrganizationFacade.CreateCommand.externalId",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.organization.service.OrganizationFacade.CreateCommand.name",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.organization.service.OrganizationFacade.CreateCommand.parentId",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.organization.service.OrganizationFacade.CreateCommand.type",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.organization.service.OrganizationFacade.CreateCommand.validFrom",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.organization.service.OrganizationFacade.CreateCommand.validTo",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.organization.service.OrganizationFacade.UpdateCommand.expectedVersion",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.organization.service.OrganizationFacade.UpdateCommand.externalId",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.organization.service.OrganizationFacade.UpdateCommand.name",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.organization.service.OrganizationFacade.UpdateCommand.parentId",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.organization.service.OrganizationFacade.UpdateCommand.type",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.organization.service.OrganizationFacade.UpdateCommand.validFrom",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.organization.service.OrganizationFacade.UpdateCommand.validTo",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.organization.service.UserOrganizationAssignmentService.AssignCommand.orgUnitId",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.organization.service.UserOrganizationAssignmentService.AssignCommand.reason",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.organization.service.UserOrganizationAssignmentService.AssignCommand.ticketNo",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.organization.service.UserOrganizationAssignmentService.AssignCommand.validFrom",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.organization.service.UserOrganizationAssignmentService.AssignCommand.validTo",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.organization.snapshot.domain.dto.DirectorySnapshotCommandDTO.checksum",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.organization.snapshot.domain.dto.DirectorySnapshotCommandDTO.generatedAt",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.organization.snapshot.domain.dto.DirectorySnapshotCommandDTO.payload",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.organization.snapshot.domain.dto.DirectorySnapshotCommandDTO.providerCode",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.organization.snapshot.domain.dto.DirectorySnapshotCommandDTO.snapshotVersion",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.position.service.PositionFacade.CreateCommand.code",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.position.service.PositionFacade.CreateCommand.externalId",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.position.service.PositionFacade.CreateCommand.name",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.position.service.PositionFacade.CreateCommand.orgUnitId",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.position.service.PositionFacade.CreateCommand.validFrom",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.position.service.PositionFacade.CreateCommand.validTo",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.position.service.PositionFacade.UpdateCommand.expectedVersion",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.position.service.PositionFacade.UpdateCommand.externalId",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.position.service.PositionFacade.UpdateCommand.name",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.position.service.PositionFacade.UpdateCommand.orgUnitId",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.position.service.PositionFacade.UpdateCommand.validFrom",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.position.service.PositionFacade.UpdateCommand.validTo",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.position.service.UserPositionAssignmentService.AssignCommand.orgUnitId",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.position.service.UserPositionAssignmentService.AssignCommand.positionId",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.position.service.UserPositionAssignmentService.AssignCommand.primaryAssignment",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.position.service.UserPositionAssignmentService.AssignCommand.reason",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.position.service.UserPositionAssignmentService.AssignCommand.ticketNo",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.position.service.UserPositionAssignmentService.AssignCommand.validFrom",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.position.service.UserPositionAssignmentService.AssignCommand.validTo",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.role.domain.dto.CreateRoleRequestDTO.applicationId",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.role.domain.dto.CreateRoleRequestDTO.landingPriority",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.role.domain.dto.CreateRoleRequestDTO.landingRouteId",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.role.domain.dto.CreateRoleRequestDTO.maximumAssignmentDays",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.role.domain.dto.CreateRoleRequestDTO.privileged",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.role.domain.dto.CreateRoleRequestDTO.riskLevel",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.role.domain.dto.CreateRoleRequestDTO.roleCode",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.role.domain.dto.CreateRoleRequestDTO.roleName",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.role.domain.dto.CreateRoleRequestDTO.roleType",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.role.domain.dto.UpdateRoleRequestDTO.expectedRoleVersion",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.role.domain.dto.UpdateRoleRequestDTO.landingPriority",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.role.domain.dto.UpdateRoleRequestDTO.landingRouteId",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.role.domain.dto.UpdateRoleRequestDTO.maximumAssignmentDays",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.role.domain.dto.UpdateRoleRequestDTO.roleName",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.role.domain.dto.UpdateRoleRequestDTO.status",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.user.domain.dto.CreateUserCommandDTO.identitySub",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.user.domain.dto.CreateUserCommandDTO.status",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.user.domain.dto.UpdateUserCommandDTO.expectedAuthVersion",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.user.domain.dto.UpdateUserCommandDTO.identitySub",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.user.domain.dto.UserStatusCommandDTO.expectedAuthVersion",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.user.domain.dto.UserStatusCommandDTO.reason",
    "usage": "FORM_FIELD"
  },
  {
    "key": "tianquan-jianshen.field.iam.user.domain.dto.UserStatusCommandDTO.status",
    "usage": "FORM_FIELD"
  }
] as const)

export const inputFields = {
  "CatalogGovernanceCommandDTO": [
    "tianquan-jianshen.field.authorization.catalog.domain.dto.CatalogGovernanceCommandDTO.action",
    "tianquan-jianshen.field.authorization.catalog.domain.dto.CatalogGovernanceCommandDTO.expectedVersion",
    "tianquan-jianshen.field.authorization.catalog.domain.dto.CatalogGovernanceCommandDTO.identityId",
    "tianquan-jianshen.field.authorization.catalog.domain.dto.CatalogGovernanceCommandDTO.kind",
    "tianquan-jianshen.field.authorization.catalog.domain.dto.CatalogGovernanceCommandDTO.target",
    "tianquan-jianshen.field.authorization.catalog.domain.dto.CatalogGovernanceCommandDTO.targetProducerId"
  ],
  "InheritanceRequestDTO": [
    "tianquan-jianshen.field.authorization.grant.roleinheritance.domain.dto.InheritanceRequestDTO.applicationId",
    "tianquan-jianshen.field.authorization.grant.roleinheritance.domain.dto.InheritanceRequestDTO.expectedRoleVersion",
    "tianquan-jianshen.field.authorization.grant.roleinheritance.domain.dto.InheritanceRequestDTO.juniorRoleId"
  ],
  ...rolePermissionInputFields,
  "AssignRequestDTO": [
    "tianquan-jianshen.field.authorization.grant.userrole.domain.dto.AssignRequestDTO.assignmentType",
    "tianquan-jianshen.field.authorization.grant.userrole.domain.dto.AssignRequestDTO.expectedUserAuthVersion",
    "tianquan-jianshen.field.authorization.grant.userrole.domain.dto.AssignRequestDTO.reason",
    "tianquan-jianshen.field.authorization.grant.userrole.domain.dto.AssignRequestDTO.roleId",
    "tianquan-jianshen.field.authorization.grant.userrole.domain.dto.AssignRequestDTO.ticketNo",
    "tianquan-jianshen.field.authorization.grant.userrole.domain.dto.AssignRequestDTO.validFrom",
    "tianquan-jianshen.field.authorization.grant.userrole.domain.dto.AssignRequestDTO.validTo"
  ],
  "RoleAssignmentChangeRequestDTO": [
    "tianquan-jianshen.field.authorization.grant.userrole.domain.dto.RoleAssignmentChangeRequestDTO.expectedAssignmentVersion",
    "tianquan-jianshen.field.authorization.grant.userrole.domain.dto.RoleAssignmentChangeRequestDTO.expectedUserAuthVersion",
    "tianquan-jianshen.field.authorization.grant.userrole.domain.dto.RoleAssignmentChangeRequestDTO.reason",
    "tianquan-jianshen.field.authorization.grant.userrole.domain.dto.RoleAssignmentChangeRequestDTO.ticketNo"
  ],
  "CardinalityRequestDTO": [
    "tianquan-jianshen.field.authorization.policy.domain.dto.CardinalityRequestDTO.expectedVersion",
    "tianquan-jianshen.field.authorization.policy.domain.dto.CardinalityRequestDTO.maximumActive",
    "tianquan-jianshen.field.authorization.policy.domain.dto.CardinalityRequestDTO.scopeType",
    "tianquan-jianshen.field.authorization.policy.domain.dto.CardinalityRequestDTO.validFrom",
    "tianquan-jianshen.field.authorization.policy.domain.dto.CardinalityRequestDTO.validTo"
  ],
  "DataRuleRequestDTO": [
    "tianquan-jianshen.field.authorization.policy.domain.dto.DataRuleRequestDTO.applicationId",
    "tianquan-jianshen.field.authorization.policy.domain.dto.DataRuleRequestDTO.directorySnapshotVersion",
    "tianquan-jianshen.field.authorization.policy.domain.dto.DataRuleRequestDTO.expectedVersion",
    "tianquan-jianshen.field.authorization.policy.domain.dto.DataRuleRequestDTO.permissionId",
    "tianquan-jianshen.field.authorization.policy.domain.dto.DataRuleRequestDTO.references",
    "tianquan-jianshen.field.authorization.policy.domain.dto.DataRuleRequestDTO.roleId",
    "tianquan-jianshen.field.authorization.policy.domain.dto.DataRuleRequestDTO.scopeType",
    "tianquan-jianshen.field.authorization.policy.domain.dto.DataRuleRequestDTO.target",
    "tianquan-jianshen.field.authorization.policy.domain.dto.DataRuleRequestDTO.validFrom",
    "tianquan-jianshen.field.authorization.policy.domain.dto.DataRuleRequestDTO.validTo"
  ],
  "OperationSodRuleRequestDTO": [
    "tianquan-jianshen.field.authorization.policy.domain.dto.OperationSodRuleRequestDTO.applicationCode",
    "tianquan-jianshen.field.authorization.policy.domain.dto.OperationSodRuleRequestDTO.businessResource",
    "tianquan-jianshen.field.authorization.policy.domain.dto.OperationSodRuleRequestDTO.expectedVersion",
    "tianquan-jianshen.field.authorization.policy.domain.dto.OperationSodRuleRequestDTO.forbiddenLaterActionCode",
    "tianquan-jianshen.field.authorization.policy.domain.dto.OperationSodRuleRequestDTO.lookbackFrom",
    "tianquan-jianshen.field.authorization.policy.domain.dto.OperationSodRuleRequestDTO.priorActionCode",
    "tianquan-jianshen.field.authorization.policy.domain.dto.OperationSodRuleRequestDTO.validFrom",
    "tianquan-jianshen.field.authorization.policy.domain.dto.OperationSodRuleRequestDTO.validTo"
  ],
  "PrerequisiteGroupRequestDTO": [
    "tianquan-jianshen.field.authorization.policy.domain.dto.PrerequisiteGroupRequestDTO.expectedRoleVersion",
    "tianquan-jianshen.field.authorization.policy.domain.dto.PrerequisiteGroupRequestDTO.groupCode",
    "tianquan-jianshen.field.authorization.policy.domain.dto.PrerequisiteGroupRequestDTO.matchMode",
    "tianquan-jianshen.field.authorization.policy.domain.dto.PrerequisiteGroupRequestDTO.prerequisiteRoleIds"
  ],
  "SodSetRequestDTO": [
    "tianquan-jianshen.field.authorization.policy.domain.dto.SodSetRequestDTO.applicationId",
    "tianquan-jianshen.field.authorization.policy.domain.dto.SodSetRequestDTO.constraintType",
    "tianquan-jianshen.field.authorization.policy.domain.dto.SodSetRequestDTO.expectedVersion",
    "tianquan-jianshen.field.authorization.policy.domain.dto.SodSetRequestDTO.maximumActiveRoles",
    "tianquan-jianshen.field.authorization.policy.domain.dto.SodSetRequestDTO.memberRoleIds",
    "tianquan-jianshen.field.authorization.policy.domain.dto.SodSetRequestDTO.setCode",
    "tianquan-jianshen.field.authorization.policy.domain.dto.SodSetRequestDTO.validFrom",
    "tianquan-jianshen.field.authorization.policy.domain.dto.SodSetRequestDTO.validTo"
  ],
  "RuleReferenceVO": [
    "tianquan-jianshen.field.authorization.policy.domain.vo.RuleReferenceVO.referenceId",
    "tianquan-jianshen.field.authorization.policy.domain.vo.RuleReferenceVO.referenceType"
  ],
  "ManagementPolicyRestrictionsDTO": [
    "tianquan-jianshen.field.authorization.policy.management.domain.dto.ManagementPolicyRestrictionsDTO.includeInheritedSubjectRoles",
    "tianquan-jianshen.field.authorization.policy.management.domain.dto.ManagementPolicyRestrictionsDTO.maximumAssignmentDays",
    "tianquan-jianshen.field.authorization.policy.management.domain.dto.ManagementPolicyRestrictionsDTO.maximumRiskLevel",
    "tianquan-jianshen.field.authorization.policy.management.domain.dto.ManagementPolicyRestrictionsDTO.requireAllAffiliationsInScope",
    "tianquan-jianshen.field.authorization.policy.management.domain.dto.ManagementPolicyRestrictionsDTO.requireReason",
    "tianquan-jianshen.field.authorization.policy.management.domain.dto.ManagementPolicyRestrictionsDTO.requireTicket",
    "tianquan-jianshen.field.authorization.policy.management.domain.dto.ManagementPolicyRestrictionsDTO.requiredAuthenticationStrength"
  ],
  "ManagementPolicyScopeDTO": [
    "tianquan-jianshen.field.authorization.policy.management.domain.dto.ManagementPolicyScopeDTO.referenceId",
    "tianquan-jianshen.field.authorization.policy.management.domain.dto.ManagementPolicyScopeDTO.type"
  ],
  "ManagementPolicySubjectDTO": [
    "tianquan-jianshen.field.authorization.policy.management.domain.dto.ManagementPolicySubjectDTO.id",
    "tianquan-jianshen.field.authorization.policy.management.domain.dto.ManagementPolicySubjectDTO.type"
  ],
  "PolicyRequestDTO": [
    "tianquan-jianshen.field.authorization.policy.management.domain.dto.PolicyRequestDTO.activationRootRoleIds",
    "tianquan-jianshen.field.authorization.policy.management.domain.dto.PolicyRequestDTO.name",
    "tianquan-jianshen.field.authorization.policy.management.domain.dto.PolicyRequestDTO.operations",
    "tianquan-jianshen.field.authorization.policy.management.domain.dto.PolicyRequestDTO.policyCode",
    "tianquan-jianshen.field.authorization.policy.management.domain.dto.PolicyRequestDTO.restrictions",
    "tianquan-jianshen.field.authorization.policy.management.domain.dto.PolicyRequestDTO.scopes",
    "tianquan-jianshen.field.authorization.policy.management.domain.dto.PolicyRequestDTO.subjects",
    "tianquan-jianshen.field.authorization.policy.management.domain.dto.PolicyRequestDTO.validFrom",
    "tianquan-jianshen.field.authorization.policy.management.domain.dto.PolicyRequestDTO.validTo"
  ],
  "DecisionRequestDTO": [
    "tianquan-jianshen.field.authorization.runtime.decision.domain.dto.DecisionRequestDTO.permissionCode",
    "tianquan-jianshen.field.authorization.runtime.decision.domain.dto.DecisionRequestDTO.requestedDecisions",
    "tianquan-jianshen.field.authorization.runtime.decision.domain.dto.DecisionRequestDTO.resource",
    "tianquan-jianshen.field.authorization.runtime.decision.domain.dto.DecisionRequestDTO.subject",
    "tianquan-jianshen.field.authorization.runtime.decision.domain.dto.DecisionRequestDTO.tokenVersions"
  ],
  "AuthorizationDecisionResourceVO": [
    "tianquan-jianshen.field.authorization.runtime.decision.domain.vo.AuthorizationDecisionResourceVO.applicationCode",
    "tianquan-jianshen.field.authorization.runtime.decision.domain.vo.AuthorizationDecisionResourceVO.resourceCode"
  ],
  "AuthorizationDecisionSubjectVO": [
    "tianquan-jianshen.field.authorization.runtime.decision.domain.vo.AuthorizationDecisionSubjectVO.identitySub",
    "tianquan-jianshen.field.authorization.runtime.decision.domain.vo.AuthorizationDecisionSubjectVO.tenantId",
    "tianquan-jianshen.field.authorization.runtime.decision.domain.vo.AuthorizationDecisionSubjectVO.userId"
  ],
  "TokenVersionsVO": [
    "tianquan-jianshen.field.authorization.runtime.decision.domain.vo.TokenVersionsVO.authVersion",
    "tianquan-jianshen.field.authorization.runtime.decision.domain.vo.TokenVersionsVO.policyVersion"
  ],
  "AuthorizationRoleChangeImpactRequestDTO": [
    "tianquan-jianshen.field.authorization.simulation.domain.dto.AuthorizationRoleChangeImpactRequestDTO.at",
    "tianquan-jianshen.field.authorization.simulation.domain.dto.AuthorizationRoleChangeImpactRequestDTO.roleId"
  ],
  "AuthorizationSimulationRequestDTO": [
    "tianquan-jianshen.field.authorization.simulation.domain.dto.AuthorizationSimulationRequestDTO.at",
    "tianquan-jianshen.field.authorization.simulation.domain.dto.AuthorizationSimulationRequestDTO.decisionRequest",
    "tianquan-jianshen.field.authorization.simulation.domain.dto.AuthorizationSimulationRequestDTO.hypothesis"
  ],
  "HypothesisDTO": [
    "tianquan-jianshen.field.authorization.simulation.domain.dto.HypothesisDTO.addedPermissions",
    "tianquan-jianshen.field.authorization.simulation.domain.dto.HypothesisDTO.removedPermissions"
  ],
  "AdmitApplicationAuthorizationScopeCommand": [
    "tianquan-jianshen.field.iam.application.domain.command.AdmitApplicationAuthorizationScopeCommand.ddcApplicationId",
    "tianquan-jianshen.field.iam.application.domain.command.AdmitApplicationAuthorizationScopeCommand.displayPriority"
  ],
  "ChangeApplicationAuthorizationScopeStatusCommand": [
    "tianquan-jianshen.field.iam.application.domain.command.ChangeApplicationAuthorizationScopeStatusCommand.expectedVersion",
    "tianquan-jianshen.field.iam.application.domain.command.ChangeApplicationAuthorizationScopeStatusCommand.status"
  ],
  "OrganizationFacade$CreateCommand": [
    "tianquan-jianshen.field.iam.organization.service.OrganizationFacade.CreateCommand.code",
    "tianquan-jianshen.field.iam.organization.service.OrganizationFacade.CreateCommand.externalId",
    "tianquan-jianshen.field.iam.organization.service.OrganizationFacade.CreateCommand.name",
    "tianquan-jianshen.field.iam.organization.service.OrganizationFacade.CreateCommand.parentId",
    "tianquan-jianshen.field.iam.organization.service.OrganizationFacade.CreateCommand.type",
    "tianquan-jianshen.field.iam.organization.service.OrganizationFacade.CreateCommand.validFrom",
    "tianquan-jianshen.field.iam.organization.service.OrganizationFacade.CreateCommand.validTo"
  ],
  "OrganizationFacade$UpdateCommand": [
    "tianquan-jianshen.field.iam.organization.service.OrganizationFacade.UpdateCommand.expectedVersion",
    "tianquan-jianshen.field.iam.organization.service.OrganizationFacade.UpdateCommand.externalId",
    "tianquan-jianshen.field.iam.organization.service.OrganizationFacade.UpdateCommand.name",
    "tianquan-jianshen.field.iam.organization.service.OrganizationFacade.UpdateCommand.parentId",
    "tianquan-jianshen.field.iam.organization.service.OrganizationFacade.UpdateCommand.type",
    "tianquan-jianshen.field.iam.organization.service.OrganizationFacade.UpdateCommand.validFrom",
    "tianquan-jianshen.field.iam.organization.service.OrganizationFacade.UpdateCommand.validTo"
  ],
  "UserOrganizationAssignmentService$AssignCommand": [
    "tianquan-jianshen.field.iam.organization.service.UserOrganizationAssignmentService.AssignCommand.orgUnitId",
    "tianquan-jianshen.field.iam.organization.service.UserOrganizationAssignmentService.AssignCommand.reason",
    "tianquan-jianshen.field.iam.organization.service.UserOrganizationAssignmentService.AssignCommand.ticketNo",
    "tianquan-jianshen.field.iam.organization.service.UserOrganizationAssignmentService.AssignCommand.validFrom",
    "tianquan-jianshen.field.iam.organization.service.UserOrganizationAssignmentService.AssignCommand.validTo"
  ],
  "DirectorySnapshotCommandDTO": [
    "tianquan-jianshen.field.iam.organization.snapshot.domain.dto.DirectorySnapshotCommandDTO.checksum",
    "tianquan-jianshen.field.iam.organization.snapshot.domain.dto.DirectorySnapshotCommandDTO.generatedAt",
    "tianquan-jianshen.field.iam.organization.snapshot.domain.dto.DirectorySnapshotCommandDTO.payload",
    "tianquan-jianshen.field.iam.organization.snapshot.domain.dto.DirectorySnapshotCommandDTO.providerCode",
    "tianquan-jianshen.field.iam.organization.snapshot.domain.dto.DirectorySnapshotCommandDTO.snapshotVersion"
  ],
  "PositionFacade$CreateCommand": [
    "tianquan-jianshen.field.iam.position.service.PositionFacade.CreateCommand.code",
    "tianquan-jianshen.field.iam.position.service.PositionFacade.CreateCommand.externalId",
    "tianquan-jianshen.field.iam.position.service.PositionFacade.CreateCommand.name",
    "tianquan-jianshen.field.iam.position.service.PositionFacade.CreateCommand.orgUnitId",
    "tianquan-jianshen.field.iam.position.service.PositionFacade.CreateCommand.validFrom",
    "tianquan-jianshen.field.iam.position.service.PositionFacade.CreateCommand.validTo"
  ],
  "PositionFacade$UpdateCommand": [
    "tianquan-jianshen.field.iam.position.service.PositionFacade.UpdateCommand.expectedVersion",
    "tianquan-jianshen.field.iam.position.service.PositionFacade.UpdateCommand.externalId",
    "tianquan-jianshen.field.iam.position.service.PositionFacade.UpdateCommand.name",
    "tianquan-jianshen.field.iam.position.service.PositionFacade.UpdateCommand.orgUnitId",
    "tianquan-jianshen.field.iam.position.service.PositionFacade.UpdateCommand.validFrom",
    "tianquan-jianshen.field.iam.position.service.PositionFacade.UpdateCommand.validTo"
  ],
  "UserPositionAssignmentService$AssignCommand": [
    "tianquan-jianshen.field.iam.position.service.UserPositionAssignmentService.AssignCommand.orgUnitId",
    "tianquan-jianshen.field.iam.position.service.UserPositionAssignmentService.AssignCommand.positionId",
    "tianquan-jianshen.field.iam.position.service.UserPositionAssignmentService.AssignCommand.primaryAssignment",
    "tianquan-jianshen.field.iam.position.service.UserPositionAssignmentService.AssignCommand.reason",
    "tianquan-jianshen.field.iam.position.service.UserPositionAssignmentService.AssignCommand.ticketNo",
    "tianquan-jianshen.field.iam.position.service.UserPositionAssignmentService.AssignCommand.validFrom",
    "tianquan-jianshen.field.iam.position.service.UserPositionAssignmentService.AssignCommand.validTo"
  ],
  "CreateRoleRequestDTO": [
    "tianquan-jianshen.field.iam.role.domain.dto.CreateRoleRequestDTO.applicationId",
    "tianquan-jianshen.field.iam.role.domain.dto.CreateRoleRequestDTO.landingPriority",
    "tianquan-jianshen.field.iam.role.domain.dto.CreateRoleRequestDTO.landingRouteId",
    "tianquan-jianshen.field.iam.role.domain.dto.CreateRoleRequestDTO.maximumAssignmentDays",
    "tianquan-jianshen.field.iam.role.domain.dto.CreateRoleRequestDTO.privileged",
    "tianquan-jianshen.field.iam.role.domain.dto.CreateRoleRequestDTO.riskLevel",
    "tianquan-jianshen.field.iam.role.domain.dto.CreateRoleRequestDTO.roleCode",
    "tianquan-jianshen.field.iam.role.domain.dto.CreateRoleRequestDTO.roleName",
    "tianquan-jianshen.field.iam.role.domain.dto.CreateRoleRequestDTO.roleType"
  ],
  "UpdateRoleRequestDTO": [
    "tianquan-jianshen.field.iam.role.domain.dto.UpdateRoleRequestDTO.expectedRoleVersion",
    "tianquan-jianshen.field.iam.role.domain.dto.UpdateRoleRequestDTO.landingPriority",
    "tianquan-jianshen.field.iam.role.domain.dto.UpdateRoleRequestDTO.landingRouteId",
    "tianquan-jianshen.field.iam.role.domain.dto.UpdateRoleRequestDTO.maximumAssignmentDays",
    "tianquan-jianshen.field.iam.role.domain.dto.UpdateRoleRequestDTO.roleName",
    "tianquan-jianshen.field.iam.role.domain.dto.UpdateRoleRequestDTO.status"
  ],
  "CreateUserCommandDTO": [
    "tianquan-jianshen.field.iam.user.domain.dto.CreateUserCommandDTO.identitySub",
    "tianquan-jianshen.field.iam.user.domain.dto.CreateUserCommandDTO.status"
  ],
  "UpdateUserCommandDTO": [
    "tianquan-jianshen.field.iam.user.domain.dto.UpdateUserCommandDTO.expectedAuthVersion",
    "tianquan-jianshen.field.iam.user.domain.dto.UpdateUserCommandDTO.identitySub"
  ],
  "UserStatusCommandDTO": [
    "tianquan-jianshen.field.iam.user.domain.dto.UserStatusCommandDTO.expectedAuthVersion",
    "tianquan-jianshen.field.iam.user.domain.dto.UserStatusCommandDTO.reason",
    "tianquan-jianshen.field.iam.user.domain.dto.UserStatusCommandDTO.status"
  ]
} as const
