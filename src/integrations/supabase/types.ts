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
      allegation_evidences: {
        Row: {
          allegation_id: string
          confidence_level: string | null
          consistency: string | null
          created_at: string
          evidence_log_id: string | null
          id: string
          trust_score: number
          validator_notes: string | null
        }
        Insert: {
          allegation_id: string
          confidence_level?: string | null
          consistency?: string | null
          created_at?: string
          evidence_log_id?: string | null
          id?: string
          trust_score: number
          validator_notes?: string | null
        }
        Update: {
          allegation_id?: string
          confidence_level?: string | null
          consistency?: string | null
          created_at?: string
          evidence_log_id?: string | null
          id?: string
          trust_score?: number
          validator_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "allegation_evidences_allegation_id_fkey"
            columns: ["allegation_id"]
            isOneToOne: false
            referencedRelation: "allegations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "allegation_evidences_evidence_log_id_fkey"
            columns: ["evidence_log_id"]
            isOneToOne: false
            referencedRelation: "evidence_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      allegations: {
        Row: {
          claim_text: string
          claim_type: string
          created_at: string
          id: string
          normalized_claim: Json | null
          opportunity_id: string
        }
        Insert: {
          claim_text: string
          claim_type: string
          created_at?: string
          id?: string
          normalized_claim?: Json | null
          opportunity_id: string
        }
        Update: {
          claim_text?: string
          claim_type?: string
          created_at?: string
          id?: string
          normalized_claim?: Json | null
          opportunity_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "allegations_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence_logs: {
        Row: {
          content_snippet: string | null
          created_at: string | null
          id: string
          opportunity_id: string | null
          organization_id: string | null
          source_type: string | null
          source_url: string | null
          trust_score: number | null
        }
        Insert: {
          content_snippet?: string | null
          created_at?: string | null
          id?: string
          opportunity_id?: string | null
          organization_id?: string | null
          source_type?: string | null
          source_url?: string | null
          trust_score?: number | null
        }
        Update: {
          content_snippet?: string | null
          created_at?: string | null
          id?: string
          opportunity_id?: string | null
          organization_id?: string | null
          source_type?: string | null
          source_url?: string | null
          trust_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "evidence_logs_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      founder_score_history: {
        Row: {
          created_at: string
          delta: number
          founder_id: string
          id: string
          organization_id: string | null
          reason: string | null
          score_after: number
          score_before: number | null
        }
        Insert: {
          created_at?: string
          delta: number
          founder_id: string
          id?: string
          organization_id?: string | null
          reason?: string | null
          score_after: number
          score_before?: number | null
        }
        Update: {
          created_at?: string
          delta?: number
          founder_id?: string
          id?: string
          organization_id?: string | null
          reason?: string | null
          score_after?: number
          score_before?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "founder_score_history_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      founders: {
        Row: {
          avatar_url: string | null
          bio: string | null
          company_name: string | null
          email: string | null
          founder_score: number | null
          github_handle: string | null
          id: string
          last_updated: string | null
          linkedin_url: string | null
          location: string | null
          name: string
          organization_id: string | null
          raw_data: Json | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          company_name?: string | null
          email?: string | null
          founder_score?: number | null
          github_handle?: string | null
          id?: string
          last_updated?: string | null
          linkedin_url?: string | null
          location?: string | null
          name: string
          organization_id?: string | null
          raw_data?: Json | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          company_name?: string | null
          email?: string | null
          founder_score?: number | null
          github_handle?: string | null
          id?: string
          last_updated?: string | null
          linkedin_url?: string | null
          location?: string | null
          name?: string
          organization_id?: string | null
          raw_data?: Json | null
        }
        Relationships: []
      }
      opportunities: {
        Row: {
          company_name: string
          created_at: string | null
          dedupe_key: string | null
          discovered_at: string | null
          discovery_reason: string | null
          founder_id: string | null
          id: string
          investment_memo: string | null
          organization_id: string | null
          pitch_deck_url: string | null
          screening_result: Json | null
          source: string | null
          status: string | null
          trust_report: Json | null
          updated_at: string
        }
        Insert: {
          company_name: string
          created_at?: string | null
          dedupe_key?: string | null
          discovered_at?: string | null
          discovery_reason?: string | null
          founder_id?: string | null
          id?: string
          investment_memo?: string | null
          organization_id?: string | null
          pitch_deck_url?: string | null
          screening_result?: Json | null
          source?: string | null
          status?: string | null
          trust_report?: Json | null
          updated_at?: string
        }
        Update: {
          company_name?: string
          created_at?: string | null
          dedupe_key?: string | null
          discovered_at?: string | null
          discovery_reason?: string | null
          founder_id?: string | null
          id?: string
          investment_memo?: string | null
          organization_id?: string | null
          pitch_deck_url?: string | null
          screening_result?: Json | null
          source?: string | null
          status?: string | null
          trust_report?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_founder_id_fkey"
            columns: ["founder_id"]
            isOneToOne: false
            referencedRelation: "founders"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunity_screenings: {
        Row: {
          created_at: string
          founder_notes: string | null
          founder_score: number | null
          founder_trend: string | null
          id: string
          idea_market_notes: string | null
          idea_market_score: number | null
          idea_market_trend: string | null
          market_notes: string | null
          market_score: number | null
          market_trend: string | null
          opportunity_id: string
          organization_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          founder_notes?: string | null
          founder_score?: number | null
          founder_trend?: string | null
          id?: string
          idea_market_notes?: string | null
          idea_market_score?: number | null
          idea_market_trend?: string | null
          market_notes?: string | null
          market_score?: number | null
          market_trend?: string | null
          opportunity_id: string
          organization_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          founder_notes?: string | null
          founder_score?: number | null
          founder_trend?: string | null
          id?: string
          idea_market_notes?: string | null
          idea_market_score?: number | null
          idea_market_trend?: string | null
          market_notes?: string | null
          market_score?: number | null
          market_trend?: string | null
          opportunity_id?: string
          organization_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "opportunity_screenings_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      thesis_config: {
        Row: {
          check_size: number | null
          geography: string[] | null
          id: string
          organization_id: string | null
          risk_appetite: string | null
          sectors: string[] | null
        }
        Insert: {
          check_size?: number | null
          geography?: string[] | null
          id?: string
          organization_id?: string | null
          risk_appetite?: string | null
          sectors?: string[] | null
        }
        Update: {
          check_size?: number | null
          geography?: string[] | null
          id?: string
          organization_id?: string | null
          risk_appetite?: string | null
          sectors?: string[] | null
        }
        Relationships: []
      }
      user_organizations: {
        Row: {
          created_at: string
          organization_id: string
          role: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          organization_id: string
          role?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          organization_id?: string
          role?: string | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      is_org_member: { Args: { _org: string }; Returns: boolean }
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
