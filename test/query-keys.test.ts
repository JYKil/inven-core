import { describe, it, expect } from 'vitest'
import { queryKeys } from '@/lib/queries/keys'

// 모든 도메인의 쿼리 키가 올바른 구조를 가지는지 검증

describe('queryKeys', () => {
  describe('partners', () => {
    it('all 키는 ["partners"]', () => {
      expect(queryKeys.partners.all).toEqual(['partners'])
    })

    it('list 키는 all + "list" + filters', () => {
      const filters = { search: '테스트', page: 2 }
      expect(queryKeys.partners.list(filters)).toEqual(['partners', 'list', filters])
    })

    it('list 기본값은 빈 필터', () => {
      expect(queryKeys.partners.list()).toEqual(['partners', 'list', {}])
    })

    it('detail 키는 all + "detail" + id', () => {
      expect(queryKeys.partners.detail('abc-123')).toEqual(['partners', 'detail', 'abc-123'])
    })
  })

  describe('items', () => {
    it('list 키에 필터 포함', () => {
      const filters = { category: '원재료', itemType: 'raw_material' }
      const key = queryKeys.items.list(filters)
      expect(key[0]).toBe('items')
      expect(key[1]).toBe('list')
      expect(key[2]).toMatchObject(filters)
    })
  })

  describe('bom', () => {
    it('byItem 키는 all + "byItem" + itemId', () => {
      expect(queryKeys.bom.byItem('item-1')).toEqual(['bom', 'byItem', 'item-1'])
    })
  })

  describe('inventory', () => {
    it('summary 키', () => {
      expect(queryKeys.inventory.summary()).toEqual(['inventory', 'summary', {}])
    })

    it('lots 키에 warehouseId 선택적 포함', () => {
      expect(queryKeys.inventory.lots('item-1')).toEqual(['inventory', 'lots', 'item-1', undefined])
      expect(queryKeys.inventory.lots('item-1', 'wh-1')).toEqual(['inventory', 'lots', 'item-1', 'wh-1'])
    })
  })

  describe('assemblyOrders', () => {
    it('materialAvailability 키에 bomHeaderId, warehouseId, quantity 포함', () => {
      const key = queryKeys.assemblyOrders.materialAvailability('bom-1', 'wh-1', 10)
      expect(key).toEqual(['assemblyOrders', 'materialAvailability', 'bom-1', 'wh-1', 10])
    })
  })

  describe('reports', () => {
    it('inventoryLedger 키', () => {
      const filters = { startDate: '2026-01-01', endDate: '2026-03-31' }
      expect(queryKeys.reports.inventoryLedger(filters)).toEqual(['reports', 'inventoryLedger', filters])
    })

    it('warehouseStock 키', () => {
      expect(queryKeys.reports.warehouseStock('wh-1')).toEqual(['reports', 'warehouseStock', 'wh-1'])
      expect(queryKeys.reports.warehouseStock()).toEqual(['reports', 'warehouseStock', undefined])
    })

    it('sales 키', () => {
      expect(queryKeys.reports.sales()).toEqual(['reports', 'sales', {}])
    })
  })

  describe('dashboard', () => {
    it('summary 키', () => {
      expect(queryKeys.dashboard.summary()).toEqual(['dashboard', 'summary'])
    })

    it('reorderAlerts 키', () => {
      expect(queryKeys.dashboard.reorderAlerts()).toEqual(['dashboard', 'reorder'])
    })
  })

  describe('키 격리 — 다른 도메인 키가 서로 겹치지 않음', () => {
    it('partners.all과 items.all 프리픽스가 다름', () => {
      expect(queryKeys.partners.all[0]).not.toBe(queryKeys.items.all[0])
    })

    it('같은 필터로 다른 도메인 list를 호출해도 키가 다름', () => {
      const filters = { search: 'test' }
      const pKey = queryKeys.partners.list(filters)
      const iKey = queryKeys.items.list(filters)
      expect(pKey).not.toEqual(iKey)
    })
  })
})
