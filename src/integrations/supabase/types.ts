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
      authorities: {
        Row: {
          authority_type: string
          boundary: unknown
          contact_email: string | null
          created_at: string
          gss_code: string | null
          id: string
          is_verified: boolean
          name: string
          slug: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          authority_type?: string
          boundary?: unknown
          contact_email?: string | null
          created_at?: string
          gss_code?: string | null
          id?: string
          is_verified?: boolean
          name: string
          slug: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          authority_type?: string
          boundary?: unknown
          contact_email?: string | null
          created_at?: string
          gss_code?: string | null
          id?: string
          is_verified?: boolean
          name?: string
          slug?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: []
      }
      issue_categories: {
        Row: {
          colour: string
          created_at: string
          description: string | null
          emoji: string
          icon: string
          id: string
          is_active: boolean
          name: string
          slug: string
          sort_order: number
        }
        Insert: {
          colour?: string
          created_at?: string
          description?: string | null
          emoji?: string
          icon?: string
          id?: string
          is_active?: boolean
          name: string
          slug: string
          sort_order?: number
        }
        Update: {
          colour?: string
          created_at?: string
          description?: string | null
          emoji?: string
          icon?: string
          id?: string
          is_active?: boolean
          name?: string
          slug?: string
          sort_order?: number
        }
        Relationships: []
      }
      issue_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          is_hidden: boolean
          issue_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          is_hidden?: boolean
          issue_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          is_hidden?: boolean
          issue_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "issue_comments_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
        ]
      }
      issue_confirmations: {
        Row: {
          created_at: string
          id: string
          issue_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          issue_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          issue_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "issue_confirmations_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
        ]
      }
      issue_followers: {
        Row: {
          created_at: string
          id: string
          issue_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          issue_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          issue_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "issue_followers_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
        ]
      }
      issue_photos: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          issue_id: string
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          issue_id: string
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          issue_id?: string
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "issue_photos_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
        ]
      }
      issue_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          from_status: Database["public"]["Enums"]["issue_status"] | null
          id: string
          issue_id: string
          note: string | null
          to_status: Database["public"]["Enums"]["issue_status"]
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["issue_status"] | null
          id?: string
          issue_id: string
          note?: string | null
          to_status: Database["public"]["Enums"]["issue_status"]
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          from_status?: Database["public"]["Enums"]["issue_status"] | null
          id?: string
          issue_id?: string
          note?: string | null
          to_status?: Database["public"]["Enums"]["issue_status"]
        }
        Relationships: [
          {
            foreignKeyName: "issue_status_history_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
        ]
      }
      issues: {
        Row: {
          address_text: string | null
          authority_id: string | null
          category_id: string
          confirmation_count: number
          created_at: string
          description: string
          geom: unknown
          id: string
          is_hidden: boolean
          is_sample: boolean
          last_confirmed_at: string | null
          latitude: number
          longitude: number
          reference: string
          reporter_id: string | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["issue_status"]
          title: string
          updated_at: string
          ward_id: string | null
        }
        Insert: {
          address_text?: string | null
          authority_id?: string | null
          category_id: string
          confirmation_count?: number
          created_at?: string
          description?: string
          geom?: unknown
          id?: string
          is_hidden?: boolean
          is_sample?: boolean
          last_confirmed_at?: string | null
          latitude: number
          longitude: number
          reference?: string
          reporter_id?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["issue_status"]
          title: string
          updated_at?: string
          ward_id?: string | null
        }
        Update: {
          address_text?: string | null
          authority_id?: string | null
          category_id?: string
          confirmation_count?: number
          created_at?: string
          description?: string
          geom?: unknown
          id?: string
          is_hidden?: boolean
          is_sample?: boolean
          last_confirmed_at?: string | null
          latitude?: number
          longitude?: number
          reference?: string
          reporter_id?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["issue_status"]
          title?: string
          updated_at?: string
          ward_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "issues_authority_id_fkey"
            columns: ["authority_id"]
            isOneToOne: false
            referencedRelation: "authorities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "issue_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "issues_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "wards"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_actions: {
        Row: {
          action: string
          created_at: string
          id: string
          moderator_id: string | null
          reason: string | null
          target_id: string
          target_type: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          moderator_id?: string | null
          reason?: string | null
          target_id: string
          target_type: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          moderator_id?: string | null
          reason?: string | null
          target_id?: string
          target_type?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          issue_id: string | null
          kind: string
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          issue_id?: string | null
          kind: string
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          issue_id?: string | null
          kind?: string
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_issue_id_fkey"
            columns: ["issue_id"]
            isOneToOne: false
            referencedRelation: "issues"
            referencedColumns: ["id"]
          },
        ]
      }
      postcodes: {
        Row: {
          authority_id: string | null
          created_at: string
          geom: unknown
          id: string
          latitude: number
          longitude: number
          outcode: string
          postcode: string
          ward_id: string | null
        }
        Insert: {
          authority_id?: string | null
          created_at?: string
          geom?: unknown
          id?: string
          latitude: number
          longitude: number
          outcode: string
          postcode: string
          ward_id?: string | null
        }
        Update: {
          authority_id?: string | null
          created_at?: string
          geom?: unknown
          id?: string
          latitude?: number
          longitude?: number
          outcode?: string
          postcode?: string
          ward_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "postcodes_authority_id_fkey"
            columns: ["authority_id"]
            isOneToOne: false
            referencedRelation: "authorities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "postcodes_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "wards"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          first_name: string
          id: string
          postcode: string | null
          postcode_district: string | null
          surname: string
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          first_name?: string
          id: string
          postcode?: string | null
          postcode_district?: string | null
          surname?: string
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          first_name?: string
          id?: string
          postcode?: string | null
          postcode_district?: string | null
          surname?: string
          updated_at?: string
        }
        Relationships: []
      }
      public_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          first_name: string
          id: string
          postcode_district: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          first_name?: string
          id: string
          postcode_district?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          first_name?: string
          id?: string
          postcode_district?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "public_profiles_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wards: {
        Row: {
          authority_id: string
          boundary: unknown
          created_at: string
          gss_code: string | null
          id: string
          name: string
        }
        Insert: {
          authority_id: string
          boundary?: unknown
          created_at?: string
          gss_code?: string | null
          id?: string
          name: string
        }
        Update: {
          authority_id?: string
          boundary?: unknown
          created_at?: string
          gss_code?: string | null
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "wards_authority_id_fkey"
            columns: ["authority_id"]
            isOneToOne: false
            referencedRelation: "authorities"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      resolve_authority: {
        Args: { _lat: number; _lng: number }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "resident"
      issue_status:
        | "NEW"
        | "ACKNOWLEDGED"
        | "IN_PROGRESS"
        | "RESOLVED"
        | "REOPENED"
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
      app_role: ["admin", "moderator", "resident"],
      issue_status: [
        "NEW",
        "ACKNOWLEDGED",
        "IN_PROGRESS",
        "RESOLVED",
        "REOPENED",
      ],
    },
  },
} as const
