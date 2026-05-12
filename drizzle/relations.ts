import { relations } from "drizzle-orm/relations";
import { bomHeaders, bomLines, items, companies, poPayments, purchaseOrders, goodsReceiptLines, purchaseOrderLines, goodsReceipts, profiles, warehouses, vendors, referenceCodes, inventoryTransactions, inventorySummary, salesOrderLines, salesOrders, inventoryLots, inventoryLotConsumptions, customers, assemblyOrders, assemblyOrderLines, warehouseTransfers, warehouseTransferLines, user, session, account } from "./schema";

export const bomLinesRelations = relations(bomLines, ({one}) => ({
	bomHeader: one(bomHeaders, {
		fields: [bomLines.bomHeaderId],
		references: [bomHeaders.id]
	}),
	item: one(items, {
		fields: [bomLines.materialItemId],
		references: [items.id]
	}),
}));

export const bomHeadersRelations = relations(bomHeaders, ({one, many}) => ({
	bomLines: many(bomLines),
	company: one(companies, {
		fields: [bomHeaders.companyId],
		references: [companies.id]
	}),
	item: one(items, {
		fields: [bomHeaders.productItemId],
		references: [items.id]
	}),
	assemblyOrders: many(assemblyOrders),
}));

export const itemsRelations = relations(items, ({one, many}) => ({
	bomLines: many(bomLines),
	goodsReceiptLines: many(goodsReceiptLines),
	purchaseOrderLines: many(purchaseOrderLines),
	company: one(companies, {
		fields: [items.companyId],
		references: [companies.id]
	}),
	inventoryTransactions: many(inventoryTransactions),
	inventorySummaries: many(inventorySummary),
	salesOrderLines: many(salesOrderLines),
	bomHeaders: many(bomHeaders),
	assemblyOrderLines: many(assemblyOrderLines),
	assemblyOrders: many(assemblyOrders),
	inventoryLots: many(inventoryLots),
	warehouseTransferLines: many(warehouseTransferLines),
}));

export const poPaymentsRelations = relations(poPayments, ({one}) => ({
	company: one(companies, {
		fields: [poPayments.companyId],
		references: [companies.id]
	}),
	purchaseOrder: one(purchaseOrders, {
		fields: [poPayments.poId],
		references: [purchaseOrders.id]
	}),
}));

export const companiesRelations = relations(companies, ({many}) => ({
	poPayments: many(poPayments),
	goodsReceipts: many(goodsReceipts),
	purchaseOrders: many(purchaseOrders),
	referenceCodes: many(referenceCodes),
	items: many(items),
	inventoryTransactions: many(inventoryTransactions),
	profiles: many(profiles),
	inventorySummaries: many(inventorySummary),
	salesOrders: many(salesOrders),
	bomHeaders: many(bomHeaders),
	assemblyOrders: many(assemblyOrders),
	customers: many(customers),
	inventoryLots: many(inventoryLots),
	warehouseTransfers: many(warehouseTransfers),
	vendors: many(vendors),
	warehouses: many(warehouses),
}));

export const purchaseOrdersRelations = relations(purchaseOrders, ({one, many}) => ({
	poPayments: many(poPayments),
	purchaseOrderLines: many(purchaseOrderLines),
	goodsReceipts: many(goodsReceipts),
	company: one(companies, {
		fields: [purchaseOrders.companyId],
		references: [companies.id]
	}),
	profile: one(profiles, {
		fields: [purchaseOrders.createdBy],
		references: [profiles.id]
	}),
	vendor: one(vendors, {
		fields: [purchaseOrders.vendorId],
		references: [vendors.id]
	}),
}));

export const goodsReceiptLinesRelations = relations(goodsReceiptLines, ({one}) => ({
	item: one(items, {
		fields: [goodsReceiptLines.itemId],
		references: [items.id]
	}),
	purchaseOrderLine: one(purchaseOrderLines, {
		fields: [goodsReceiptLines.poLineId],
		references: [purchaseOrderLines.id]
	}),
	goodsReceipt: one(goodsReceipts, {
		fields: [goodsReceiptLines.receiptId],
		references: [goodsReceipts.id]
	}),
}));

