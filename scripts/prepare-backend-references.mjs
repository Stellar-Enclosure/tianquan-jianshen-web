import {resolve} from 'node:path'
import {pathToFileURL} from 'node:url'

if (!process.env.PAC_SDK_DIR) throw new Error('PAC_SDK_DIR_REQUIRED: use the tool checkout pinned by the toolchain lock')
const tool = pathToFileURL(resolve(process.env.PAC_SDK_DIR, 'scripts/permissions/prepare-consumer-backend.mjs')).href
const {prepareConsumerBackend} = await import(tool)
await prepareConsumerBackend()
