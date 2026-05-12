import { pgTable, foreignKey, unique, pgPolicy, check, uuid, numeric, integer, index, date, varchar, text, timestamp, uniqueIndex, boolean } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const bomLines = pgTable("bom_lines", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	bomHeaderId: uuid("bom_header_id").notNull(),
	materialItemId: uuid("material_item_id").notNull(),
	quantity: numeric({ precision: 15, scale:  4 }).notNull(),
	sortOrder: integer("sort_order").default(0).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.bomHeaderId],
			foreignColumns: [bomHeaders.id],
			name: "bom_lines_bom_header_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.materialItemId],
			foreignColumns: [items.id],
			name: "bom_lines_material_item_id_fkey"
		}),
	unique("bom_lines_bom_header_id_material_item_id_key").on(table.bomHeaderId, table.materialItemId),
	pgPolicy("bom_lines_tenant_isolation", { as: "permissive", for: "all", to: ["public"], using: sql`(EXISTS ( SELECT 1
   FROM bom_headers
  WHERE ((bom_headers.id = bom_lines.bom_header_id) AND ((bom_headers.company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text)))))`, withCheck: sql`(EXISTS ( SELECT 1
   FROM bom_headers
  WHERE ((bom_headers.id = bom_lines.bom_header_id) AND ((bom_headers.company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text)))))`  }),
	check("bom_lines_quantity_check", sql`quantity > (0)::numeric`),
]);

export const poPayments = pgTable("po_payments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	companyId: uuid("company_id").notNull(),
	poId: uuid("po_id").notNull(),
	paymentDate: date("payment_date").notNull(),
	amount: numeric({ precision: 18, scale:  2 }).notNull(),
	paymentMethod: varchar("payment_method", { length: 50 }),
	notes: text(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_po_payments_po_id").using("btree", table.poId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.companyId],
			foreignColumns: [companies.id],
			name: "po_payments_company_id_fkey"
		}),
	foreignKey({
			columns: [table.poId],
			foreignColumns: [purchaseOrders.id],
			name: "po_payments_po_id_fkey"
		}),
	pgPolicy("po_payments_tenant_isolation", { as: "permissive", for: "all", to: ["public"], using: sql`((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text))`, withCheck: sql`((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text))`  }),
	check("po_payments_amount_check", sql`amount > (0)::numeric`),
]);

