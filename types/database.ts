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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agent_commissions: {
        Row: {
          agent_id: string
          amount: number
          approved_at: string | null
          created_at: string
          id: string
          invoice_id: string
          paid_at: string | null
          percent: number
          provider_id: string
          status: string
        }
        Insert: {
          agent_id: string
          amount: number
          approved_at?: string | null
          created_at?: string
          id?: string
          invoice_id: string
          paid_at?: string | null
          percent: number
          provider_id: string
          status?: string
        }
        Update: {
          agent_id?: string
          amount?: number
          approved_at?: string | null
          created_at?: string
          id?: string
          invoice_id?: string
          paid_at?: string | null
          percent?: number
          provider_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "agent_commissions_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_commissions_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: true
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agent_commissions_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      agents: {
        Row: {
          created_at: string
          default_commission_percent: number
          email: string
          id: string
          is_active: boolean
          name: string
          phone: string | null
          ref_code: string
          user_id: string
        }
        Insert: {
          created_at?: string
          default_commission_percent?: number
          email: string
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          ref_code: string
          user_id: string
        }
        Update: {
          created_at?: string
          default_commission_percent?: number
          email?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          ref_code?: string
          user_id?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          cancel_token: string
          cancelled_by: string | null
          client_email: string | null
          client_name: string
          client_phone: string
          created_at: string
          ends_at: string
          id: string
          notes: string | null
          provider_id: string
          review_score: number | null
          review_sent_at: string | null
          review_token: string
          service_id: string
          starts_at: string
          status: string
          worker_id: string
        }
        Insert: {
          cancel_token?: string
          cancelled_by?: string | null
          client_email?: string | null
          client_name: string
          client_phone: string
          created_at?: string
          ends_at: string
          id?: string
          notes?: string | null
          provider_id: string
          review_score?: number | null
          review_sent_at?: string | null
          review_token?: string
          service_id: string
          starts_at: string
          status?: string
          worker_id: string
        }
        Update: {
          cancel_token?: string
          cancelled_by?: string | null
          client_email?: string | null
          client_name?: string
          client_phone?: string
          created_at?: string
          ends_at?: string
          id?: string
          notes?: string | null
          provider_id?: string
          review_score?: number | null
          review_sent_at?: string | null
          review_token?: string
          service_id?: string
          starts_at?: string
          status?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_counters: {
        Row: {
          last_number: number
          year: number
        }
        Insert: {
          last_number?: number
          year: number
        }
        Update: {
          last_number?: number
          year?: number
        }
        Relationships: []
      }
      invoices: {
        Row: {
          amount: number | null
          created_at: string
          due_at: string | null
          id: string
          issued_at: string | null
          notes: string | null
          number: string
          paid_at: string | null
          payment_claim_token: string
          payment_claimed_at: string | null
          payment_method: string | null
          payment_proof_url: string | null
          pdf_url: string | null
          period_from: string | null
          period_to: string | null
          plan: string | null
          provider_id: string
          status: string
        }
        Insert: {
          amount?: number | null
          created_at?: string
          due_at?: string | null
          id?: string
          issued_at?: string | null
          notes?: string | null
          number: string
          paid_at?: string | null
          payment_claim_token?: string
          payment_claimed_at?: string | null
          payment_method?: string | null
          payment_proof_url?: string | null
          pdf_url?: string | null
          period_from?: string | null
          period_to?: string | null
          plan?: string | null
          provider_id: string
          status?: string
        }
        Update: {
          amount?: number | null
          created_at?: string
          due_at?: string | null
          id?: string
          issued_at?: string | null
          notes?: string | null
          number?: string
          paid_at?: string | null
          payment_claim_token?: string
          payment_claimed_at?: string | null
          payment_method?: string | null
          payment_proof_url?: string | null
          pdf_url?: string | null
          period_from?: string | null
          period_to?: string | null
          plan?: string | null
          provider_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number | null
          created_at: string
          currency: string
          gateway: string | null
          gateway_payment_id: string | null
          id: string
          invoice_id: string
          provider_id: string
          status: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string
          currency?: string
          gateway?: string | null
          gateway_payment_id?: string | null
          id?: string
          invoice_id: string
          provider_id: string
          status?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string
          currency?: string
          gateway?: string | null
          gateway_payment_id?: string | null
          id?: string
          invoice_id?: string
          provider_id?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_gallery: {
        Row: {
          created_at: string
          id: string
          image_url: string
          provider_id: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          image_url: string
          provider_id: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string
          provider_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "provider_gallery_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      providers: {
        Row: {
          address: string | null
          agent_commission_percent: number | null
          agent_id: string | null
          billing_email: string | null
          booking_max_days_ahead: number
          booking_min_notice_hours: number
          cancel_min_hours: number
          city: string | null
          company_address: string | null
          company_mb: string | null
          company_name: string | null
          company_pib: string | null
          cover_url: string | null
          created_at: string
          custom_domain: string | null
          description: string | null
          facebook_url: string | null
          font_choice: string
          google_review_url: string | null
          id: string
          instagram_url: string | null
          intro_text: string | null
          logo_url: string | null
          name: string
          phone: string | null
          plan: string
          plan_expires_at: string | null
          plan_status: string
          primary_color: string
          ref_code: string | null
          slug: string
          text_color: string
          tiktok_url: string | null
          trial_ends_at: string | null
          user_id: string
        }
        Insert: {
          address?: string | null
          agent_commission_percent?: number | null
          agent_id?: string | null
          billing_email?: string | null
          booking_max_days_ahead?: number
          booking_min_notice_hours?: number
          cancel_min_hours?: number
          city?: string | null
          company_address?: string | null
          company_mb?: string | null
          company_name?: string | null
          company_pib?: string | null
          cover_url?: string | null
          created_at?: string
          custom_domain?: string | null
          description?: string | null
          facebook_url?: string | null
          font_choice?: string
          google_review_url?: string | null
          id?: string
          instagram_url?: string | null
          intro_text?: string | null
          logo_url?: string | null
          name: string
          phone?: string | null
          plan?: string
          plan_expires_at?: string | null
          plan_status?: string
          primary_color?: string
          ref_code?: string | null
          slug: string
          text_color?: string
          tiktok_url?: string | null
          trial_ends_at?: string | null
          user_id: string
        }
        Update: {
          address?: string | null
          agent_commission_percent?: number | null
          agent_id?: string | null
          billing_email?: string | null
          booking_max_days_ahead?: number
          booking_min_notice_hours?: number
          cancel_min_hours?: number
          city?: string | null
          company_address?: string | null
          company_mb?: string | null
          company_name?: string | null
          company_pib?: string | null
          cover_url?: string | null
          created_at?: string
          custom_domain?: string | null
          description?: string | null
          facebook_url?: string | null
          font_choice?: string
          google_review_url?: string | null
          id?: string
          instagram_url?: string | null
          intro_text?: string | null
          logo_url?: string | null
          name?: string
          phone?: string | null
          plan?: string
          plan_expires_at?: string | null
          plan_status?: string
          primary_color?: string
          ref_code?: string | null
          slug?: string
          text_color?: string
          tiktok_url?: string | null
          trial_ends_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "providers_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
        ]
      }
      schedule_overrides: {
        Row: {
          date: string
          id: string
          reason: string | null
          shift_id: string | null
          worker_id: string
        }
        Insert: {
          date: string
          id?: string
          reason?: string | null
          shift_id?: string | null
          worker_id: string
        }
        Update: {
          date?: string
          id?: string
          reason?: string | null
          shift_id?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "schedule_overrides_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "schedule_overrides_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      services: {
        Row: {
          duration_minutes: number
          id: string
          is_active: boolean
          name: string
          price: number | null
          provider_id: string
          sort_order: number
        }
        Insert: {
          duration_minutes: number
          id?: string
          is_active?: boolean
          name: string
          price?: number | null
          provider_id: string
          sort_order?: number
        }
        Update: {
          duration_minutes?: number
          id?: string
          is_active?: boolean
          name?: string
          price?: number | null
          provider_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "services_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_rotation_members: {
        Row: {
          day_of_week: number
          id: string
          rotation_id: string
          week_even_shift_id: string | null
          week_odd_shift_id: string | null
          worker_id: string
        }
        Insert: {
          day_of_week: number
          id?: string
          rotation_id: string
          week_even_shift_id?: string | null
          week_odd_shift_id?: string | null
          worker_id: string
        }
        Update: {
          day_of_week?: number
          id?: string
          rotation_id?: string
          week_even_shift_id?: string | null
          week_odd_shift_id?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_rotation_members_rotation_id_fkey"
            columns: ["rotation_id"]
            isOneToOne: false
            referencedRelation: "shift_rotations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_rotation_members_week_even_shift_id_fkey"
            columns: ["week_even_shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_rotation_members_week_odd_shift_id_fkey"
            columns: ["week_odd_shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shift_rotation_members_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      shift_rotations: {
        Row: {
          created_at: string
          id: string
          name: string | null
          provider_id: string
          rotation_start_date: string
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          provider_id: string
          rotation_start_date: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          provider_id?: string
          rotation_start_date?: string
        }
        Relationships: [
          {
            foreignKeyName: "shift_rotations_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      shifts: {
        Row: {
          break_end: string | null
          break_start: string | null
          end_time: string
          id: string
          name: string
          provider_id: string
          start_time: string
        }
        Insert: {
          break_end?: string | null
          break_start?: string | null
          end_time: string
          id?: string
          name: string
          provider_id: string
          start_time: string
        }
        Update: {
          break_end?: string | null
          break_start?: string | null
          end_time?: string
          id?: string
          name?: string
          provider_id?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "shifts_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
      time_off: {
        Row: {
          date_from: string
          date_to: string
          id: string
          is_public_holiday: boolean
          provider_id: string
          reason: string | null
          worker_id: string | null
        }
        Insert: {
          date_from: string
          date_to: string
          id?: string
          is_public_holiday?: boolean
          provider_id: string
          reason?: string | null
          worker_id?: string | null
        }
        Update: {
          date_from?: string
          date_to?: string
          id?: string
          is_public_holiday?: boolean
          provider_id?: string
          reason?: string | null
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_off_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_off_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_schedule: {
        Row: {
          day_of_week: number
          id: string
          shift_id: string | null
          worker_id: string
        }
        Insert: {
          day_of_week: number
          id?: string
          shift_id?: string | null
          worker_id: string
        }
        Update: {
          day_of_week?: number
          id?: string
          shift_id?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_schedule_shift_id_fkey"
            columns: ["shift_id"]
            isOneToOne: false
            referencedRelation: "shifts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_schedule_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_services: {
        Row: {
          service_id: string
          worker_id: string
        }
        Insert: {
          service_id: string
          worker_id: string
        }
        Update: {
          service_id?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "services"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_services_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      workers: {
        Row: {
          archived_at: string | null
          bio: string | null
          buffer_minutes: number
          created_at: string
          id: string
          is_active: boolean
          name: string
          photo_url: string | null
          provider_id: string
        }
        Insert: {
          archived_at?: string | null
          bio?: string | null
          buffer_minutes?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          photo_url?: string | null
          provider_id: string
        }
        Update: {
          archived_at?: string | null
          bio?: string | null
          buffer_minutes?: number
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          photo_url?: string | null
          provider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workers_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "providers"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      claim_invoice_payment: {
        Args: { p_payment_claim_token: string; p_payment_proof_url?: string }
        Returns: boolean
      }
      create_public_booking: {
        Args: {
          p_client_email: string
          p_client_name: string
          p_client_phone: string
          p_notes?: string
          p_provider_id: string
          p_service_id: string
          p_starts_at: string
          p_worker_id: string
        }
        Returns: string
      }
      current_agent_id: { Args: never; Returns: string }
      current_provider_id: { Args: never; Returns: string }
      get_public_provider: {
        Args: { p_slug: string }
        Returns: {
          address: string
          booking_max_days_ahead: number
          booking_min_notice_hours: number
          cancel_min_hours: number
          city: string
          cover_url: string
          custom_domain: string
          description: string
          facebook_url: string
          font_choice: string
          google_review_url: string
          id: string
          instagram_url: string
          intro_text: string
          logo_url: string
          name: string
          phone: string
          primary_color: string
          slug: string
          text_color: string
          tiktok_url: string
        }[]
      }
      get_public_provider_gallery: {
        Args: { p_provider_id: string }
        Returns: {
          id: string
          image_url: string
          sort_order: number
        }[]
      }
      get_public_services: {
        Args: { p_provider_id: string }
        Returns: {
          duration_minutes: number
          id: string
          name: string
          price: number
          sort_order: number
        }[]
      }
      get_public_workers: {
        Args: { p_provider_id: string }
        Returns: {
          bio: string
          id: string
          name: string
          photo_url: string
        }[]
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
