import { NextResponse } from 'next/server'
import { dbPool } from '@/db'
import { withApiHandler } from '@/lib/api/handler'
import { apiSuccess, ApiError, mapDbError } from '@/lib/api/error'
import { getSessionProfile } from '@/lib/api/session'

type QueryOp =
  | { type: 'select'; columns?: string; options?: { count?: string } }
  | { type: 'insert'; values: Record<string, unknown> | Record<string, unknown>[] }
  | { type: 'update'; values: Record<string, unknown> }
  | { type: 'delete' }
  | { type: 'eq' | 'neq' | 'gt' | 'gte' | 'lte' | 'ilike'; column: string; value: unknown }
  | { type: 'in'; column: string; values: unknown[] }
  | { type: 'or'; filter: string }
  | { type: 'order'; column: string; options?: { ascending?: boolean } }
  | { type: 'range'; from: number; to: number }
  | { type: 'limit'; count: number }

type Body =
  | { mode: 'query'; table: string; ops: QueryOp[]; single?: boolean }
  | { mode: 'rpc'; name: string; args?: Record<string, unknown> }

type ValueFilterOp = Extract<QueryOp, { type: 'eq' | 'neq' | 'gt' | 'gte' | 'lte' | 'ilike' }>
type InFilterOp = Extract<QueryOp, { type: 'in' }>

const tableColumns: Record<string, string[]> = {
  profiles: ['id', 'company_id', 'role', 'display_name', 'email', 'is_active', 'created_at', 'updated_at'],
  companies: ['id', 'name', 'business_number', 'address', 'phone', 'costing_method', 'is_active', 'created_at', 'updated_at'],
  items: ['id', 'company_id', 'code', 'name', 'unit', 'item_type', 'description', 'min_stock_qty', 'is_active', 'created_at', 'updated_at', 'material_type'],
  warehouses: ['id', 'company_id', 'code', 'name', 'address', 'is_active', 'created_at', 'updated_at'],
  vendors: ['id', 'company_id', 'name', 'business_number', 'address', 'bank_name', 'bank_code', 'account_number', 'account_holder', 'payment_currency', 'contact_email', 'notes', 'is_active', 'created_at', 'updated_at'],
  customers: ['id', 'company_id', 'name', 'business_number', 'address', 'receipt_currency', 'contact_email', 'notes', 'is_active', 'created_at', 'updated_at'],
  reference_codes: ['id', 'company_id', 'code_type', 'code_data1', 'code_data2', 'code_data3', 'code_data4', 'code_data5', 'code_data6', 'code_data7', 'code_data8', 'code_data9', 'sort_order', 'is_active', 'created_at', 'updated_at'],
  purchase_orders: ['id', 'company_id', 'po_number', 'order_date', 'expected_date', 'status', 'total_amount', 'notes', 'created_by', 'created_at', 'updated_at', 'vendor_id'],
  purchase_order_lines: ['id', 'po_id', 'item_id', 'ordered_qty', 'received_qty', 'unit_price', 'line_amount', 'line_type', 'description'],
  sales_orders: ['id', 'company_id', 'order_number', 'customer_id', 'order_date', 'status', 'total_amount', 'notes', 'created_by', 'created_at', 'updated_at', 'shipped_at', 'cancelled_at', 'cancel_reason'],
  sales_order_lines: ['id', 'sales_order_id', 'item_id', 'warehouse_id', 'quantity', 'unit_price', 'line_amount', 'shipped_qty', 'cost_of_goods'],
  goods_receipts: ['id', 'company_id', 'receipt_number', 'po_id', 'warehouse_id', 'receipt_date', 'status', 'notes', 'created_by', 'created_at', 'updated_at', 'cancelled_at', 'cancel_reason'],
  goods_receipt_lines: ['id', 'receipt_id', 'po_line_id', 'item_id', 'quantity', 'unit_price'],
  po_payments: ['id', 'company_id', 'po_id', 'payment_date', 'amount', 'payment_method', 'notes', 'created_at'],
  bom_headers: ['id', 'company_id', 'product_item_id', 'version', 'is_active', 'created_at', 'updated_at'],
  bom_lines: ['id', 'bom_header_id', 'material_item_id', 'quantity', 'sort_order'],
  inventory_transactions: ['id', 'company_id', 'item_id', 'warehouse_id', 'transaction_type', 'quantity', 'unit_cost', 'total_cost', 'reference_type', 'reference_id', 'transaction_date', 'created_by', 'created_at'],
  inventory_summary: ['id', 'company_id', 'item_id', 'warehouse_id', 'total_qty', 'total_value', 'avg_unit_cost', 'updated_at'],
  inventory_lots: ['id', 'company_id', 'item_id', 'warehouse_id', 'lot_number', 'lot_date', 'initial_qty', 'remaining_qty', 'unit_cost', 'source_type', 'source_id', 'created_at'],
  inventory_lot_consumptions: ['id', 'lot_id', 'transaction_id', 'quantity', 'unit_cost', 'created_at'],
  assembly_orders: ['id', 'company_id', 'order_number', 'bom_header_id', 'product_item_id', 'warehouse_id', 'quantity', 'assembly_date', 'status', 'total_cost', 'created_by', 'created_at', 'updated_at', 'cancelled_at', 'cancel_reason'],
  assembly_order_lines: ['id', 'assembly_order_id', 'material_item_id', 'required_qty', 'consumed_qty', 'unit_cost'],
  warehouse_transfers: ['id', 'company_id', 'transfer_number', 'from_warehouse_id', 'to_warehouse_id', 'transfer_date', 'status', 'notes', 'created_by', 'created_at', 'updated_at', 'cancelled_at', 'cancel_reason'],
  warehouse_transfer_lines: ['id', 'transfer_id', 'item_id', 'quantity'],
}

