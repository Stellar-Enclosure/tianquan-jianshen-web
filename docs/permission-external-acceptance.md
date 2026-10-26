# Existing-environment permission acceptance

`playwright.external.config.ts` is separate from the historical mocked browser fixtures. It contains no `webServer`, preview, startup command, default localhost URL or automatic login. Its eight scenarios require a user-prepared, already running HTTPS environment and disposable data. No browser or environment acceptance was executed during implementation.

The harness covers anonymous rejection, real prepared identities across two applications/tenants, actual browser-page credential use, API-008 scope/version binding, real field-catalog input bindings, credential-cookie flags/paths, missing-CSRF rejection and cross-application/tenant ownership of a **known existing** refresh operation. It does not fabricate an empty permission view, mint credentials, register a producer, activate a deployment or create administrator roles.

Prepare two disposable actor browser states manually through the real login/consent flow. Each state must contain its own valid application cookies for both configured applications. Store the state and fixture outside Git in owner-only absolute files (`0600`); do not upload them as CI artifacts. The harness reads them privately and neither exports nor overwrites browser state. Passwords are not fixture inputs. Trace, HAR, screenshots and video are disabled; errors must not include cookie values.

The fixture JSON contains:

- `schemaVersion: 1`, `disposable: true`, and canonical HTTPS `origin` without credentials/query/fragment.
- `apps`: two to six objects with `alias`, same-origin `uiUrl`, and `fields: [{key, inputBinding}]`. Choose actual keys from each backend's final FULL manifest, including at least one readonly response field. Each request is bounded to 24 keys.
- `actors`: two to four objects with distinct `name`, `issuer`, `tenantId`, `subject`, absolute private `storageStateFile`, and `targets[appAlias]`. Each target is the exact six fields `catalogScopeId`, `tenantId`, `businessCode`, `applicationCode`, `namespaceCode`, `environment`; IDs are positive decimal strings. The prepared dataset must include two tenants, namespaces and environments.
- `refreshOperations`: at least one `{owner, deniedActor, app, deniedApp, operationId}`. The owner/app lookup must succeed first, then the other actor and other application must receive 404. Supply a real retained operation from the disposable dataset; a random unknown UUID cannot prove isolation.

The fixture values come from B0 → producer registration/READY → deployment qualification/activation → B1 and the real login state. No sample IDs are accepted as proof that those stages completed. A stale/expired state, mismatched target, unready build or absent known operation fails the test.

Collection and source checking need no fixture or browser:

```bash
npm run e2e:external -- --list
./node_modules/.bin/tsc --ignoreConfig --noEmit --target ES2022 --module ESNext \
  --moduleResolution Bundler --strict --skipLibCheck --types node \
  playwright.external.config.ts e2e/external/permission-platform.spec.ts
```

Only after the owner explicitly authorizes runtime/browser validation:

```bash
STELLAR_PERMISSION_EXTERNAL_ENABLED=true \
STELLAR_PERMISSION_EXTERNAL_CONFIG_FILE=/absolute/private/permission-external.json \
npm run e2e:external
```

The test performs one deliberately invalid logout POST without a CSRF proof and checks that identity remains valid. Treat the actors as disposable: if the deployed server has a CSRF regression, this negative test can close that test authorization. The harness does not perform a successful logout, credential rotation or business mutation automatically.

Fresh login/Code/Refresh response-loss and restart/concurrency behavior, full SSO/logout/account-switch interactions, direct API/FIELD writes for all seven resource kinds, actual CI registration/deployment proof/activation/rollback, and independent human translation publication remain separate S32 acceptance items. They require their exact prepared database, API and delivery fixtures and explicit runtime authorization; these eight browser scenarios do not establish those results.
