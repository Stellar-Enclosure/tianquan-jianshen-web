import {fieldReferences} from './fieldReferences'
import {defineResources, defineMessages} from '@stellar-enclosure/stellar-enclosure-web-shared/permissions'

export const resources = defineResources([
  {
    "key": "tianquan-jianshen.app.console",
    "type": "APP",
    "target": {
      "applicationCode": "tianquan-jianshen"
    },
    "access": "PUBLIC",
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.app.console"
    }
  },
  {
    "key": "tianquan-jianshen.menu.iam",
    "type": "MENU",
    "target": {
      "order": "10",
      "label": "IAM"
    },
    "access": "PUBLIC",
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.menu.iam"
    }
  },
  {
    "key": "tianquan-jianshen.menu.iam.directory",
    "type": "MENU",
    "target": {
      "parentKey": "tianquan-jianshen.menu.iam",
      "order": "20",
      "label": "目录"
    },
    "access": "PUBLIC",
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.menu.iam.directory"
    }
  },
  {
    "key": "tianquan-jianshen.menu.iam.authorization",
    "type": "MENU",
    "target": {
      "parentKey": "tianquan-jianshen.menu.iam",
      "order": "30",
      "label": "授权"
    },
    "access": "PUBLIC",
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.menu.iam.authorization"
    }
  },
  {
    "key": "tianquan-jianshen.menu.iam.catalog",
    "type": "MENU",
    "target": {
      "parentKey": "tianquan-jianshen.menu.iam",
      "order": "40",
      "label": "资源目录"
    },
    "access": "PUBLIC",
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.menu.iam.catalog"
    }
  },
  {
    "key": "tianquan-jianshen.menu.iam.diagnostics",
    "type": "MENU",
    "target": {
      "parentKey": "tianquan-jianshen.menu.iam",
      "order": "90",
      "label": "诊断"
    },
    "access": "PUBLIC",
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.menu.iam.diagnostics"
    }
  },
  {
    "key": "tianquan-jianshen.page.overview",
    "type": "PAGE",
    "target": {
      "route": "/iam/overview",
      "component": "tianquan-jianshen-overview",
      "label": "治理概览",
      "parentKey": "tianquan-jianshen.menu.iam",
      "order": "10",
      "hidden": "false"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:runtime:read"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.page.overview"
    }
  },
  {
    "key": "tianquan-jianshen.page.directory-users",
    "type": "PAGE",
    "target": {
      "route": "/iam/users",
      "component": "tianquan-jianshen-users",
      "label": "用户",
      "parentKey": "tianquan-jianshen.menu.iam.directory",
      "order": "30",
      "hidden": "false"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:user:read"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.page.directory-users"
    }
  },
  {
    "key": "tianquan-jianshen.page.directory-organizations",
    "type": "PAGE",
    "target": {
      "route": "/iam/organizations",
      "component": "tianquan-jianshen-organizations",
      "label": "组织",
      "parentKey": "tianquan-jianshen.menu.iam.directory",
      "order": "31",
      "hidden": "false"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:organization:read"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.page.directory-organizations"
    }
  },
  {
    "key": "tianquan-jianshen.page.directory-positions",
    "type": "PAGE",
    "target": {
      "route": "/iam/positions",
      "component": "tianquan-jianshen-positions",
      "label": "岗位",
      "parentKey": "tianquan-jianshen.menu.iam.directory",
      "order": "32",
      "hidden": "false"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:position:read"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.page.directory-positions"
    }
  },
  {
    "key": "tianquan-jianshen.page.tenant-applications",
    "type": "PAGE",
    "target": {
      "route": "/iam/tenant-applications",
      "component": "tianquan-jianshen-tenant-applications",
      "label": "租户应用",
      "parentKey": "tianquan-jianshen.menu.iam.catalog",
      "order": "40",
      "hidden": "false"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:application:read"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.page.tenant-applications"
    }
  },
  {
    "key": "tianquan-jianshen.page.resources",
    "type": "PAGE",
    "target": {
      "route": "/iam/resources",
      "component": "tianquan-jianshen-resources",
      "label": "资源",
      "parentKey": "tianquan-jianshen.menu.iam.catalog",
      "order": "41",
      "hidden": "false"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:permission-catalog:read"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.page.resources"
    }
  },
  {
    "key": "tianquan-jianshen.page.fields",
    "type": "PAGE",
    "target": {
      "route": "/iam/fields",
      "component": "tianquan-jianshen-fields",
      "label": "字段定义",
      "parentKey": "tianquan-jianshen.menu.iam.catalog",
      "order": "42",
      "hidden": "false"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:permission-catalog:read"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.page.fields"
    }
  },
  {
    "key": "tianquan-jianshen.page.permissions",
    "type": "PAGE",
    "target": {
      "route": "/iam/permissions",
      "component": "tianquan-jianshen-permissions",
      "label": "权限",
      "parentKey": "tianquan-jianshen.menu.iam.catalog",
      "order": "43",
      "hidden": "false"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:permission-catalog:read"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.page.permissions"
    }
  },
  {
    "key": "tianquan-jianshen.page.business-catalog",
    "type": "PAGE",
    "target": {
      "route": "/iam/businesses",
      "component": "tianquan-jianshen-business-catalog",
      "label": "业务目录",
      "parentKey": "tianquan-jianshen.menu.iam.catalog",
      "order": "44",
      "hidden": "false"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:business:read"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.page.business-catalog"
    }
  },
  {
    "key": "tianquan-jianshen.page.roles",
    "type": "PAGE",
    "target": {
      "route": "/iam/roles",
      "component": "tianquan-jianshen-role-graph",
      "label": "角色",
      "parentKey": "tianquan-jianshen.menu.iam.authorization",
      "order": "50",
      "hidden": "false"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:role:read"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.page.roles"
    }
  },
  {
    "key": "tianquan-jianshen.page.role-permissions",
    "type": "PAGE",
    "target": {
      "route": "/iam/roles/:roleId/permissions",
      "component": "tianquan-jianshen-role-permissions",
      "label": "角色权限字符",
      "parentKey": "tianquan-jianshen.menu.iam.catalog",
      "order": "51",
      "hidden": "true"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:role-permission:read",
        "system:permission-catalog:read"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.page.role-permissions"
    }
  },
  {
    "key": "tianquan-jianshen.page.constraints",
    "type": "PAGE",
    "target": {
      "route": "/iam/policies",
      "component": "tianquan-jianshen-constraints",
      "label": "授权策略",
      "parentKey": "tianquan-jianshen.menu.iam.authorization",
      "order": "60",
      "hidden": "false"
    },
    "requirement": {
      "mode": "ANY",
      "codes": [
        "system:authorization-constraint:read",
        "system:data-rule:read",
        "system:operation-sod:read"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.page.constraints"
    }
  },
  {
    "key": "tianquan-jianshen.page.manifest-versions",
    "type": "PAGE",
    "target": {
      "route": "/iam/manifests",
      "component": "tianquan-jianshen-manifests",
      "label": "候选与激活",
      "parentKey": "tianquan-jianshen.menu.iam.catalog",
      "order": "45",
      "hidden": "false"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:permission-catalog:read"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.page.manifest-versions"
    }
  },
  {
    "key": "tianquan-jianshen.page.manifest-diff",
    "type": "PAGE",
    "target": {
      "route": "/iam/manifest-diff",
      "component": "tianquan-jianshen-manifest-diff",
      "label": "Manifest 差异",
      "parentKey": "tianquan-jianshen.menu.iam.catalog",
      "order": "46",
      "hidden": "false"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:permission-catalog:read"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.page.manifest-diff"
    }
  },
  {
    "key": "tianquan-jianshen.page.assignments",
    "type": "PAGE",
    "target": {
      "route": "/iam/users/:userId/role-assignments",
      "component": "tianquan-jianshen-assignments",
      "label": "角色任职",
      "parentKey": "tianquan-jianshen.menu.iam.authorization",
      "order": "70",
      "hidden": "true"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:role-assignment:read"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.page.assignments"
    }
  },
  {
    "key": "tianquan-jianshen.page.management-policies",
    "type": "PAGE",
    "target": {
      "route": "/iam/management-policies",
      "component": "tianquan-jianshen-management-policies",
      "label": "委托策略",
      "parentKey": "tianquan-jianshen.menu.iam.authorization",
      "order": "71",
      "hidden": "false"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:management-policy:read"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.page.management-policies"
    }
  },
  {
    "key": "tianquan-jianshen.page.role-activation",
    "type": "PAGE",
    "target": {
      "route": "/iam/role-activation",
      "component": "tianquan-jianshen-role-activation",
      "label": "激活角色",
      "parentKey": "tianquan-jianshen.menu.iam.authorization",
      "order": "72",
      "hidden": "false"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:role-activation:read"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.page.role-activation"
    }
  },
  {
    "key": "tianquan-jianshen.page.simulation",
    "type": "PAGE",
    "target": {
      "route": "/iam/diagnostics/simulation",
      "component": "tianquan-jianshen-simulation",
      "label": "授权模拟",
      "parentKey": "tianquan-jianshen.menu.iam.diagnostics",
      "order": "80",
      "hidden": "false"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:authorization-simulation:execute"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.page.simulation"
    }
  },
  {
    "key": "tianquan-jianshen.page.audit",
    "type": "PAGE",
    "target": {
      "route": "/iam/diagnostics/audit",
      "component": "tianquan-jianshen-audit",
      "label": "授权审计",
      "parentKey": "tianquan-jianshen.menu.iam.diagnostics",
      "order": "81",
      "hidden": "false"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:audit:read"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.page.audit"
    }
  },
  {
    "key": "tianquan-jianshen.page.runtime",
    "type": "PAGE",
    "target": {
      "route": "/iam/diagnostics/runtime",
      "component": "tianquan-jianshen-runtime",
      "label": "运行状态",
      "parentKey": "tianquan-jianshen.menu.iam.diagnostics",
      "order": "82",
      "hidden": "false"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:authorization-runtime:read"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.page.runtime"
    }
  },
  {
    "key": "tianquan-jianshen.button.ApplicationListPage.manage1",
    "type": "BUTTON",
    "target": {
      "component": "src/features/application/ApplicationListPage.tsx",
      "action": "manage1"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:application:manage"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.button.ApplicationListPage.manage1"
    }
  },
  {
    "key": "tianquan-jianshen.button.ApplicationListPage.manage2",
    "type": "BUTTON",
    "target": {
      "component": "src/features/application/ApplicationListPage.tsx",
      "action": "manage2"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:application:manage"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.button.ApplicationListPage.manage2"
    }
  },
  {
    "key": "tianquan-jianshen.button.AssignmentListPage.manage1",
    "type": "BUTTON",
    "target": {
      "component": "src/features/assignment/AssignmentListPage.tsx",
      "action": "manage1"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:role-assignment:manage"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.button.AssignmentListPage.manage1"
    }
  },
  {
    "key": "tianquan-jianshen.button.AssignmentListPage.manage2",
    "type": "BUTTON",
    "target": {
      "component": "src/features/assignment/AssignmentListPage.tsx",
      "action": "manage2"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:role-assignment:manage"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.button.AssignmentListPage.manage2"
    }
  },
  {
    "key": "tianquan-jianshen.button.ConstraintPage.manage1",
    "type": "BUTTON",
    "target": {
      "component": "src/features/constraint/ConstraintPage.tsx",
      "action": "manage1"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:authorization-constraint:manage"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.button.ConstraintPage.manage1"
    }
  },
  {
    "key": "tianquan-jianshen.button.ConstraintPage.manage2",
    "type": "BUTTON",
    "target": {
      "component": "src/features/constraint/ConstraintPage.tsx",
      "action": "manage2"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:authorization-constraint:manage"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.button.ConstraintPage.manage2"
    }
  },
  {
    "key": "tianquan-jianshen.button.ConstraintPage.sod",
    "type": "BUTTON",
    "target": {
      "component": "src/features/constraint/ConstraintPage.tsx",
      "action": "sod"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:authorization-constraint:manage"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.button.ConstraintPage.sod"
    }
  },
  {
    "key": "tianquan-jianshen.button.ConstraintPage.data",
    "type": "BUTTON",
    "target": {
      "component": "src/features/constraint/ConstraintPage.tsx",
      "action": "data"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:data-rule:manage"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.button.ConstraintPage.data"
    }
  },
  {
    "key": "tianquan-jianshen.button.ConstraintPage.operation",
    "type": "BUTTON",
    "target": {
      "component": "src/features/constraint/ConstraintPage.tsx",
      "action": "operation"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:operation-sod:manage"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.button.ConstraintPage.operation"
    }
  },
  {
    "key": "tianquan-jianshen.button.OrgPositionSnapshotPage.sync1",
    "type": "BUTTON",
    "target": {
      "component": "src/features/directory/OrgPositionSnapshotPage.tsx",
      "action": "sync1"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:directory:sync"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.button.OrgPositionSnapshotPage.sync1"
    }
  },
  {
    "key": "tianquan-jianshen.button.OrganizationPage.manage1",
    "type": "BUTTON",
    "target": {
      "component": "src/features/directory/OrganizationPage.tsx",
      "action": "manage1"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:organization:manage"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.button.OrganizationPage.manage1"
    }
  },
  {
    "key": "tianquan-jianshen.button.OrganizationPage.manage2",
    "type": "BUTTON",
    "target": {
      "component": "src/features/directory/OrganizationPage.tsx",
      "action": "manage2"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:organization:manage"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.button.OrganizationPage.manage2"
    }
  },
  {
    "key": "tianquan-jianshen.button.PositionPage.manage1",
    "type": "BUTTON",
    "target": {
      "component": "src/features/directory/PositionPage.tsx",
      "action": "manage1"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:position:manage"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.button.PositionPage.manage1"
    }
  },
  {
    "key": "tianquan-jianshen.button.PositionPage.manage2",
    "type": "BUTTON",
    "target": {
      "component": "src/features/directory/PositionPage.tsx",
      "action": "manage2"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:position:manage"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.button.PositionPage.manage2"
    }
  },
  {
    "key": "tianquan-jianshen.button.UserDirectoryPage.manage1.system.user.manage",
    "type": "BUTTON",
    "target": {
      "component": "src/features/directory/UserDirectoryPage.tsx",
      "action": "manage1"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:user:manage"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.button.UserDirectoryPage.manage1.system.user.manage"
    }
  },
  {
    "key": "tianquan-jianshen.button.UserDirectoryPage.manage2",
    "type": "BUTTON",
    "target": {
      "component": "src/features/directory/UserDirectoryPage.tsx",
      "action": "manage2"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:user:manage"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.button.UserDirectoryPage.manage2"
    }
  },
  {
    "key": "tianquan-jianshen.button.UserDirectoryPage.manage1.system.user-status.manage",
    "type": "BUTTON",
    "target": {
      "component": "src/features/directory/UserDirectoryPage.tsx",
      "action": "manage1"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:user-status:manage"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.button.UserDirectoryPage.manage1.system.user-status.manage"
    }
  },
  {
    "key": "tianquan-jianshen.button.UserRelationsPanel.manage1.system.user-organization.manage",
    "type": "BUTTON",
    "target": {
      "component": "src/features/directory/UserRelationsPanel.tsx",
      "action": "manage1"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:user-organization:manage"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.button.UserRelationsPanel.manage1.system.user-organization.manage"
    }
  },
  {
    "key": "tianquan-jianshen.button.UserRelationsPanel.manage1.system.user-position.manage",
    "type": "BUTTON",
    "target": {
      "component": "src/features/directory/UserRelationsPanel.tsx",
      "action": "manage1"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:user-position:manage"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.button.UserRelationsPanel.manage1.system.user-position.manage"
    }
  },
  {
    "key": "tianquan-jianshen.button.UserRelationsPanel.read1",
    "type": "BUTTON",
    "target": {
      "component": "src/features/directory/UserRelationsPanel.tsx",
      "action": "read1"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:role-assignment:read"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.button.UserRelationsPanel.read1"
    }
  },
  {
    "key": "tianquan-jianshen.button.UserRelationsPanel.manage2.system.user-organization.manage",
    "type": "BUTTON",
    "target": {
      "component": "src/features/directory/UserRelationsPanel.tsx",
      "action": "manage2"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:user-organization:manage"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.button.UserRelationsPanel.manage2.system.user-organization.manage"
    }
  },
  {
    "key": "tianquan-jianshen.button.UserRelationsPanel.manage2.system.user-position.manage",
    "type": "BUTTON",
    "target": {
      "component": "src/features/directory/UserRelationsPanel.tsx",
      "action": "manage2"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:user-position:manage"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.button.UserRelationsPanel.manage2.system.user-position.manage"
    }
  },
  {
    "key": "tianquan-jianshen.button.ManagementPolicyPage.manage1",
    "type": "BUTTON",
    "target": {
      "component": "src/features/management-policy/ManagementPolicyPage.tsx",
      "action": "manage1"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:management-policy:manage"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.button.ManagementPolicyPage.manage1"
    }
  },
  {
    "key": "tianquan-jianshen.button.ManagementPolicyPage.manage2",
    "type": "BUTTON",
    "target": {
      "component": "src/features/management-policy/ManagementPolicyPage.tsx",
      "action": "manage2"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:management-policy:manage"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.button.ManagementPolicyPage.manage2"
    }
  },
  {
    "key": "tianquan-jianshen.button.RoleGraphPage.create1",
    "type": "BUTTON",
    "target": {
      "component": "src/features/role/RoleGraphPage.tsx",
      "action": "create1"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:role:create"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.button.RoleGraphPage.create1"
    }
  },
  {
    "key": "tianquan-jianshen.button.RoleGraphPage.update1",
    "type": "BUTTON",
    "target": {
      "component": "src/features/role/RoleGraphPage.tsx",
      "action": "update1"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:role:update"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.button.RoleGraphPage.update1"
    }
  },
  {
    "key": "tianquan-jianshen.button.RoleGraphPage.manage1",
    "type": "BUTTON",
    "target": {
      "component": "src/features/role/RoleGraphPage.tsx",
      "action": "manage1"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:role-inheritance:manage"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.button.RoleGraphPage.manage1"
    }
  },
  {
    "key": "tianquan-jianshen.button.RoleGraphPage.read1",
    "type": "BUTTON",
    "target": {
      "component": "src/features/role/RoleGraphPage.tsx",
      "action": "read1"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:role-permission:read"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.button.RoleGraphPage.read1"
    }
  },
  {
    "key": "tianquan-jianshen.button.RoleActivationPage.use",
    "type": "BUTTON",
    "target": {
      "component": "src/features/role-activation/RoleActivationPage.tsx",
      "action": "use"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:role-activation:use"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.button.RoleActivationPage.use"
    }
  },
  {
    "key": "tianquan-jianshen.button.MutationRecoveryPanel.operate1",
    "type": "BUTTON",
    "target": {
      "component": "src/features/runtime/MutationRecoveryPanel.tsx",
      "action": "operate1"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:authorization-runtime:operate"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.button.MutationRecoveryPanel.operate1"
    }
  },
  {
    "key": "tianquan-jianshen.button.AuthorizationSimulationPage.execute1",
    "type": "BUTTON",
    "target": {
      "component": "src/features/simulation/AuthorizationSimulationPage.tsx",
      "action": "execute1"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:authorization-simulation:execute"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.button.AuthorizationSimulationPage.execute1"
    }
  },
  {
    "key": "tianquan-jianshen.button.AuthorizationSimulationPage.execute2",
    "type": "BUTTON",
    "target": {
      "component": "src/features/simulation/AuthorizationSimulationPage.tsx",
      "action": "execute2"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:authorization-simulation:execute"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.button.AuthorizationSimulationPage.execute2"
    }
  },
  {
    "key": "tianquan-jianshen.button.catalog.disable",
    "type": "BUTTON",
    "target": {
      "action": "catalog.disable"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:permission-catalog:manage"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.button.catalog.disable"
    }
  },
  {
    "key": "tianquan-jianshen.button.catalog.retire",
    "type": "BUTTON",
    "target": {
      "action": "catalog.retire"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:permission-catalog:manage"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.button.catalog.retire"
    }
  },
  {
    "key": "tianquan-jianshen.button.catalog.transfer",
    "type": "BUTTON",
    "target": {
      "action": "catalog.transfer"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:permission-catalog:manage"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.button.catalog.transfer"
    }
  },
  {
    "key": "tianquan-jianshen.button.catalog.activate",
    "type": "BUTTON",
    "target": {
      "action": "catalog.activate"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:permission-catalog:activate"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.button.catalog.activate"
    }
  },
  {
    "key": "tianquan-jianshen.button.catalog.approveExpansion",
    "type": "BUTTON",
    "target": {
      "action": "catalog.approveExpansion"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:permission-catalog:manage"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.button.catalog.approveExpansion"
    }
  },
  {
    "key": "tianquan-jianshen.button.rolePermissions.save",
    "type": "BUTTON",
    "target": {
      "action": "rolePermissions.save"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:role-permission:manage"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.button.rolePermissions.save"
    }
  },
  {
    "key": "tianquan-jianshen.component.ConstraintPage.sod",
    "type": "COMPONENT",
    "target": {
      "component": "src/features/constraint/ConstraintPage.tsx"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:authorization-constraint:read"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.component.ConstraintPage.sod"
    }
  },
  {
    "key": "tianquan-jianshen.component.ConstraintPage.data",
    "type": "COMPONENT",
    "target": {
      "component": "src/features/constraint/ConstraintPage.tsx"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:data-rule:read",
        "system:permission-catalog:read"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.component.ConstraintPage.data"
    }
  },
  {
    "key": "tianquan-jianshen.component.ConstraintPage.operation",
    "type": "COMPONENT",
    "target": {
      "component": "src/features/constraint/ConstraintPage.tsx"
    },
    "requirement": {
      "mode": "ALL",
      "codes": [
        "system:operation-sod:read"
      ]
    },
    "i18n": {
      "pageCode": "tianquan-jianshen.web.permissions",
      "labelKey": "tianquan-jianshen.component.ConstraintPage.operation"
    }
  }
] as const)