const tenantTables = new Set([
  'items', 'warehouses', 'vendors', 'customers', 'reference_codes', 'purchase_orders',
  'sales_orders', 'goods_receipts', 'po_payments', 'bom_headers', 'inventory_summary',
  'inventory_lots', 'assembly_orders', 'warehouse_transfers',
])

const childTenantTables: Record<string, { parentTable: string; foreignKey: string; parentKey: string }> = {
  bom_lines: { parentTable: 'bom_headers', foreignKey: 'bom_header_id', parentKey: 'id' },
  purchase_order_lines: { parentTable: 'purchase_orders', foreignKey: 'po_id', parentKey: 'id' },
  goods_receipt_lines: { parentTable: 'goods_receipts', foreignKey: 'receipt_id', parentKey: 'id' },
  sales_order_lines: { parentTable: 'sales_orders', foreignKey: 'sales_order_id', parentKey: 'id' },
  assembly_order_lines: { parentTable: 'assembly_orders', foreignKey: 'assembly_order_id', parentKey: 'id' },
  warehouse_transfer_lines: { parentTable: 'warehouse_transfers', foreignKey: 'transfer_id', parentKey: 'id' },
  inventory_lot_consumptions: { parentTable: 'inventory_lots', foreignKey: 'lot_id', parentKey: 'id' },
}

function assertTable(table: string) {
  if (!tableColumns[table]) throw new ApiError(400, '지원하지 않는 테이블입니다', 'VALIDATION_ERROR')
}

function assertColumn(table: string, column: string) {
  if (!tableColumns[table]?.includes(column)) {
    throw new ApiError(400, `지원하지 않는 컬럼입니다: ${column}`, 'VALIDATION_ERROR')
  }
}

function selectedCount(ops: QueryOp[]) {
  return ops.some((op) => op.type === 'select' && op.options?.count === 'exact')
}

function getSelect(ops: QueryOp[]) {
  return ops.find((op): op is Extract<QueryOp, { type: 'select' }> => op.type === 'select')?.columns ?? '*'
}

function getFilter(ops: QueryOp[], column: string) {
  return ops.find((op): op is ValueFilterOp => op.type === 'eq' && op.column === column)?.value
}

function addFilters(table: string, ops: QueryOp[], values: unknown[], where: string[]) {
  for (const op of ops) {
    if (!['eq', 'neq', 'gt', 'gte', 'lte', 'ilike', 'in'].includes(op.type)) continue
    const filterOp = op as ValueFilterOp | InFilterOp
    const column = filterOp.column
    assertColumn(table, column)
    if (filterOp.type === 'in') {
      values.push(filterOp.values)
      where.push(`${column} = ANY($${values.length})`)
      continue
    }
    values.push(filterOp.value)
    const operator = filterOp.type === 'eq' ? '=' : filterOp.type === 'neq' ? '<>' : filterOp.type === 'gt' ? '>' : filterOp.type === 'gte' ? '>=' : filterOp.type === 'lte' ? '<=' : 'ILIKE'
    where.push(`${column} ${operator} $${values.length}`)
  }

  for (const op of ops) {
    if (op.type !== 'or') continue
    const parts = op.filter.split(',').map((part) => part.match(/^([a-z_]+)\.ilike\.%(.*)%$/)).filter(Boolean) as RegExpMatchArray[]
    if (!parts.length) continue
    const clauses = parts.map((match) => {
      assertColumn(table, match[1])
      values.push(`%${match[2]}%`)
      return `${match[1]} ILIKE $${values.length}`
    })
    where.push(`(${clauses.join(' OR ')})`)
  }
}