export const purchaseOrderLinesRelations = relations(purchaseOrderLines, ({one, many}) => ({
	goodsReceiptLines: many(goodsReceiptLines),
	item: one(items, {
		fields: [purchaseOrderLines.itemId],
		references: [items.id]
	}),
	purchaseOrder: one(purchaseOrders, {
		fields: [purchaseOrderLines.poId],
		references: [purchaseOrders.id]
	}),
}));

export const goodsReceiptsRelations = relations(goodsReceipts, ({one, many}) => ({
	goodsReceiptLines: many(goodsReceiptLines),
	company: one(companies, {
		fields: [goodsReceipts.companyId],
		references: [companies.id]
	}),
	profile: one(profiles, {
		fields: [goodsReceipts.createdBy],
		references: [profiles.id]
	}),
	purchaseOrder: one(purchaseOrders, {
		fields: [goodsReceipts.poId],
		references: [purchaseOrders.id]
	}),
	warehouse: one(warehouses, {
		fields: [goodsReceipts.warehouseId],
		references: [warehouses.id]
	}),
}));

export const profilesRelations = relations(profiles, ({one, many}) => ({
	goodsReceipts: many(goodsReceipts),
	purchaseOrders: many(purchaseOrders),
	inventoryTransactions: many(inventoryTransactions),
	company: one(companies, {
		fields: [profiles.companyId],
		references: [companies.id]
	}),
	salesOrders: many(salesOrders),
	assemblyOrders: many(assemblyOrders),
	warehouseTransfers: many(warehouseTransfers),
}));

export const warehousesRelations = relations(warehouses, ({one, many}) => ({
	goodsReceipts: many(goodsReceipts),
	inventoryTransactions: many(inventoryTransactions),
	inventorySummaries: many(inventorySummary),
	salesOrderLines: many(salesOrderLines),
	assemblyOrders: many(assemblyOrders),
	inventoryLots: many(inventoryLots),
	warehouseTransfers_fromWarehouseId: many(warehouseTransfers, {
		relationName: "warehouseTransfers_fromWarehouseId_warehouses_id"
	}),
	warehouseTransfers_toWarehouseId: many(warehouseTransfers, {
		relationName: "warehouseTransfers_toWarehouseId_warehouses_id"
	}),
	company: one(companies, {
		fields: [warehouses.companyId],
		references: [companies.id]
	}),
}));

export const vendorsRelations = relations(vendors, ({one, many}) => ({
	purchaseOrders: many(purchaseOrders),
	company: one(companies, {
		fields: [vendors.companyId],
		references: [companies.id]
	}),
}));

export const referenceCodesRelations = relations(referenceCodes, ({one}) => ({
	company: one(companies, {
		fields: [referenceCodes.companyId],
		references: [companies.id]
	}),
}));

export const inventoryTransactionsRelations = relations(inventoryTransactions, ({one, many}) => ({
	company: one(companies, {
		fields: [inventoryTransactions.companyId],
		references: [companies.id]
	}),
	profile: one(profiles, {
		fields: [inventoryTransactions.createdBy],
		references: [profiles.id]
	}),
	item: one(items, {
		fields: [inventoryTransactions.itemId],
		references: [items.id]
	}),
	warehouse: one(warehouses, {
		fields: [inventoryTransactions.warehouseId],
		references: [warehouses.id]
	}),
	inventoryLotConsumptions: many(inventoryLotConsumptions),
}));

export const inventorySummaryRelations = relations(inventorySummary, ({one}) => ({
	company: one(companies, {
		fields: [inventorySummary.companyId],
		references: [companies.id]
	}),
	item: one(items, {
		fields: [inventorySummary.itemId],
		references: [items.id]
	}),
	warehouse: one(warehouses, {
		fields: [inventorySummary.warehouseId],
		references: [warehouses.id]
	}),
}));

export const salesOrderLinesRelations = relations(salesOrderLines, ({one}) => ({
	item: one(items, {
		fields: [salesOrderLines.itemId],
		references: [items.id]
	}),
	salesOrder: one(salesOrders, {
		fields: [salesOrderLines.salesOrderId],
		references: [salesOrders.id]
	}),
	warehouse: one(warehouses, {
		fields: [salesOrderLines.warehouseId],
		references: [warehouses.id]
	}),
}));

