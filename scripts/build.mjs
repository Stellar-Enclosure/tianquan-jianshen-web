import {resolve} from 'node:path'
import {pathToFileURL} from 'node:url'
import {rm} from 'node:fs/promises'
import {loadEnv} from 'vite'
import {validateDeploymentConfig, verifyDeploymentArtifact} from './deployment-config.mjs'

const release = process.argv.includes('--release') || process.env.JIANSHEN_RELEASE_BUILD === 'true'
delete process.env.JIANSHEN_DEPLOYMENT_CONFIG
const clearSuccessEvidence = async () => {
  for (const path of ['dist/deployment-config.json', 'dist/permission-build.json',
    '.generated/permissions/artifact-record.json', '.generated/permissions/build-evidence.json']) {
    await rm(resolve(path), {force: true})
  }
}
if (release) {
  await clearSuccessEvidence()
  const environment = {...loadEnv('production', process.cwd(), 'VITE_'), ...process.env}
  const deployment = validateDeploymentConfig(environment)
  const {createPublicOAuthClient} = await import('@stellar-enclosure/stellar-enclosure-web-shared')
  createPublicOAuthClient({registrations: deployment.oauth.registrations, activeResource: deployment.oauth.activeResource})
  Object.assign(process.env, environment, {JIANSHEN_DEPLOYMENT_CONFIG: JSON.stringify(deployment)})
}

if (!process.env.PAC_SDK_DIR) throw new Error('PAC_SDK_DIR_REQUIRED: use the tool checkout pinned by the toolchain lock')
const tool = pathToFileURL(resolve(process.env.PAC_SDK_DIR, 'scripts/permissions/build-consumer.mjs')).href
const {buildConsumer} = await import(tool)
try {
  const result = await buildConsumer()
  if (release) await verifyDeploymentArtifact(resolve('dist'))
  process.stdout.write(JSON.stringify({status: result.status, mode: result.mode, buildId: result.artifact.buildId, manifestDigest: result.manifestDigest, artifactDigest: result.artifactDigest}) + '\n')
} catch (error) {
  await clearSuccessEvidence()
  throw error
}
