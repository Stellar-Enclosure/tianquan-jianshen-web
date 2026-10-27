import {createContext, useContext, type PropsWithChildren} from 'react'
import {useQuery} from '@tanstack/react-query'
import {useRbac3Authorization} from '@stellar-enclosure/stellar-enclosure-tianquan-jianshen-react-sdk'
import {evaluateFieldAccess, loadFieldCatalog, type BackendFieldCatalog} from '@stellar-enclosure/stellar-enclosure-web-shared/permissions'
import {useFeatureApi} from '../features/shared/FeatureApi'
import {inputFields} from './fieldReferences'
import {resourceReferences} from './resources'

export const FieldCatalogContext = createContext<BackendFieldCatalog | null>(null)
export const FieldCatalogProvider = ({children}: PropsWithChildren) => {
  const {status, binding} = useRbac3Authorization()
  const client = useFeatureApi()
  const query = useQuery({queryKey: ['rbac-field-catalog', binding], enabled: status === 'READY', staleTime: 30_000, retry: false,
    queryFn: ({signal}) => loadFieldCatalog(resourceReferences.filter(reference =>
      ['FORM_FIELD', 'TABLE_FIELD', 'DETAIL_FIELD'].includes(reference.usage)).map(reference => reference.key), query =>
      client.request<BackendFieldCatalog>(`/api/v1/authorization/field-catalog?${query}`, {signal}))})
  return <FieldCatalogContext.Provider value={status === 'READY' && !query.error ? query.data ?? null : null}>{children}</FieldCatalogContext.Provider>
}
export const useWritableFieldKeys = (keys: readonly string[]): boolean => {
  const catalog = useContext(FieldCatalogContext)
  const {status, snapshot, binding} = useRbac3Authorization()
  return keys.length > 0 && keys.every(key => evaluateFieldAccess(key, catalog, status === 'READY' ? snapshot : null, binding).writable)
}
export const useWritableFields = (...dtos: readonly (keyof typeof inputFields)[]): boolean =>
  useWritableFieldKeys(dtos.flatMap(dto => inputFields[dto]))