function addTenant(table: string, profile: Awaited<ReturnType<typeof getSessionProfile>>, values: unknown[], where: string[]) {
  if (table === 'companies' && profile.role !== 'super_admin') {
    if (!profile.company_id) throw new ApiError(403, '회사 정보가 없습니다', 'FORBIDDEN')
    values.push(profile.company_id)
    where.push(`id = $${values.length}`)
    return
  }
  if (table === 'profiles' && profile.role !== 'super_admin') {
    if (!profile.company_id) {
      values.push(profile.id)
      where.push(`id = $${values.length}::uuid`)
      return
    }
    values.push(profile.id)
    const userIndex = values.length
    values.push(profile.company_id)
    where.push(`(id = $${userIndex}::uuid OR company_id = $${values.length})`)
    return
  }
  if (!tenantTables.has(table)) return
  if (profile.role === 'super_admin') return
  if (!profile.company_id) throw new ApiError(403, '회사 정보가 없습니다', 'FORBIDDEN')
  values.push(profile.company_id)
  where.push(`company_id = $${values.length}`)
}

function addChildTenant(table: string, profile: Awaited<ReturnType<typeof getSessionProfile>>, values: unknown[], where: string[]) {
  const relation = childTenantTables[table]
  if (!relation || profile.role === 'super_admin') return
  if (!profile.company_id) throw new ApiError(403, '회사 정보가 없습니다', 'FORBIDDEN')
  values.push(profile.company_id)
  where.push(`EXISTS (SELECT 1 FROM ${relation.parentTable} parent_tenant WHERE parent_tenant.${relation.parentKey} = ${relation.foreignKey} AND parent_tenant.company_id = $${values.length})`)
}

function addOrderLimit(table: string, ops: QueryOp[], values: unknown[]) {
  const order = ops.filter((op): op is Extract<QueryOp, { type: 'order' }> => op.type === 'order')
    .map((op) => {
      assertColumn(table, op.column)
      return `${op.column} ${op.options?.ascending === false ? 'DESC' : 'ASC'}`
    })
  const range = ops.find((op): op is Extract<QueryOp, { type: 'range' }> => op.type === 'range')
  const limit = ops.find((op): op is Extract<QueryOp, { type: 'limit' }> => op.type === 'limit')
  const parts = order.length ? [`ORDER BY ${order.join(', ')}`] : []
  if (range) {
    values.push(range.to - range.from + 1)
    const limitIdx = values.length
    values.push(range.from)
    parts.push(`LIMIT $${limitIdx} OFFSET $${values.length}`)
  } else if (limit) {
    values.push(limit.count)
    parts.push(`LIMIT $${values.length}`)
  }
  return parts.join(' ')
}

function qualify(sqlText: string, aliases: Record<string, string>) {
  return Object.entries(aliases).reduce(
    (sql, [column, qualified]) => sql.replace(new RegExp(`\\b${column}\\b`, 'g'), qualified),
    sqlText,
  )
}

async function queryRows(sqlText: string, values: unknown[] = []) {
  try {
    return await dbPool.query(sqlText, values)
  } catch (error) {
    const dbError = error as { code?: string; message?: string }
    throw mapDbError({ code: dbError.code, message: dbError.message ?? 'DB 오류' })
  }
}

async function genericSelect(table: string, ops: QueryOp[], profile: Awaited<ReturnType<typeof getSessionProfile>>) {
  assertTable(table)
  const values: unknown[] = []
  const where: string[] = []
  addTenant(table, profile, values, where)
  addFilters(table, ops, values, where)
  addChildTenant(table, profile, values, where)

  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const orderLimit = addOrderLimit(table, ops, values)
  const count = selectedCount(ops)
    ? Number((await queryRows(`SELECT COUNT(*)::int AS count FROM ${table} ${whereSql}`, values)).rows[0]?.count ?? 0)
    : null
  const { rows } = await queryRows(`SELECT * FROM ${table} ${whereSql} ${orderLimit}`, values)
  return { data: rows, count }
}

