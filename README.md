# tianquan-jianshen-web

React console for Jianshen IAM governance and RBAC3 authorization management. All first-party modules start at **0.0.1**.

## Pages and capabilities

| Area | Function |
|---|---|
| IAM directory | Manage users, organizations/positions, businesses and applications; browse admitted resource catalogs. |
| Roles and permissions | Maintain roles/inheritance, permissions, role-resource grants and user-role assignments. |
| Governance | Edit constraints and management policies; inspect their effect through authorization and role-change simulation. |
| Role activation | Inspect available activation candidates and replace the current user's active role set. |
| Operations | Inspect audit records, runtime publication state and recovery/retry information. |

[Navigation](src/app/navigation.ts) combines the [governance](src/features/governance.routes.tsx), [authorization](src/features/authorization.routes.tsx) and [runtime](src/features/runtime.routes.tsx) descriptors. [Routing](src/app/router.tsx) filters navigation and guards pages against the authorization state. The usual role-management entry is `/iam/roles`; the actual landing route is selected from the current user's allowed local routes.

The console consumes [tianquan-jianshen-service](https://github.com/Stellar-Enclosure/tianquan-jianshen-service), the shared Web UI package and the [Jianshen React SDK](https://github.com/Stellar-Enclosure/web-sdk/tree/main/packages/stellar-enclosure-tianquan-jianshen-react-sdk). Browser authentication uses Edge registration `edge-jianshen`; the SDK supplies typed authorization, activation and UI guards while the server independently enforces decisions. Shoubing user/password/client/key administration belongs to [tianquan-shoubing-web](https://github.com/Stellar-Enclosure/tianquan-shoubing-web).

This is a static SPA that can run standalone or as a portal child. Resource reporting and bundle/conformance checks are available in [package.json](package.json); browser E2E commands are separate from ordinary build/test commands.

## Build and test

Requires Node 24 and npm 11. After the SDKs are published:

```bash
npm ci
npm run build
npm test -- --run
```

For the initial release before npm publication, clone `web-sdk` next to this repository:

```bash
node ../web-sdk/scripts/verify-consumers.mjs \
  --workspace "$(cd .. && pwd)" \
  --cache "$HOME/.npm" \
  --output "$(cd ../web-sdk && pwd)/dist/npm-release" \
  --consumer tianquan-jianshen-web --phase verify --online true
```

The verifier uses actual pack checksums and official registry addresses in the committed lock, then validates offline installation. It never publishes packages.

## Application delivery (no package publication)

This repository is a frontend application, not a library. Its `package.json` remains `private: true`; do not publish it to npm or Maven Central. Publish only the reusable packages owned by [web-sdk](https://github.com/Stellar-Enclosure/web-sdk#publish-to-npmjs).

```bash
npm ci
npm test
npm run build
```

Deploy the resulting `dist/` directory as static application assets. Before the first SDK publication, use the Build section's local consumer verification instead of `npm ci` against the public registry. These commands do not start a server.

## Compatibility and publication

Java packages/classes, Bean names, configuration keys, OAuth/RPC identities, APIs, and database ownership are retained. Existing SQL and DDL history are copied byte for byte. Artifact/build versions and necessary build paths change. A successful build does not imply application startup or live infrastructure acceptance.

Git pushes run validation only. Central and npm publication are separate user actions. CI defaults to initial source bootstrap; after publication set `STELLAR_USE_SOURCE_BOOTSTRAP=false` to consume published artifacts directly. Private organizations may supply the Actions secret `STELLAR_ENCLOSURE_READ_TOKEN` with repository read access.

Original MIT/LGPL licenses and author attribution are preserved.
