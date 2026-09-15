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
      account_balances: {
        Row: {
          balance: number
          created_at: string
          equity: number
          pnl: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          created_at?: string
          equity?: number
          pnl?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          created_at?: string
          equity?: number
          pnl?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      forex_pairs: {
        Row: {
          base_currency: string
          change_pct: number
          created_at: string
          current_rate: number
          id: string
          pair: string
          quote_currency: string
          status: string
          updated_at: string
        }
        Insert: {
          base_currency: string
          change_pct?: number
          created_at?: string
          current_rate?: number
          id?: string
          pair: string
          quote_currency: string
          status?: string
          updated_at?: string
        }
        Update: {
          base_currency?: string
          change_pct?: number
          created_at?: string
          current_rate?: number
          id?: string
          pair?: string
          quote_currency?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      forex_user_controls: {
        Row: {
          created_at: string
          direction: string
          enabled: boolean
          end_at: string
          id: string
          pair_id: string
          paused: boolean
          remaining_seconds: number | null
          resume_target: number | null
          start_at: string
          start_rate: number
          target_rate: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          direction: string
          enabled?: boolean
          end_at: string
          id?: string
          pair_id: string
          paused?: boolean
          remaining_seconds?: number | null
          resume_target?: number | null
          start_at?: string
          start_rate: number
          target_rate: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          direction?: string
          enabled?: boolean
          end_at?: string
          id?: string
          pair_id?: string
          paused?: boolean
          remaining_seconds?: number | null
          resume_target?: number | null
          start_at?: string
          start_rate?: number
          target_rate?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "forex_user_controls_pair_id_fkey"
            columns: ["pair_id"]
            isOneToOne: false
            referencedRelation: "forex_pairs"
            referencedColumns: ["id"]
          },
        ]
      }
      nft_charts: {
        Row: {
          accent: string
          asset: string
          change_pct: number
          collection: string
          created_at: string
          enabled: boolean
          end_at: string | null
          floor_price: number
          frozen_value: number | null
          holders: number
          live_status: string
          seed: number
          start_at: string | null
          start_value: number
          target_value: number
          title: string
          updated_at: string
          user_id: string
          volume: number
        }
        Insert: {
          accent?: string
          asset?: string
          change_pct?: number
          collection?: string
          created_at?: string
          enabled?: boolean
          end_at?: string | null
          floor_price?: number
          frozen_value?: number | null
          holders?: number
          live_status?: string
          seed?: number
          start_at?: string | null
          start_value?: number
          target_value?: number
          title?: string
          updated_at?: string
          user_id: string
          volume?: number
        }
        Update: {
          accent?: string
          asset?: string
          change_pct?: number
          collection?: string
          created_at?: string
          enabled?: boolean
          end_at?: string | null
          floor_price?: number
          frozen_value?: number | null
          holders?: number
          live_status?: string
          seed?: number
          start_at?: string | null
          start_value?: number
          target_value?: number
          title?: string
          updated_at?: string
          user_id?: string
          volume?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string
          country: string
          created_at: string
          currency_code: string
          email: string
          full_name: string
          id: string
          phone: string
          status: Database["public"]["Enums"]["account_status"]
          username: string
        }
        Insert: {
          avatar_url?: string
          country?: string
          created_at?: string
          currency_code?: string
          email?: string
          full_name?: string
          id: string
          phone?: string
          status?: Database["public"]["Enums"]["account_status"]
          username?: string
        }
        Update: {
          avatar_url?: string
          country?: string
          created_at?: string
          currency_code?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string
          status?: Database["public"]["Enums"]["account_status"]
          username?: string
        }
        Relationships: []
      }
      stock_user_controls: {
        Row: {
          created_at: string
          direction: string
          enabled: boolean
          end_at: string
          id: string
          paused: boolean
          remaining_seconds: number | null
          resume_target: number | null
          start_at: string
          start_price: number
          stock_id: string
          target_price: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          direction: string
          enabled?: boolean
          end_at: string
          id?: string
          paused?: boolean
          remaining_seconds?: number | null
          resume_target?: number | null
          start_at?: string
          start_price: number
          stock_id: string
          target_price: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          direction?: string
          enabled?: boolean
          end_at?: string
          id?: string
          paused?: boolean
          remaining_seconds?: number | null
          resume_target?: number | null
          start_at?: string
          start_price?: number
          stock_id?: string
          target_price?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_user_controls_stock_id_fkey"
            columns: ["stock_id"]
            isOneToOne: false
            referencedRelation: "stocks"
            referencedColumns: ["id"]
          },
        ]
      }
      stocks: {
        Row: {
          company_name: string
          country: string
          created_at: string
          currency: string
          current_price: number
          id: string
          market: string
          percentage_change: number
          price_change: number
          status: string
          symbol: string
          updated_at: string
        }
        Insert: {
          company_name: string
          country: string
          created_at?: string
          currency: string
          current_price?: number
          id?: string
          market: string
          percentage_change?: number
          price_change?: number
          status?: string
          symbol: string
          updated_at?: string
        }
        Update: {
          company_name?: string
          country?: string
          created_at?: string
          currency?: string
          current_price?: number
          id?: string
          market?: string
          percentage_change?: number
          price_change?: number
          status?: string
          symbol?: string
          updated_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          id: string
          note: string
          type: Database["public"]["Enums"]["txn_type"]
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          id?: string
          note?: string
          type: Database["public"]["Enums"]["txn_type"]
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          note?: string
          type?: Database["public"]["Enums"]["txn_type"]
          user_id?: string
        }
        Relationships: []
      }
      user_forex_positions: {
        Row: {
          amount_invested: number
          amount_sold: number
          current_value: number
          entry_rate: number
          forecast_direction: string | null
          forecast_end_at: string | null
          forecast_start_at: string | null
          forecast_start_rate: number | null
          forecast_target_rate: number | null
          id: string
          pair_id: string
          purchased_at: string
          remaining_units: number
          sale_date: string | null
          sale_transaction_id: string | null
          status: string
          transaction_id: string
          units: number
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_invested: number
          amount_sold?: number
          current_value?: number
          entry_rate: number
          forecast_direction?: string | null
          forecast_end_at?: string | null
          forecast_start_at?: string | null
          forecast_start_rate?: number | null
          forecast_target_rate?: number | null
          id?: string
          pair_id: string
          purchased_at?: string
          remaining_units: number
          sale_date?: string | null
          sale_transaction_id?: string | null
          status?: string
          transaction_id: string
          units: number
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_invested?: number
          amount_sold?: number
          current_value?: number
          entry_rate?: number
          forecast_direction?: string | null
          forecast_end_at?: string | null
          forecast_start_at?: string | null
          forecast_start_rate?: number | null
          forecast_target_rate?: number | null
          id?: string
          pair_id?: string
          purchased_at?: string
          remaining_units?: number
          sale_date?: string | null
          sale_transaction_id?: string | null
          status?: string
          transaction_id?: string
          units?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_forex_positions_pair_id_fkey"
            columns: ["pair_id"]
            isOneToOne: false
            referencedRelation: "forex_pairs"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_stock_positions: {
        Row: {
          amount_invested: number
          amount_sold: number
          current_value: number
          growth_start_at: string | null
          id: string
          purchase_price: number
          purchased_at: string
          remaining_value: number
          sale_date: string | null
          sale_price: number | null
          sale_transaction_id: string | null
          shares: number
          status: string
          stock_id: string
          target_date: string | null
          target_price: number | null
          transaction_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount_invested: number
          amount_sold?: number
          current_value?: number
          growth_start_at?: string | null
          id?: string
          purchase_price: number
          purchased_at?: string
          remaining_value?: number
          sale_date?: string | null
          sale_price?: number | null
          sale_transaction_id?: string | null
          shares: number
          status?: string
          stock_id: string
          target_date?: string | null
          target_price?: number | null
          transaction_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount_invested?: number
          amount_sold?: number
          current_value?: number
          growth_start_at?: string | null
          id?: string
          purchase_price?: number
          purchased_at?: string
          remaining_value?: number
          sale_date?: string | null
          sale_price?: number | null
          sale_transaction_id?: string | null
          shares?: number
          status?: string
          stock_id?: string
          target_date?: string | null
          target_price?: number | null
          transaction_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_stock_positions_stock_id_fkey"
            columns: ["stock_id"]
            isOneToOne: false
            referencedRelation: "stocks"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawal_requests: {
        Row: {
          admin_reason: string
          amount: number
          created_at: string
          crypto_key: string
          destination: string
          id: string
          method: Database["public"]["Enums"]["withdrawal_method"]
          status: Database["public"]["Enums"]["withdrawal_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_reason?: string
          amount?: number
          created_at?: string
          crypto_key?: string
          destination?: string
          id?: string
          method?: Database["public"]["Enums"]["withdrawal_method"]
          status?: Database["public"]["Enums"]["withdrawal_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_reason?: string
          amount?: number
          created_at?: string
          crypto_key?: string
          destination?: string
          id?: string
          method?: Database["public"]["Enums"]["withdrawal_method"]
          status?: Database["public"]["Enums"]["withdrawal_status"]
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
      buy_forex: {
        Args: {
          p_amount: number
          p_pair_id: string
          p_transaction_id: string
          p_user_id: string
        }
        Returns: Json
      }
      buy_stock: {
        Args: { p_amount: number; p_stock_id: string; p_transaction_id: string }
        Returns: Json
      }
      delete_forex_schedule: {
        Args: { p_pair_id: string; p_user_id: string }
        Returns: Json
      }
      delete_stock_channel: {
        Args: { p_stock_id: string; p_user_id: string }
        Returns: Json
      }
      forex_effective_rate: {
        Args: {
          p_end_at: string
          p_market_rate: number
          p_start_at: string
          p_start_rate: number
          p_target_rate: number
        }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      pause_forex_schedule: {
        Args: { p_pair_id: string; p_user_id: string }
        Returns: Json
      }
      pause_stock_channel: {
        Args: { p_stock_id: string; p_user_id: string }
        Returns: Json
      }
      position_effective_price: {
        Args: {
          p_growth_start_at: string
          p_market_price: number
          p_purchase_price: number
          p_target_date: string
          p_target_price: number
        }
        Returns: number
      }
      resume_forex_schedule: {
        Args: { p_pair_id: string; p_user_id: string }
        Returns: Json
      }
      resume_stock_channel: {
        Args: { p_stock_id: string; p_user_id: string }
        Returns: Json
      }
      sell_forex: {
        Args: {
          p_amount: number
          p_position_id: string
          p_transaction_id: string
          p_user_id: string
        }
        Returns: Json
      }
      sell_stock: {
        Args: {
          p_amount: number
          p_position_id: string
          p_transaction_id: string
        }
        Returns: Json
      }
      set_forex_schedule: {
        Args: {
          p_direction: string
          p_duration_minutes: number
          p_pair_id: string
          p_target_rate: number
          p_user_id: string
        }
        Returns: Json
      }
      set_stock_channel: {
        Args: {
          p_direction: string
          p_duration_minutes: number
          p_stock_id: string
          p_target_price: number
          p_user_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      account_status:
        | "PENDING_APPROVAL"
        | "ACTIVE"
        | "DECLINED"
        | "SUSPENDED"
        | "CONTACT_SUPPORT"
        | "TAX_PAYMENT_PROOF"
        | "INSURANCE_FEE_REQUIRED"
        | "INACTIVE"
        | "ACCOUNT_UPGRADE"
        | "KYC_REQUIRED"
      app_role: "admin" | "user"
      txn_type:
        | "DEPOSIT"
        | "WITHDRAWAL"
        | "TRADE_WON"
        | "TRADE_LOST"
        | "STOCK_PURCHASE"
        | "STOCK_SELL"
        | "FOREX_BUY"
        | "FOREX_SELL"
      withdrawal_method: "BANK" | "CRYPTO"
      withdrawal_status: "PENDING" | "APPROVED" | "REJECTED"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      account_status: [
        "PENDING_APPROVAL",
        "ACTIVE",
        "DECLINED",
        "SUSPENDED",
        "CONTACT_SUPPORT",
        "TAX_PAYMENT_PROOF",
        "INSURANCE_FEE_REQUIRED",
        "INACTIVE",
        "ACCOUNT_UPGRADE",
        "KYC_REQUIRED",
      ],
      app_role: ["admin", "user"],
      txn_type: [
        "DEPOSIT",
        "WITHDRAWAL",
        "TRADE_WON",
        "TRADE_LOST",
        "STOCK_PURCHASE",
        "STOCK_SELL",
        "FOREX_BUY",
        "FOREX_SELL",
      ],
      withdrawal_method: ["BANK", "CRYPTO"],
      withdrawal_status: ["PENDING", "APPROVED", "REJECTED"],
    },
  },
} as const