async function genericMutate(table: string, ops: QueryOp[], profile: Awaited<ReturnType<typeof getSessionProfile>>) {
  assertTable(table)
  const update = ops.find((op): op is Extract<QueryOp, { type: 'update' }> => op.type === 'update')
  const insert = ops.find((op): op is Extract<QueryOp, { type: 'insert' }> => op.type === 'insert')
  const hasDelete = ops.some((op) => op.type === 'delete')
  if (insert) {
    const rows = Array.isArray(insert.values) ? insert.values : [insert.values]
    if (tenantTables.has(table) && profile.role !== 'super_admin') {
      for (const row of rows) {
        if (row.company_id && row.company_id !== profile.company_id) throw new ApiError(403, '권한이 부족합니다', 'FORBIDDEN')
        row.company_id = profile.company_id
      }
    }
    const childRelation = childTenantTables[table]
    if (childRelation && profile.role !== 'super_admin') {
      if (!profile.company_id) throw new ApiError(403, '회사 정보가 없습니다', 'FORBIDDEN')
      if (rows.some((row) => !row[childRelation.foreignKey])) throw new ApiError(400, '상위 데이터가 필요합니다', 'VALIDATION_ERROR')
      const parentIds = [...new Set(rows.map((row) => row[childRelation.foreignKey]))].filter(Boolean)
      const { rows: ownedParents } = await queryRows(
        `SELECT ${childRelation.parentKey} FROM ${childRelation.parentTable} WHERE ${childRelation.parentKey} = ANY($1::uuid[]) AND company_id = $2::uuid`,
        [parentIds, profile.company_id],
      )
      if (ownedParents.length !== parentIds.length) throw new ApiError(403, '권한이 부족합니다', 'FORBIDDEN')
    }
    const columns = Object.keys(rows[0] ?? {}).filter((column) => tableColumns[table].includes(column))
    if (!columns.length) throw new ApiError(400, '등록할 컬럼이 없습니다', 'VALIDATION_ERROR')
    const values = rows.flatMap((row) => columns.map((column) => row[column]))
    const groups = rows.map((_, rowIndex) => `(${columns.map((_, colIndex) => `$${rowIndex * columns.length + colIndex + 1}`).join(', ')})`)
    const { rows: inserted } = await queryRows(`INSERT INTO ${table} (${columns.join(', ')}) VALUES ${groups.join(', ')} RETURNING *`, values)
    return { data: Array.isArray(insert.values) ? inserted : inserted[0] ?? null, count: null }
  }
  if (hasDelete) {
    const values: unknown[] = []
    const where: string[] = []
    addTenant(table, profile, values, where)
    addChildTenant(table, profile, values, where)
    addFilters(table, ops, values, where)
    if (!where.length) throw new ApiError(400, '삭제 조건이 필요합니다', 'VALIDATION_ERROR')
    const { rows } = await queryRows(`DELETE FROM ${table} WHERE ${where.join(' AND ')} RETURNING *`, values)
    return { data: rows, count: null }
  }
  if (!update) throw new ApiError(400, '지원하지 않는 작업입니다', 'VALIDATION_ERROR')
  if (table === 'profiles' && profile.role !== 'super_admin' && update.values.role === 'super_admin') {
    throw new ApiError(403, '권한이 부족합니다', 'FORBIDDEN')
  }

  const columns = Object.keys(update.values).filter((column) => tableColumns[table].includes(column) && column !== 'id' && column !== 'company_id')
  if (!columns.length) throw new ApiError(400, '수정할 컬럼이 없습니다', 'VALIDATION_ERROR')
  const values = columns.map((column) => update.values[column])
  const setSql = columns.map((column, index) => `${column} = $${index + 1}`).join(', ')
  const where: string[] = []
  if (table === 'companies' && profile.role !== 'super_admin') {
    requireCompanyAdmin(profile)
  }
  if (table === 'profiles' && profile.role !== 'super_admin') {
    requireCompanyAdmin(profile)
  }
  addTenant(table, profile, values, where)
  addChildTenant(table, profile, values, where)
  addFilters(table, ops, values, where)
  if (!where.length) throw new ApiError(400, '수정 조건이 필요합니다', 'VALIDATION_ERROR')
  const { rows } = await queryRows(`UPDATE ${table} SET ${setSql}, updated_at = now() WHERE ${where.join(' AND ')} RETURNING *`, values)
  if (table === 'profiles' && Object.prototype.hasOwnProperty.call(update.values, 'role')) {
    await Promise.all(rows.map((row) => queryRows(
      'UPDATE "user" SET role = $2, "updatedAt" = now() WHERE id = $1',
      [row.id, row.role],
    )))
  }
  return { data: rows, count: null }
}

function requireCompanyAdmin(profile: Awaited<ReturnType<typeof getSessionProfile>>) {
  if (profile.role !== 'company_admin') {
    throw new ApiError(403, '권한이 부족합니다', 'FORBIDDEN')
  }
}

