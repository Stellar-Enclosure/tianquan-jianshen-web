import {access, readdir, readFile} from 'node:fs/promises'
import {dirname, extname, join, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
for (const old of ['src/app/resourceDefinitions.json', 'scripts/report-rbac-resources.mjs', 'src/features/role/RoleResourceGrantPage.tsx']) {
  try {await access(join(root, old))} catch (error) {if (error.code === 'ENOENT') continue; throw error}
  throw new Error('Removed manual registration/grant source is still present: ' + old)
}
const forbidden = ['reportFrontendResources', '/permission-mapping', 'createPermission(', 'createFieldRule(', 'updateFieldRule(', '/iam/roles/:roleId/resources']
const inspect = async directory => {
  for (const entry of await readdir(directory, {withFileTypes: true})) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) await inspect(path)
    else if (['.ts', '.tsx', '.json'].includes(extname(entry.name)) && !entry.name.includes('.test.')) {
      const content = await readFile(path, 'utf8')
      const violation = forbidden.find(value => content.includes(value))
      if (violation) throw new Error('Removed authorization path remains: ' + violation + ' (' + path + ')')
    }
  }
}
await inspect(join(root, 'src'))
const manifest = JSON.parse(await readFile(join(root, '.generated/permissions/manifest-v1.json'), 'utf8'))
const record = JSON.parse(await readFile(join(root, '.generated/permissions/artifact-record.json'), 'utf8'))
const embedded = JSON.parse(await readFile(join(root, 'dist/permission-build.json'), 'utf8'))
if (record.status !== 'BUILT' || manifest.producer.snapshotMode !== 'FULL' || manifest.artifact.buildId !== embedded.artifact.buildId
  || record.buildEvidenceDigest !== embedded.buildEvidenceDigest || record.manifestDigest !== embedded.manifestDigest) throw new Error('Current permission build evidence is missing or inconsistent')
process.stdout.write('Permission declarations and current embedded build evidence passed\n')
