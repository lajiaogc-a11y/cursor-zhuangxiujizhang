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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      accounting_periods: {
        Row: {
          closed_at: string | null
          closed_by: string | null
          created_at: string
          id: string
          notes: string | null
          period_month: number
          period_year: number
          reopened_at: string | null
          reopened_by: string | null
          status: string
          tenant_id: string
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          period_month: number
          period_year: number
          reopened_at?: string | null
          reopened_by?: string | null
          status?: string
          tenant_id: string
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          closed_by?: string | null
          created_at?: string
          id?: string
          notes?: string | null
          period_month?: number
          period_year?: number
          reopened_at?: string | null
          reopened_by?: string | null
          status?: string
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "accounting_periods_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_rules: {
        Row: {
          account_currency: string | null
          account_type: string | null
          alert_days_before: number | null
          created_at: string
          id: string
          is_active: boolean | null
          rule_name: string
          rule_type: Database["public"]["Enums"]["alert_type"]
          tenant_id: string | null
          threshold_value: number | null
        }
        Insert: {
          account_currency?: string | null
          account_type?: string | null
          alert_days_before?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          rule_name: string
          rule_type: Database["public"]["Enums"]["alert_type"]
          tenant_id?: string | null
          threshold_value?: number | null
        }
        Update: {
          account_currency?: string | null
          account_type?: string | null
          alert_days_before?: number | null
          created_at?: string
          id?: string
          is_active?: boolean | null
          rule_name?: string
          rule_type?: Database["public"]["Enums"]["alert_type"]
          tenant_id?: string | null
          threshold_value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "alert_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          created_at: string
          event_category: string
          event_data: Json | null
          event_name: string
          id: string
          page_url: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          event_category?: string
          event_data?: Json | null
          event_name: string
          id?: string
          page_url?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          event_category?: string
          event_data?: Json | null
          event_name?: string
          id?: string
          page_url?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      analytics_events_archive: {
        Row: {
          archived_at: string
          created_at: string
          event_category: string
          event_data: Json | null
          event_name: string
          id: string
          page_url: string | null
          user_id: string | null
        }
        Insert: {
          archived_at?: string
          created_at?: string
          event_category?: string
          event_data?: Json | null
          event_name: string
          id?: string
          page_url?: string | null
          user_id?: string | null
        }
        Update: {
          archived_at?: string
          created_at?: string
          event_category?: string
          event_data?: Json | null
          event_name?: string
          id?: string
          page_url?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      approval_requests: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          record_id: string
          record_table: string
          request_type: string
          requested_by: string
          review_note: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          rule_id: string | null
          status: string
          tenant_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          record_id: string
          record_table: string
          request_type: string
          requested_by: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rule_id?: string | null
          status?: string
          tenant_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          record_id?: string
          record_table?: string
          request_type?: string
          requested_by?: string
          review_note?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          rule_id?: string | null
          status?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_requests_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "approval_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      approval_rules: {
        Row: {
          approver_role: string
          created_at: string
          id: string
          is_active: boolean | null
          rule_name: string
          rule_type: string
          tenant_id: string | null
          threshold_amount: number
          threshold_currency: string
          updated_at: string
        }
        Insert: {
          approver_role?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          rule_name: string
          rule_type?: string
          tenant_id?: string | null
          threshold_amount?: number
          threshold_currency?: string
          updated_at?: string
        }
        Update: {
          approver_role?: string
          created_at?: string
          id?: string
          is_active?: boolean | null
          rule_name?: string
          rule_type?: string
          tenant_id?: string | null
          threshold_amount?: number
          threshold_currency?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "approval_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_records: {
        Row: {
          check_in_lat: number | null
          check_in_lng: number | null
          check_in_method: string | null
          check_in_photo_url: string | null
          check_in_time: string | null
          check_out_lat: number | null
          check_out_lng: number | null
          check_out_method: string | null
          check_out_photo_url: string | null
          check_out_time: string | null
          comment: string | null
          created_at: string
          device_id: string | null
          duration_minutes: number | null
          id: string
          is_within_geofence: boolean | null
          local_timestamp: string | null
          overtime_minutes: number | null
          shift_id: string | null
          site_id: string
          status: string | null
          sync_status: string | null
          tenant_id: string | null
          updated_at: string
          verified_by: string | null
          worker_id: string
        }
        Insert: {
          check_in_lat?: number | null
          check_in_lng?: number | null
          check_in_method?: string | null
          check_in_photo_url?: string | null
          check_in_time?: string | null
          check_out_lat?: number | null
          check_out_lng?: number | null
          check_out_method?: string | null
          check_out_photo_url?: string | null
          check_out_time?: string | null
          comment?: string | null
          created_at?: string
          device_id?: string | null
          duration_minutes?: number | null
          id?: string
          is_within_geofence?: boolean | null
          local_timestamp?: string | null
          overtime_minutes?: number | null
          shift_id?: string | null
          site_id: string
          status?: string | null
          sync_status?: string | null
          tenant_id?: string | null
          updated_at?: string
          verified_by?: string | null
          worker_id: string
        }
        Update: {
          check_in_lat?: number | null
          check_in_lng?: number | null
          check_in_method?: string | null
          check_in_photo_url?: string | null
          check_in_time?: string | null
          check_out_lat?: number | null
          check_out_lng?: number | null
          check_out_method?: string | null
          check_out_photo_url?: string | null
          check_out_time?: string | null
          comment?: string | null
          created_at?: string
          device_id?: string | null
          duration_minutes?: number | null
          id?: string
          is_within_geofence?: boolean | null
          local_timestamp?: string | null
          overtime_minutes?: number | null
          shift_id?: string | null
          site_id?: string
          status?: string | null
          sync_status?: string | null
          tenant_id?: string | null
          updated_at?: string
          verified_by?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_records_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_records_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          action_display: string | null
          created_at: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          restored_at: string | null
          restored_by: string | null
          table_display_name: string | null
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          action_display?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          restored_at?: string | null
          restored_by?: string | null
          table_display_name?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          action_display?: string | null
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          restored_at?: string | null
          restored_by?: string | null
          table_display_name?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      audit_logs_archive: {
        Row: {
          action: string
          action_display: string | null
          archived_at: string
          created_at: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          restored_at: string | null
          restored_by: string | null
          table_display_name: string | null
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          action_display?: string | null
          archived_at?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          restored_at?: string | null
          restored_by?: string | null
          table_display_name?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          action_display?: string | null
          archived_at?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          restored_at?: string | null
          restored_by?: string | null
          table_display_name?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      bank_import_batches: {
        Row: {
          account_currency: string
          account_type: string
          file_name: string
          file_size: number | null
          id: string
          imported_at: string
          imported_by: string | null
          matched_records: number
          tenant_id: string | null
          total_records: number
          unmatched_records: number
        }
        Insert: {
          account_currency?: string
          account_type?: string
          file_name: string
          file_size?: number | null
          id?: string
          imported_at?: string
          imported_by?: string | null
          matched_records?: number
          tenant_id?: string | null
          total_records?: number
          unmatched_records?: number
        }
        Update: {
          account_currency?: string
          account_type?: string
          file_name?: string
          file_size?: number | null
          id?: string
          imported_at?: string
          imported_by?: string | null
          matched_records?: number
          tenant_id?: string | null
          total_records?: number
          unmatched_records?: number
        }
        Relationships: [
          {
            foreignKeyName: "bank_import_batches_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_statements: {
        Row: {
          account_currency: string
          account_type: string
          balance: number
          created_at: string
          created_by: string | null
          credit_amount: number
          debit_amount: number
          description: string
          id: string
          import_batch_id: string
          match_status: string
          matched_transaction_id: string | null
          statement_date: string
          tenant_id: string | null
        }
        Insert: {
          account_currency?: string
          account_type?: string
          balance?: number
          created_at?: string
          created_by?: string | null
          credit_amount?: number
          debit_amount?: number
          description?: string
          id?: string
          import_batch_id: string
          match_status?: string
          matched_transaction_id?: string | null
          statement_date: string
          tenant_id?: string | null
        }
        Update: {
          account_currency?: string
          account_type?: string
          balance?: number
          created_at?: string
          created_by?: string | null
          credit_amount?: number
          debit_amount?: number
          description?: string
          id?: string
          import_batch_id?: string
          match_status?: string
          matched_transaction_id?: string | null
          statement_date?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bank_statements_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "bank_import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_statements_matched_transaction_id_fkey"
            columns: ["matched_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_statements_matched_transaction_id_fkey"
            columns: ["matched_transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions_with_details"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bank_statements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      company_accounts: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          balance: number
          currency: Database["public"]["Enums"]["currency_type"]
          id: string
          include_in_stats: boolean | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          account_type: Database["public"]["Enums"]["account_type"]
          balance?: number
          currency: Database["public"]["Enums"]["currency_type"]
          id?: string
          include_in_stats?: boolean | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          balance?: number
          currency?: Database["public"]["Enums"]["currency_type"]
          id?: string
          include_in_stats?: boolean | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_accounts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_activities: {
        Row: {
          activity_type: string
          contact_id: string
          content: string
          created_at: string
          created_by: string | null
          id: string
          next_follow_up: string | null
          tenant_id: string | null
        }
        Insert: {
          activity_type?: string
          contact_id: string
          content: string
          created_at?: string
          created_by?: string | null
          id?: string
          next_follow_up?: string | null
          tenant_id?: string | null
        }
        Update: {
          activity_type?: string
          contact_id?: string
          content?: string
          created_at?: string
          created_by?: string | null
          id?: string
          next_follow_up?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contact_activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_activities_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_reminders: {
        Row: {
          contact_id: string
          created_at: string
          created_by: string | null
          id: string
          is_completed: boolean | null
          remind_at: string
          tenant_id: string | null
          title: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_completed?: boolean | null
          remind_at: string
          tenant_id?: string | null
          title: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_completed?: boolean | null
          remind_at?: string
          tenant_id?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_reminders_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_reminders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          address: string | null
          company_name: string | null
          contact_type: string
          created_at: string
          created_by: string | null
          default_currency: string | null
          email: string | null
          estimated_budget: number | null
          id: string
          is_active: boolean | null
          lead_source: string | null
          lead_status: string | null
          name: string
          next_follow_up: string | null
          notes: string | null
          phone: string | null
          property_address: string | null
          property_type: string | null
          tax_id: string | null
          tenant_id: string | null
          updated_at: string
          whatsapp_number: string | null
        }
        Insert: {
          address?: string | null
          company_name?: string | null
          contact_type?: string
          created_at?: string
          created_by?: string | null
          default_currency?: string | null
          email?: string | null
          estimated_budget?: number | null
          id?: string
          is_active?: boolean | null
          lead_source?: string | null
          lead_status?: string | null
          name: string
          next_follow_up?: string | null
          notes?: string | null
          phone?: string | null
          property_address?: string | null
          property_type?: string | null
          tax_id?: string | null
          tenant_id?: string | null
          updated_at?: string
          whatsapp_number?: string | null
        }
        Update: {
          address?: string | null
          company_name?: string | null
          contact_type?: string
          created_at?: string
          created_by?: string | null
          default_currency?: string | null
          email?: string | null
          estimated_budget?: number | null
          id?: string
          is_active?: boolean | null
          lead_source?: string | null
          lead_status?: string | null
          name?: string
          next_follow_up?: string | null
          notes?: string | null
          phone?: string | null
          property_address?: string | null
          property_type?: string | null
          tax_id?: string | null
          tenant_id?: string | null
          updated_at?: string
          whatsapp_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_amendments: {
        Row: {
          amendment_number: string
          amount_change: number | null
          approved_at: string | null
          approved_by: string | null
          contract_id: string
          created_at: string | null
          description: string | null
          id: string
          new_total_amount: number | null
          requested_by: string | null
          review_note: string | null
          status: string
          tenant_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          amendment_number: string
          amount_change?: number | null
          approved_at?: string | null
          approved_by?: string | null
          contract_id: string
          created_at?: string | null
          description?: string | null
          id?: string
          new_total_amount?: number | null
          requested_by?: string | null
          review_note?: string | null
          status?: string
          tenant_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          amendment_number?: string
          amount_change?: number | null
          approved_at?: string | null
          approved_by?: string | null
          contract_id?: string
          created_at?: string | null
          description?: string | null
          id?: string
          new_total_amount?: number | null
          requested_by?: string | null
          review_note?: string | null
          status?: string
          tenant_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_amendments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_amendments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_payment_plans: {
        Row: {
          amount: number | null
          contract_id: string
          created_at: string | null
          created_by: string | null
          currency: string | null
          due_date: string | null
          id: string
          milestone_name: string
          notes: string | null
          paid_amount: number | null
          paid_at: string | null
          payment_method: string | null
          percentage: number | null
          receipt_url: string | null
          sort_order: number | null
          status: string
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number | null
          contract_id: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          due_date?: string | null
          id?: string
          milestone_name: string
          notes?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          payment_method?: string | null
          percentage?: number | null
          receipt_url?: string | null
          sort_order?: number | null
          status?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number | null
          contract_id?: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          due_date?: string | null
          id?: string
          milestone_name?: string
          notes?: string | null
          paid_amount?: number | null
          paid_at?: string | null
          payment_method?: string | null
          percentage?: number | null
          receipt_url?: string | null
          sort_order?: number | null
          status?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_payment_plans_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_payment_plans_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_signatures: {
        Row: {
          contract_id: string
          id: string
          ip_address: string | null
          signature_data: string | null
          signature_url: string | null
          signed_at: string | null
          signer_name: string
          signer_role: string | null
          tenant_id: string | null
          user_agent: string | null
        }
        Insert: {
          contract_id: string
          id?: string
          ip_address?: string | null
          signature_data?: string | null
          signature_url?: string | null
          signed_at?: string | null
          signer_name: string
          signer_role?: string | null
          tenant_id?: string | null
          user_agent?: string | null
        }
        Update: {
          contract_id?: string
          id?: string
          ip_address?: string | null
          signature_data?: string | null
          signature_url?: string | null
          signed_at?: string | null
          signer_name?: string
          signer_role?: string | null
          tenant_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_signatures_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_signatures_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_templates: {
        Row: {
          content: string
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          merge_fields: Json | null
          name: string
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          merge_fields?: Json | null
          name: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          merge_fields?: Json | null
          name?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contract_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      contracts: {
        Row: {
          contact_id: string | null
          content: string
          contract_number: string
          created_at: string | null
          created_by: string | null
          currency: string | null
          effective_date: string | null
          expiry_date: string | null
          id: string
          notes: string | null
          project_id: string | null
          signed_at: string | null
          status: string
          template_id: string | null
          tenant_id: string | null
          title: string
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          contact_id?: string | null
          content?: string
          contract_number: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          effective_date?: string | null
          expiry_date?: string | null
          id?: string
          notes?: string | null
          project_id?: string | null
          signed_at?: string | null
          status?: string
          template_id?: string | null
          tenant_id?: string | null
          title: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          contact_id?: string | null
          content?: string
          contract_number?: string
          created_at?: string | null
          created_by?: string | null
          currency?: string | null
          effective_date?: string | null
          expiry_date?: string | null
          id?: string
          notes?: string | null
          project_id?: string | null
          signed_at?: string | null
          status?: string
          template_id?: string | null
          tenant_id?: string | null
          title?: string
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contracts_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_positions: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_positions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employees: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          monthly_salary: number
          name: string
          phone: string | null
          position: string | null
          status: Database["public"]["Enums"]["employee_status"]
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          monthly_salary?: number
          name: string
          phone?: string | null
          position?: string | null
          status?: Database["public"]["Enums"]["employee_status"]
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          monthly_salary?: number
          name?: string
          phone?: string | null
          position?: string | null
          status?: Database["public"]["Enums"]["employee_status"]
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "employees_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      error_logs: {
        Row: {
          component_stack: string | null
          created_at: string
          error_message: string
          error_stack: string | null
          id: string
          url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          component_stack?: string | null
          created_at?: string
          error_message: string
          error_stack?: string | null
          id?: string
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          component_stack?: string | null
          created_at?: string
          error_message?: string
          error_stack?: string | null
          id?: string
          url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      exchange_rates: {
        Row: {
          created_at: string
          created_by: string | null
          from_currency: Database["public"]["Enums"]["currency_type"]
          id: string
          rate: number
          rate_date: string
          source: string | null
          tenant_id: string | null
          to_currency: Database["public"]["Enums"]["currency_type"]
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          from_currency: Database["public"]["Enums"]["currency_type"]
          id?: string
          rate: number
          rate_date?: string
          source?: string | null
          tenant_id?: string | null
          to_currency: Database["public"]["Enums"]["currency_type"]
        }
        Update: {
          created_at?: string
          created_by?: string | null
          from_currency?: Database["public"]["Enums"]["currency_type"]
          id?: string
          rate?: number
          rate_date?: string
          source?: string | null
          tenant_id?: string | null
          to_currency?: Database["public"]["Enums"]["currency_type"]
        }
        Relationships: [
          {
            foreignKeyName: "exchange_rates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_transactions: {
        Row: {
          created_at: string
          created_by: string | null
          exchange_rate: number
          id: string
          in_account_type: Database["public"]["Enums"]["account_type"]
          in_amount: number
          in_amount_myr: number
          in_currency: Database["public"]["Enums"]["currency_type"]
          out_account_type: Database["public"]["Enums"]["account_type"]
          out_amount: number
          out_amount_myr: number
          out_currency: Database["public"]["Enums"]["currency_type"]
          profit_loss: number
          remark: string | null
          sequence_no: number
          tenant_id: string | null
          transaction_date: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          exchange_rate: number
          id?: string
          in_account_type: Database["public"]["Enums"]["account_type"]
          in_amount: number
          in_amount_myr: number
          in_currency: Database["public"]["Enums"]["currency_type"]
          out_account_type: Database["public"]["Enums"]["account_type"]
          out_amount: number
          out_amount_myr: number
          out_currency: Database["public"]["Enums"]["currency_type"]
          profit_loss?: number
          remark?: string | null
          sequence_no?: number
          tenant_id?: string | null
          transaction_date: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          exchange_rate?: number
          id?: string
          in_account_type?: Database["public"]["Enums"]["account_type"]
          in_amount?: number
          in_amount_myr?: number
          in_currency?: Database["public"]["Enums"]["currency_type"]
          out_account_type?: Database["public"]["Enums"]["account_type"]
          out_amount?: number
          out_amount_myr?: number
          out_currency?: Database["public"]["Enums"]["currency_type"]
          profit_loss?: number
          remark?: string | null
          sequence_no?: number
          tenant_id?: string | null
          transaction_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "exchange_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      fixed_assets: {
        Row: {
          accumulated_depreciation: number | null
          asset_code: string
          asset_name: string
          category: string | null
          created_at: string
          created_by: string | null
          currency: string
          current_value: number | null
          depreciation_method: string | null
          exchange_rate: number
          id: string
          location: string | null
          notes: string | null
          project_id: string | null
          purchase_amount: number
          purchase_amount_myr: number
          purchase_date: string
          salvage_value: number | null
          status: string | null
          tenant_id: string | null
          updated_at: string
          useful_life_months: number | null
        }
        Insert: {
          accumulated_depreciation?: number | null
          asset_code: string
          asset_name: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          current_value?: number | null
          depreciation_method?: string | null
          exchange_rate?: number
          id?: string
          location?: string | null
          notes?: string | null
          project_id?: string | null
          purchase_amount?: number
          purchase_amount_myr?: number
          purchase_date?: string
          salvage_value?: number | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
          useful_life_months?: number | null
        }
        Update: {
          accumulated_depreciation?: number | null
          asset_code?: string
          asset_name?: string
          category?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          current_value?: number | null
          depreciation_method?: string | null
          exchange_rate?: number
          id?: string
          location?: string | null
          notes?: string | null
          project_id?: string | null
          purchase_amount?: number
          purchase_amount_myr?: number
          purchase_date?: string
          salvage_value?: number | null
          status?: string | null
          tenant_id?: string | null
          updated_at?: string
          useful_life_months?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "fixed_assets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fixed_assets_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      import_history: {
        Row: {
          created_at: string
          details: Json | null
          error_message: string | null
          failed_tables: number | null
          file_name: string
          file_size: number | null
          id: string
          imported_at: string
          imported_by: string | null
          status: string
          success_records: number | null
          success_tables: number | null
          total_records: number | null
          total_tables: number | null
        }
        Insert: {
          created_at?: string
          details?: Json | null
          error_message?: string | null
          failed_tables?: number | null
          file_name: string
          file_size?: number | null
          id?: string
          imported_at?: string
          imported_by?: string | null
          status?: string
          success_records?: number | null
          success_tables?: number | null
          total_records?: number | null
          total_tables?: number | null
        }
        Update: {
          created_at?: string
          details?: Json | null
          error_message?: string | null
          failed_tables?: number | null
          file_name?: string
          file_size?: number | null
          id?: string
          imported_at?: string
          imported_by?: string | null
          status?: string
          success_records?: number | null
          success_tables?: number | null
          total_records?: number | null
          total_tables?: number | null
        }
        Relationships: []
      }
      insurance_payments: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          amount_myr: number
          company_contribution: number
          created_at: string
          created_by: string | null
          currency: Database["public"]["Enums"]["currency_type"]
          employee_contribution: number
          employee_id: string
          id: string
          insurance_type: string
          payment_date: string
          payment_month: string
          remark: string | null
          tenant_id: string | null
          total_amount: number
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"]
          amount_myr?: number
          company_contribution?: number
          created_at?: string
          created_by?: string | null
          currency?: Database["public"]["Enums"]["currency_type"]
          employee_contribution?: number
          employee_id: string
          id?: string
          insurance_type: string
          payment_date?: string
          payment_month: string
          remark?: string | null
          tenant_id?: string | null
          total_amount?: number
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          amount_myr?: number
          company_contribution?: number
          created_at?: string
          created_by?: string | null
          currency?: Database["public"]["Enums"]["currency_type"]
          employee_contribution?: number
          employee_id?: string
          id?: string
          insurance_type?: string
          payment_date?: string
          payment_month?: string
          remark?: string | null
          tenant_id?: string | null
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "insurance_payments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invitation_codes: {
        Row: {
          code: string
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number
          note: string | null
          tenant_id: string | null
          used_count: number
        }
        Insert: {
          code: string
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number
          note?: string | null
          tenant_id?: string | null
          used_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number
          note?: string | null
          tenant_id?: string | null
          used_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "invitation_codes_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          amount: number
          description: string
          id: string
          invoice_id: string
          quantity: number
          sort_order: number | null
          tax_amount: number
          tax_rate_id: string | null
          tenant_id: string | null
          unit_price: number
        }
        Insert: {
          amount?: number
          description: string
          id?: string
          invoice_id: string
          quantity?: number
          sort_order?: number | null
          tax_amount?: number
          tax_rate_id?: string | null
          tenant_id?: string | null
          unit_price?: number
        }
        Update: {
          amount?: number
          description?: string
          id?: string
          invoice_id?: string
          quantity?: number
          sort_order?: number | null
          tax_amount?: number
          tax_rate_id?: string | null
          tenant_id?: string | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_tax_rate_id_fkey"
            columns: ["tax_rate_id"]
            isOneToOne: false
            referencedRelation: "tax_rates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          contact_id: string | null
          created_at: string
          created_by: string | null
          currency: string
          due_date: string | null
          exchange_rate: number
          id: string
          invoice_number: string
          invoice_type: string
          issue_date: string | null
          notes: string | null
          project_id: string | null
          status: string
          subtotal: number
          tax_amount: number
          tenant_id: string | null
          terms: string | null
          total_amount: number
          total_amount_myr: number
          updated_at: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          due_date?: string | null
          exchange_rate?: number
          id?: string
          invoice_number: string
          invoice_type?: string
          issue_date?: string | null
          notes?: string | null
          project_id?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          tenant_id?: string | null
          terms?: string | null
          total_amount?: number
          total_amount_myr?: number
          updated_at?: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string
          due_date?: string | null
          exchange_rate?: number
          id?: string
          invoice_number?: string
          invoice_type?: string
          issue_date?: string | null
          notes?: string | null
          project_id?: string | null
          status?: string
          subtotal?: number
          tax_amount?: number
          tenant_id?: string | null
          terms?: string | null
          total_amount?: number
          total_amount_myr?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          approved_at: string | null
          approver_id: string | null
          created_at: string
          end_date: string
          evidence_url: string | null
          id: string
          leave_type: string
          reason: string | null
          review_note: string | null
          site_id: string | null
          start_date: string
          status: string | null
          tenant_id: string | null
          worker_id: string
        }
        Insert: {
          approved_at?: string | null
          approver_id?: string | null
          created_at?: string
          end_date: string
          evidence_url?: string | null
          id?: string
          leave_type?: string
          reason?: string | null
          review_note?: string | null
          site_id?: string | null
          start_date: string
          status?: string | null
          tenant_id?: string | null
          worker_id: string
        }
        Update: {
          approved_at?: string | null
          approver_id?: string | null
          created_at?: string
          end_date?: string
          evidence_url?: string | null
          id?: string
          leave_type?: string
          reason?: string | null
          review_note?: string | null
          site_id?: string | null
          start_date?: string
          status?: string | null
          tenant_id?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leave_requests_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      login_attempts: {
        Row: {
          attempted_at: string
          email: string | null
          id: string
          ip_address: string
          success: boolean
        }
        Insert: {
          attempted_at?: string
          email?: string | null
          id?: string
          ip_address: string
          success?: boolean
        }
        Update: {
          attempted_at?: string
          email?: string | null
          id?: string
          ip_address?: string
          success?: boolean
        }
        Relationships: []
      }
      material_issues: {
        Row: {
          created_at: string
          id: string
          issued_by: string | null
          issued_to: string | null
          material_name: string
          purpose: string | null
          qty_issued: number
          return_qty: number | null
          returned_at: string | null
          site_id: string
          tenant_id: string | null
          unit: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          issued_by?: string | null
          issued_to?: string | null
          material_name: string
          purpose?: string | null
          qty_issued?: number
          return_qty?: number | null
          returned_at?: string | null
          site_id: string
          tenant_id?: string | null
          unit?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          issued_by?: string | null
          issued_to?: string | null
          material_name?: string
          purpose?: string | null
          qty_issued?: number
          return_qty?: number | null
          returned_at?: string | null
          site_id?: string
          tenant_id?: string | null
          unit?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "material_issues_issued_to_fkey"
            columns: ["issued_to"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_issues_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "material_issues_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      memos: {
        Row: {
          content: string | null
          created_at: string
          created_by: string | null
          id: string
          is_completed: boolean | null
          reminder_time: string | null
          tenant_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_completed?: boolean | null
          reminder_time?: string | null
          tenant_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          is_completed?: boolean | null
          reminder_time?: string | null
          tenant_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "memos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payable_payments: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          amount: number
          amount_myr: number
          created_at: string
          created_by: string
          currency: Database["public"]["Enums"]["currency_type"]
          exchange_rate: number
          id: string
          payable_id: string
          payment_date: string
          receipt_url: string | null
          remark: string | null
          tenant_id: string | null
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"]
          amount?: number
          amount_myr?: number
          created_at?: string
          created_by: string
          currency?: Database["public"]["Enums"]["currency_type"]
          exchange_rate?: number
          id?: string
          payable_id: string
          payment_date?: string
          receipt_url?: string | null
          remark?: string | null
          tenant_id?: string | null
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          amount?: number
          amount_myr?: number
          created_at?: string
          created_by?: string
          currency?: Database["public"]["Enums"]["currency_type"]
          exchange_rate?: number
          id?: string
          payable_id?: string
          payment_date?: string
          receipt_url?: string | null
          remark?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payable_payments_payable_id_fkey"
            columns: ["payable_id"]
            isOneToOne: false
            referencedRelation: "payables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payable_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payables: {
        Row: {
          created_at: string
          created_by: string
          currency: Database["public"]["Enums"]["currency_type"]
          description: string
          due_date: string | null
          exchange_rate: number
          id: string
          paid_amount: number
          paid_amount_myr: number
          payable_date: string
          project_id: string | null
          record_type: string
          remark: string | null
          source_record_id: string | null
          status: string
          supplier_name: string
          tenant_id: string | null
          total_amount: number
          total_amount_myr: number
          unpaid_amount: number
          unpaid_amount_myr: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          currency?: Database["public"]["Enums"]["currency_type"]
          description: string
          due_date?: string | null
          exchange_rate?: number
          id?: string
          paid_amount?: number
          paid_amount_myr?: number
          payable_date?: string
          project_id?: string | null
          record_type?: string
          remark?: string | null
          source_record_id?: string | null
          status?: string
          supplier_name: string
          tenant_id?: string | null
          total_amount?: number
          total_amount_myr?: number
          unpaid_amount?: number
          unpaid_amount_myr?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          currency?: Database["public"]["Enums"]["currency_type"]
          description?: string
          due_date?: string | null
          exchange_rate?: number
          id?: string
          paid_amount?: number
          paid_amount_myr?: number
          payable_date?: string
          project_id?: string | null
          record_type?: string
          remark?: string | null
          source_record_id?: string | null
          status?: string
          supplier_name?: string
          tenant_id?: string | null
          total_amount?: number
          total_amount_myr?: number
          unpaid_amount?: number
          unpaid_amount_myr?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payables_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payables_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_settings: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          setting_key: string
          setting_type: string
          setting_value: Json
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          setting_key: string
          setting_type: string
          setting_value?: Json
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          setting_key?: string
          setting_type?: string
          setting_value?: Json
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          email: string | null
          id: string
          preferences: Json | null
          updated_at: string
          user_id: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          preferences?: Json | null
          updated_at?: string
          user_id: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          id?: string
          preferences?: Json | null
          updated_at?: string
          user_id?: string
          username?: string
        }
        Relationships: []
      }
      project_additions: {
        Row: {
          addition_date: string
          amount: number
          amount_myr: number
          created_at: string
          created_by: string | null
          currency: Database["public"]["Enums"]["currency_type"]
          description: string
          exchange_rate: number
          id: string
          is_paid: boolean | null
          project_id: string
          remark: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          addition_date?: string
          amount?: number
          amount_myr?: number
          created_at?: string
          created_by?: string | null
          currency?: Database["public"]["Enums"]["currency_type"]
          description: string
          exchange_rate?: number
          id?: string
          is_paid?: boolean | null
          project_id: string
          remark?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          addition_date?: string
          amount?: number
          amount_myr?: number
          created_at?: string
          created_by?: string | null
          currency?: Database["public"]["Enums"]["currency_type"]
          description?: string
          exchange_rate?: number
          id?: string
          is_paid?: boolean | null
          project_id?: string
          remark?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_additions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_additions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      project_alerts: {
        Row: {
          alert_level: Database["public"]["Enums"]["alert_level"]
          alert_message: string
          alert_type: Database["public"]["Enums"]["alert_type"]
          created_at: string
          id: string
          is_resolved: boolean | null
          project_id: string | null
          resolved_at: string | null
          tenant_id: string | null
        }
        Insert: {
          alert_level?: Database["public"]["Enums"]["alert_level"]
          alert_message: string
          alert_type: Database["public"]["Enums"]["alert_type"]
          created_at?: string
          id?: string
          is_resolved?: boolean | null
          project_id?: string | null
          resolved_at?: string | null
          tenant_id?: string | null
        }
        Update: {
          alert_level?: Database["public"]["Enums"]["alert_level"]
          alert_message?: string
          alert_type?: Database["public"]["Enums"]["alert_type"]
          created_at?: string
          id?: string
          is_resolved?: boolean | null
          project_id?: string | null
          resolved_at?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_alerts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_alerts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      project_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          tenant_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          tenant_id?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          tenant_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "project_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      project_expenses: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          amount: number
          amount_myr: number
          category: Database["public"]["Enums"]["project_expense_category"]
          category_v2:
            | Database["public"]["Enums"]["project_expense_category_v2"]
            | null
          created_at: string
          created_by: string | null
          currency: Database["public"]["Enums"]["currency_type"]
          description: string
          exchange_rate: number
          expense_date: string
          id: string
          project_id: string
          receipt_url: string | null
          remark: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"]
          amount?: number
          amount_myr?: number
          category: Database["public"]["Enums"]["project_expense_category"]
          category_v2?:
            | Database["public"]["Enums"]["project_expense_category_v2"]
            | null
          created_at?: string
          created_by?: string | null
          currency?: Database["public"]["Enums"]["currency_type"]
          description: string
          exchange_rate?: number
          expense_date?: string
          id?: string
          project_id: string
          receipt_url?: string | null
          remark?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          amount?: number
          amount_myr?: number
          category?: Database["public"]["Enums"]["project_expense_category"]
          category_v2?:
            | Database["public"]["Enums"]["project_expense_category_v2"]
            | null
          created_at?: string
          created_by?: string | null
          currency?: Database["public"]["Enums"]["currency_type"]
          description?: string
          exchange_rate?: number
          expense_date?: string
          id?: string
          project_id?: string
          receipt_url?: string | null
          remark?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_expenses_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_expenses_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      project_payments: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          amount: number
          amount_myr: number
          created_at: string
          created_by: string | null
          currency: Database["public"]["Enums"]["currency_type"]
          exchange_rate: number
          id: string
          payment_date: string
          payment_stage: Database["public"]["Enums"]["payment_stage"]
          project_id: string
          receipt_url: string | null
          remark: string | null
          tenant_id: string | null
        }
        Insert: {
          account_type: Database["public"]["Enums"]["account_type"]
          amount: number
          amount_myr: number
          created_at?: string
          created_by?: string | null
          currency: Database["public"]["Enums"]["currency_type"]
          exchange_rate?: number
          id?: string
          payment_date: string
          payment_stage: Database["public"]["Enums"]["payment_stage"]
          project_id: string
          receipt_url?: string | null
          remark?: string | null
          tenant_id?: string | null
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          amount?: number
          amount_myr?: number
          created_at?: string
          created_by?: string | null
          currency?: Database["public"]["Enums"]["currency_type"]
          exchange_rate?: number
          id?: string
          payment_date?: string
          payment_stage?: Database["public"]["Enums"]["payment_stage"]
          project_id?: string
          receipt_url?: string | null
          remark?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_payments_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          actual_delivery_date: string | null
          contract_amount: number
          contract_amount_myr: number
          contract_currency: Database["public"]["Enums"]["currency_type"]
          created_at: string
          created_by: string | null
          customer_address: string | null
          customer_age: number | null
          customer_gender: string | null
          customer_name: string
          customer_nationality: string | null
          customer_phone: string | null
          delivery_date: string | null
          exchange_rate_at_sign: number
          final_payment_date: string | null
          id: string
          labor_cost_myr: number | null
          meal_cost_myr: number | null
          mistake_loss_myr: number | null
          net_profit_myr: number | null
          project_code: string
          project_manager: string | null
          project_name: string
          referrer_commission_amount: number | null
          referrer_commission_rate: number | null
          referrer_name: string | null
          referrer_paid: boolean | null
          sign_date: string
          status: Database["public"]["Enums"]["project_status"]
          tenant_id: string | null
          total_addition_myr: number | null
          total_expense_myr: number | null
          total_income_myr: number | null
          total_labor_myr: number | null
          total_material_myr: number | null
          total_other_expense_myr: number | null
          updated_at: string
          warranty_end_date: string | null
        }
        Insert: {
          actual_delivery_date?: string | null
          contract_amount: number
          contract_amount_myr: number
          contract_currency?: Database["public"]["Enums"]["currency_type"]
          created_at?: string
          created_by?: string | null
          customer_address?: string | null
          customer_age?: number | null
          customer_gender?: string | null
          customer_name: string
          customer_nationality?: string | null
          customer_phone?: string | null
          delivery_date?: string | null
          exchange_rate_at_sign?: number
          final_payment_date?: string | null
          id?: string
          labor_cost_myr?: number | null
          meal_cost_myr?: number | null
          mistake_loss_myr?: number | null
          net_profit_myr?: number | null
          project_code: string
          project_manager?: string | null
          project_name: string
          referrer_commission_amount?: number | null
          referrer_commission_rate?: number | null
          referrer_name?: string | null
          referrer_paid?: boolean | null
          sign_date: string
          status?: Database["public"]["Enums"]["project_status"]
          tenant_id?: string | null
          total_addition_myr?: number | null
          total_expense_myr?: number | null
          total_income_myr?: number | null
          total_labor_myr?: number | null
          total_material_myr?: number | null
          total_other_expense_myr?: number | null
          updated_at?: string
          warranty_end_date?: string | null
        }
        Update: {
          actual_delivery_date?: string | null
          contract_amount?: number
          contract_amount_myr?: number
          contract_currency?: Database["public"]["Enums"]["currency_type"]
          created_at?: string
          created_by?: string | null
          customer_address?: string | null
          customer_age?: number | null
          customer_gender?: string | null
          customer_name?: string
          customer_nationality?: string | null
          customer_phone?: string | null
          delivery_date?: string | null
          exchange_rate_at_sign?: number
          final_payment_date?: string | null
          id?: string
          labor_cost_myr?: number | null
          meal_cost_myr?: number | null
          mistake_loss_myr?: number | null
          net_profit_myr?: number | null
          project_code?: string
          project_manager?: string | null
          project_name?: string
          referrer_commission_amount?: number | null
          referrer_commission_rate?: number | null
          referrer_name?: string | null
          referrer_paid?: boolean | null
          sign_date?: string
          status?: Database["public"]["Enums"]["project_status"]
          tenant_id?: string | null
          total_addition_myr?: number | null
          total_expense_myr?: number | null
          total_income_myr?: number | null
          total_labor_myr?: number | null
          total_material_myr?: number | null
          total_other_expense_myr?: number | null
          updated_at?: string
          warranty_end_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      q_breakdown_attachments: {
        Row: {
          created_at: string | null
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          project_breakdown_id: string
          tenant_id: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string
          file_url: string
          id?: string
          project_breakdown_id: string
          tenant_id?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          project_breakdown_id?: string
          tenant_id?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "q_breakdown_attachments_project_breakdown_id_fkey"
            columns: ["project_breakdown_id"]
            isOneToOne: false
            referencedRelation: "q_project_breakdowns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "q_breakdown_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      q_breakdown_items: {
        Row: {
          created_at: string | null
          estimated_cost: number | null
          id: string
          material_id: string | null
          method_id: string | null
          net_quantity: number | null
          project_breakdown_id: string | null
          purchase_quantity: number | null
          quantity: number
          quantity_with_waste: number | null
          quotation_item_id: string | null
          tenant_id: string | null
          unit_price: number | null
          waste_pct: number | null
        }
        Insert: {
          created_at?: string | null
          estimated_cost?: number | null
          id?: string
          material_id?: string | null
          method_id?: string | null
          net_quantity?: number | null
          project_breakdown_id?: string | null
          purchase_quantity?: number | null
          quantity?: number
          quantity_with_waste?: number | null
          quotation_item_id?: string | null
          tenant_id?: string | null
          unit_price?: number | null
          waste_pct?: number | null
        }
        Update: {
          created_at?: string | null
          estimated_cost?: number | null
          id?: string
          material_id?: string | null
          method_id?: string | null
          net_quantity?: number | null
          project_breakdown_id?: string | null
          purchase_quantity?: number | null
          quantity?: number
          quantity_with_waste?: number | null
          quotation_item_id?: string | null
          tenant_id?: string | null
          unit_price?: number | null
          waste_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "q_breakdown_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "q_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "q_breakdown_items_method_id_fkey"
            columns: ["method_id"]
            isOneToOne: false
            referencedRelation: "q_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "q_breakdown_items_project_breakdown_id_fkey"
            columns: ["project_breakdown_id"]
            isOneToOne: false
            referencedRelation: "q_project_breakdowns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "q_breakdown_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      q_breakdown_versions: {
        Row: {
          change_description: string | null
          created_at: string | null
          created_by: string | null
          id: string
          items: Json
          project_breakdown_id: string
          tenant_id: string | null
          total_cost: number | null
          total_labor_cost: number | null
          total_material_cost: number | null
          version_number: number
        }
        Insert: {
          change_description?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          items?: Json
          project_breakdown_id: string
          tenant_id?: string | null
          total_cost?: number | null
          total_labor_cost?: number | null
          total_material_cost?: number | null
          version_number?: number
        }
        Update: {
          change_description?: string | null
          created_at?: string | null
          created_by?: string | null
          id?: string
          items?: Json
          project_breakdown_id?: string
          tenant_id?: string | null
          total_cost?: number | null
          total_labor_cost?: number | null
          total_material_cost?: number | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "q_breakdown_versions_project_breakdown_id_fkey"
            columns: ["project_breakdown_id"]
            isOneToOne: false
            referencedRelation: "q_project_breakdowns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "q_breakdown_versions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      q_category_method_mapping: {
        Row: {
          category_id: string
          created_at: string
          created_by: string | null
          id: string
          method_id: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          created_by?: string | null
          id?: string
          method_id: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          created_by?: string | null
          id?: string
          method_id?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "q_category_method_mapping_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "q_product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "q_category_method_mapping_method_id_fkey"
            columns: ["method_id"]
            isOneToOne: false
            referencedRelation: "q_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "q_category_method_mapping_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      q_company_settings: {
        Row: {
          bank_info: string | null
          company_address: string | null
          company_name: string
          created_at: string
          currency: string
          currency_scopes: string[] | null
          exchange_rates: Json
          id: string
          logo_url: string | null
          payment_terms: Json
          ssm_no: string | null
          system_currency: string
          tax_settings: Json
          tenant_id: string | null
          updated_at: string
          updated_by: string | null
          validity_period: number
        }
        Insert: {
          bank_info?: string | null
          company_address?: string | null
          company_name?: string
          created_at?: string
          currency?: string
          currency_scopes?: string[] | null
          exchange_rates?: Json
          id?: string
          logo_url?: string | null
          payment_terms?: Json
          ssm_no?: string | null
          system_currency?: string
          tax_settings?: Json
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
          validity_period?: number
        }
        Update: {
          bank_info?: string | null
          company_address?: string | null
          company_name?: string
          created_at?: string
          currency?: string
          currency_scopes?: string[] | null
          exchange_rates?: Json
          id?: string
          logo_url?: string | null
          payment_terms?: Json
          ssm_no?: string | null
          system_currency?: string
          tax_settings?: Json
          tenant_id?: string | null
          updated_at?: string
          updated_by?: string | null
          validity_period?: number
        }
        Relationships: [
          {
            foreignKeyName: "q_company_settings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      q_customers: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string
          created_by: string | null
          email: string | null
          id: string
          name_en: string | null
          name_zh: string
          notes: string | null
          phone: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name_en?: string | null
          name_zh: string
          notes?: string | null
          phone?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          id?: string
          name_en?: string | null
          name_zh?: string
          notes?: string | null
          phone?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "q_customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      q_inventory: {
        Row: {
          current_quantity: number | null
          id: string
          location: string | null
          material_id: string
          material_source: string | null
          max_quantity: number | null
          min_quantity: number | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          current_quantity?: number | null
          id?: string
          location?: string | null
          material_id: string
          material_source?: string | null
          max_quantity?: number | null
          min_quantity?: number | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          current_quantity?: number | null
          id?: string
          location?: string | null
          material_id?: string
          material_source?: string | null
          max_quantity?: number | null
          min_quantity?: number | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "q_inventory_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "q_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "q_inventory_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      q_inventory_transactions: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          material_id: string
          notes: string | null
          project_no: string | null
          quantity: number
          reference_id: string | null
          reference_type: string | null
          tenant_id: string | null
          transaction_type: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          material_id: string
          notes?: string | null
          project_no?: string | null
          quantity: number
          reference_id?: string | null
          reference_type?: string | null
          tenant_id?: string | null
          transaction_type: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          material_id?: string
          notes?: string | null
          project_no?: string | null
          quantity?: number
          reference_id?: string | null
          reference_type?: string | null
          tenant_id?: string | null
          transaction_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "q_inventory_transactions_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "q_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "q_inventory_transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      q_labor_rates: {
        Row: {
          created_at: string | null
          created_by: string | null
          hourly_rate: number
          hours_per_unit: number
          id: string
          labor_unit: string | null
          method_id: string | null
          notes: string | null
          tenant_id: string | null
          updated_at: string | null
          worker_type: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          hourly_rate?: number
          hours_per_unit?: number
          id?: string
          labor_unit?: string | null
          method_id?: string | null
          notes?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          worker_type: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          hourly_rate?: number
          hours_per_unit?: number
          id?: string
          labor_unit?: string | null
          method_id?: string | null
          notes?: string | null
          tenant_id?: string | null
          updated_at?: string | null
          worker_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "q_labor_rates_method_id_fkey"
            columns: ["method_id"]
            isOneToOne: false
            referencedRelation: "q_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "q_labor_rates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      q_material_supplier_prices: {
        Row: {
          created_at: string
          currency: string | null
          id: string
          is_preferred: boolean | null
          last_quoted_at: string | null
          lead_days: number | null
          material_id: string
          min_order_qty: number | null
          notes: string | null
          supplier_id: string
          tenant_id: string | null
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string | null
          id?: string
          is_preferred?: boolean | null
          last_quoted_at?: string | null
          lead_days?: number | null
          material_id: string
          min_order_qty?: number | null
          notes?: string | null
          supplier_id: string
          tenant_id?: string | null
          unit_price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string | null
          id?: string
          is_preferred?: boolean | null
          last_quoted_at?: string | null
          lead_days?: number | null
          material_id?: string
          min_order_qty?: number | null
          notes?: string | null
          supplier_id?: string
          tenant_id?: string | null
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "q_material_supplier_prices_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "q_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "q_material_supplier_prices_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "q_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "q_material_supplier_prices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      q_materials: {
        Row: {
          brand: string | null
          category: string | null
          code: string | null
          created_at: string
          created_by: string | null
          currency: string | null
          default_price: number | null
          default_supplier_id: string | null
          id: string
          is_active: boolean | null
          material_type: string | null
          min_stock: number | null
          name: string
          notes: string | null
          price_cny: number | null
          specification: string | null
          tenant_id: string | null
          unit: string | null
          updated_at: string
          volume_cbm: number | null
          waste_pct: number | null
        }
        Insert: {
          brand?: string | null
          category?: string | null
          code?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          default_price?: number | null
          default_supplier_id?: string | null
          id?: string
          is_active?: boolean | null
          material_type?: string | null
          min_stock?: number | null
          name: string
          notes?: string | null
          price_cny?: number | null
          specification?: string | null
          tenant_id?: string | null
          unit?: string | null
          updated_at?: string
          volume_cbm?: number | null
          waste_pct?: number | null
        }
        Update: {
          brand?: string | null
          category?: string | null
          code?: string | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          default_price?: number | null
          default_supplier_id?: string | null
          id?: string
          is_active?: boolean | null
          material_type?: string | null
          min_stock?: number | null
          name?: string
          notes?: string | null
          price_cny?: number | null
          specification?: string | null
          tenant_id?: string | null
          unit?: string | null
          updated_at?: string
          volume_cbm?: number | null
          waste_pct?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "q_materials_default_supplier_id_fkey"
            columns: ["default_supplier_id"]
            isOneToOne: false
            referencedRelation: "q_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "q_materials_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      q_measurement_units: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          id: string
          is_system: boolean
          name_en: string
          name_zh: string
          sort_order: number
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_system?: boolean
          name_en: string
          name_zh: string
          sort_order?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_system?: boolean
          name_en?: string
          name_zh?: string
          sort_order?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "q_measurement_units_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      q_method_materials: {
        Row: {
          adjustable_description: string | null
          created_at: string | null
          id: string
          is_adjustable: boolean | null
          material_id: string | null
          method_id: string | null
          notes: string | null
          pricing_unit: string | null
          quantity_per_unit: number
          rounding_rule: string | null
          tenant_id: string | null
        }
        Insert: {
          adjustable_description?: string | null
          created_at?: string | null
          id?: string
          is_adjustable?: boolean | null
          material_id?: string | null
          method_id?: string | null
          notes?: string | null
          pricing_unit?: string | null
          quantity_per_unit?: number
          rounding_rule?: string | null
          tenant_id?: string | null
        }
        Update: {
          adjustable_description?: string | null
          created_at?: string | null
          id?: string
          is_adjustable?: boolean | null
          material_id?: string | null
          method_id?: string | null
          notes?: string | null
          pricing_unit?: string | null
          quantity_per_unit?: number
          rounding_rule?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "q_method_materials_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "q_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "q_method_materials_method_id_fkey"
            columns: ["method_id"]
            isOneToOne: false
            referencedRelation: "q_methods"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "q_method_materials_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      q_methods: {
        Row: {
          category_id: string | null
          created_at: string | null
          created_by: string | null
          default_waste_pct: number | null
          description: string | null
          id: string
          is_active: boolean | null
          method_code: string
          name_en: string | null
          name_zh: string
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          default_waste_pct?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          method_code: string
          name_en?: string | null
          name_zh: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          created_by?: string | null
          default_waste_pct?: number | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          method_code?: string
          name_en?: string | null
          name_zh?: string
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "q_methods_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "q_product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "q_methods_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      q_po_attachments: {
        Row: {
          created_at: string | null
          file_name: string
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          purchase_order_id: string
          tenant_id: string | null
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string | null
          file_name: string
          file_size?: number | null
          file_type?: string
          file_url: string
          id?: string
          purchase_order_id: string
          tenant_id?: string | null
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string | null
          file_name?: string
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          purchase_order_id?: string
          tenant_id?: string | null
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "q_po_attachments_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "q_purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "q_po_attachments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      q_po_audit_logs: {
        Row: {
          action: string
          created_at: string | null
          details: string | null
          id: string
          performed_by: string | null
          purchase_order_id: string
          tenant_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          details?: string | null
          id?: string
          performed_by?: string | null
          purchase_order_id: string
          tenant_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          details?: string | null
          id?: string
          performed_by?: string | null
          purchase_order_id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "q_po_audit_logs_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "q_purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "q_po_audit_logs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      q_procurement_materials: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          default_supplier_id: string | null
          default_waste_pct: number | null
          id: string
          is_active: boolean | null
          material_code: string
          name_en: string | null
          name_zh: string
          notes: string | null
          price_cny: number | null
          reference_price: number | null
          source_material_id: string | null
          spec: string | null
          tenant_id: string | null
          unit: string
          updated_at: string | null
          volume_cbm: number | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          default_supplier_id?: string | null
          default_waste_pct?: number | null
          id?: string
          is_active?: boolean | null
          material_code: string
          name_en?: string | null
          name_zh: string
          notes?: string | null
          price_cny?: number | null
          reference_price?: number | null
          source_material_id?: string | null
          spec?: string | null
          tenant_id?: string | null
          unit?: string
          updated_at?: string | null
          volume_cbm?: number | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          default_supplier_id?: string | null
          default_waste_pct?: number | null
          id?: string
          is_active?: boolean | null
          material_code?: string
          name_en?: string | null
          name_zh?: string
          notes?: string | null
          price_cny?: number | null
          reference_price?: number | null
          source_material_id?: string | null
          spec?: string | null
          tenant_id?: string | null
          unit?: string
          updated_at?: string | null
          volume_cbm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "q_procurement_materials_default_supplier_id_fkey"
            columns: ["default_supplier_id"]
            isOneToOne: false
            referencedRelation: "q_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "q_procurement_materials_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      q_product_categories: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          default_description: string | null
          id: string
          is_system: boolean
          name_en: string
          name_zh: string
          parent_id: string | null
          sort_order: number
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          default_description?: string | null
          id?: string
          is_system?: boolean
          name_en: string
          name_zh: string
          parent_id?: string | null
          sort_order?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          default_description?: string | null
          id?: string
          is_system?: boolean
          name_en?: string
          name_zh?: string
          parent_id?: string | null
          sort_order?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "q_product_categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "q_product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "q_product_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      q_product_favorites: {
        Row: {
          created_at: string
          id: string
          product_id: string
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          product_id: string
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          product_id?: string
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "q_product_favorites_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "q_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "q_product_favorites_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      q_product_templates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          items: Json
          name: string
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          items?: Json
          name: string
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          items?: Json
          name?: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "q_product_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      q_products: {
        Row: {
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          description_en: string | null
          id: string
          is_active: boolean
          is_company_product: boolean
          name_en: string | null
          name_zh: string
          price_advanced: number | null
          price_medium: number | null
          price_normal: number | null
          tenant_id: string | null
          unit: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean
          is_company_product?: boolean
          name_en?: string | null
          name_zh: string
          price_advanced?: number | null
          price_medium?: number | null
          price_normal?: number | null
          tenant_id?: string | null
          unit?: string
          unit_price?: number
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          description_en?: string | null
          id?: string
          is_active?: boolean
          is_company_product?: boolean
          name_en?: string | null
          name_zh?: string
          price_advanced?: number | null
          price_medium?: number | null
          price_normal?: number | null
          tenant_id?: string | null
          unit?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "q_products_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      q_project_breakdowns: {
        Row: {
          created_at: string | null
          created_by: string | null
          currency: string
          estimated_profit: number | null
          id: string
          management_fee_pct: number | null
          name: string
          quotation_id: string | null
          quoted_amount: number | null
          status: string | null
          submitted_to_procurement_at: string | null
          submitted_to_procurement_by: string | null
          tax_pct: number | null
          tenant_id: string | null
          total_cost: number | null
          total_labor_cost: number | null
          total_material_cost: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          currency?: string
          estimated_profit?: number | null
          id?: string
          management_fee_pct?: number | null
          name: string
          quotation_id?: string | null
          quoted_amount?: number | null
          status?: string | null
          submitted_to_procurement_at?: string | null
          submitted_to_procurement_by?: string | null
          tax_pct?: number | null
          tenant_id?: string | null
          total_cost?: number | null
          total_labor_cost?: number | null
          total_material_cost?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          currency?: string
          estimated_profit?: number | null
          id?: string
          management_fee_pct?: number | null
          name?: string
          quotation_id?: string | null
          quoted_amount?: number | null
          status?: string | null
          submitted_to_procurement_at?: string | null
          submitted_to_procurement_by?: string | null
          tax_pct?: number | null
          tenant_id?: string | null
          total_cost?: number | null
          total_labor_cost?: number | null
          total_material_cost?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "q_project_breakdowns_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "q_quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "q_project_breakdowns_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      q_purchase_order_items: {
        Row: {
          created_at: string | null
          id: string
          material_id: string | null
          notes: string | null
          procurement_country: string | null
          purchase_order_id: string | null
          quantity: number
          received_quantity: number | null
          tenant_id: string | null
          total_price: number | null
          unit_price: number
          unit_price_cny: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          material_id?: string | null
          notes?: string | null
          procurement_country?: string | null
          purchase_order_id?: string | null
          quantity?: number
          received_quantity?: number | null
          tenant_id?: string | null
          total_price?: number | null
          unit_price?: number
          unit_price_cny?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          material_id?: string | null
          notes?: string | null
          procurement_country?: string | null
          purchase_order_id?: string | null
          quantity?: number
          received_quantity?: number | null
          tenant_id?: string | null
          total_price?: number | null
          unit_price?: number
          unit_price_cny?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "q_purchase_order_items_material_id_fkey"
            columns: ["material_id"]
            isOneToOne: false
            referencedRelation: "q_materials"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "q_purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "q_purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "q_purchase_order_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      q_purchase_orders: {
        Row: {
          created_at: string | null
          created_by: string | null
          currency: string
          delivery_date: string | null
          id: string
          notes: string | null
          order_no: string
          paid_amount: number | null
          payment_status: string | null
          project_breakdown_id: string | null
          received_status: string | null
          status: string | null
          submitted_to_finance_at: string | null
          submitted_to_finance_by: string | null
          supplier_id: string | null
          tenant_id: string | null
          total_amount: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          currency?: string
          delivery_date?: string | null
          id?: string
          notes?: string | null
          order_no: string
          paid_amount?: number | null
          payment_status?: string | null
          project_breakdown_id?: string | null
          received_status?: string | null
          status?: string | null
          submitted_to_finance_at?: string | null
          submitted_to_finance_by?: string | null
          supplier_id?: string | null
          tenant_id?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          currency?: string
          delivery_date?: string | null
          id?: string
          notes?: string | null
          order_no?: string
          paid_amount?: number | null
          payment_status?: string | null
          project_breakdown_id?: string | null
          received_status?: string | null
          status?: string | null
          submitted_to_finance_at?: string | null
          submitted_to_finance_by?: string | null
          supplier_id?: string | null
          tenant_id?: string | null
          total_amount?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "q_purchase_orders_project_breakdown_id_fkey"
            columns: ["project_breakdown_id"]
            isOneToOne: false
            referencedRelation: "q_project_breakdowns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "q_purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "q_suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "q_purchase_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      q_purchase_payments: {
        Row: {
          amount: number
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          payment_date: string | null
          payment_method: string | null
          purchase_order_id: string
          reference_no: string | null
          tenant_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          purchase_order_id: string
          reference_no?: string | null
          tenant_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          payment_date?: string | null
          payment_method?: string | null
          purchase_order_id?: string
          reference_no?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "q_purchase_payments_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "q_purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "q_purchase_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      q_purchase_receiving_items: {
        Row: {
          created_at: string | null
          exception_notes: string | null
          id: string
          material_id: string | null
          notes: string | null
          photos: string[] | null
          purchase_order_item_id: string | null
          received_quantity: number
          receiving_id: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          exception_notes?: string | null
          id?: string
          material_id?: string | null
          notes?: string | null
          photos?: string[] | null
          purchase_order_item_id?: string | null
          received_quantity?: number
          receiving_id: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          exception_notes?: string | null
          id?: string
          material_id?: string | null
          notes?: string | null
          photos?: string[] | null
          purchase_order_item_id?: string | null
          received_quantity?: number
          receiving_id?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "q_purchase_receiving_items_purchase_order_item_id_fkey"
            columns: ["purchase_order_item_id"]
            isOneToOne: false
            referencedRelation: "q_purchase_order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "q_purchase_receiving_items_receiving_id_fkey"
            columns: ["receiving_id"]
            isOneToOne: false
            referencedRelation: "q_purchase_receivings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "q_purchase_receiving_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      q_purchase_receivings: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          notes: string | null
          purchase_order_id: string
          receiving_date: string | null
          receiving_no: string
          tenant_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          purchase_order_id: string
          receiving_date?: string | null
          receiving_no: string
          tenant_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          notes?: string | null
          purchase_order_id?: string
          receiving_date?: string | null
          receiving_no?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "q_purchase_receivings_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "q_purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "q_purchase_receivings_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      q_quotation_drafts: {
        Row: {
          created_at: string
          draft_data: Json
          id: string
          tenant_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          draft_data: Json
          id?: string
          tenant_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          draft_data?: Json
          id?: string
          tenant_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "q_quotation_drafts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      q_quotation_notes_templates: {
        Row: {
          content: string
          content_en: string | null
          created_at: string
          id: string
          is_default: boolean
          sort_order: number
          tenant_id: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          content_en?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          sort_order?: number
          tenant_id?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          content_en?: string | null
          created_at?: string
          id?: string
          is_default?: boolean
          sort_order?: number
          tenant_id?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "q_quotation_notes_templates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      q_quotation_versions: {
        Row: {
          change_description: string | null
          cost_analysis: Json | null
          created_at: string
          discount_amount: number
          grand_total: number
          id: string
          items: Json
          quotation_id: string
          quotation_notes: string | null
          settings: Json | null
          sst_amount: number
          subtotal: number
          tenant_id: string | null
          version_number: number
        }
        Insert: {
          change_description?: string | null
          cost_analysis?: Json | null
          created_at?: string
          discount_amount?: number
          grand_total?: number
          id?: string
          items?: Json
          quotation_id: string
          quotation_notes?: string | null
          settings?: Json | null
          sst_amount?: number
          subtotal?: number
          tenant_id?: string | null
          version_number?: number
        }
        Update: {
          change_description?: string | null
          cost_analysis?: Json | null
          created_at?: string
          discount_amount?: number
          grand_total?: number
          id?: string
          items?: Json
          quotation_id?: string
          quotation_notes?: string | null
          settings?: Json | null
          sst_amount?: number
          subtotal?: number
          tenant_id?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "q_quotation_versions_quotation_id_fkey"
            columns: ["quotation_id"]
            isOneToOne: false
            referencedRelation: "q_quotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "q_quotation_versions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      q_quotations: {
        Row: {
          cost_analysis: Json | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          discount_amount: number
          grand_total: number
          id: string
          items: Json
          notes: string | null
          project_no: string
          quotation_date: string
          quotation_no: string | null
          quotation_notes: string | null
          quotation_type: string
          settings: Json | null
          sst_amount: number
          status: string
          subtotal: number
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          cost_analysis?: Json | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          discount_amount?: number
          grand_total?: number
          id?: string
          items?: Json
          notes?: string | null
          project_no: string
          quotation_date?: string
          quotation_no?: string | null
          quotation_notes?: string | null
          quotation_type?: string
          settings?: Json | null
          sst_amount?: number
          status?: string
          subtotal?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          cost_analysis?: Json | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          discount_amount?: number
          grand_total?: number
          id?: string
          items?: Json
          notes?: string | null
          project_no?: string
          quotation_date?: string
          quotation_no?: string | null
          quotation_notes?: string | null
          quotation_type?: string
          settings?: Json | null
          sst_amount?: number
          status?: string
          subtotal?: number
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "q_quotations_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "q_customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "q_quotations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      q_suppliers: {
        Row: {
          address: string | null
          company_name: string | null
          contact_id: string | null
          contact_person: string | null
          created_at: string
          created_by: string | null
          default_currency: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          notes: string | null
          payment_terms: string | null
          phone: string | null
          rating: number | null
          supplier_code: string | null
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          company_name?: string | null
          contact_id?: string | null
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          default_currency?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          rating?: number | null
          supplier_code?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          company_name?: string | null
          contact_id?: string | null
          contact_person?: string | null
          created_at?: string
          created_by?: string | null
          default_currency?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          rating?: number | null
          supplier_code?: string | null
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "q_suppliers_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "q_suppliers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      q_user_product_categories: {
        Row: {
          category_id: string
          created_at: string
          id: string
          is_visible: boolean
          sort_order: number
          tenant_id: string | null
          user_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          is_visible?: boolean
          sort_order?: number
          tenant_id?: string | null
          user_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          is_visible?: boolean
          sort_order?: number
          tenant_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "q_user_product_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "q_product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "q_user_product_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      q_worker_types: {
        Row: {
          created_at: string | null
          default_hourly_rate: number
          id: string
          is_active: boolean | null
          name_en: string | null
          name_zh: string
          sort_order: number | null
          tenant_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          default_hourly_rate?: number
          id?: string
          is_active?: boolean | null
          name_en?: string | null
          name_zh: string
          sort_order?: number | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          default_hourly_rate?: number
          id?: string
          is_active?: boolean | null
          name_en?: string | null
          name_zh?: string
          sort_order?: number | null
          tenant_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "q_worker_types_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      reconciliation_rules: {
        Row: {
          amount_tolerance: number | null
          auto_category: string | null
          created_at: string
          created_by: string | null
          date_tolerance_days: number | null
          description_pattern: string | null
          id: string
          is_active: boolean | null
          match_amount: boolean | null
          match_date: boolean | null
          match_description: boolean | null
          rule_name: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          amount_tolerance?: number | null
          auto_category?: string | null
          created_at?: string
          created_by?: string | null
          date_tolerance_days?: number | null
          description_pattern?: string | null
          id?: string
          is_active?: boolean | null
          match_amount?: boolean | null
          match_date?: boolean | null
          match_description?: boolean | null
          rule_name: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          amount_tolerance?: number | null
          auto_category?: string | null
          created_at?: string
          created_by?: string | null
          date_tolerance_days?: number | null
          description_pattern?: string | null
          id?: string
          is_active?: boolean | null
          match_amount?: boolean | null
          match_date?: boolean | null
          match_description?: boolean | null
          rule_name?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reconciliation_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_reports: {
        Row: {
          action_taken: string | null
          created_at: string
          description: string | null
          id: string
          lat: number | null
          lng: number | null
          photos: Json | null
          report_type: string
          reporter_id: string | null
          resolved_at: string | null
          resolved_by: string | null
          severity: string | null
          site_id: string
          status: string | null
          tenant_id: string | null
          video_url: string | null
        }
        Insert: {
          action_taken?: string | null
          created_at?: string
          description?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          photos?: Json | null
          report_type?: string
          reporter_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          site_id: string
          status?: string | null
          tenant_id?: string | null
          video_url?: string | null
        }
        Update: {
          action_taken?: string | null
          created_at?: string
          description?: string | null
          id?: string
          lat?: number | null
          lng?: number | null
          photos?: Json | null
          report_type?: string
          reporter_id?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          severity?: string | null
          site_id?: string
          status?: string | null
          tenant_id?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "safety_reports_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_advances: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          advance_date: string
          amount: number
          amount_myr: number
          created_at: string
          created_by: string | null
          currency: Database["public"]["Enums"]["currency_type"]
          deducted_in_payment_id: string | null
          employee_id: string
          exchange_rate: number
          id: string
          is_deducted: boolean
          remark: string | null
          tenant_id: string | null
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"]
          advance_date?: string
          amount?: number
          amount_myr?: number
          created_at?: string
          created_by?: string | null
          currency?: Database["public"]["Enums"]["currency_type"]
          deducted_in_payment_id?: string | null
          employee_id: string
          exchange_rate?: number
          id?: string
          is_deducted?: boolean
          remark?: string | null
          tenant_id?: string | null
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          advance_date?: string
          amount?: number
          amount_myr?: number
          created_at?: string
          created_by?: string | null
          currency?: Database["public"]["Enums"]["currency_type"]
          deducted_in_payment_id?: string | null
          employee_id?: string
          exchange_rate?: number
          id?: string
          is_deducted?: boolean
          remark?: string | null
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "salary_advances_deducted_in_payment_id_fkey"
            columns: ["deducted_in_payment_id"]
            isOneToOne: false
            referencedRelation: "salary_payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_advances_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_advances_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      salary_payments: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          advance_deduction: number
          amount_myr: number
          base_salary: number
          bonus: number
          commission: number | null
          created_at: string
          created_by: string | null
          currency: Database["public"]["Enums"]["currency_type"]
          employee_id: string
          exchange_rate: number
          full_attendance_bonus: number | null
          gross_salary: number
          id: string
          insurance_deduction: number
          leave_days: number | null
          net_salary: number
          other_deduction: number
          overtime_pay: number
          payment_date: string
          payment_month: string
          penalty: number | null
          remark: string | null
          tenant_id: string | null
          work_days: number | null
        }
        Insert: {
          account_type?: Database["public"]["Enums"]["account_type"]
          advance_deduction?: number
          amount_myr?: number
          base_salary?: number
          bonus?: number
          commission?: number | null
          created_at?: string
          created_by?: string | null
          currency?: Database["public"]["Enums"]["currency_type"]
          employee_id: string
          exchange_rate?: number
          full_attendance_bonus?: number | null
          gross_salary?: number
          id?: string
          insurance_deduction?: number
          leave_days?: number | null
          net_salary?: number
          other_deduction?: number
          overtime_pay?: number
          payment_date?: string
          payment_month: string
          penalty?: number | null
          remark?: string | null
          tenant_id?: string | null
          work_days?: number | null
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          advance_deduction?: number
          amount_myr?: number
          base_salary?: number
          bonus?: number
          commission?: number | null
          created_at?: string
          created_by?: string | null
          currency?: Database["public"]["Enums"]["currency_type"]
          employee_id?: string
          exchange_rate?: number
          full_attendance_bonus?: number | null
          gross_salary?: number
          id?: string
          insurance_deduction?: number
          leave_days?: number | null
          net_salary?: number
          other_deduction?: number
          overtime_pay?: number
          payment_date?: string
          payment_month?: string
          penalty?: number | null
          remark?: string | null
          tenant_id?: string | null
          work_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "salary_payments_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "salary_payments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_assignments: {
        Row: {
          assignment_date: string
          created_at: string
          created_by: string | null
          id: string
          shift_id: string
          status: string | null
          tenant_id: string | null
          worker_id: string
        }
        Insert: {
          assignment_date: string
          created_at?: string
          created_by?: string | null
          id?: string
          shift_id: string
          status?: string | null
          tenant_id?: string | null
          worker_id: string
        }
        Update: {
          assignment_date?: string
          created_at?: string
          created_by?: string | null
          id?: string
          shift_id?: string
          status?: string | null
          tenant_id?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_assignments_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_assignments_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          break_minutes: number | null
          created_at: string
          created_by: string | null
          end_time: string
          id: string
          is_active: boolean | null
          name: string
          shift_type: string | null
          site_id: string
          start_time: string
          tenant_id: string | null
        }
        Insert: {
          break_minutes?: number | null
          created_at?: string
          created_by?: string | null
          end_time: string
          id?: string
          is_active?: boolean | null
          name: string
          shift_type?: string | null
          site_id: string
          start_time: string
          tenant_id?: string | null
        }
        Update: {
          break_minutes?: number | null
          created_at?: string
          created_by?: string | null
          end_time?: string
          id?: string
          is_active?: boolean | null
          name?: string
          shift_type?: string | null
          site_id?: string
          start_time?: string
          tenant_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shifts_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shifts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      site_workers: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          is_active: boolean | null
          role: string | null
          site_id: string
          start_date: string | null
          tenant_id: string | null
          worker_id: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          role?: string | null
          site_id: string
          start_date?: string | null
          tenant_id?: string | null
          worker_id: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          is_active?: boolean | null
          role?: string | null
          site_id?: string
          start_date?: string | null
          tenant_id?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_workers_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_workers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "site_workers_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          address: string | null
          created_at: string
          created_by: string | null
          end_date: string | null
          geofence_radius_m: number | null
          id: string
          lat: number | null
          lng: number | null
          manager_id: string | null
          name: string
          notes: string | null
          start_date: string | null
          status: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          geofence_radius_m?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          manager_id?: string | null
          name: string
          notes?: string | null
          start_date?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          created_by?: string | null
          end_date?: string | null
          geofence_radius_m?: number | null
          id?: string
          lat?: number | null
          lng?: number | null
          manager_id?: string | null
          name?: string
          notes?: string | null
          start_date?: string | null
          status?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sites_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      system_announcements: {
        Row: {
          announcement_type: string
          content: string
          created_at: string
          created_by: string | null
          ends_at: string | null
          id: string
          is_active: boolean
          priority: number
          starts_at: string
          title: string
          updated_at: string
        }
        Insert: {
          announcement_type?: string
          content: string
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          priority?: number
          starts_at?: string
          title: string
          updated_at?: string
        }
        Update: {
          announcement_type?: string
          content?: string
          created_at?: string
          created_by?: string | null
          ends_at?: string | null
          id?: string
          is_active?: boolean
          priority?: number
          starts_at?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      tax_rates: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          is_inclusive: boolean | null
          name: string
          rate: number
          tax_type: string
          tenant_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_inclusive?: boolean | null
          name: string
          rate?: number
          tax_type?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_inclusive?: boolean | null
          name?: string
          rate?: number
          tax_type?: string
          tenant_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tax_rates_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_members: {
        Row: {
          id: string
          is_active: boolean
          joined_at: string
          role: Database["public"]["Enums"]["tenant_member_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          id?: string
          is_active?: boolean
          joined_at?: string
          role?: Database["public"]["Enums"]["tenant_member_role"]
          tenant_id: string
          user_id: string
        }
        Update: {
          id?: string
          is_active?: boolean
          joined_at?: string
          role?: Database["public"]["Enums"]["tenant_member_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_members_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_subscriptions: {
        Row: {
          billing_cycle: string
          cancel_at: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan: Database["public"]["Enums"]["tenant_plan"]
          price_amount: number
          price_currency: string
          status: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          billing_cycle?: string
          cancel_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan: Database["public"]["Enums"]["tenant_plan"]
          price_amount?: number
          price_currency?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          billing_cycle?: string
          cancel_at?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan?: Database["public"]["Enums"]["tenant_plan"]
          price_amount?: number
          price_currency?: string
          status?: Database["public"]["Enums"]["subscription_status"]
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_subscriptions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          expires_at: string | null
          id: string
          logo_url: string | null
          max_members: number
          name: string
          owner_user_id: string | null
          plan: Database["public"]["Enums"]["tenant_plan"]
          settings: Json | null
          slug: string
          status: Database["public"]["Enums"]["tenant_status"]
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          logo_url?: string | null
          max_members?: number
          name: string
          owner_user_id?: string | null
          plan?: Database["public"]["Enums"]["tenant_plan"]
          settings?: Json | null
          slug: string
          status?: Database["public"]["Enums"]["tenant_status"]
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          expires_at?: string | null
          id?: string
          logo_url?: string | null
          max_members?: number
          name?: string
          owner_user_id?: string | null
          plan?: Database["public"]["Enums"]["tenant_plan"]
          settings?: Json | null
          slug?: string
          status?: Database["public"]["Enums"]["tenant_status"]
          updated_at?: string
        }
        Relationships: []
      }
      transaction_categories: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          tenant_id: string | null
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          tenant_id?: string | null
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          tenant_id?: string | null
          type?: Database["public"]["Enums"]["transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "transaction_categories_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"]
          amount: number
          amount_myr: number
          category_id: string | null
          category_name: string
          created_at: string
          created_by: string | null
          currency: Database["public"]["Enums"]["currency_type"]
          exchange_rate: number
          id: string
          ledger_type: Database["public"]["Enums"]["ledger_type"]
          project_id: string | null
          receipt_url_1: string | null
          receipt_url_2: string | null
          remark_1: string | null
          remark_2: string | null
          sequence_no: number
          summary: string
          tenant_id: string | null
          transaction_date: string
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Insert: {
          account_type: Database["public"]["Enums"]["account_type"]
          amount: number
          amount_myr: number
          category_id?: string | null
          category_name: string
          created_at?: string
          created_by?: string | null
          currency: Database["public"]["Enums"]["currency_type"]
          exchange_rate?: number
          id?: string
          ledger_type?: Database["public"]["Enums"]["ledger_type"]
          project_id?: string | null
          receipt_url_1?: string | null
          receipt_url_2?: string | null
          remark_1?: string | null
          remark_2?: string | null
          sequence_no?: number
          summary: string
          tenant_id?: string | null
          transaction_date: string
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Update: {
          account_type?: Database["public"]["Enums"]["account_type"]
          amount?: number
          amount_myr?: number
          category_id?: string | null
          category_name?: string
          created_at?: string
          created_by?: string | null
          currency?: Database["public"]["Enums"]["currency_type"]
          exchange_rate?: number
          id?: string
          ledger_type?: Database["public"]["Enums"]["ledger_type"]
          project_id?: string | null
          receipt_url_1?: string | null
          receipt_url_2?: string | null
          remark_1?: string | null
          remark_2?: string | null
          sequence_no?: number
          summary?: string
          tenant_id?: string | null
          transaction_date?: string
          type?: Database["public"]["Enums"]["transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_permissions: {
        Row: {
          created_at: string | null
          granted: boolean
          id: string
          permission_key: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          granted?: boolean
          id?: string
          permission_key: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          granted?: boolean
          id?: string
          permission_key?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      work_orders: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          photos: Json | null
          priority: string | null
          site_id: string
          status: string | null
          tenant_id: string | null
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          photos?: Json | null
          priority?: string | null
          site_id: string
          status?: string | null
          tenant_id?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          photos?: Json | null
          priority?: string | null
          site_id?: string
          status?: string | null
          tenant_id?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "work_orders_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "work_orders_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      workforce_payroll: {
        Row: {
          base_pay: number | null
          bonuses: number | null
          created_at: string
          created_by: string | null
          currency: string | null
          deductions: number | null
          export_status: string | null
          id: string
          net_pay: number | null
          notes: string | null
          overtime_hours: number | null
          overtime_pay: number | null
          period_end: string
          period_start: string
          site_id: string | null
          tenant_id: string | null
          total_days: number | null
          total_hours: number | null
          worker_id: string
        }
        Insert: {
          base_pay?: number | null
          bonuses?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          deductions?: number | null
          export_status?: string | null
          id?: string
          net_pay?: number | null
          notes?: string | null
          overtime_hours?: number | null
          overtime_pay?: number | null
          period_end: string
          period_start: string
          site_id?: string | null
          tenant_id?: string | null
          total_days?: number | null
          total_hours?: number | null
          worker_id: string
        }
        Update: {
          base_pay?: number | null
          bonuses?: number | null
          created_at?: string
          created_by?: string | null
          currency?: string | null
          deductions?: number | null
          export_status?: string | null
          id?: string
          net_pay?: number | null
          notes?: string | null
          overtime_hours?: number | null
          overtime_pay?: number | null
          period_end?: string
          period_start?: string
          site_id?: string | null
          tenant_id?: string | null
          total_days?: number | null
          total_hours?: number | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workforce_payroll_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workforce_payroll_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workforce_payroll_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "employees"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      transactions_with_details: {
        Row: {
          account_type: Database["public"]["Enums"]["account_type"] | null
          amount: number | null
          amount_myr: number | null
          category_id: string | null
          category_name: string | null
          created_at: string | null
          created_by: string | null
          creator_name: string | null
          currency: Database["public"]["Enums"]["currency_type"] | null
          exchange_rate: number | null
          id: string | null
          ledger_type: Database["public"]["Enums"]["ledger_type"] | null
          project_code: string | null
          project_id: string | null
          project_name: string | null
          receipt_url_1: string | null
          receipt_url_2: string | null
          remark_1: string | null
          remark_2: string | null
          sequence_no: number | null
          summary: string | null
          tenant_id: string | null
          transaction_date: string | null
          type: Database["public"]["Enums"]["transaction_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      archive_old_data: { Args: { days_threshold?: number }; Returns: Json }
      can_view_alerts: { Args: { _user_id: string }; Returns: boolean }
      check_project_profit_warnings: { Args: never; Returns: undefined }
      cleanup_login_attempts: { Args: never; Returns: undefined }
      delete_transaction_with_balance: {
        Args: { _transaction_id: string }
        Returns: undefined
      }
      detect_suspicious_operations: { Args: never; Returns: undefined }
      generate_project_alerts: { Args: never; Returns: undefined }
      get_transactions_count: { Args: never; Returns: number }
      get_user_tenant_id: { Args: never; Returns: string }
      get_user_tenant_ids: { Args: { _user_id: string }; Returns: string[] }
      has_management_role: { Args: { _user_id: string }; Returns: boolean }
      has_nav_permission: {
        Args: { _permission_key: string; _user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_accountant: { Args: { _user_id: string }; Returns: boolean }
      is_login_locked: {
        Args: { check_email?: string; check_ip: string }
        Returns: boolean
      }
      is_period_locked: {
        Args: { _date: string; _tenant_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      is_tenant_admin: {
        Args: { _tenant_id: string; _user_id: string }
        Returns: boolean
      }
      is_tenant_admin_or_accountant: {
        Args: { _user_id: string }
        Returns: boolean
      }
      is_tenant_expired: { Args: { _tenant_id: string }; Returns: boolean }
      recalculate_project_summary: {
        Args: { _project_id: string }
        Returns: undefined
      }
      use_invitation_code: { Args: { p_code: string }; Returns: string }
      validate_invitation_code: { Args: { p_code: string }; Returns: string }
    }
    Enums: {
      account_type: "cash" | "bank"
      alert_level: "safe" | "warning" | "danger"
      alert_type:
        | "profit_warning"
        | "payment_warning"
        | "delivery_warning"
        | "delivery_upcoming"
        | "warranty_expiring"
        | "final_payment_due"
        | "payment_overdue"
        | "low_balance"
      app_role:
        | "admin"
        | "accountant"
        | "viewer"
        | "project_manager"
        | "shareholder"
      currency_type: "MYR" | "CNY" | "USD"
      employee_status: "active" | "inactive"
      ledger_type: "company_daily" | "exchange" | "project"
      payment_stage:
        | "deposit_1"
        | "deposit_2"
        | "progress_3"
        | "progress_4"
        | "final_5"
      project_expense_category: "material" | "labor" | "other"
      project_expense_category_v2:
        | "material"
        | "project_management"
        | "outsourcing"
        | "transportation"
        | "labor"
        | "other"
      project_status: "in_progress" | "completed" | "paused"
      subscription_status: "active" | "past_due" | "cancelled" | "trialing"
      tenant_member_role: "owner" | "admin" | "member"
      tenant_plan: "free" | "basic" | "professional" | "enterprise"
      tenant_status: "active" | "suspended" | "expired" | "cancelled"
      transaction_type: "income" | "expense"
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
    Enums: {
      account_type: ["cash", "bank"],
      alert_level: ["safe", "warning", "danger"],
      alert_type: [
        "profit_warning",
        "payment_warning",
        "delivery_warning",
        "delivery_upcoming",
        "warranty_expiring",
        "final_payment_due",
        "payment_overdue",
        "low_balance",
      ],
      app_role: [
        "admin",
        "accountant",
        "viewer",
        "project_manager",
        "shareholder",
      ],
      currency_type: ["MYR", "CNY", "USD"],
      employee_status: ["active", "inactive"],
      ledger_type: ["company_daily", "exchange", "project"],
      payment_stage: [
        "deposit_1",
        "deposit_2",
        "progress_3",
        "progress_4",
        "final_5",
      ],
      project_expense_category: ["material", "labor", "other"],
      project_expense_category_v2: [
        "material",
        "project_management",
        "outsourcing",
        "transportation",
        "labor",
        "other",
      ],
      project_status: ["in_progress", "completed", "paused"],
      subscription_status: ["active", "past_due", "cancelled", "trialing"],
      tenant_member_role: ["owner", "admin", "member"],
      tenant_plan: ["free", "basic", "professional", "enterprise"],
      tenant_status: ["active", "suspended", "expired", "cancelled"],
      transaction_type: ["income", "expense"],
    },
  },
} as const
