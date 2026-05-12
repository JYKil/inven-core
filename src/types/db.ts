import type { InferInsertModel, InferSelectModel, Table } from 'drizzle-orm'
import type {
  account,
  assemblyOrderLines,
  assemblyOrders,
  bomHeaders,
  bomLines,
  companies,
  customers,
  goodsReceiptLines,
  goodsReceipts,
  inventoryLotConsumptions,
  inventoryLots,
  inventorySummary,
  inventoryTransactions,
  items,
  poPayments,
  profiles,
  purchaseOrderLines,
  purchaseOrders,
  referenceCodes,
  salesOrderLines,
  salesOrders,
  session,
  user,
  vendors,
  verification,
  warehouseTransferLines,
  warehouseTransfers,
  warehouses,
} from '@/db/schema'

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

type SnakeCase<S extends string> = S extends `${infer Head}${infer Tail}`
  ? Head extends Lowercase<Head>
    ? `${Head}${SnakeCase<Tail>}`
    : `_${Lowercase<Head>}${SnakeCase<Tail>}`
  : S

type SnakeCaseKeys<T> = {
  [K in keyof T as K extends string ? SnakeCase<K> : K]: T[K]
}

type NumericFields = {
  assembly_order_lines: 'required_qty' | 'consumed_qty' | 'consumed_cost'
  assembly_orders: 'quantity' | 'total_cost' | 'unit_cost'
  bom_lines: 'quantity'
  goods_receipt_lines: 'quantity' | 'unit_price'
  inventory_lot_consumptions: 'quantity' | 'unit_cost'
  inventory_lots: 'unit_cost' | 'initial_qty' | 'remaining_qty'
  inventory_summary: 'total_qty' | 'total_value' | 'avg_unit_cost'
  inventory_transactions: 'quantity' | 'unit_cost' | 'total_cost'
  items: 'min_stock_qty'
  po_payments: 'amount'
  purchase_order_lines: 'ordered_qty' | 'received_qty' | 'unit_price' | 'line_amount'
  purchase_orders: 'total_amount'
  sales_order_lines: 'quantity' | 'unit_price' | 'line_amount' | 'shipped_qty' | 'cost_of_goods'
  sales_orders: 'total_amount'
  warehouse_transfer_lines: 'quantity' | 'unit_cost'
}

type NumberForNumeric<T> = T extends string ? number : T

type CoerceNumericFields<TableName extends string, T> = TableName extends keyof NumericFields
  ? Omit<T, NumericFields[TableName] & keyof T> & {
      [K in NumericFields[TableName] & keyof T]: NumberForNumeric<T[K]>
    }
  : T

type TableTypes<TableName extends string, T extends Table> = {
  Row: CoerceNumericFields<TableName, SnakeCaseKeys<InferSelectModel<T>>>
  Insert: CoerceNumericFields<TableName, SnakeCaseKeys<InferInsertModel<T>>>
  Update: Partial<CoerceNumericFields<TableName, SnakeCaseKeys<InferInsertModel<T>>>>
}

type PublicTables = {
  account: TableTypes<'account', typeof account>
  assembly_order_lines: TableTypes<'assembly_order_lines', typeof assemblyOrderLines>
  assembly_orders: TableTypes<'assembly_orders', typeof assemblyOrders>
  bom_headers: TableTypes<'bom_headers', typeof bomHeaders>
  bom_lines: TableTypes<'bom_lines', typeof bomLines>
  companies: TableTypes<'companies', typeof companies>
  customers: TableTypes<'customers', typeof customers>
  goods_receipt_lines: TableTypes<'goods_receipt_lines', typeof goodsReceiptLines>
  goods_receipts: TableTypes<'goods_receipts', typeof goodsReceipts>
  inventory_lot_consumptions: TableTypes<'inventory_lot_consumptions', typeof inventoryLotConsumptions>
  inventory_lots: TableTypes<'inventory_lots', typeof inventoryLots>
  inventory_summary: TableTypes<'inventory_summary', typeof inventorySummary>
  inventory_transactions: TableTypes<'inventory_transactions', typeof inventoryTransactions>
  items: TableTypes<'items', typeof items>
  po_payments: TableTypes<'po_payments', typeof poPayments>
  profiles: TableTypes<'profiles', typeof profiles>
  purchase_order_lines: TableTypes<'purchase_order_lines', typeof purchaseOrderLines>
  purchase_orders: TableTypes<'purchase_orders', typeof purchaseOrders>
  reference_codes: TableTypes<'reference_codes', typeof referenceCodes>
  sales_order_lines: TableTypes<'sales_order_lines', typeof salesOrderLines>
  sales_orders: TableTypes<'sales_orders', typeof salesOrders>
  session: TableTypes<'session', typeof session>
  user: TableTypes<'user', typeof user>
  vendors: TableTypes<'vendors', typeof vendors>
  verification: TableTypes<'verification', typeof verification>
  warehouse_transfer_lines: TableTypes<'warehouse_transfer_lines', typeof warehouseTransferLines>
  warehouse_transfers: TableTypes<'warehouse_transfers', typeof warehouseTransfers>
  warehouses: TableTypes<'warehouses', typeof warehouses>
}

export type Database = {
  public: {
    Tables: PublicTables
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

export type Tables<TableName extends keyof PublicTables> = PublicTables[TableName]['Row']
export type TablesInsert<TableName extends keyof PublicTables> = PublicTables[TableName]['Insert']
export type TablesUpdate<TableName extends keyof PublicTables> = PublicTables[TableName]['Update']
export type Enums<_EnumName extends string> = never