export const resourceReferences = fieldReferences

export const messages = defineMessages([
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.app.console",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "权限治理"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.menu.iam",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "IAM"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.menu.iam.directory",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "目录"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.menu.iam.authorization",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "授权"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.menu.iam.catalog",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "资源目录"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.menu.iam.diagnostics",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "诊断"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.page.overview",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "治理概览"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.page.directory-users",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "用户"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.page.directory-organizations",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "组织"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.page.directory-positions",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "岗位"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.page.tenant-applications",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "租户应用"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.page.resources",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "资源"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.page.fields",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "字段定义"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.page.permissions",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "权限"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.page.business-catalog",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "业务目录"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.page.roles",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "角色"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.page.role-permissions",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "角色权限字符"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.page.constraints",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "授权策略"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.page.manifest-versions",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "候选与激活"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.page.manifest-diff",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "Manifest 差异"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.page.assignments",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "角色任职"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.page.management-policies",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "委托策略"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.page.role-activation",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "激活角色"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.page.simulation",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "授权模拟"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.page.audit",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "授权审计"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.page.runtime",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "运行状态"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.button.ApplicationListPage.manage1",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "manage1"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.button.ApplicationListPage.manage2",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "manage2"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.button.AssignmentListPage.manage1",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "manage1"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.button.AssignmentListPage.manage2",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "manage2"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.button.ConstraintPage.manage1",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "manage1"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.button.ConstraintPage.manage2",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "manage2"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.button.ConstraintPage.sod",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "sod"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.button.ConstraintPage.data",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "data"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.button.ConstraintPage.operation",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "operation"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.button.OrgPositionSnapshotPage.sync1",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "sync1"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.button.OrganizationPage.manage1",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "manage1"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.button.OrganizationPage.manage2",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "manage2"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.button.PositionPage.manage1",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "manage1"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.button.PositionPage.manage2",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "manage2"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.button.UserDirectoryPage.manage1.system.user.manage",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "manage1"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.button.UserDirectoryPage.manage2",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "manage2"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.button.UserDirectoryPage.manage1.system.user-status.manage",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "manage1"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.button.UserRelationsPanel.manage1.system.user-organization.manage",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "manage1"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.button.UserRelationsPanel.manage1.system.user-position.manage",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "manage1"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.button.UserRelationsPanel.read1",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "read1"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.button.UserRelationsPanel.manage2.system.user-organization.manage",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "manage2"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.button.UserRelationsPanel.manage2.system.user-position.manage",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "manage2"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.button.ManagementPolicyPage.manage1",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "manage1"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.button.ManagementPolicyPage.manage2",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "manage2"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.button.RoleGraphPage.create1",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "create1"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.button.RoleGraphPage.update1",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "update1"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.button.RoleGraphPage.manage1",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "manage1"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.button.RoleGraphPage.read1",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "read1"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.button.RoleActivationPage.use",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "use"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.button.MutationRecoveryPanel.operate1",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "operate1"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.button.AuthorizationSimulationPage.execute1",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "execute1"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.button.AuthorizationSimulationPage.execute2",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "execute2"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.button.catalog.disable",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "停用定义"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.button.catalog.retire",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "退场定义"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.button.catalog.transfer",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "转移所有权"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.button.catalog.activate",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "激活完整版本集"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.button.catalog.approveExpansion",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "确认扩权"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.button.rolePermissions.save",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "保存权限字符"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.component.ConstraintPage.sod",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "职责分离约束"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.component.ConstraintPage.data",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "数据规则"
    }
  },
  {
    "pageCode": "tianquan-jianshen.web.permissions",
    "key": "tianquan-jianshen.component.ConstraintPage.operation",
    "defaultLocale": "zh-CN",
    "defaults": {
      "zh-CN": "操作职责分离"
    }
  }
] as const)
