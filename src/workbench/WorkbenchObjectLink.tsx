import type {PropsWithChildren} from 'react'
import {Link} from 'react-router-dom'
import {useEmbeddedWorkbench} from '@stellar-enclosure/stellar-enclosure-web-shared'

/** The host owns embedded object tabs; standalone links keep normal router behavior. */
export const WorkbenchObjectLink = ({to, children}: PropsWithChildren<{readonly to: string}>) => {
  const {embedded, requestNavigation} = useEmbeddedWorkbench()
  return <Link to={to} onClick={event => {
    if (!embedded || event.defaultPrevented || event.button !== 0
      || event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) return
    event.preventDefault()
    requestNavigation('push', {path: to})
  }}>{children}</Link>
}
