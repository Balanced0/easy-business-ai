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
      business_profiles: {
        Row: {
          business_name: string
          created_at: string
          description: string | null
          id: string
          industry: string | null
          monthly_revenue: string | null
          products: string | null
          target_market: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          business_name: string
          created_at?: string
          description?: string | null
          id?: string
          industry?: string | null
          monthly_revenue?: string | null
          products?: string | null
          target_market?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          business_name?: string
          created_at?: string
          description?: string | null
          id?: string
          industry?: string | null
          monthly_revenue?: string | null
          products?: string | null
          target_market?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_conversations: {
        Row: {
          created_at: string
          id: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          language: string | null
          role: string
          user_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          language?: string | null
          role: string
          user_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          language?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      competitor_products: {
        Row: {
          availability: string | null
          competitor_id: string
          created_at: string
          currency: string | null
          id: string
          image_url: string | null
          price: number | null
          raw: Json
          scraped_at: string
          source_url: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          availability?: string | null
          competitor_id: string
          created_at?: string
          currency?: string | null
          id?: string
          image_url?: string | null
          price?: number | null
          raw?: Json
          scraped_at?: string
          source_url: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          availability?: string | null
          competitor_id?: string
          created_at?: string
          currency?: string | null
          id?: string
          image_url?: string | null
          price?: number | null
          raw?: Json
          scraped_at?: string
          source_url?: string
          title?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitor_products_competitor_id_fkey"
            columns: ["competitor_id"]
            isOneToOne: false
            referencedRelation: "competitors"
            referencedColumns: ["id"]
          },
        ]
      }
      competitors: {
        Row: {
          created_at: string
          description: string | null
          domain: string
          id: string
          last_scraped_at: string | null
          name: string
          query: string
          source: string
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          domain: string
          id?: string
          last_scraped_at?: string | null
          name: string
          query: string
          source?: string
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          domain?: string
          id?: string
          last_scraped_at?: string | null
          name?: string
          query?: string
          source?: string
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: []
      }
      credit_packs: {
        Row: {
          active: boolean
          created_at: string
          credits: number
          currency: string
          id: string
          name: string
          price_cents: number
          slug: string
          sort_order: number
          stripe_price_id: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          credits: number
          currency?: string
          id?: string
          name: string
          price_cents: number
          slug: string
          sort_order?: number
          stripe_price_id?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          credits?: number
          currency?: string
          id?: string
          name?: string
          price_cents?: number
          slug?: string
          sort_order?: number
          stripe_price_id?: string | null
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          action_meta: Json
          balance_after: number
          created_at: string
          delta: number
          id: string
          reason: string
          stripe_session_id: string | null
          user_id: string
        }
        Insert: {
          action_meta?: Json
          balance_after: number
          created_at?: string
          delta: number
          id?: string
          reason: string
          stripe_session_id?: string | null
          user_id: string
        }
        Update: {
          action_meta?: Json
          balance_after?: number
          created_at?: string
          delta?: number
          id?: string
          reason?: string
          stripe_session_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          batch_id: string | null
          cost: number | null
          created_at: string
          id: string
          name: string | null
          price: number | null
          reorder_threshold: number
          sku: string
          stock: number
          updated_at: string
          user_id: string
        }
        Insert: {
          batch_id?: string | null
          cost?: number | null
          created_at?: string
          id?: string
          name?: string | null
          price?: number | null
          reorder_threshold?: number
          sku: string
          stock?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          batch_id?: string | null
          cost?: number | null
          created_at?: string
          id?: string
          name?: string | null
          price?: number | null
          reorder_threshold?: number
          sku?: string
          stock?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      knowledge_documents: {
        Row: {
          content: string
          created_at: string
          embedding: string | null
          id: string
          metadata: Json
          source_type: string
          title: string | null
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          embedding?: string | null
          id?: string
          metadata?: Json
          source_type: string
          title?: string | null
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          embedding?: string | null
          id?: string
          metadata?: Json
          source_type?: string
          title?: string | null
          user_id?: string
        }
        Relationships: []
      }
      order_records: {
        Row: {
          batch_id: string | null
          created_at: string
          customer: string | null
          id: string
          order_id: string | null
          ordered_at: string | null
          status: string | null
          total: number
          user_id: string
        }
        Insert: {
          batch_id?: string | null
          created_at?: string
          customer?: string | null
          id?: string
          order_id?: string | null
          ordered_at?: string | null
          status?: string | null
          total?: number
          user_id: string
        }
        Update: {
          batch_id?: string | null
          created_at?: string
          customer?: string | null
          id?: string
          order_id?: string | null
          ordered_at?: string | null
          status?: string | null
          total?: number
          user_id?: string
        }
        Relationships: []
      }
      product_records: {
        Row: {
          batch_id: string | null
          category: string | null
          created_at: string
          id: string
          name: string | null
          price: number | null
          sku: string | null
          user_id: string
        }
        Insert: {
          batch_id?: string | null
          category?: string | null
          created_at?: string
          id?: string
          name?: string | null
          price?: number | null
          sku?: string | null
          user_id: string
        }
        Update: {
          batch_id?: string | null
          category?: string | null
          created_at?: string
          id?: string
          name?: string | null
          price?: number | null
          sku?: string | null
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          byok_gemini_key: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          preferred_currency: string
          updated_at: string
          user_id: string
        }
        Insert: {
          byok_gemini_key?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          preferred_currency?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          byok_gemini_key?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          preferred_currency?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      review_records: {
        Row: {
          batch_id: string | null
          content: string | null
          created_at: string
          id: string
          product: string | null
          rating: number | null
          review_date: string | null
          sentiment: string | null
          user_id: string
        }
        Insert: {
          batch_id?: string | null
          content?: string | null
          created_at?: string
          id?: string
          product?: string | null
          rating?: number | null
          review_date?: string | null
          sentiment?: string | null
          user_id: string
        }
        Update: {
          batch_id?: string | null
          content?: string | null
          created_at?: string
          id?: string
          product?: string | null
          rating?: number | null
          review_date?: string | null
          sentiment?: string | null
          user_id?: string
        }
        Relationships: []
      }
      sales_records: {
        Row: {
          batch_id: string | null
          channel: string | null
          created_at: string
          id: string
          product_name: string | null
          quantity: number
          revenue: number
          sale_date: string | null
          sku: string | null
          user_id: string
        }
        Insert: {
          batch_id?: string | null
          channel?: string | null
          created_at?: string
          id?: string
          product_name?: string | null
          quantity?: number
          revenue?: number
          sale_date?: string | null
          sku?: string | null
          user_id: string
        }
        Update: {
          batch_id?: string | null
          channel?: string | null
          created_at?: string
          id?: string
          product_name?: string | null
          quantity?: number
          revenue?: number
          sale_date?: string | null
          sku?: string | null
          user_id?: string
        }
        Relationships: []
      }
      upload_batches: {
        Row: {
          created_at: string
          filename: string | null
          id: string
          kind: string
          row_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          filename?: string | null
          id?: string
          kind: string
          row_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          filename?: string | null
          id?: string
          kind?: string
          row_count?: number
          user_id?: string
        }
        Relationships: []
      }
      user_credits: {
        Row: {
          balance: number
          created_at: string
          free_quota_monthly: number
          free_quota_remaining: number
          lifetime_purchased: number
          quota_reset_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          free_quota_monthly?: number
          free_quota_remaining?: number
          lifetime_purchased?: number
          quota_reset_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          free_quota_monthly?: number
          free_quota_remaining?: number
          lifetime_purchased?: number
          quota_reset_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      grant_credits: {
        Args: {
          _amount: number
          _meta?: Json
          _reason: string
          _stripe_session_id?: string
          _user_id: string
        }
        Returns: number
      }
      match_documents:
        | {
            Args: {
              filter_source_types?: string[]
              match_count?: number
              query_embedding: string
            }
            Returns: {
              content: string
              id: string
              metadata: Json
              similarity: number
              source_type: string
              title: string
            }[]
          }
        | {
            Args: {
              filter_source_types?: string[]
              filter_user_id?: string
              match_count?: number
              query_embedding: string
            }
            Returns: {
              content: string
              id: string
              metadata: Json
              similarity: number
              source_type: string
              title: string
            }[]
          }
      spend_credits: {
        Args: {
          _amount: number
          _meta?: Json
          _reason: string
          _user_id: string
        }
        Returns: {
          new_balance: number
          new_quota: number
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