export const goodsReceiptLines = pgTable("goods_receipt_lines", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	receiptId: uuid("receipt_id").notNull(),
	poLineId: uuid("po_line_id"),
	itemId: uuid("item_id").notNull(),
	quantity: numeric({ precision: 15, scale:  4 }).notNull(),
	unitPrice: numeric("unit_price", { precision: 18, scale:  5 }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.itemId],
			foreignColumns: [items.id],
			name: "goods_receipt_lines_item_id_fkey"
		}),
	foreignKey({
			columns: [table.poLineId],
			foreignColumns: [purchaseOrderLines.id],
			name: "goods_receipt_lines_po_line_id_fkey"
		}),
	foreignKey({
			columns: [table.receiptId],
			foreignColumns: [goodsReceipts.id],
			name: "goods_receipt_lines_receipt_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("goods_receipt_lines_tenant_isolation", { as: "permissive", for: "all", to: ["public"], using: sql`(EXISTS ( SELECT 1
   FROM goods_receipts
  WHERE ((goods_receipts.id = goods_receipt_lines.receipt_id) AND ((goods_receipts.company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text)))))`, withCheck: sql`(EXISTS ( SELECT 1
   FROM goods_receipts
  WHERE ((goods_receipts.id = goods_receipt_lines.receipt_id) AND ((goods_receipts.company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text)))))`  }),
	check("goods_receipt_lines_quantity_check", sql`quantity > (0)::numeric`),
	check("goods_receipt_lines_unit_price_check", sql`unit_price >= (0)::numeric`),
]);

export const purchaseOrderLines = pgTable("purchase_order_lines", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	poId: uuid("po_id").notNull(),
	itemId: uuid("item_id"),
	orderedQty: numeric("ordered_qty", { precision: 15, scale:  4 }).notNull(),
	receivedQty: numeric("received_qty", { precision: 15, scale:  4 }).default('0').notNull(),
	unitPrice: numeric("unit_price", { precision: 18, scale:  5 }).notNull(),
	lineAmount: numeric("line_amount", { precision: 18, scale:  2 }).notNull(),
	lineType: varchar("line_type", { length: 20 }).default('inventory').notNull(),
	description: varchar({ length: 200 }),
}, (table) => [
	foreignKey({
			columns: [table.itemId],
			foreignColumns: [items.id],
			name: "purchase_order_lines_item_id_fkey"
		}),
	foreignKey({
			columns: [table.poId],
			foreignColumns: [purchaseOrders.id],
			name: "purchase_order_lines_po_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("purchase_order_lines_tenant_isolation", { as: "permissive", for: "all", to: ["public"], using: sql`(EXISTS ( SELECT 1
   FROM purchase_orders
  WHERE ((purchase_orders.id = purchase_order_lines.po_id) AND ((purchase_orders.company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text)))))`, withCheck: sql`(EXISTS ( SELECT 1
   FROM purchase_orders
  WHERE ((purchase_orders.id = purchase_order_lines.po_id) AND ((purchase_orders.company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text)))))`  }),
	check("purchase_order_lines_line_type_check", sql`(line_type)::text = ANY (ARRAY[('inventory'::character varying)::text, ('expense'::character varying)::text])`),
	check("purchase_order_lines_ordered_qty_check", sql`((line_type)::text = 'expense'::text) OR (ordered_qty > (0)::numeric)`),
	check("purchase_order_lines_received_qty_check", sql`received_qty >= (0)::numeric`),
	check("purchase_order_lines_unit_price_check", sql`unit_price >= (0)::numeric`),
]);

export const goodsReceipts = pgTable("goods_receipts", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	companyId: uuid("company_id").notNull(),
	receiptNumber: varchar("receipt_number", { length: 50 }).notNull(),
	poId: uuid("po_id"),
	warehouseId: uuid("warehouse_id").notNull(),
	receiptDate: date("receipt_date").notNull(),
	status: varchar({ length: 20 }).default('confirmed').notNull(),
	notes: text(),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	cancelledAt: timestamp("cancelled_at", { withTimezone: true, mode: 'string' }),
	cancelReason: text("cancel_reason"),
}, (table) => [
	foreignKey({
			columns: [table.companyId],
			foreignColumns: [companies.id],
			name: "goods_receipts_company_id_fkey"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [profiles.id],
			name: "goods_receipts_created_by_fkey"
		}),
	foreignKey({
			columns: [table.poId],
			foreignColumns: [purchaseOrders.id],
			name: "goods_receipts_po_id_fkey"
		}),
	foreignKey({
			columns: [table.warehouseId],
			foreignColumns: [warehouses.id],
			name: "goods_receipts_warehouse_id_fkey"
		}),
	unique("goods_receipts_company_id_receipt_number_key").on(table.companyId, table.receiptNumber),
	pgPolicy("goods_receipts_tenant_isolation", { as: "permissive", for: "all", to: ["public"], using: sql`((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text))`, withCheck: sql`((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text))`  }),
	check("goods_receipts_status_check", sql`(status)::text = ANY (ARRAY[('confirmed'::character varying)::text, ('cancelled'::character varying)::text])`),
]);

export const purchaseOrders = pgTable("purchase_orders", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	companyId: uuid("company_id").notNull(),
	poNumber: varchar("po_number", { length: 50 }).notNull(),
	orderDate: date("order_date").notNull(),
	expectedDate: date("expected_date"),
	status: varchar({ length: 20 }).default('draft').notNull(),
	totalAmount: numeric("total_amount", { precision: 18, scale:  2 }).default('0').notNull(),
	notes: text(),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	vendorId: uuid("vendor_id").notNull(),
}, (table) => [
	index("idx_po_company_status").using("btree", table.companyId.asc().nullsLast().op("text_ops"), table.status.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.companyId],
			foreignColumns: [companies.id],
			name: "purchase_orders_company_id_fkey"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [profiles.id],
			name: "purchase_orders_created_by_fkey"
		}),
	foreignKey({
			columns: [table.vendorId],
			foreignColumns: [vendors.id],
			name: "purchase_orders_vendor_id_fkey"
		}),
	unique("purchase_orders_company_id_po_number_key").on(table.companyId, table.poNumber),
	pgPolicy("purchase_orders_tenant_isolation", { as: "permissive", for: "all", to: ["public"], using: sql`((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text))`, withCheck: sql`((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text))`  }),
	check("purchase_orders_status_check", sql`(status)::text = ANY (ARRAY[('draft'::character varying)::text, ('confirmed'::character varying)::text, ('partially_received'::character varying)::text, ('received'::character varying)::text, ('cancelled'::character varying)::text])`),
]);

export const referenceCodes = pgTable("reference_codes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	companyId: uuid("company_id").notNull(),
	codeType: varchar("code_type", { length: 100 }).notNull(),
	codeData1: varchar("code_data1", { length: 500 }).notNull(),
	codeData2: varchar("code_data2", { length: 500 }),
	codeData3: varchar("code_data3", { length: 500 }),
	codeData4: varchar("code_data4", { length: 500 }),
	codeData5: varchar("code_data5", { length: 500 }),
	codeData6: varchar("code_data6", { length: 500 }),
	codeData7: varchar("code_data7", { length: 500 }),
	codeData8: varchar("code_data8", { length: 500 }),
	codeData9: varchar("code_data9", { length: 500 }),
	sortOrder: integer("sort_order").default(0),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
}, (table) => [
	index("idx_reference_codes_company_type").using("btree", table.companyId.asc().nullsLast().op("text_ops"), table.codeType.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("idx_reference_codes_unique_active").using("btree", table.companyId.asc().nullsLast().op("uuid_ops"), table.codeType.asc().nullsLast().op("text_ops"), table.codeData1.asc().nullsLast().op("uuid_ops")).where(sql`(is_active = true)`),
	foreignKey({
			columns: [table.companyId],
			foreignColumns: [companies.id],
			name: "reference_codes_company_id_fkey"
		}),
	pgPolicy("reference_codes_tenant_isolation", { as: "permissive", for: "all", to: ["public"], using: sql`((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text))`, withCheck: sql`((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text))`  }),
]);

export const items = pgTable("items", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	companyId: uuid("company_id").notNull(),
	code: varchar({ length: 50 }).notNull(),
	name: varchar({ length: 200 }).notNull(),
	unit: varchar({ length: 20 }).default('EA').notNull(),
	itemType: varchar("item_type", { length: 20 }).default('basic').notNull(),
	description: text(),
	minStockQty: numeric("min_stock_qty", { precision: 15, scale:  4 }).default('0'),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	materialType: text("material_type"),
}, (table) => [
	index("idx_items_company_id").using("btree", table.companyId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.companyId],
			foreignColumns: [companies.id],
			name: "items_company_id_fkey"
		}),
	unique("items_company_id_code_key").on(table.companyId, table.code),
	pgPolicy("items_tenant_isolation", { as: "permissive", for: "all", to: ["public"], using: sql`((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text))`, withCheck: sql`((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text))`  }),
	check("items_item_type_check", sql`(item_type)::text = ANY (ARRAY[('basic'::character varying)::text, ('assembly'::character varying)::text])`),
]);

export const inventoryTransactions = pgTable("inventory_transactions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	companyId: uuid("company_id").notNull(),
	itemId: uuid("item_id").notNull(),
	warehouseId: uuid("warehouse_id").notNull(),
	transactionType: varchar("transaction_type", { length: 30 }).notNull(),
	quantity: numeric({ precision: 15, scale:  4 }).notNull(),
	unitCost: numeric("unit_cost", { precision: 18, scale:  4 }),
	totalCost: numeric("total_cost", { precision: 18, scale:  2 }),
	referenceType: varchar("reference_type", { length: 30 }),
	referenceId: uuid("reference_id"),
	transactionDate: timestamp("transaction_date", { withTimezone: true, mode: 'string' }).notNull(),
	notes: text(),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_txn_item_date").using("btree", table.companyId.asc().nullsLast().op("timestamptz_ops"), table.itemId.asc().nullsLast().op("timestamptz_ops"), table.transactionDate.asc().nullsLast().op("timestamptz_ops")),
	index("idx_txn_reference").using("btree", table.referenceType.asc().nullsLast().op("text_ops"), table.referenceId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.companyId],
			foreignColumns: [companies.id],
			name: "inventory_transactions_company_id_fkey"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [profiles.id],
			name: "inventory_transactions_created_by_fkey"
		}),
	foreignKey({
			columns: [table.itemId],
			foreignColumns: [items.id],
			name: "inventory_transactions_item_id_fkey"
		}),
	foreignKey({
			columns: [table.warehouseId],
			foreignColumns: [warehouses.id],
			name: "inventory_transactions_warehouse_id_fkey"
		}),
	pgPolicy("inventory_transactions_tenant_isolation", { as: "permissive", for: "all", to: ["public"], using: sql`((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text))`, withCheck: sql`((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text))`  }),
	check("inventory_transactions_transaction_type_check", sql`(transaction_type)::text = ANY (ARRAY[('purchase_in'::character varying)::text, ('assembly_in'::character varying)::text, ('assembly_out'::character varying)::text, ('sale_out'::character varying)::text, ('transfer_in'::character varying)::text, ('transfer_out'::character varying)::text, ('adjustment'::character varying)::text, ('purchase_in_cancel'::character varying)::text, ('assembly_in_cancel'::character varying)::text, ('assembly_out_cancel'::character varying)::text, ('sale_out_cancel'::character varying)::text, ('transfer_in_cancel'::character varying)::text, ('transfer_out_cancel'::character varying)::text])`),
]);

export const profiles = pgTable("profiles", {
	id: uuid().primaryKey().notNull(),
	companyId: uuid("company_id"),
	role: varchar({ length: 20 }).default('normal').notNull(),
	displayName: varchar("display_name", { length: 100 }),
	email: varchar({ length: 255 }).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_profiles_company_id").using("btree", table.companyId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.companyId],
			foreignColumns: [companies.id],
			name: "profiles_company_id_fkey"
		}),
	check("profiles_role_check", sql`(role)::text = ANY (ARRAY[('super_admin'::character varying)::text, ('company_admin'::character varying)::text, ('normal'::character varying)::text, ('pending'::character varying)::text])`),
	check("profiles_role_company_check", sql`(((role)::text = ANY (ARRAY[('super_admin'::character varying)::text, ('pending'::character varying)::text])) AND (company_id IS NULL)) OR (((role)::text <> ALL (ARRAY[('super_admin'::character varying)::text, ('pending'::character varying)::text])) AND (company_id IS NOT NULL))`),
]);

export const inventorySummary = pgTable("inventory_summary", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	companyId: uuid("company_id").notNull(),
	itemId: uuid("item_id").notNull(),
	warehouseId: uuid("warehouse_id").notNull(),
	totalQty: numeric("total_qty", { precision: 15, scale:  4 }).default('0').notNull(),
	totalValue: numeric("total_value", { precision: 18, scale:  2 }).default('0').notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.companyId],
			foreignColumns: [companies.id],
			name: "inventory_summary_company_id_fkey"
		}),
	foreignKey({
			columns: [table.itemId],
			foreignColumns: [items.id],
			name: "inventory_summary_item_id_fkey"
		}),
	foreignKey({
			columns: [table.warehouseId],
			foreignColumns: [warehouses.id],
			name: "inventory_summary_warehouse_id_fkey"
		}),
	unique("inventory_summary_company_id_item_id_warehouse_id_key").on(table.companyId, table.itemId, table.warehouseId),
	pgPolicy("inventory_summary_tenant_isolation", { as: "permissive", for: "all", to: ["public"], using: sql`((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text))`, withCheck: sql`((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text))`  }),
]);

export const salesOrderLines = pgTable("sales_order_lines", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	salesOrderId: uuid("sales_order_id").notNull(),
	itemId: uuid("item_id").notNull(),
	warehouseId: uuid("warehouse_id").notNull(),
	quantity: numeric({ precision: 15, scale:  4 }).notNull(),
	unitPrice: numeric("unit_price", { precision: 18, scale:  4 }).notNull(),
	lineAmount: numeric("line_amount", { precision: 18, scale:  2 }).notNull(),
	costOfGoods: numeric("cost_of_goods", { precision: 18, scale:  2 }),
}, (table) => [
	foreignKey({
			columns: [table.itemId],
			foreignColumns: [items.id],
			name: "sales_order_lines_item_id_fkey"
		}),
	foreignKey({
			columns: [table.salesOrderId],
			foreignColumns: [salesOrders.id],
			name: "sales_order_lines_sales_order_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.warehouseId],
			foreignColumns: [warehouses.id],
			name: "sales_order_lines_warehouse_id_fkey"
		}),
	pgPolicy("sales_order_lines_tenant_isolation", { as: "permissive", for: "all", to: ["public"], using: sql`(EXISTS ( SELECT 1
   FROM sales_orders
  WHERE ((sales_orders.id = sales_order_lines.sales_order_id) AND ((sales_orders.company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text)))))`, withCheck: sql`(EXISTS ( SELECT 1
   FROM sales_orders
  WHERE ((sales_orders.id = sales_order_lines.sales_order_id) AND ((sales_orders.company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text)))))`  }),
	check("sales_order_lines_quantity_check", sql`quantity > (0)::numeric`),
	check("sales_order_lines_unit_price_check", sql`unit_price >= (0)::numeric`),
]);

export const companies = pgTable("companies", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: varchar({ length: 200 }).notNull(),
	businessNumber: varchar("business_number", { length: 20 }),
	address: text(),
	phone: varchar({ length: 20 }),
	costingMethod: varchar("costing_method", { length: 20 }).default('FIFO').notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	unique("companies_business_number_key").on(table.businessNumber),
	pgPolicy("companies_tenant_isolation", { as: "permissive", for: "all", to: ["public"], using: sql`((id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text))`, withCheck: sql`((id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text))`  }),
	check("companies_costing_method_check", sql`(costing_method)::text = ANY (ARRAY[('FIFO'::character varying)::text, ('LIFO'::character varying)::text, ('WEIGHTED_AVG'::character varying)::text])`),
]);

export const inventoryLotConsumptions = pgTable("inventory_lot_consumptions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	lotId: uuid("lot_id").notNull(),
	consumedQty: numeric("consumed_qty", { precision: 15, scale:  4 }).notNull(),
	transactionId: uuid("transaction_id").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	isReversed: boolean("is_reversed").default(false).notNull(),
}, (table) => [
	index("idx_lot_consumptions_lot_id").using("btree", table.lotId.asc().nullsLast().op("uuid_ops")),
	index("idx_lot_consumptions_txn_id").using("btree", table.transactionId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.lotId],
			foreignColumns: [inventoryLots.id],
			name: "inventory_lot_consumptions_lot_id_fkey"
		}),
	foreignKey({
			columns: [table.transactionId],
			foreignColumns: [inventoryTransactions.id],
			name: "inventory_lot_consumptions_transaction_id_fkey"
		}),
	pgPolicy("inventory_lot_consumptions_tenant_isolation", { as: "permissive", for: "all", to: ["public"], using: sql`(EXISTS ( SELECT 1
   FROM inventory_lots
  WHERE ((inventory_lots.id = inventory_lot_consumptions.lot_id) AND ((inventory_lots.company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text)))))`, withCheck: sql`(EXISTS ( SELECT 1
   FROM inventory_lots
  WHERE ((inventory_lots.id = inventory_lot_consumptions.lot_id) AND ((inventory_lots.company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text)))))`  }),
	check("inventory_lot_consumptions_consumed_qty_check", sql`consumed_qty > (0)::numeric`),
]);

export const salesOrders = pgTable("sales_orders", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	companyId: uuid("company_id").notNull(),
	orderNumber: varchar("order_number", { length: 50 }).notNull(),
	orderDate: date("order_date").notNull(),
	status: varchar({ length: 20 }).default('draft').notNull(),
	totalAmount: numeric("total_amount", { precision: 18, scale:  2 }).default('0').notNull(),
	notes: text(),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	cancelledShipmentAt: timestamp("cancelled_shipment_at", { withTimezone: true, mode: 'string' }),
	cancelReason: text("cancel_reason"),
	customerId: uuid("customer_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.companyId],
			foreignColumns: [companies.id],
			name: "sales_orders_company_id_fkey"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [profiles.id],
			name: "sales_orders_created_by_fkey"
		}),
	foreignKey({
			columns: [table.customerId],
			foreignColumns: [customers.id],
			name: "sales_orders_customer_id_fkey"
		}),
	unique("sales_orders_company_id_order_number_key").on(table.companyId, table.orderNumber),
	pgPolicy("sales_orders_tenant_isolation", { as: "permissive", for: "all", to: ["public"], using: sql`((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text))`, withCheck: sql`((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text))`  }),
	check("sales_orders_status_check", sql`(status)::text = ANY (ARRAY[('draft'::character varying)::text, ('confirmed'::character varying)::text, ('shipped'::character varying)::text, ('cancelled'::character varying)::text])`),
]);

export const bomHeaders = pgTable("bom_headers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	companyId: uuid("company_id").notNull(),
	productItemId: uuid("product_item_id").notNull(),
	version: integer().default(1).notNull(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_bom_headers_company_id").using("btree", table.companyId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.companyId],
			foreignColumns: [companies.id],
			name: "bom_headers_company_id_fkey"
		}),
	foreignKey({
			columns: [table.productItemId],
			foreignColumns: [items.id],
			name: "bom_headers_product_item_id_fkey"
		}),
	unique("bom_headers_product_item_id_version_key").on(table.productItemId, table.version),
	pgPolicy("bom_headers_tenant_isolation", { as: "permissive", for: "all", to: ["public"], using: sql`((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text))`, withCheck: sql`((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text))`  }),
]);

export const assemblyOrderLines = pgTable("assembly_order_lines", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	assemblyOrderId: uuid("assembly_order_id").notNull(),
	materialItemId: uuid("material_item_id").notNull(),
	requiredQty: numeric("required_qty", { precision: 15, scale:  4 }).notNull(),
	consumedQty: numeric("consumed_qty", { precision: 15, scale:  4 }).default('0').notNull(),
	consumedCost: numeric("consumed_cost", { precision: 18, scale:  2 }).default('0').notNull(),
}, (table) => [
	foreignKey({
			columns: [table.assemblyOrderId],
			foreignColumns: [assemblyOrders.id],
			name: "assembly_order_lines_assembly_order_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.materialItemId],
			foreignColumns: [items.id],
			name: "assembly_order_lines_material_item_id_fkey"
		}),
	pgPolicy("assembly_order_lines_tenant_isolation", { as: "permissive", for: "all", to: ["public"], using: sql`(EXISTS ( SELECT 1
   FROM assembly_orders
  WHERE ((assembly_orders.id = assembly_order_lines.assembly_order_id) AND ((assembly_orders.company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text)))))`, withCheck: sql`(EXISTS ( SELECT 1
   FROM assembly_orders
  WHERE ((assembly_orders.id = assembly_order_lines.assembly_order_id) AND ((assembly_orders.company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text)))))`  }),
]);

export const assemblyOrders = pgTable("assembly_orders", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	companyId: uuid("company_id").notNull(),
	orderNumber: varchar("order_number", { length: 50 }).notNull(),
	bomHeaderId: uuid("bom_header_id").notNull(),
	productItemId: uuid("product_item_id").notNull(),
	warehouseId: uuid("warehouse_id").notNull(),
	quantity: numeric({ precision: 15, scale:  4 }).notNull(),
	totalCost: numeric("total_cost", { precision: 18, scale:  2 }),
	unitCost: numeric("unit_cost", { precision: 18, scale:  4 }),
	assemblyDate: date("assembly_date").notNull(),
	status: varchar({ length: 20 }).default('draft').notNull(),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	cancelledAt: timestamp("cancelled_at", { withTimezone: true, mode: 'string' }),
	cancelReason: text("cancel_reason"),
}, (table) => [
	foreignKey({
			columns: [table.bomHeaderId],
			foreignColumns: [bomHeaders.id],
			name: "assembly_orders_bom_header_id_fkey"
		}),
	foreignKey({
			columns: [table.companyId],
			foreignColumns: [companies.id],
			name: "assembly_orders_company_id_fkey"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [profiles.id],
			name: "assembly_orders_created_by_fkey"
		}),
	foreignKey({
			columns: [table.productItemId],
			foreignColumns: [items.id],
			name: "assembly_orders_product_item_id_fkey"
		}),
	foreignKey({
			columns: [table.warehouseId],
			foreignColumns: [warehouses.id],
			name: "assembly_orders_warehouse_id_fkey"
		}),
	unique("assembly_orders_company_id_order_number_key").on(table.companyId, table.orderNumber),
	pgPolicy("assembly_orders_tenant_isolation", { as: "permissive", for: "all", to: ["public"], using: sql`((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text))`, withCheck: sql`((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text))`  }),
	check("assembly_orders_quantity_check", sql`quantity > (0)::numeric`),
	check("assembly_orders_status_check", sql`(status)::text = ANY (ARRAY[('draft'::character varying)::text, ('completed'::character varying)::text, ('cancelled'::character varying)::text])`),
]);

export const customers = pgTable("customers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	companyId: uuid("company_id").notNull(),
	name: varchar({ length: 200 }).notNull(),
	businessNumber: varchar("business_number", { length: 20 }),
	address: text(),
	receiptCurrency: varchar("receipt_currency", { length: 10 }).default('USD').notNull(),
	contactEmail: varchar("contact_email", { length: 255 }),
	notes: text(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_customers_company").using("btree", table.companyId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.companyId],
			foreignColumns: [companies.id],
			name: "customers_company_id_fkey"
		}),
	unique("customers_company_id_name_key").on(table.companyId, table.name),
	pgPolicy("customers_tenant_isolation", { as: "permissive", for: "all", to: ["public"], using: sql`((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text))`, withCheck: sql`((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text))`  }),
]);

export const inventoryLots = pgTable("inventory_lots", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	companyId: uuid("company_id").notNull(),
	itemId: uuid("item_id").notNull(),
	warehouseId: uuid("warehouse_id").notNull(),
	lotDate: timestamp("lot_date", { withTimezone: true, mode: 'string' }).notNull(),
	unitCost: numeric("unit_cost", { precision: 18, scale:  4 }).notNull(),
	initialQty: numeric("initial_qty", { precision: 15, scale:  4 }).notNull(),
	remainingQty: numeric("remaining_qty", { precision: 15, scale:  4 }).notNull(),
	sourceType: varchar("source_type", { length: 20 }).notNull(),
	sourceId: uuid("source_id"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_lots_fifo").using("btree", table.companyId.asc().nullsLast().op("timestamptz_ops"), table.itemId.asc().nullsLast().op("uuid_ops"), table.warehouseId.asc().nullsLast().op("uuid_ops"), table.lotDate.asc().nullsLast().op("timestamptz_ops")).where(sql`(remaining_qty > (0)::numeric)`),
	index("idx_lots_lifo").using("btree", table.companyId.asc().nullsLast().op("uuid_ops"), table.itemId.asc().nullsLast().op("timestamptz_ops"), table.warehouseId.asc().nullsLast().op("timestamptz_ops"), table.lotDate.desc().nullsFirst().op("uuid_ops")).where(sql`(remaining_qty > (0)::numeric)`),
	foreignKey({
			columns: [table.companyId],
			foreignColumns: [companies.id],
			name: "inventory_lots_company_id_fkey"
		}),
	foreignKey({
			columns: [table.itemId],
			foreignColumns: [items.id],
			name: "inventory_lots_item_id_fkey"
		}),
	foreignKey({
			columns: [table.warehouseId],
			foreignColumns: [warehouses.id],
			name: "inventory_lots_warehouse_id_fkey"
		}),
	pgPolicy("inventory_lots_tenant_isolation", { as: "permissive", for: "all", to: ["public"], using: sql`((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text))`, withCheck: sql`((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text))`  }),
	check("inventory_lots_initial_qty_check", sql`initial_qty > (0)::numeric`),
	check("inventory_lots_remaining_qty_check", sql`remaining_qty >= (0)::numeric`),
	check("inventory_lots_source_type_check", sql`(source_type)::text = ANY (ARRAY[('purchase'::character varying)::text, ('assembly'::character varying)::text, ('transfer_in'::character varying)::text])`),
	check("inventory_lots_unit_cost_check", sql`unit_cost >= (0)::numeric`),
]);

export const warehouseTransfers = pgTable("warehouse_transfers", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	companyId: uuid("company_id").notNull(),
	transferNumber: varchar("transfer_number", { length: 50 }).notNull(),
	fromWarehouseId: uuid("from_warehouse_id").notNull(),
	toWarehouseId: uuid("to_warehouse_id").notNull(),
	transferDate: date("transfer_date").notNull(),
	status: varchar({ length: 20 }).default('completed').notNull(),
	notes: text(),
	createdBy: uuid("created_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	cancelledAt: timestamp("cancelled_at", { withTimezone: true, mode: 'string' }),
	cancelReason: text("cancel_reason"),
}, (table) => [
	foreignKey({
			columns: [table.companyId],
			foreignColumns: [companies.id],
			name: "warehouse_transfers_company_id_fkey"
		}),
	foreignKey({
			columns: [table.createdBy],
			foreignColumns: [profiles.id],
			name: "warehouse_transfers_created_by_fkey"
		}),
	foreignKey({
			columns: [table.fromWarehouseId],
			foreignColumns: [warehouses.id],
			name: "warehouse_transfers_from_warehouse_id_fkey"
		}),
	foreignKey({
			columns: [table.toWarehouseId],
			foreignColumns: [warehouses.id],
			name: "warehouse_transfers_to_warehouse_id_fkey"
		}),
	unique("warehouse_transfers_company_id_transfer_number_key").on(table.companyId, table.transferNumber),
	pgPolicy("warehouse_transfers_tenant_isolation", { as: "permissive", for: "all", to: ["public"], using: sql`((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text))`, withCheck: sql`((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text))`  }),
	check("warehouse_transfers_check", sql`from_warehouse_id <> to_warehouse_id`),
	check("warehouse_transfers_status_check", sql`(status)::text = ANY (ARRAY[('completed'::character varying)::text, ('cancelled'::character varying)::text])`),
]);

export const warehouseTransferLines = pgTable("warehouse_transfer_lines", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	transferId: uuid("transfer_id").notNull(),
	itemId: uuid("item_id").notNull(),
	quantity: numeric({ precision: 15, scale:  4 }).notNull(),
	unitCost: numeric("unit_cost", { precision: 18, scale:  4 }),
}, (table) => [
	foreignKey({
			columns: [table.itemId],
			foreignColumns: [items.id],
			name: "warehouse_transfer_lines_item_id_fkey"
		}),
	foreignKey({
			columns: [table.transferId],
			foreignColumns: [warehouseTransfers.id],
			name: "warehouse_transfer_lines_transfer_id_fkey"
		}).onDelete("cascade"),
	pgPolicy("warehouse_transfer_lines_tenant_isolation", { as: "permissive", for: "all", to: ["public"], using: sql`(EXISTS ( SELECT 1
   FROM warehouse_transfers
  WHERE ((warehouse_transfers.id = warehouse_transfer_lines.transfer_id) AND ((warehouse_transfers.company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text)))))`, withCheck: sql`(EXISTS ( SELECT 1
   FROM warehouse_transfers
  WHERE ((warehouse_transfers.id = warehouse_transfer_lines.transfer_id) AND ((warehouse_transfers.company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text)))))`  }),
	check("warehouse_transfer_lines_quantity_check", sql`quantity > (0)::numeric`),
]);

export const vendors = pgTable("vendors", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	companyId: uuid("company_id").notNull(),
	name: varchar({ length: 200 }).notNull(),
	businessNumber: varchar("business_number", { length: 20 }),
	address: text(),
	bankName: varchar("bank_name", { length: 100 }),
	bankCode: varchar("bank_code", { length: 20 }),
	accountNumber: varchar("account_number", { length: 50 }),
	accountHolder: varchar("account_holder", { length: 100 }),
	paymentCurrency: varchar("payment_currency", { length: 10 }).default('KRW').notNull(),
	contactEmail: varchar("contact_email", { length: 255 }),
	notes: text(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_vendors_company").using("btree", table.companyId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.companyId],
			foreignColumns: [companies.id],
			name: "vendors_company_id_fkey"
		}),
	unique("vendors_company_id_name_key").on(table.companyId, table.name),
	pgPolicy("vendors_tenant_isolation", { as: "permissive", for: "all", to: ["public"], using: sql`((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text))`, withCheck: sql`((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text))`  }),
]);

export const warehouses = pgTable("warehouses", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	companyId: uuid("company_id").notNull(),
	name: varchar({ length: 200 }).notNull(),
	address: text(),
	contact: text(),
	notes: text(),
	isActive: boolean("is_active").default(true).notNull(),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("idx_warehouses_company_id").using("btree", table.companyId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.companyId],
			foreignColumns: [companies.id],
			name: "warehouses_company_id_fkey"
		}),
	pgPolicy("warehouses_tenant_isolation", { as: "permissive", for: "all", to: ["public"], using: sql`((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text))`, withCheck: sql`((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text))`  }),
]);

export const user = pgTable("user", {
	id: text().primaryKey().notNull(),
	name: text().notNull(),
	email: text().notNull(),
	emailVerified: boolean().notNull(),
	image: text(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	role: text(),
	companyId: text(),
}, (table) => [
	unique("user_email_key").on(table.email),
]);

export const session = pgTable("session", {
	id: text().primaryKey().notNull(),
	expiresAt: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	token: text().notNull(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	ipAddress: text(),
	userAgent: text(),
	userId: text().notNull(),
}, (table) => [
	index("session_userId_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "session_userId_fkey"
		}).onDelete("cascade"),
	unique("session_token_key").on(table.token),
]);

export const account = pgTable("account", {
	id: text().primaryKey().notNull(),
	accountId: text().notNull(),
	providerId: text().notNull(),
	userId: text().notNull(),
	accessToken: text(),
	refreshToken: text(),
	idToken: text(),
	accessTokenExpiresAt: timestamp({ withTimezone: true, mode: 'string' }),
	refreshTokenExpiresAt: timestamp({ withTimezone: true, mode: 'string' }),
	scope: text(),
	password: text(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
}, (table) => [
	index("account_userId_idx").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [user.id],
			name: "account_userId_fkey"
		}).onDelete("cascade"),
]);

export const verification = pgTable("verification", {
	id: text().primaryKey().notNull(),
	identifier: text().notNull(),
	value: text().notNull(),
	expiresAt: timestamp({ withTimezone: true, mode: 'string' }).notNull(),
	createdAt: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
	updatedAt: timestamp({ withTimezone: true, mode: 'string' }).default(sql`CURRENT_TIMESTAMP`).notNull(),
}, (table) => [
	index("verification_identifier_idx").using("btree", table.identifier.asc().nullsLast().op("text_ops")),
]);
