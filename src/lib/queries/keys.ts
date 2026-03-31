// TanStack Query 키 팩토리

export type ListFilters = {
  search?: string
  page?: number
  pageSize?: number
  [key: string]: unknown
}

export const queryKeys = {
  partners: {
    all: ['partners'] as const,
    list: (filters: ListFilters = {}) => [...queryKeys.partners.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.partners.all, 'detail', id] as const,
  },
  warehouses: {
    all: ['warehouses'] as const,
    list: (filters: ListFilters = {}) => [...queryKeys.warehouses.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.warehouses.all, 'detail', id] as const,
  },
  items: {
    all: ['items'] as const,
    list: (filters: ListFilters = {}) => [...queryKeys.items.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.items.all, 'detail', id] as const,
  },
  bom: {
    all: ['bom'] as const,
    list: (filters: ListFilters = {}) => [...queryKeys.bom.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.bom.all, 'detail', id] as const,
    byItem: (itemId: string) => [...queryKeys.bom.all, 'byItem', itemId] as const,
  },
  purchaseOrders: {
    all: ['purchaseOrders'] as const,
    list: (filters: ListFilters = {}) => [...queryKeys.purchaseOrders.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.purchaseOrders.all, 'detail', id] as const,
  },
  goodsReceipts: {
    all: ['goodsReceipts'] as const,
    list: (filters: ListFilters = {}) => [...queryKeys.goodsReceipts.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.goodsReceipts.all, 'detail', id] as const,
    byPo: (poId: string) => [...queryKeys.goodsReceipts.all, 'byPo', poId] as const,
  },
  poPayments: {
    all: ['poPayments'] as const,
    list: (filters: ListFilters = {}) => [...queryKeys.poPayments.all, 'list', filters] as const,
    byPo: (poId: string) => [...queryKeys.poPayments.all, 'byPo', poId] as const,
  },
  inventory: {
    all: ['inventory'] as const,
    summary: (filters: ListFilters = {}) => [...queryKeys.inventory.all, 'summary', filters] as const,
    lots: (itemId: string, warehouseId?: string) => [...queryKeys.inventory.all, 'lots', itemId, warehouseId] as const,
  },
  assemblyOrders: {
    all: ['assemblyOrders'] as const,
    list: (filters: ListFilters = {}) => [...queryKeys.assemblyOrders.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.assemblyOrders.all, 'detail', id] as const,
    items: () => [...queryKeys.assemblyOrders.all, 'items'] as const,
    materialAvailability: (bomHeaderId: string, warehouseId: string, quantity: number) =>
      [...queryKeys.assemblyOrders.all, 'materialAvailability', bomHeaderId, warehouseId, quantity] as const,
  },
  salesOrders: {
    all: ['salesOrders'] as const,
    list: (filters: ListFilters = {}) => [...queryKeys.salesOrders.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.salesOrders.all, 'detail', id] as const,
  },
  warehouseTransfers: {
    all: ['warehouseTransfers'] as const,
    list: (filters: ListFilters = {}) => [...queryKeys.warehouseTransfers.all, 'list', filters] as const,
    detail: (id: string) => [...queryKeys.warehouseTransfers.all, 'detail', id] as const,
  },
  reports: {
    all: ['reports'] as const,
    inventoryLedger: (filters: Record<string, unknown> = {}) => [...queryKeys.reports.all, 'inventoryLedger', filters] as const,
    warehouseStock: (warehouseId?: string) => [...queryKeys.reports.all, 'warehouseStock', warehouseId] as const,
    sales: (filters: Record<string, unknown> = {}) => [...queryKeys.reports.all, 'sales', filters] as const,
  },
  dashboard: {
    all: ['dashboard'] as const,
    summary: () => [...queryKeys.dashboard.all, 'summary'] as const,
    reorderAlerts: () => [...queryKeys.dashboard.all, 'reorder'] as const,
  },
}
