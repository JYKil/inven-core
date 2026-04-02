export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      assembly_order_lines: {
        Row: {
          assembly_order_id: string
          consumed_cost: number
          consumed_qty: number
          id: string
          material_item_id: string
          required_qty: number
        }
        Insert: {
          assembly_order_id: string
          consumed_cost?: number
          consumed_qty?: number
          id?: string
          material_item_id: string
          required_qty: number
        }
        Update: {
          assembly_order_id?: string
          consumed_cost?: number
          consumed_qty?: number
          id?: string
          material_item_id?: string
          required_qty?: number
        }
        Relationships: [
          {
            foreignKeyName: "assembly_order_lines_assembly_order_id_fkey"
            columns: ["assembly_order_id"]
            isOneToOne: false
            referencedRelation: "assembly_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assembly_order_lines_material_item_id_fkey"
            columns: ["material_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      assembly_orders: {
        Row: {
          assembly_date: string
          bom_header_id: string
          cancel_reason: string | null
          cancelled_at: string | null
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          order_number: string
          product_item_id: string
          quantity: number
          status: string
          total_cost: number | null
          unit_cost: number | null
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          assembly_date: string
          bom_header_id: string
          cancel_reason?: string | null
          cancelled_at?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          order_number: string
          product_item_id: string
          quantity: number
          status?: string
          total_cost?: number | null
          unit_cost?: number | null
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          assembly_date?: string
          bom_header_id?: string
          cancel_reason?: string | null
          cancelled_at?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          order_number?: string
          product_item_id?: string
          quantity?: number
          status?: string
          total_cost?: number | null
          unit_cost?: number | null
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assembly_orders_bom_header_id_fkey"
            columns: ["bom_header_id"]
            isOneToOne: false
            referencedRelation: "bom_headers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assembly_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assembly_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assembly_orders_product_item_id_fkey"
            columns: ["product_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assembly_orders_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      bom_headers: {
        Row: {
          company_id: string
          created_at: string
          id: string
          is_active: boolean
          product_item_id: string
          updated_at: string
          version: number
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          product_item_id: string
          updated_at?: string
          version?: number
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          product_item_id?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "bom_headers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bom_headers_product_item_id_fkey"
            columns: ["product_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      bom_lines: {
        Row: {
          bom_header_id: string
          id: string
          material_item_id: string
          quantity: number
          sort_order: number
        }
        Insert: {
          bom_header_id: string
          id?: string
          material_item_id: string
          quantity: number
          sort_order?: number
        }
        Update: {
          bom_header_id?: string
          id?: string
          material_item_id?: string
          quantity?: number
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "bom_lines_bom_header_id_fkey"
            columns: ["bom_header_id"]
            isOneToOne: false
            referencedRelation: "bom_headers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bom_lines_material_item_id_fkey"
            columns: ["material_item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          address: string | null
          business_number: string | null
          costing_method: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          business_number?: string | null
          costing_method?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          business_number?: string | null
          costing_method?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          business_number: string | null
          company_id: string
          contact_email: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          receipt_currency: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          business_number?: string | null
          company_id: string
          contact_email?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          receipt_currency?: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          business_number?: string | null
          company_id?: string
          contact_email?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          receipt_currency?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      goods_receipt_lines: {
        Row: {
          id: string
          item_id: string
          po_line_id: string | null
          quantity: number
          receipt_id: string
          unit_price: number
        }
        Insert: {
          id?: string
          item_id: string
          po_line_id?: string | null
          quantity: number
          receipt_id: string
          unit_price: number
        }
        Update: {
          id?: string
          item_id?: string
          po_line_id?: string | null
          quantity?: number
          receipt_id?: string
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "goods_receipt_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipt_lines_po_line_id_fkey"
            columns: ["po_line_id"]
            isOneToOne: false
            referencedRelation: "purchase_order_lines"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipt_lines_receipt_id_fkey"
            columns: ["receipt_id"]
            isOneToOne: false
            referencedRelation: "goods_receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      goods_receipts: {
        Row: {
          cancel_reason: string | null
          cancelled_at: string | null
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          notes: string | null
          po_id: string | null
          receipt_date: string
          receipt_number: string
          status: string
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          po_id?: string | null
          receipt_date: string
          receipt_number: string
          status?: string
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          notes?: string | null
          po_id?: string | null
          receipt_date?: string
          receipt_number?: string
          status?: string
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "goods_receipts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipts_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_receipts_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_lot_consumptions: {
        Row: {
          consumed_qty: number
          created_at: string
          id: string
          is_reversed: boolean
          lot_id: string
          transaction_id: string
        }
        Insert: {
          consumed_qty: number
          created_at?: string
          id?: string
          is_reversed?: boolean
          lot_id: string
          transaction_id: string
        }
        Update: {
          consumed_qty?: number
          created_at?: string
          id?: string
          is_reversed?: boolean
          lot_id?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_lot_consumptions_lot_id_fkey"
            columns: ["lot_id"]
            isOneToOne: false
            referencedRelation: "inventory_lots"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_lot_consumptions_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "inventory_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_lots: {
        Row: {
          company_id: string
          created_at: string
          id: string
          initial_qty: number
          item_id: string
          lot_date: string
          remaining_qty: number
          source_id: string | null
          source_type: string
          unit_cost: number
          warehouse_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          initial_qty: number
          item_id: string
          lot_date: string
          remaining_qty: number
          source_id?: string | null
          source_type: string
          unit_cost: number
          warehouse_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          initial_qty?: number
          item_id?: string
          lot_date?: string
          remaining_qty?: number
          source_id?: string | null
          source_type?: string
          unit_cost?: number
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_lots_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_lots_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_lots_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_summary: {
        Row: {
          company_id: string
          id: string
          item_id: string
          total_qty: number
          total_value: number
          updated_at: string
          warehouse_id: string
        }
        Insert: {
          company_id: string
          id?: string
          item_id: string
          total_qty?: number
          total_value?: number
          updated_at?: string
          warehouse_id: string
        }
        Update: {
          company_id?: string
          id?: string
          item_id?: string
          total_qty?: number
          total_value?: number
          updated_at?: string
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_summary_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_summary_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_summary_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_transactions: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          id: string
          item_id: string
          notes: string | null
          quantity: number
          reference_id: string | null
          reference_type: string | null
          total_cost: number | null
          transaction_date: string
          transaction_type: string
          unit_cost: number | null
          warehouse_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          item_id: string
          notes?: string | null
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          total_cost?: number | null
          transaction_date: string
          transaction_type: string
          unit_cost?: number | null
          warehouse_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          item_id?: string
          notes?: string | null
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          total_cost?: number | null
          transaction_date?: string
          transaction_type?: string
          unit_cost?: number | null
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inventory_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_transactions_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          code: string
          company_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          item_type: string
          material_type: string | null
          min_stock_qty: number | null
          name: string
          unit: string
          updated_at: string
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          item_type?: string
          material_type?: string | null
          min_stock_qty?: number | null
          name: string
          unit?: string
          updated_at?: string
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          item_type?: string
          material_type?: string | null
          min_stock_qty?: number | null
          name?: string
          unit?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "items_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      po_payments: {
        Row: {
          amount: number
          company_id: string
          created_at: string
          id: string
          notes: string | null
          payment_date: string
          payment_method: string | null
          po_id: string
        }
        Insert: {
          amount: number
          company_id: string
          created_at?: string
          id?: string
          notes?: string | null
          payment_date: string
          payment_method?: string | null
          po_id: string
        }
        Update: {
          amount?: number
          company_id?: string
          created_at?: string
          id?: string
          notes?: string | null
          payment_date?: string
          payment_method?: string | null
          po_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "po_payments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "po_payments_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          company_id: string | null
          created_at: string
          display_name: string | null
          email: string
          id: string
          is_active: boolean
          role: string
          updated_at: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          display_name?: string | null
          email: string
          id: string
          is_active?: boolean
          role?: string
          updated_at?: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          display_name?: string | null
          email?: string
          id?: string
          is_active?: boolean
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_lines: {
        Row: {
          description: string | null
          id: string
          item_id: string | null
          line_amount: number
          line_type: string
          ordered_qty: number
          po_id: string
          received_qty: number
          unit_price: number
        }
        Insert: {
          description?: string | null
          id?: string
          item_id?: string | null
          line_amount: number
          line_type?: string
          ordered_qty: number
          po_id: string
          received_qty?: number
          unit_price: number
        }
        Update: {
          description?: string | null
          id?: string
          item_id?: string | null
          line_amount?: number
          line_type?: string
          ordered_qty?: number
          po_id?: string
          received_qty?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_lines_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          expected_date: string | null
          id: string
          notes: string | null
          order_date: string
          po_number: string
          status: string
          total_amount: number
          updated_at: string
          vendor_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_date: string
          po_number: string
          status?: string
          total_amount?: number
          updated_at?: string
          vendor_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          expected_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          po_number?: string
          status?: string
          total_amount?: number
          updated_at?: string
          vendor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      reference_codes: {
        Row: {
          code_data1: string
          code_data2: string | null
          code_data3: string | null
          code_data4: string | null
          code_data5: string | null
          code_data6: string | null
          code_data7: string | null
          code_data8: string | null
          code_data9: string | null
          code_type: string
          company_id: string
          created_at: string | null
          id: string
          is_active: boolean
          sort_order: number | null
          updated_at: string | null
        }
        Insert: {
          code_data1: string
          code_data2?: string | null
          code_data3?: string | null
          code_data4?: string | null
          code_data5?: string | null
          code_data6?: string | null
          code_data7?: string | null
          code_data8?: string | null
          code_data9?: string | null
          code_type: string
          company_id: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          sort_order?: number | null
          updated_at?: string | null
        }
        Update: {
          code_data1?: string
          code_data2?: string | null
          code_data3?: string | null
          code_data4?: string | null
          code_data5?: string | null
          code_data6?: string | null
          code_data7?: string | null
          code_data8?: string | null
          code_data9?: string | null
          code_type?: string
          company_id?: string
          created_at?: string | null
          id?: string
          is_active?: boolean
          sort_order?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reference_codes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_order_lines: {
        Row: {
          cost_of_goods: number | null
          id: string
          item_id: string
          line_amount: number
          quantity: number
          sales_order_id: string
          unit_price: number
          warehouse_id: string
        }
        Insert: {
          cost_of_goods?: number | null
          id?: string
          item_id: string
          line_amount: number
          quantity: number
          sales_order_id: string
          unit_price: number
          warehouse_id: string
        }
        Update: {
          cost_of_goods?: number | null
          id?: string
          item_id?: string
          line_amount?: number
          quantity?: number
          sales_order_id?: string
          unit_price?: number
          warehouse_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_lines_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_lines_warehouse_id_fkey"
            columns: ["warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_orders: {
        Row: {
          cancel_reason: string | null
          cancelled_shipment_at: string | null
          company_id: string
          created_at: string
          created_by: string | null
          customer_id: string
          id: string
          notes: string | null
          order_date: string
          order_number: string
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_shipment_at?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          id?: string
          notes?: string | null
          order_date: string
          order_number: string
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Update: {
          cancel_reason?: string | null
          cancelled_shipment_at?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          id?: string
          notes?: string | null
          order_date?: string
          order_number?: string
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          account_holder: string | null
          account_number: string | null
          address: string | null
          bank_code: string | null
          bank_name: string | null
          business_number: string | null
          company_id: string
          contact_email: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          payment_currency: string
          updated_at: string
        }
        Insert: {
          account_holder?: string | null
          account_number?: string | null
          address?: string | null
          bank_code?: string | null
          bank_name?: string | null
          business_number?: string | null
          company_id: string
          contact_email?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          payment_currency?: string
          updated_at?: string
        }
        Update: {
          account_holder?: string | null
          account_number?: string | null
          address?: string | null
          bank_code?: string | null
          bank_name?: string | null
          business_number?: string | null
          company_id?: string
          contact_email?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          payment_currency?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vendors_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_transfer_lines: {
        Row: {
          id: string
          item_id: string
          quantity: number
          transfer_id: string
          unit_cost: number | null
        }
        Insert: {
          id?: string
          item_id: string
          quantity: number
          transfer_id: string
          unit_cost?: number | null
        }
        Update: {
          id?: string
          item_id?: string
          quantity?: number
          transfer_id?: string
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_transfer_lines_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_transfer_lines_transfer_id_fkey"
            columns: ["transfer_id"]
            isOneToOne: false
            referencedRelation: "warehouse_transfers"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouse_transfers: {
        Row: {
          cancel_reason: string | null
          cancelled_at: string | null
          company_id: string
          created_at: string
          created_by: string | null
          from_warehouse_id: string
          id: string
          notes: string | null
          status: string
          to_warehouse_id: string
          transfer_date: string
          transfer_number: string
        }
        Insert: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          from_warehouse_id: string
          id?: string
          notes?: string | null
          status?: string
          to_warehouse_id: string
          transfer_date: string
          transfer_number: string
        }
        Update: {
          cancel_reason?: string | null
          cancelled_at?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          from_warehouse_id?: string
          id?: string
          notes?: string | null
          status?: string
          to_warehouse_id?: string
          transfer_date?: string
          transfer_number?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouse_transfers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_transfers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_transfers_from_warehouse_id_fkey"
            columns: ["from_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "warehouse_transfers_to_warehouse_id_fkey"
            columns: ["to_warehouse_id"]
            isOneToOne: false
            referencedRelation: "warehouses"
            referencedColumns: ["id"]
          },
        ]
      }
      warehouses: {
        Row: {
          address: string | null
          company_id: string
          contact: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          company_id: string
          contact?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          company_id?: string
          contact?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "warehouses_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_create_company: {
        Args: {
          p_address?: string
          p_business_number?: string
          p_name: string
          p_phone?: string
        }
        Returns: string
      }
      cancel_assembly: {
        Args: {
          p_assembly_order_id: string
          p_company_id: string
          p_reason?: string
        }
        Returns: Json
      }
      cancel_goods_receipt: {
        Args: {
          p_company_id: string
          p_goods_receipt_id: string
          p_reason?: string
        }
        Returns: Json
      }
      cancel_shipment: {
        Args: {
          p_company_id: string
          p_reason?: string
          p_sales_order_id: string
        }
        Returns: Json
      }
      cancel_transfer: {
        Args: {
          p_company_id: string
          p_reason?: string
          p_warehouse_transfer_id: string
        }
        Returns: Json
      }
      consume_inventory: {
        Args: {
          p_company_id: string
          p_item_id: string
          p_qty: number
          p_transaction_id: string
          p_warehouse_id: string
        }
        Returns: number
      }
      create_bom: {
        Args: {
          p_company_id: string
          p_lines?: Json
          p_product_item_id: string
          p_version?: number
        }
        Returns: string
      }
      create_bom_version: {
        Args: {
          p_company_id: string
          p_product_item_id?: string
          p_source_bom_id: string
        }
        Returns: string
      }
      create_company_with_profile: {
        Args: {
          p_business_number?: string
          p_company_name: string
          p_display_name?: string
          p_email?: string
          p_user_id: string
        }
        Returns: string
      }
      create_po_payment: {
        Args: {
          p_amount: number
          p_company_id: string
          p_notes?: string
          p_payment_date: string
          p_payment_method?: string
          p_po_id: string
        }
        Returns: string
      }
      create_purchase_order: {
        Args: {
          p_company_id: string
          p_created_by: string
          p_expected_date?: string
          p_lines?: Json
          p_notes?: string
          p_order_date: string
          p_po_number: string
          p_vendor_id: string
        }
        Returns: string
      }
      create_reference_code: {
        Args: {
          p_code_data1: string
          p_code_data2?: string
          p_code_data3?: string
          p_code_data4?: string
          p_code_data5?: string
          p_code_data6?: string
          p_code_data7?: string
          p_code_data8?: string
          p_code_data9?: string
          p_code_type: string
          p_sort_order?: number
        }
        Returns: string
      }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      dashboard_reorder_alerts: {
        Args: { p_company_id: string }
        Returns: Json
      }
      dashboard_summary: { Args: { p_company_id: string }; Returns: Json }
      execute_assembly: {
        Args: {
          p_assembly_date: string
          p_bom_header_id: string
          p_company_id: string
          p_created_by: string
          p_order_number: string
          p_product_item_id: string
          p_quantity: number
          p_warehouse_id: string
        }
        Returns: string
      }
      execute_goods_receipt: {
        Args: {
          p_company_id: string
          p_created_by?: string
          p_lines?: Json
          p_notes?: string
          p_po_id?: string
          p_receipt_date?: string
          p_receipt_number: string
          p_warehouse_id?: string
        }
        Returns: string
      }
      execute_shipment: {
        Args: {
          p_company_id: string
          p_created_by: string
          p_sales_order_id: string
        }
        Returns: Json
      }
      execute_transfer: {
        Args: {
          p_company_id: string
          p_created_by?: string
          p_from_warehouse_id: string
          p_lines?: Json
          p_notes?: string
          p_to_warehouse_id: string
          p_transfer_date: string
        }
        Returns: Json
      }
      get_my_company_id: { Args: never; Returns: string }
      get_my_role: { Args: never; Returns: string }
      get_reference_code_types: {
        Args: never
        Returns: {
          code_type: string
        }[]
      }
      report_inventory_ledger: {
        Args: {
          p_company_id: string
          p_end_date: string
          p_item_id?: string
          p_start_date: string
          p_warehouse_id?: string
        }
        Returns: Json
      }
      report_sales: {
        Args: {
          p_company_id: string
          p_customer_id?: string
          p_end_date: string
          p_start_date: string
        }
        Returns: Json
      }
      report_warehouse_stock: {
        Args: { p_company_id: string; p_warehouse_id?: string }
        Returns: Json
      }
      restore_lot_consumptions: {
        Args: { p_company_id: string; p_transaction_id: string }
        Returns: {
          lot_id: string
          restored_qty: number
          unit_cost: number
        }[]
      }
      soft_delete_reference_code: { Args: { p_id: string }; Returns: undefined }
      update_bom_lines: {
        Args: { p_bom_header_id: string; p_company_id: string; p_lines: Json }
        Returns: undefined
      }
      update_reference_code: {
        Args: {
          p_code_data1?: string
          p_code_data2?: string
          p_code_data3?: string
          p_code_data4?: string
          p_code_data5?: string
          p_code_data6?: string
          p_code_data7?: string
          p_code_data8?: string
          p_code_data9?: string
          p_id: string
          p_sort_order?: number
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
