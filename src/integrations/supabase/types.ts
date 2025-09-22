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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      ai_chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          role: string
          session_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          role: string
          session_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          role?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_chat_messages_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "ai_chat_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_chat_sessions: {
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
      campaign_analytics: {
        Row: {
          campaign_id: string
          candidate_id: string | null
          channel: string
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          status: string
          timestamp: string
        }
        Insert: {
          campaign_id: string
          candidate_id?: string | null
          channel: string
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          status?: string
          timestamp?: string
        }
        Update: {
          campaign_id?: string
          candidate_id?: string | null
          channel?: string
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          status?: string
          timestamp?: string
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          agent_config: Json | null
          calls_made: number | null
          candidates_count: number | null
          created_at: string
          id: string
          messages_sent: number | null
          name: string
          responses_received: number | null
          scheduled_at: string | null
          status: string
          template_voice: string | null
          template_whatsapp: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          agent_config?: Json | null
          calls_made?: number | null
          candidates_count?: number | null
          created_at?: string
          id?: string
          messages_sent?: number | null
          name: string
          responses_received?: number | null
          scheduled_at?: string | null
          status?: string
          template_voice?: string | null
          template_whatsapp?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          agent_config?: Json | null
          calls_made?: number | null
          candidates_count?: number | null
          created_at?: string
          id?: string
          messages_sent?: number | null
          name?: string
          responses_received?: number | null
          scheduled_at?: string | null
          status?: string
          template_voice?: string | null
          template_whatsapp?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      candidates: {
        Row: {
          call_answered: boolean | null
          campaign_id: string
          city: string | null
          course: string | null
          created_at: string
          email: string | null
          email_opened: boolean | null
          id: string
          name: string
          phone: string
          response_received: boolean | null
          status: string | null
          updated_at: string
          voice_called: boolean | null
          whatsapp_read: boolean | null
          whatsapp_sent: boolean | null
        }
        Insert: {
          call_answered?: boolean | null
          campaign_id: string
          city?: string | null
          course?: string | null
          created_at?: string
          email?: string | null
          email_opened?: boolean | null
          id?: string
          name: string
          phone: string
          response_received?: boolean | null
          status?: string | null
          updated_at?: string
          voice_called?: boolean | null
          whatsapp_read?: boolean | null
          whatsapp_sent?: boolean | null
        }
        Update: {
          call_answered?: boolean | null
          campaign_id?: string
          city?: string | null
          course?: string | null
          created_at?: string
          email?: string | null
          email_opened?: boolean | null
          id?: string
          name?: string
          phone?: string
          response_received?: boolean | null
          status?: string | null
          updated_at?: string
          voice_called?: boolean | null
          whatsapp_read?: boolean | null
          whatsapp_sent?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "candidates_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_submissions: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      demo_requests: {
        Row: {
          company: string
          created_at: string
          email: string
          id: string
          message: string | null
          name: string
          preferred_time: string
          role: string | null
          updated_at: string
        }
        Insert: {
          company: string
          created_at?: string
          email: string
          id?: string
          message?: string | null
          name: string
          preferred_time: string
          role?: string | null
          updated_at?: string
        }
        Update: {
          company?: string
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          name?: string
          preferred_time?: string
          role?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          college_address: string | null
          college_name: string | null
          college_website: string | null
          created_at: string
          display_name: string | null
          email: string | null
          email_alerts: boolean | null
          full_name: string | null
          id: string
          notifications_enabled: boolean | null
          sms_alerts: boolean | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          college_address?: string | null
          college_name?: string | null
          college_website?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          email_alerts?: boolean | null
          full_name?: string | null
          id?: string
          notifications_enabled?: boolean | null
          sms_alerts?: boolean | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          college_address?: string | null
          college_name?: string | null
          college_website?: string | null
          created_at?: string
          display_name?: string | null
          email?: string | null
          email_alerts?: boolean | null
          full_name?: string | null
          id?: string
          notifications_enabled?: boolean | null
          sms_alerts?: boolean | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      schedule_demos: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string | null
          name: string
          preferred_time: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message?: string | null
          name: string
          preferred_time: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          name?: string
          preferred_time?: string
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      send_contact_email: {
        Args: {
          contact_email: string
          contact_message: string
          contact_name: string
          form_type?: string
        }
        Returns: Json
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
