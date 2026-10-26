import type { ComponentType } from 'react'

export interface FeatureRouteDescriptor {
  readonly key: string
  readonly path: string
  readonly title: string
  readonly resourceKey: string
  readonly componentKey: string
  readonly component: ComponentType
  readonly navigationOrder: number
  readonly hideFromNav?: boolean
}
