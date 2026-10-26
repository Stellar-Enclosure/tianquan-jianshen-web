import type {ReactNode} from 'react'
import {useRbac3Authorization} from '@stellar-enclosure/stellar-enclosure-tianquan-jianshen-react-sdk'
import {usePermission} from '@stellar-enclosure/stellar-enclosure-web-shared/react-permissions'
import {resources} from './resources'

export const useResourcePermission = (key: string): boolean => {
  const {status, snapshot, binding} = useRbac3Authorization()
  const permission = usePermission(status === 'READY' ? snapshot : null, binding)
  const resource = resources.find(value => value.key === key)
  return resource ? permission.allows('requirement' in resource ? resource.requirement : {access: resource.access}) : false
}
export const ResourceGuard = ({resourceKey, children, fallback = null}: {resourceKey: string; children: ReactNode; fallback?: ReactNode}) =>
  useResourcePermission(resourceKey) ? children : fallback