async function queryWithRelations(table: string, ops: QueryOp[], profile: Awaited<ReturnType<typeof getSessionProfile>>) {
  const select = getSelect(ops)
  const id = getFilter(ops, 'id') as string | undefined
  const values: unknown[] = []
  const where: string[] = []
  addTenant(table, profile, values, where)
  addFilters(table, ops, values, where)
  const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : ''
  const orderLimit = addOrderLimit(table, ops, values)
  const count = selectedCount(ops)
    ? Number((await queryRows(`SELECT COUNT(*)::int AS count FROM ${table} ${whereSql}`, values)).rows[0]?.count ?? 0)
    : null

  if (table === 'items' && select.includes('bom_headers')) {
    const { rows } = await queryRows(`
      SELECT i.*,
        COALESCE((
          SELECT json_agg(json_build_object(
            'id', bh.id, 'version', bh.version, 'is_active', bh.is_active,
            'bom_lines', COALESCE((
              SELECT json_agg(json_build_object(
                'id', bl.id, 'quantity', bl.quantity, 'sort_order', bl.sort_order,
                'material_item_id', bl.material_item_id,
                'material_item', json_build_object('id', mi.id, 'code', mi.code, 'name', mi.name, 'unit', mi.unit, 'material_type', mi.material_type, 'item_type', mi.item_type)
              ) ORDER BY bl.sort_order)
              FROM bom_lines bl JOIN items mi ON mi.id = bl.material_item_id AND mi.company_id = i.company_id
              WHERE bl.bom_header_id = bh.id
            ), '[]'::json)
          ) ORDER BY bh.version DESC)
          FROM bom_headers bh
          WHERE bh.product_item_id = i.id AND bh.company_id = i.company_id
        ), '[]'::json) AS bom_headers
      FROM items i ${qualify(whereSql, { company_id: 'i.company_id', is_active: 'i.is_active', item_type: 'i.item_type', material_type: 'i.material_type', name: 'i.name', code: 'i.code' })}
      ${qualify(orderLimit, { material_type: 'i.material_type', code: 'i.code' })}
    `, values)
    return { data: rows, count }
  }

  if (table === 'items' && select.includes('inventory_summary')) {
    const { rows } = await queryRows(`
      SELECT i.*, COALESCE((
        SELECT json_agg(json_build_object('total_qty', s.total_qty))
        FROM inventory_summary s
        WHERE s.item_id = i.id AND s.company_id = i.company_id
      ), '[]'::json) AS inventory_summary
      FROM items i ${qualify(whereSql, { company_id: 'i.company_id', is_active: 'i.is_active', material_type: 'i.material_type', item_type: 'i.item_type', name: 'i.name', code: 'i.code' })}
      ${qualify(orderLimit, { item_type: 'i.item_type', name: 'i.name' })}
    `, values)
    return { data: rows, count }
  }

  if (table === 'bom_lines' && select.includes('material_item')) {
    const { rows } = await queryRows(`
      SELECT bl.*,
        json_build_object('id', i.id, 'code', i.code, 'name', i.name, 'unit', i.unit, 'material_type', i.material_type, 'item_type', i.item_type) AS material_item
      FROM bom_lines bl
      JOIN bom_headers bh ON bh.id = bl.bom_header_id
      JOIN items i ON i.id = bl.material_item_id AND i.company_id = bh.company_id
      ${qualify(whereSql, { bom_header_id: 'bl.bom_header_id', material_item_id: 'bl.material_item_id' })}
      ${qualify(orderLimit, { sort_order: 'bl.sort_order' })}
    `, values)
    return { data: rows, count }
  }

  if (table === 'bom_headers') {
    const withLines = select.includes('bom_lines')
    const withProduct = select.includes('product_item')
    const { rows } = await queryRows(`
      SELECT bh.*
        ${withProduct ? `, json_build_object('id', p.id, 'code', p.code, 'name', p.name, 'unit', p.unit) AS product_item` : ''}
        ${withLines ? `,
        COALESCE((
          SELECT json_agg(json_build_object(
            'id', bl.id, 'bom_header_id', bl.bom_header_id, 'material_item_id', bl.material_item_id,
            'quantity', bl.quantity, 'sort_order', bl.sort_order,
            'material_item', json_build_object('id', mi.id, 'code', mi.code, 'name', mi.name, 'unit', mi.unit, 'material_type', mi.material_type, 'item_type', mi.item_type)
          ) ORDER BY bl.sort_order)
          FROM bom_lines bl JOIN items mi ON mi.id = bl.material_item_id AND mi.company_id = bh.company_id
          WHERE bl.bom_header_id = bh.id
        ), '[]'::json) AS bom_lines` : ''}
      FROM bom_headers bh
      ${withProduct ? 'JOIN items p ON p.id = bh.product_item_id AND p.company_id = bh.company_id' : ''}
      ${qualify(whereSql, { company_id: 'bh.company_id', id: 'bh.id', product_item_id: 'bh.product_item_id' })}
      ${qualify(orderLimit, { version: 'bh.version' })}
    `, values)
    return { data: rows, count }
  }

  if (table === 'purchase_orders') {
    const detail = !!id && select.includes('purchase_order_lines')
    const { rows } = await queryRows(`
      SELECT po.*,
        json_build_object('id', v.id, 'name', v.name) AS vendor
        ${detail ? `,
        COALESCE((
          SELECT json_agg(json_build_object(
            'id', pol.id, 'po_id', pol.po_id, 'item_id', pol.item_id, 'ordered_qty', pol.ordered_qty,
            'received_qty', pol.received_qty, 'unit_price', pol.unit_price, 'line_amount', pol.line_amount,
            'line_type', pol.line_type, 'description', pol.description,
            'item', CASE WHEN i.id IS NULL THEN NULL ELSE json_build_object('id', i.id, 'code', i.code, 'name', i.name, 'unit', i.unit) END
          ))
          FROM purchase_order_lines pol LEFT JOIN items i ON i.id = pol.item_id AND i.company_id = po.company_id
          WHERE pol.po_id = po.id
        ), '[]'::json) AS purchase_order_lines` : ''}
      FROM purchase_orders po
      JOIN vendors v ON v.id = po.vendor_id AND v.company_id = po.company_id
      ${qualify(whereSql, { company_id: 'po.company_id', status: 'po.status', id: 'po.id', po_number: 'po.po_number' })}
      ${qualify(orderLimit, { created_at: 'po.created_at' })}
    `, values)
    return { data: rows, count }
  }

  if (table === 'goods_receipts') {
    const detail = select.includes('goods_receipt_lines')
    const { rows } = await queryRows(`
      SELECT gr.*,
        json_build_object('id', w.id, 'code', w.code, 'name', w.name) AS warehouse,
        CASE WHEN po.id IS NULL THEN NULL ELSE json_build_object('id', po.id, 'po_number', po.po_number) END AS purchase_order
        ${detail ? `,
        COALESCE((
          SELECT json_agg(json_build_object(
            'id', gl.id, 'receipt_id', gl.receipt_id, 'po_line_id', gl.po_line_id, 'item_id', gl.item_id,
            'quantity', gl.quantity, 'unit_price', gl.unit_price,
            'item', json_build_object('id', i.id, 'code', i.code, 'name', i.name, 'unit', i.unit)
          ))
          FROM goods_receipt_lines gl JOIN items i ON i.id = gl.item_id AND i.company_id = gr.company_id
          WHERE gl.receipt_id = gr.id
        ), '[]'::json) AS goods_receipt_lines` : ''}
      FROM goods_receipts gr
      JOIN warehouses w ON w.id = gr.warehouse_id AND w.company_id = gr.company_id
      LEFT JOIN purchase_orders po ON po.id = gr.po_id AND po.company_id = gr.company_id
      ${qualify(whereSql, { company_id: 'gr.company_id', po_id: 'gr.po_id', id: 'gr.id', receipt_number: 'gr.receipt_number' })}
      ${qualify(orderLimit, { created_at: 'gr.created_at', receipt_date: 'gr.receipt_date' })}
    `, values)
    return { data: rows, count }
  }

  if (table === 'sales_orders') {
    const detail = select.includes('sales_order_lines')
    const { rows } = await queryRows(`
      SELECT so.*,
        json_build_object('id', c.id, 'name', c.name) AS customer
        ${detail ? `,
        COALESCE((
          SELECT json_agg(json_build_object(
            'id', sol.id, 'sales_order_id', sol.sales_order_id, 'item_id', sol.item_id, 'warehouse_id', sol.warehouse_id,
            'quantity', sol.quantity, 'unit_price', sol.unit_price, 'line_amount', sol.line_amount,
            'shipped_qty', sol.shipped_qty, 'cost_of_goods', sol.cost_of_goods,
            'item', json_build_object('id', i.id, 'code', i.code, 'name', i.name, 'unit', i.unit),
            'warehouse', json_build_object('id', w.id, 'code', w.code, 'name', w.name)
          ))
          FROM sales_order_lines sol
          JOIN items i ON i.id = sol.item_id AND i.company_id = so.company_id
          JOIN warehouses w ON w.id = sol.warehouse_id AND w.company_id = so.company_id
          WHERE sol.sales_order_id = so.id
        ), '[]'::json) AS sales_order_lines` : ''}
      FROM sales_orders so
      JOIN customers c ON c.id = so.customer_id AND c.company_id = so.company_id
      ${qualify(whereSql, { company_id: 'so.company_id', status: 'so.status', id: 'so.id', order_number: 'so.order_number' })}
      ${qualify(orderLimit, { created_at: 'so.created_at' })}
    `, values)
    return { data: rows, count }
  }

  if (table === 'inventory_summary') {
    const { rows } = await queryRows(`
      SELECT s.*,
        json_build_object('id', i.id, 'code', i.code, 'name', i.name, 'unit', i.unit, 'min_stock_qty', i.min_stock_qty, 'item_type', i.item_type) AS item,
        json_build_object('id', w.id, 'code', w.code, 'name', w.name) AS warehouse
      FROM inventory_summary s
      JOIN items i ON i.id = s.item_id AND i.company_id = s.company_id
      JOIN warehouses w ON w.id = s.warehouse_id AND w.company_id = s.company_id
      ${qualify(whereSql, { company_id: 's.company_id', warehouse_id: 's.warehouse_id', total_qty: 's.total_qty' })}
      ${qualify(orderLimit, { item_id: 's.item_id' })}
    `, values)
    return { data: rows, count }
  }

  if (table === 'inventory_lots') {
    const { rows } = await queryRows(`
      SELECT l.*, json_build_object('id', w.id, 'code', w.code, 'name', w.name) AS warehouse
      FROM inventory_lots l
      JOIN warehouses w ON w.id = l.warehouse_id AND w.company_id = l.company_id
      ${qualify(whereSql, { company_id: 'l.company_id', warehouse_id: 'l.warehouse_id', item_id: 'l.item_id', remaining_qty: 'l.remaining_qty' })}
      ${qualify(orderLimit, { lot_date: 'l.lot_date' })}
    `, values)
    return { data: rows, count }
  }

  if (table === 'po_payments' && select.includes('purchase_order')) {
    const { rows } = await queryRows(`
      SELECT p.*,
        json_build_object(
          'id', po.id, 'po_number', po.po_number, 'total_amount', po.total_amount,
          'vendor', json_build_object('name', v.name)
        ) AS purchase_order
      FROM po_payments p
      JOIN purchase_orders po ON po.id = p.po_id AND po.company_id = p.company_id
      JOIN vendors v ON v.id = po.vendor_id AND v.company_id = p.company_id
      ${qualify(whereSql, { company_id: 'p.company_id', po_id: 'p.po_id' })}
      ${qualify(orderLimit, { payment_date: 'p.payment_date' })}
    `, values)
    return { data: rows, count }
  }

  if (table === 'assembly_orders') {
    const detail = select.includes('assembly_order_lines')
    const { rows } = await queryRows(`
      SELECT ao.*,
        json_build_object('id', pi.id, 'code', pi.code, 'name', pi.name, 'unit', pi.unit) AS product_item,
        json_build_object('id', w.id, 'code', w.code, 'name', w.name) AS warehouse,
        CASE WHEN bh.id IS NULL THEN NULL ELSE json_build_object('id', bh.id, 'version', bh.version) END AS bom_header
        ${detail ? `,
        COALESCE((
          SELECT json_agg(json_build_object(
            'id', aol.id, 'assembly_order_id', aol.assembly_order_id, 'material_item_id', aol.material_item_id,
            'required_qty', aol.required_qty, 'consumed_qty', aol.consumed_qty, 'unit_cost', aol.unit_cost,
            'material_item', json_build_object('id', mi.id, 'code', mi.code, 'name', mi.name, 'unit', mi.unit)
          ))
          FROM assembly_order_lines aol JOIN items mi ON mi.id = aol.material_item_id AND mi.company_id = ao.company_id
          WHERE aol.assembly_order_id = ao.id
        ), '[]'::json) AS assembly_order_lines` : ''}
      FROM assembly_orders ao
      JOIN items pi ON pi.id = ao.product_item_id AND pi.company_id = ao.company_id
      JOIN warehouses w ON w.id = ao.warehouse_id AND w.company_id = ao.company_id
      LEFT JOIN bom_headers bh ON bh.id = ao.bom_header_id AND bh.company_id = ao.company_id
      ${qualify(whereSql, { company_id: 'ao.company_id', status: 'ao.status', id: 'ao.id', order_number: 'ao.order_number' })}
      ${qualify(orderLimit, { created_at: 'ao.created_at' })}
    `, values)
    return { data: rows, count }
  }

  if (table === 'warehouse_transfers') {
    const detail = select.includes('warehouse_transfer_lines')
    const { rows } = await queryRows(`
      SELECT wt.*,
        json_build_object('id', fw.id, 'code', fw.code, 'name', fw.name) AS from_warehouse,
        json_build_object('id', tw.id, 'code', tw.code, 'name', tw.name) AS to_warehouse
        ${detail ? `,
        COALESCE((
          SELECT json_agg(json_build_object(
            'id', wtl.id, 'transfer_id', wtl.transfer_id, 'item_id', wtl.item_id, 'quantity', wtl.quantity,
            'item', json_build_object('id', i.id, 'code', i.code, 'name', i.name, 'unit', i.unit)
          ))
          FROM warehouse_transfer_lines wtl JOIN items i ON i.id = wtl.item_id AND i.company_id = wt.company_id
          WHERE wtl.transfer_id = wt.id
        ), '[]'::json) AS warehouse_transfer_lines` : ''}
      FROM warehouse_transfers wt
      JOIN warehouses fw ON fw.id = wt.from_warehouse_id AND fw.company_id = wt.company_id
      JOIN warehouses tw ON tw.id = wt.to_warehouse_id AND tw.company_id = wt.company_id
      ${qualify(whereSql, { company_id: 'wt.company_id', status: 'wt.status', id: 'wt.id', transfer_number: 'wt.transfer_number' })}
      ${qualify(orderLimit, { created_at: 'wt.created_at' })}
    `, values)
    return { data: rows, count }
  }

  return genericSelect(table, ops, profile)
}

