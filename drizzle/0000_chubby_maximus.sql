-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TABLE "bom_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"bom_header_id" uuid NOT NULL,
	"material_item_id" uuid NOT NULL,
	"quantity" numeric(15, 4) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "bom_lines_bom_header_id_material_item_id_key" UNIQUE("bom_header_id","material_item_id"),
	CONSTRAINT "bom_lines_quantity_check" CHECK (quantity > (0)::numeric)
);
--> statement-breakpoint
ALTER TABLE "bom_lines" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "po_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"po_id" uuid NOT NULL,
	"payment_date" date NOT NULL,
	"amount" numeric(18, 2) NOT NULL,
	"payment_method" varchar(50),
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "po_payments_amount_check" CHECK (amount > (0)::numeric)
);
--> statement-breakpoint
ALTER TABLE "po_payments" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "goods_receipt_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"receipt_id" uuid NOT NULL,
	"po_line_id" uuid,
	"item_id" uuid NOT NULL,
	"quantity" numeric(15, 4) NOT NULL,
	"unit_price" numeric(18, 5) NOT NULL,
	CONSTRAINT "goods_receipt_lines_quantity_check" CHECK (quantity > (0)::numeric),
	CONSTRAINT "goods_receipt_lines_unit_price_check" CHECK (unit_price >= (0)::numeric)
);
--> statement-breakpoint
ALTER TABLE "goods_receipt_lines" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "purchase_order_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"po_id" uuid NOT NULL,
	"item_id" uuid,
	"ordered_qty" numeric(15, 4) NOT NULL,
	"received_qty" numeric(15, 4) DEFAULT '0' NOT NULL,
	"unit_price" numeric(18, 5) NOT NULL,
	"line_amount" numeric(18, 2) NOT NULL,
	"line_type" varchar(20) DEFAULT 'inventory' NOT NULL,
	"description" varchar(200),
	CONSTRAINT "purchase_order_lines_line_type_check" CHECK ((line_type)::text = ANY (ARRAY[('inventory'::character varying)::text, ('expense'::character varying)::text])),
	CONSTRAINT "purchase_order_lines_ordered_qty_check" CHECK (((line_type)::text = 'expense'::text) OR (ordered_qty > (0)::numeric)),
	CONSTRAINT "purchase_order_lines_received_qty_check" CHECK (received_qty >= (0)::numeric),
	CONSTRAINT "purchase_order_lines_unit_price_check" CHECK (unit_price >= (0)::numeric)
);
--> statement-breakpoint
ALTER TABLE "purchase_order_lines" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "goods_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"receipt_number" varchar(50) NOT NULL,
	"po_id" uuid,
	"warehouse_id" uuid NOT NULL,
	"receipt_date" date NOT NULL,
	"status" varchar(20) DEFAULT 'confirmed' NOT NULL,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cancelled_at" timestamp with time zone,
	"cancel_reason" text,
	CONSTRAINT "goods_receipts_company_id_receipt_number_key" UNIQUE("company_id","receipt_number"),
	CONSTRAINT "goods_receipts_status_check" CHECK ((status)::text = ANY (ARRAY[('confirmed'::character varying)::text, ('cancelled'::character varying)::text]))
);
--> statement-breakpoint
ALTER TABLE "goods_receipts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "purchase_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"po_number" varchar(50) NOT NULL,
	"order_date" date NOT NULL,
	"expected_date" date,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"total_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"vendor_id" uuid NOT NULL,
	CONSTRAINT "purchase_orders_company_id_po_number_key" UNIQUE("company_id","po_number"),
	CONSTRAINT "purchase_orders_status_check" CHECK ((status)::text = ANY (ARRAY[('draft'::character varying)::text, ('confirmed'::character varying)::text, ('partially_received'::character varying)::text, ('received'::character varying)::text, ('cancelled'::character varying)::text]))
);
--> statement-breakpoint
ALTER TABLE "purchase_orders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "reference_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"code_type" varchar(100) NOT NULL,
	"code_data1" varchar(500) NOT NULL,
	"code_data2" varchar(500),
	"code_data3" varchar(500),
	"code_data4" varchar(500),
	"code_data5" varchar(500),
	"code_data6" varchar(500),
	"code_data7" varchar(500),
	"code_data8" varchar(500),
	"code_data9" varchar(500),
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now(),
	"updated_at" timestamp with time zone DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "reference_codes" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"code" varchar(50) NOT NULL,
	"name" varchar(200) NOT NULL,
	"unit" varchar(20) DEFAULT 'EA' NOT NULL,
	"item_type" varchar(20) DEFAULT 'basic' NOT NULL,
	"description" text,
	"min_stock_qty" numeric(15, 4) DEFAULT '0',
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"material_type" text,
	CONSTRAINT "items_company_id_code_key" UNIQUE("company_id","code"),
	CONSTRAINT "items_item_type_check" CHECK ((item_type)::text = ANY (ARRAY[('basic'::character varying)::text, ('assembly'::character varying)::text]))
);
--> statement-breakpoint
ALTER TABLE "items" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "inventory_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"transaction_type" varchar(30) NOT NULL,
	"quantity" numeric(15, 4) NOT NULL,
	"unit_cost" numeric(18, 4),
	"total_cost" numeric(18, 2),
	"reference_type" varchar(30),
	"reference_id" uuid,
	"transaction_date" timestamp with time zone NOT NULL,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_transactions_transaction_type_check" CHECK ((transaction_type)::text = ANY (ARRAY[('purchase_in'::character varying)::text, ('assembly_in'::character varying)::text, ('assembly_out'::character varying)::text, ('sale_out'::character varying)::text, ('transfer_in'::character varying)::text, ('transfer_out'::character varying)::text, ('adjustment'::character varying)::text, ('purchase_in_cancel'::character varying)::text, ('assembly_in_cancel'::character varying)::text, ('assembly_out_cancel'::character varying)::text, ('sale_out_cancel'::character varying)::text, ('transfer_in_cancel'::character varying)::text, ('transfer_out_cancel'::character varying)::text]))
);
--> statement-breakpoint
ALTER TABLE "inventory_transactions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"company_id" uuid,
	"role" varchar(20) DEFAULT 'normal' NOT NULL,
	"display_name" varchar(100),
	"email" varchar(255) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_role_check" CHECK ((role)::text = ANY (ARRAY[('super_admin'::character varying)::text, ('company_admin'::character varying)::text, ('normal'::character varying)::text, ('pending'::character varying)::text])),
	CONSTRAINT "profiles_role_company_check" CHECK ((((role)::text = ANY (ARRAY[('super_admin'::character varying)::text, ('pending'::character varying)::text])) AND (company_id IS NULL)) OR (((role)::text <> ALL (ARRAY[('super_admin'::character varying)::text, ('pending'::character varying)::text])) AND (company_id IS NOT NULL)))
);
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "inventory_summary" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"total_qty" numeric(15, 4) DEFAULT '0' NOT NULL,
	"total_value" numeric(18, 2) DEFAULT '0' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_summary_company_id_item_id_warehouse_id_key" UNIQUE("company_id","item_id","warehouse_id")
);
--> statement-breakpoint
ALTER TABLE "inventory_summary" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales_order_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"sales_order_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"quantity" numeric(15, 4) NOT NULL,
	"unit_price" numeric(18, 4) NOT NULL,
	"line_amount" numeric(18, 2) NOT NULL,
	"cost_of_goods" numeric(18, 2),
	CONSTRAINT "sales_order_lines_quantity_check" CHECK (quantity > (0)::numeric),
	CONSTRAINT "sales_order_lines_unit_price_check" CHECK (unit_price >= (0)::numeric)
);
--> statement-breakpoint
ALTER TABLE "sales_order_lines" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(200) NOT NULL,
	"business_number" varchar(20),
	"address" text,
	"phone" varchar(20),
	"costing_method" varchar(20) DEFAULT 'FIFO' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "companies_business_number_key" UNIQUE("business_number"),
	CONSTRAINT "companies_costing_method_check" CHECK ((costing_method)::text = ANY (ARRAY[('FIFO'::character varying)::text, ('LIFO'::character varying)::text, ('WEIGHTED_AVG'::character varying)::text]))
);
--> statement-breakpoint
ALTER TABLE "companies" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "inventory_lot_consumptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"lot_id" uuid NOT NULL,
	"consumed_qty" numeric(15, 4) NOT NULL,
	"transaction_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"is_reversed" boolean DEFAULT false NOT NULL,
	CONSTRAINT "inventory_lot_consumptions_consumed_qty_check" CHECK (consumed_qty > (0)::numeric)
);
--> statement-breakpoint
ALTER TABLE "inventory_lot_consumptions" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "sales_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"order_number" varchar(50) NOT NULL,
	"order_date" date NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"total_amount" numeric(18, 2) DEFAULT '0' NOT NULL,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cancelled_shipment_at" timestamp with time zone,
	"cancel_reason" text,
	"customer_id" uuid NOT NULL,
	CONSTRAINT "sales_orders_company_id_order_number_key" UNIQUE("company_id","order_number"),
	CONSTRAINT "sales_orders_status_check" CHECK ((status)::text = ANY (ARRAY[('draft'::character varying)::text, ('confirmed'::character varying)::text, ('shipped'::character varying)::text, ('cancelled'::character varying)::text]))
);
--> statement-breakpoint
ALTER TABLE "sales_orders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "bom_headers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"product_item_id" uuid NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bom_headers_product_item_id_version_key" UNIQUE("product_item_id","version")
);
--> statement-breakpoint
ALTER TABLE "bom_headers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "assembly_order_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"assembly_order_id" uuid NOT NULL,
	"material_item_id" uuid NOT NULL,
	"required_qty" numeric(15, 4) NOT NULL,
	"consumed_qty" numeric(15, 4) DEFAULT '0' NOT NULL,
	"consumed_cost" numeric(18, 2) DEFAULT '0' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assembly_order_lines" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "assembly_orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"order_number" varchar(50) NOT NULL,
	"bom_header_id" uuid NOT NULL,
	"product_item_id" uuid NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"quantity" numeric(15, 4) NOT NULL,
	"total_cost" numeric(18, 2),
	"unit_cost" numeric(18, 4),
	"assembly_date" date NOT NULL,
	"status" varchar(20) DEFAULT 'draft' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cancelled_at" timestamp with time zone,
	"cancel_reason" text,
	CONSTRAINT "assembly_orders_company_id_order_number_key" UNIQUE("company_id","order_number"),
	CONSTRAINT "assembly_orders_quantity_check" CHECK (quantity > (0)::numeric),
	CONSTRAINT "assembly_orders_status_check" CHECK ((status)::text = ANY (ARRAY[('draft'::character varying)::text, ('completed'::character varying)::text, ('cancelled'::character varying)::text]))
);
--> statement-breakpoint
ALTER TABLE "assembly_orders" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "customers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"business_number" varchar(20),
	"address" text,
	"receipt_currency" varchar(10) DEFAULT 'USD' NOT NULL,
	"contact_email" varchar(255),
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "customers_company_id_name_key" UNIQUE("company_id","name")
);
--> statement-breakpoint
ALTER TABLE "customers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "inventory_lots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"warehouse_id" uuid NOT NULL,
	"lot_date" timestamp with time zone NOT NULL,
	"unit_cost" numeric(18, 4) NOT NULL,
	"initial_qty" numeric(15, 4) NOT NULL,
	"remaining_qty" numeric(15, 4) NOT NULL,
	"source_type" varchar(20) NOT NULL,
	"source_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "inventory_lots_initial_qty_check" CHECK (initial_qty > (0)::numeric),
	CONSTRAINT "inventory_lots_remaining_qty_check" CHECK (remaining_qty >= (0)::numeric),
	CONSTRAINT "inventory_lots_source_type_check" CHECK ((source_type)::text = ANY (ARRAY[('purchase'::character varying)::text, ('assembly'::character varying)::text, ('transfer_in'::character varying)::text])),
	CONSTRAINT "inventory_lots_unit_cost_check" CHECK (unit_cost >= (0)::numeric)
);
--> statement-breakpoint
ALTER TABLE "inventory_lots" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "warehouse_transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"transfer_number" varchar(50) NOT NULL,
	"from_warehouse_id" uuid NOT NULL,
	"to_warehouse_id" uuid NOT NULL,
	"transfer_date" date NOT NULL,
	"status" varchar(20) DEFAULT 'completed' NOT NULL,
	"notes" text,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cancelled_at" timestamp with time zone,
	"cancel_reason" text,
	CONSTRAINT "warehouse_transfers_company_id_transfer_number_key" UNIQUE("company_id","transfer_number"),
	CONSTRAINT "warehouse_transfers_check" CHECK (from_warehouse_id <> to_warehouse_id),
	CONSTRAINT "warehouse_transfers_status_check" CHECK ((status)::text = ANY (ARRAY[('completed'::character varying)::text, ('cancelled'::character varying)::text]))
);
--> statement-breakpoint
ALTER TABLE "warehouse_transfers" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "warehouse_transfer_lines" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"transfer_id" uuid NOT NULL,
	"item_id" uuid NOT NULL,
	"quantity" numeric(15, 4) NOT NULL,
	"unit_cost" numeric(18, 4),
	CONSTRAINT "warehouse_transfer_lines_quantity_check" CHECK (quantity > (0)::numeric)
);
--> statement-breakpoint
ALTER TABLE "warehouse_transfer_lines" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "vendors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"business_number" varchar(20),
	"address" text,
	"bank_name" varchar(100),
	"bank_code" varchar(20),
	"account_number" varchar(50),
	"account_holder" varchar(100),
	"payment_currency" varchar(10) DEFAULT 'KRW' NOT NULL,
	"contact_email" varchar(255),
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "vendors_company_id_name_key" UNIQUE("company_id","name")
);
--> statement-breakpoint
ALTER TABLE "vendors" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "warehouses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"company_id" uuid NOT NULL,
	"name" varchar(200) NOT NULL,
	"address" text,
	"contact" text,
	"notes" text,
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "warehouses" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"emailVerified" boolean NOT NULL,
	"image" text,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"role" text,
	"companyId" text,
	CONSTRAINT "user_email_key" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"token" text NOT NULL,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL,
	"ipAddress" text,
	"userAgent" text,
	"userId" text NOT NULL,
	CONSTRAINT "session_token_key" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"accountId" text NOT NULL,
	"providerId" text NOT NULL,
	"userId" text NOT NULL,
	"accessToken" text,
	"refreshToken" text,
	"idToken" text,
	"accessTokenExpiresAt" timestamp with time zone,
	"refreshTokenExpiresAt" timestamp with time zone,
	"scope" text,
	"password" text,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expiresAt" timestamp with time zone NOT NULL,
	"createdAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updatedAt" timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "bom_lines" ADD CONSTRAINT "bom_lines_bom_header_id_fkey" FOREIGN KEY ("bom_header_id") REFERENCES "public"."bom_headers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bom_lines" ADD CONSTRAINT "bom_lines_material_item_id_fkey" FOREIGN KEY ("material_item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "po_payments" ADD CONSTRAINT "po_payments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "po_payments" ADD CONSTRAINT "po_payments_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "public"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_po_line_id_fkey" FOREIGN KEY ("po_line_id") REFERENCES "public"."purchase_order_lines"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipt_lines" ADD CONSTRAINT "goods_receipt_lines_receipt_id_fkey" FOREIGN KEY ("receipt_id") REFERENCES "public"."goods_receipts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_order_lines" ADD CONSTRAINT "purchase_order_lines_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "public"."purchase_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_po_id_fkey" FOREIGN KEY ("po_id") REFERENCES "public"."purchase_orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "goods_receipts" ADD CONSTRAINT "goods_receipts_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_vendor_id_fkey" FOREIGN KEY ("vendor_id") REFERENCES "public"."vendors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reference_codes" ADD CONSTRAINT "reference_codes_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "items" ADD CONSTRAINT "items_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_summary" ADD CONSTRAINT "inventory_summary_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_summary" ADD CONSTRAINT "inventory_summary_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_summary" ADD CONSTRAINT "inventory_summary_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order_lines" ADD CONSTRAINT "sales_order_lines_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order_lines" ADD CONSTRAINT "sales_order_lines_sales_order_id_fkey" FOREIGN KEY ("sales_order_id") REFERENCES "public"."sales_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_order_lines" ADD CONSTRAINT "sales_order_lines_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_lot_consumptions" ADD CONSTRAINT "inventory_lot_consumptions_lot_id_fkey" FOREIGN KEY ("lot_id") REFERENCES "public"."inventory_lots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_lot_consumptions" ADD CONSTRAINT "inventory_lot_consumptions_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "public"."inventory_transactions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sales_orders" ADD CONSTRAINT "sales_orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "public"."customers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bom_headers" ADD CONSTRAINT "bom_headers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bom_headers" ADD CONSTRAINT "bom_headers_product_item_id_fkey" FOREIGN KEY ("product_item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assembly_order_lines" ADD CONSTRAINT "assembly_order_lines_assembly_order_id_fkey" FOREIGN KEY ("assembly_order_id") REFERENCES "public"."assembly_orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assembly_order_lines" ADD CONSTRAINT "assembly_order_lines_material_item_id_fkey" FOREIGN KEY ("material_item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assembly_orders" ADD CONSTRAINT "assembly_orders_bom_header_id_fkey" FOREIGN KEY ("bom_header_id") REFERENCES "public"."bom_headers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assembly_orders" ADD CONSTRAINT "assembly_orders_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assembly_orders" ADD CONSTRAINT "assembly_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assembly_orders" ADD CONSTRAINT "assembly_orders_product_item_id_fkey" FOREIGN KEY ("product_item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "assembly_orders" ADD CONSTRAINT "assembly_orders_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "customers" ADD CONSTRAINT "customers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_lots" ADD CONSTRAINT "inventory_lots_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_lots" ADD CONSTRAINT "inventory_lots_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_lots" ADD CONSTRAINT "inventory_lots_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_transfers" ADD CONSTRAINT "warehouse_transfers_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_transfers" ADD CONSTRAINT "warehouse_transfers_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_transfers" ADD CONSTRAINT "warehouse_transfers_from_warehouse_id_fkey" FOREIGN KEY ("from_warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_transfers" ADD CONSTRAINT "warehouse_transfers_to_warehouse_id_fkey" FOREIGN KEY ("to_warehouse_id") REFERENCES "public"."warehouses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_transfer_lines" ADD CONSTRAINT "warehouse_transfer_lines_item_id_fkey" FOREIGN KEY ("item_id") REFERENCES "public"."items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouse_transfer_lines" ADD CONSTRAINT "warehouse_transfer_lines_transfer_id_fkey" FOREIGN KEY ("transfer_id") REFERENCES "public"."warehouse_transfers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendors" ADD CONSTRAINT "vendors_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_po_payments_po_id" ON "po_payments" USING btree ("po_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_po_company_status" ON "purchase_orders" USING btree ("company_id" text_ops,"status" text_ops);--> statement-breakpoint
CREATE INDEX "idx_reference_codes_company_type" ON "reference_codes" USING btree ("company_id" text_ops,"code_type" uuid_ops);--> statement-breakpoint
CREATE UNIQUE INDEX "idx_reference_codes_unique_active" ON "reference_codes" USING btree ("company_id" uuid_ops,"code_type" text_ops,"code_data1" uuid_ops) WHERE (is_active = true);--> statement-breakpoint
CREATE INDEX "idx_items_company_id" ON "items" USING btree ("company_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_txn_item_date" ON "inventory_transactions" USING btree ("company_id" timestamptz_ops,"item_id" timestamptz_ops,"transaction_date" timestamptz_ops);--> statement-breakpoint
CREATE INDEX "idx_txn_reference" ON "inventory_transactions" USING btree ("reference_type" text_ops,"reference_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_profiles_company_id" ON "profiles" USING btree ("company_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_lot_consumptions_lot_id" ON "inventory_lot_consumptions" USING btree ("lot_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_lot_consumptions_txn_id" ON "inventory_lot_consumptions" USING btree ("transaction_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_bom_headers_company_id" ON "bom_headers" USING btree ("company_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_customers_company" ON "customers" USING btree ("company_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_lots_fifo" ON "inventory_lots" USING btree ("company_id" timestamptz_ops,"item_id" uuid_ops,"warehouse_id" uuid_ops,"lot_date" timestamptz_ops) WHERE (remaining_qty > (0)::numeric);--> statement-breakpoint
CREATE INDEX "idx_lots_lifo" ON "inventory_lots" USING btree ("company_id" uuid_ops,"item_id" timestamptz_ops,"warehouse_id" timestamptz_ops,"lot_date" uuid_ops) WHERE (remaining_qty > (0)::numeric);--> statement-breakpoint
CREATE INDEX "idx_vendors_company" ON "vendors" USING btree ("company_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "idx_warehouses_company_id" ON "warehouses" USING btree ("company_id" uuid_ops);--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("userId" text_ops);--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("userId" text_ops);--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier" text_ops);--> statement-breakpoint
CREATE POLICY "bom_lines_tenant_isolation" ON "bom_lines" AS PERMISSIVE FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM bom_headers
  WHERE ((bom_headers.id = bom_lines.bom_header_id) AND ((bom_headers.company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM bom_headers
  WHERE ((bom_headers.id = bom_lines.bom_header_id) AND ((bom_headers.company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text))))));--> statement-breakpoint
CREATE POLICY "po_payments_tenant_isolation" ON "po_payments" AS PERMISSIVE FOR ALL TO public USING (((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text))) WITH CHECK (((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text)));--> statement-breakpoint
CREATE POLICY "goods_receipt_lines_tenant_isolation" ON "goods_receipt_lines" AS PERMISSIVE FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM goods_receipts
  WHERE ((goods_receipts.id = goods_receipt_lines.receipt_id) AND ((goods_receipts.company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM goods_receipts
  WHERE ((goods_receipts.id = goods_receipt_lines.receipt_id) AND ((goods_receipts.company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text))))));--> statement-breakpoint
CREATE POLICY "purchase_order_lines_tenant_isolation" ON "purchase_order_lines" AS PERMISSIVE FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM purchase_orders
  WHERE ((purchase_orders.id = purchase_order_lines.po_id) AND ((purchase_orders.company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM purchase_orders
  WHERE ((purchase_orders.id = purchase_order_lines.po_id) AND ((purchase_orders.company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text))))));--> statement-breakpoint
CREATE POLICY "goods_receipts_tenant_isolation" ON "goods_receipts" AS PERMISSIVE FOR ALL TO public USING (((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text))) WITH CHECK (((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text)));--> statement-breakpoint
CREATE POLICY "purchase_orders_tenant_isolation" ON "purchase_orders" AS PERMISSIVE FOR ALL TO public USING (((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text))) WITH CHECK (((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text)));--> statement-breakpoint
CREATE POLICY "reference_codes_tenant_isolation" ON "reference_codes" AS PERMISSIVE FOR ALL TO public USING (((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text))) WITH CHECK (((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text)));--> statement-breakpoint
CREATE POLICY "items_tenant_isolation" ON "items" AS PERMISSIVE FOR ALL TO public USING (((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text))) WITH CHECK (((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text)));--> statement-breakpoint
CREATE POLICY "inventory_transactions_tenant_isolation" ON "inventory_transactions" AS PERMISSIVE FOR ALL TO public USING (((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text))) WITH CHECK (((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text)));--> statement-breakpoint
CREATE POLICY "inventory_summary_tenant_isolation" ON "inventory_summary" AS PERMISSIVE FOR ALL TO public USING (((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text))) WITH CHECK (((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text)));--> statement-breakpoint
CREATE POLICY "sales_order_lines_tenant_isolation" ON "sales_order_lines" AS PERMISSIVE FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM sales_orders
  WHERE ((sales_orders.id = sales_order_lines.sales_order_id) AND ((sales_orders.company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM sales_orders
  WHERE ((sales_orders.id = sales_order_lines.sales_order_id) AND ((sales_orders.company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text))))));--> statement-breakpoint
CREATE POLICY "companies_tenant_isolation" ON "companies" AS PERMISSIVE FOR ALL TO public USING (((id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text))) WITH CHECK (((id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text)));--> statement-breakpoint
CREATE POLICY "inventory_lot_consumptions_tenant_isolation" ON "inventory_lot_consumptions" AS PERMISSIVE FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM inventory_lots
  WHERE ((inventory_lots.id = inventory_lot_consumptions.lot_id) AND ((inventory_lots.company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM inventory_lots
  WHERE ((inventory_lots.id = inventory_lot_consumptions.lot_id) AND ((inventory_lots.company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text))))));--> statement-breakpoint
CREATE POLICY "sales_orders_tenant_isolation" ON "sales_orders" AS PERMISSIVE FOR ALL TO public USING (((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text))) WITH CHECK (((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text)));--> statement-breakpoint
CREATE POLICY "bom_headers_tenant_isolation" ON "bom_headers" AS PERMISSIVE FOR ALL TO public USING (((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text))) WITH CHECK (((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text)));--> statement-breakpoint
CREATE POLICY "assembly_order_lines_tenant_isolation" ON "assembly_order_lines" AS PERMISSIVE FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM assembly_orders
  WHERE ((assembly_orders.id = assembly_order_lines.assembly_order_id) AND ((assembly_orders.company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM assembly_orders
  WHERE ((assembly_orders.id = assembly_order_lines.assembly_order_id) AND ((assembly_orders.company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text))))));--> statement-breakpoint
CREATE POLICY "assembly_orders_tenant_isolation" ON "assembly_orders" AS PERMISSIVE FOR ALL TO public USING (((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text))) WITH CHECK (((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text)));--> statement-breakpoint
CREATE POLICY "customers_tenant_isolation" ON "customers" AS PERMISSIVE FOR ALL TO public USING (((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text))) WITH CHECK (((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text)));--> statement-breakpoint
CREATE POLICY "inventory_lots_tenant_isolation" ON "inventory_lots" AS PERMISSIVE FOR ALL TO public USING (((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text))) WITH CHECK (((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text)));--> statement-breakpoint
CREATE POLICY "warehouse_transfers_tenant_isolation" ON "warehouse_transfers" AS PERMISSIVE FOR ALL TO public USING (((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text))) WITH CHECK (((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text)));--> statement-breakpoint
CREATE POLICY "warehouse_transfer_lines_tenant_isolation" ON "warehouse_transfer_lines" AS PERMISSIVE FOR ALL TO public USING ((EXISTS ( SELECT 1
   FROM warehouse_transfers
  WHERE ((warehouse_transfers.id = warehouse_transfer_lines.transfer_id) AND ((warehouse_transfers.company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text)))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM warehouse_transfers
  WHERE ((warehouse_transfers.id = warehouse_transfer_lines.transfer_id) AND ((warehouse_transfers.company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text))))));--> statement-breakpoint
CREATE POLICY "vendors_tenant_isolation" ON "vendors" AS PERMISSIVE FOR ALL TO public USING (((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text))) WITH CHECK (((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text)));--> statement-breakpoint
CREATE POLICY "warehouses_tenant_isolation" ON "warehouses" AS PERMISSIVE FOR ALL TO public USING (((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text))) WITH CHECK (((company_id = get_my_company_id()) OR (get_my_role() = 'super_admin'::text)));
*/