export const salesOrdersRelations = relations(salesOrders, ({one, many}) => ({
	salesOrderLines: many(salesOrderLines),
	company: one(companies, {
		fields: [salesOrders.companyId],
		references: [companies.id]
	}),
	profile: one(profiles, {
		fields: [salesOrders.createdBy],
		references: [profiles.id]
	}),
	customer: one(customers, {
		fields: [salesOrders.customerId],
		references: [customers.id]
	}),
}));

export const inventoryLotConsumptionsRelations = relations(inventoryLotConsumptions, ({one}) => ({
	inventoryLot: one(inventoryLots, {
		fields: [inventoryLotConsumptions.lotId],
		references: [inventoryLots.id]
	}),
	inventoryTransaction: one(inventoryTransactions, {
		fields: [inventoryLotConsumptions.transactionId],
		references: [inventoryTransactions.id]
	}),
}));

export const inventoryLotsRelations = relations(inventoryLots, ({one, many}) => ({
	inventoryLotConsumptions: many(inventoryLotConsumptions),
	company: one(companies, {
		fields: [inventoryLots.companyId],
		references: [companies.id]
	}),
	item: one(items, {
		fields: [inventoryLots.itemId],
		references: [items.id]
	}),
	warehouse: one(warehouses, {
		fields: [inventoryLots.warehouseId],
		references: [warehouses.id]
	}),
}));

export const customersRelations = relations(customers, ({one, many}) => ({
	salesOrders: many(salesOrders),
	company: one(companies, {
		fields: [customers.companyId],
		references: [companies.id]
	}),
}));

export const assemblyOrderLinesRelations = relations(assemblyOrderLines, ({one}) => ({
	assemblyOrder: one(assemblyOrders, {
		fields: [assemblyOrderLines.assemblyOrderId],
		references: [assemblyOrders.id]
	}),
	item: one(items, {
		fields: [assemblyOrderLines.materialItemId],
		references: [items.id]
	}),
}));

export const assemblyOrdersRelations = relations(assemblyOrders, ({one, many}) => ({
	assemblyOrderLines: many(assemblyOrderLines),
	bomHeader: one(bomHeaders, {
		fields: [assemblyOrders.bomHeaderId],
		references: [bomHeaders.id]
	}),
	company: one(companies, {
		fields: [assemblyOrders.companyId],
		references: [companies.id]
	}),
	profile: one(profiles, {
		fields: [assemblyOrders.createdBy],
		references: [profiles.id]
	}),
	item: one(items, {
		fields: [assemblyOrders.productItemId],
		references: [items.id]
	}),
	warehouse: one(warehouses, {
		fields: [assemblyOrders.warehouseId],
		references: [warehouses.id]
	}),
}));

export const warehouseTransfersRelations = relations(warehouseTransfers, ({one, many}) => ({
	company: one(companies, {
		fields: [warehouseTransfers.companyId],
		references: [companies.id]
	}),
	profile: one(profiles, {
		fields: [warehouseTransfers.createdBy],
		references: [profiles.id]
	}),
	warehouse_fromWarehouseId: one(warehouses, {
		fields: [warehouseTransfers.fromWarehouseId],
		references: [warehouses.id],
		relationName: "warehouseTransfers_fromWarehouseId_warehouses_id"
	}),
	warehouse_toWarehouseId: one(warehouses, {
		fields: [warehouseTransfers.toWarehouseId],
		references: [warehouses.id],
		relationName: "warehouseTransfers_toWarehouseId_warehouses_id"
	}),
	warehouseTransferLines: many(warehouseTransferLines),
}));

export const warehouseTransferLinesRelations = relations(warehouseTransferLines, ({one}) => ({
	item: one(items, {
		fields: [warehouseTransferLines.itemId],
		references: [items.id]
	}),
	warehouseTransfer: one(warehouseTransfers, {
		fields: [warehouseTransferLines.transferId],
		references: [warehouseTransfers.id]
	}),
}));

export const sessionRelations = relations(session, ({one}) => ({
	user: one(user, {
		fields: [session.userId],
		references: [user.id]
	}),
}));

export const userRelations = relations(user, ({many}) => ({
	sessions: many(session),
	accounts: many(account),
}));

export const accountRelations = relations(account, ({one}) => ({
	user: one(user, {
		fields: [account.userId],
		references: [user.id]
	}),
}));