async function handleRpc(name: string, args: Record<string, unknown>, profile: Awaited<ReturnType<typeof getSessionProfile>>) {
  if (profile.role !== 'super_admin' && !profile.company_id) throw new ApiError(403, '회사 정보가 없습니다', 'FORBIDDEN')
  const companyId = profile.company_id
  if (name === 'get_reference_code_types') {
    const { rows } = await queryRows(
      'SELECT DISTINCT code_type FROM reference_codes WHERE company_id = $1::uuid AND is_active = true ORDER BY code_type',
      [companyId],
    )
    return rows
  }
  if (name === 'create_reference_code') {
    const { rows } = await queryRows(
      `
        INSERT INTO reference_codes (
          company_id, code_type, code_data1, code_data2, code_data3,
          code_data4, code_data5, code_data6, code_data7, code_data8,
          code_data9, sort_order
        )
        VALUES (
          $1::uuid, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11,
          COALESCE($12::integer, (
            SELECT COALESCE(MAX(sort_order), 0) + 1
            FROM reference_codes
            WHERE company_id = $1::uuid AND code_type = $2 AND is_active = true
          ))
        )
        RETURNING id
      `,
      [companyId, args.p_code_type, args.p_code_data1, args.p_code_data2 ?? null, args.p_code_data3 ?? null, args.p_code_data4 ?? null, args.p_code_data5 ?? null, args.p_code_data6 ?? null, args.p_code_data7 ?? null, args.p_code_data8 ?? null, args.p_code_data9 ?? null, args.p_sort_order ?? null],
    )
    return rows[0]?.id
  }
  if (name === 'update_reference_code') {
    await queryRows(
      `
        UPDATE reference_codes
        SET code_data1 = COALESCE($3, code_data1),
            code_data2 = $4,
            code_data3 = $5,
            code_data4 = $6,
            code_data5 = $7,
            code_data6 = $8,
            code_data7 = $9,
            code_data8 = $10,
            code_data9 = $11,
            sort_order = COALESCE($12::integer, sort_order),
            updated_at = now()
        WHERE id = $1::uuid AND company_id = $2::uuid AND is_active = true
      `,
      [args.p_id, companyId, args.p_code_data1 ?? null, args.p_code_data2 ?? null, args.p_code_data3 ?? null, args.p_code_data4 ?? null, args.p_code_data5 ?? null, args.p_code_data6 ?? null, args.p_code_data7 ?? null, args.p_code_data8 ?? null, args.p_code_data9 ?? null, args.p_sort_order ?? null],
    )
    return null
  }
  if (name === 'soft_delete_reference_code') {
    await queryRows(
      'UPDATE reference_codes SET is_active = false, updated_at = now() WHERE id = $1::uuid AND company_id = $2::uuid AND is_active = true',
      [args.p_id, companyId],
    )
    return null
  }
  if (name === 'admin_create_company') {
    if (profile.role !== 'super_admin') throw new ApiError(403, '권한이 부족합니다', 'FORBIDDEN')
    const { rows } = await queryRows(
      'INSERT INTO companies (name, business_number, address, phone) VALUES ($1, $2, $3, $4) RETURNING id',
      [args.p_name, args.p_business_number ?? null, args.p_address ?? null, args.p_phone ?? null],
    )
    return rows[0]?.id
  }
  const rpc: Record<string, { sql: string; values: unknown[] }> = {
    dashboard_reorder_alerts: { sql: 'SELECT dashboard_reorder_alerts($1::uuid) AS result', values: [companyId] },
    dashboard_summary: { sql: 'SELECT dashboard_summary($1::uuid) AS result', values: [companyId] },
    report_inventory_ledger: { sql: 'SELECT report_inventory_ledger($1::uuid, $2::date, $3::date, $4::uuid, $5::uuid) AS result', values: [companyId, args.p_start_date, args.p_end_date, args.p_item_id ?? null, args.p_warehouse_id ?? null] },
    report_warehouse_stock: { sql: 'SELECT report_warehouse_stock($1::uuid, $2::uuid) AS result', values: [companyId, args.p_warehouse_id ?? null] },
    report_sales: { sql: 'SELECT report_sales($1::uuid, $2::date, $3::date, $4::uuid) AS result', values: [companyId, args.p_start_date, args.p_end_date, args.p_customer_id ?? null] },
    update_bom_lines: { sql: 'SELECT update_bom_lines($1::uuid, $2::uuid, $3::jsonb) AS result', values: [args.p_bom_header_id, companyId, args.p_lines] },
  }
  const entry = rpc[name]
  if (!entry) throw new ApiError(400, '지원하지 않는 RPC입니다', 'VALIDATION_ERROR')
  if (name.startsWith('admin_') && profile.role !== 'super_admin') throw new ApiError(403, '권한이 부족합니다', 'FORBIDDEN')
  const result = await queryRows(entry.sql, entry.values)
  return result.rows[0]?.result
}

export const POST = withApiHandler(async (request: Request) => {
  const profile = await getSessionProfile()
  const body = await request.json() as Body

  if (body.mode === 'rpc') {
    const data = await handleRpc(body.name, body.args ?? {}, profile)
    return NextResponse.json(apiSuccess(data))
  }

  const hasMutation = body.ops.some((op) => op.type === 'insert' || op.type === 'update' || op.type === 'delete')
  const result = hasMutation
    ? await genericMutate(body.table, body.ops, profile)
    : await queryWithRelations(body.table, body.ops, profile)

  return NextResponse.json({ success: true, data: body.single && Array.isArray(result.data) ? result.data[0] ?? null : result.data, count: result.count, error: null })
})
