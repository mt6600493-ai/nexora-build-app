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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      ai_usage: {
        Row: {
          builds: number
          chats: number
          day: string
          user_id: string
        }
        Insert: {
          builds?: number
          chats?: number
          day: string
          user_id: string
        }
        Update: {
          builds?: number
          chats?: number
          day?: string
          user_id?: string
        }
        Relationships: []
      }
      project_assets: {
        Row: {
          created_at: string
          data: string
          id: string
          path: string
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          data: string
          id?: string
          path?: string
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          data?: string
          id?: string
          path?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_assets_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_publishes: {
        Row: {
          first_published_at: string
          project_id: string
          user_id: string
        }
        Insert: {
          first_published_at?: string
          project_id: string
          user_id: string
        }
        Update: {
          first_published_at?: string
          project_id?: string
          user_id?: string
        }
        Relationships: []
      }
      project_versions: {
        Row: {
          created_at: string
          files: Json
          id: string
          label: string
          project_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          files?: Json
          id?: string
          label?: string
          project_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          files?: Json
          id?: string
          label?: string
          project_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_versions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_visits: {
        Row: {
          device: string
          id: number
          owner_id: string
          project_id: string
          visited_at: string
        }
        Insert: {
          device?: string
          id?: never
          owner_id: string
          project_id: string
          visited_at?: string
        }
        Update: {
          device?: string
          id?: never
          owner_id?: string
          project_id?: string
          visited_at?: string
        }
        Relationships: []
      }
      projects: {
        Row: {
          created_at: string
          custom_domain: string
          description: string
          files: Json
          framework: string
          id: string
          messages: Json
          name: string
          published_at: string | null
          published_files: Json | null
          published_hash: string | null
          sale_contact: string
          sale_price: string
          source: string
          updated_at: string
          user_id: string
          visibility: string
        }
        Insert: {
          created_at?: string
          custom_domain?: string
          description?: string
          files?: Json
          framework?: string
          id?: string
          messages?: Json
          name?: string
          published_at?: string | null
          published_files?: Json | null
          published_hash?: string | null
          sale_contact?: string
          sale_price?: string
          source?: string
          updated_at?: string
          user_id: string
          visibility?: string
        }
        Update: {
          created_at?: string
          custom_domain?: string
          description?: string
          files?: Json
          framework?: string
          id?: string
          messages?: Json
          name?: string
          published_at?: string | null
          published_files?: Json | null
          published_hash?: string | null
          sale_contact?: string
          sale_price?: string
          source?: string
          updated_at?: string
          user_id?: string
          visibility?: string
        }
        Relationships: []
      }
      user_plans: {
        Row: {
          plan: string
          premium_until: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          plan?: string
          premium_until?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          plan?: string
          premium_until?: string | null
          updated_at?: string
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_set_plan: {
        Args: { _months?: number; _premium: boolean; _uid: string }
        Returns: undefined
      }
      admin_stats: { Args: never; Returns: Json }
      admin_users: {
        Args: never
        Returns: {
          created_at: string
          email: string
          id: string
          last_sign_in_at: string
          premium: boolean
          premium_until: string
        }[]
      }
      consume_ai: { Args: { _kind: string }; Returns: Json }
      get_published_project: {
        Args: { _id: string }
        Returns: {
          description: string
          files: Json
          name: string
          sale_contact: string
          sale_price: string
          updated_at: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_premium: { Args: { _uid: string }; Returns: boolean }
      list_published_projects: {
        Args: never
        Returns: {
          id: string
          updated_at: string
        }[]
      }
      my_quota: { Args: never; Returns: Json }
      pk_today: { Args: never; Returns: string }
      plan_of: { Args: { _uid: string }; Returns: string }
      project_stats: { Args: { _project: string }; Returns: Json }
      publish_allowance: { Args: { _uid: string }; Returns: Json }
      record_visit: {
        Args: { _device: string; _project: string }
        Returns: undefined
      }
      transfer_project: {
        Args: { _email: string; _id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
