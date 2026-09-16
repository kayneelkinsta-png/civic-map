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
          boundary_effective_from: string | null
          boundary_imported_at: string | null
          boundary_source_id: string | null
          boundary_source_version: string | null
          contact_email: string | null
          country_id: string | null
          created_at: string
          gss_code: string | null
          id: string
          is_active: boolean
          is_verified: boolean
          name: string
          region_id: string | null
          reporting_info: Json
          slug: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          authority_type?: string
          boundary?: unknown
          boundary_effective_from?: string | null
          boundary_imported_at?: string | null
          boundary_source_id?: string | null
          boundary_source_version?: string | null
          contact_email?: string | null
          country_id?: string | null
          created_at?: string
          gss_code?: string | null
          id?: string
          is_active?: boolean
          is_verified?: boolean
          name: string
          region_id?: string | null
          reporting_info?: Json
          slug: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          authority_type?: string
          boundary?: unknown
          boundary_effective_from?: string | null
          boundary_imported_at?: string | null
          boundary_source_id?: string | null
          boundary_source_version?: string | null
          contact_email?: string | null
          country_id?: string | null
          created_at?: string
          gss_code?: string | null
          id?: string
          is_active?: boolean
          is_verified?: boolean
          name?: string
          region_id?: string | null
          reporting_info?: Json
          slug?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "authorities_boundary_source_id_fkey"
            columns: ["boundary_source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "authorities_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "authorities_region_id_fkey"
            columns: ["region_id"]
            isOneToOne: false
            referencedRelation: "regions"
            referencedColumns: ["id"]
          },
        ]
      }
      authority_configs: {
        Row: {
          authority_id: string
          config_number: number
          coverage_note: string | null
          created_at: string
          display_name: string
          id: string
          import_config: Json
          is_active: boolean
          location_fallback_label: string
          map_centre_lat: number
          map_centre_lng: number
          map_default_zoom: number
          search_label: string
          updated_at: string
        }
        Insert: {
          authority_id: string
          config_number: number
          coverage_note?: string | null
          created_at?: string
          display_name: string
          id?: string
          import_config?: Json
          is_active?: boolean
          location_fallback_label: string
          map_centre_lat: number
          map_centre_lng: number
          map_default_zoom: number
          search_label: string
          updated_at?: string
        }
        Update: {
          authority_id?: string
          config_number?: number
          coverage_note?: string | null
          created_at?: string
          display_name?: string
          id?: string
          import_config?: Json
          is_active?: boolean
          location_fallback_label?: string
          map_centre_lat?: number
          map_centre_lng?: number
          map_default_zoom?: number
          search_label?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "authority_configs_authority_id_fkey"
            columns: ["authority_id"]
            isOneToOne: true
            referencedRelation: "authorities"
            referencedColumns: ["id"]
          },
        ]
      }
      countries: {
        Row: {
          code: string
          created_at: string
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      data_sources: {
        Row: {
          accessed_at: string | null
          attribution: string | null
          authority_id: string | null
          coverage: string | null
          created_at: string
          dataset_name: string
          dataset_type: string
          id: string
          import_status: string
          is_active: boolean
          last_imported_at: string | null
          licence: string | null
          notes: string | null
          organisation: string
          record_count: number
          source_id_field: string | null
          source_url: string | null
          source_version: string | null
          update_frequency: string | null
          updated_at: string
        }
        Insert: {
          accessed_at?: string | null
          attribution?: string | null
          authority_id?: string | null
          coverage?: string | null
          created_at?: string
          dataset_name: string
          dataset_type?: string
          id?: string
          import_status?: string
          is_active?: boolean
          last_imported_at?: string | null
          licence?: string | null
          notes?: string | null
          organisation: string
          record_count?: number
          source_id_field?: string | null
          source_url?: string | null
          source_version?: string | null
          update_frequency?: string | null
          updated_at?: string
        }
        Update: {
          accessed_at?: string | null
          attribution?: string | null
          authority_id?: string | null
          coverage?: string | null
          created_at?: string
          dataset_name?: string
          dataset_type?: string
          id?: string
          import_status?: string
          is_active?: boolean
          last_imported_at?: string | null
          licence?: string | null
          notes?: string | null
          organisation?: string
          record_count?: number
          source_id_field?: string | null
          source_url?: string | null
          source_version?: string | null
          update_frequency?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "data_sources_authority_id_fkey"
            columns: ["authority_id"]
            isOneToOne: false
            referencedRelation: "authorities"
            referencedColumns: ["id"]
          },
        ]
      }
      infrastructure_assets: {
        Row: {
          asset_type: string
          authority_id: string | null
          boundary: unknown
          created_at: string
          external_asset_id: string | null
          geom: unknown
          geometry_type: string
          id: string
          is_sample: boolean
          latitude: number
          longitude: number
          metadata: Json
          name: string | null
          owner_org_id: string | null
          ownership_source: string | null
          postcode_sector: string | null
          responsibility_source: string | null
          responsible_org_id: string | null
          source_id: string | null
          source_updated_at: string | null
          source_version: string | null
          status: string
          updated_at: string
          ward_id: string | null
        }
        Insert: {
          asset_type: string
          authority_id?: string | null
          boundary?: unknown
          created_at?: string
          external_asset_id?: string | null
          geom?: unknown
          geometry_type?: string
          id?: string
          is_sample?: boolean
          latitude: number
          longitude: number
          metadata?: Json
          name?: string | null
          owner_org_id?: string | null
          ownership_source?: string | null
          postcode_sector?: string | null
          responsibility_source?: string | null
          responsible_org_id?: string | null
          source_id?: string | null
          source_updated_at?: string | null
          source_version?: string | null
          status?: string
          updated_at?: string
          ward_id?: string | null
        }
        Update: {
          asset_type?: string
          authority_id?: string | null
          boundary?: unknown
          created_at?: string
          external_asset_id?: string | null
          geom?: unknown
          geometry_type?: string
          id?: string
          is_sample?: boolean
          latitude?: number
          longitude?: number
          metadata?: Json
          name?: string | null
          owner_org_id?: string | null
          ownership_source?: string | null
          postcode_sector?: string | null
          responsibility_source?: string | null
          responsible_org_id?: string | null
          source_id?: string | null
          source_updated_at?: string | null
          source_version?: string | null
          status?: string
          updated_at?: string
          ward_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "infrastructure_assets_authority_id_fkey"
            columns: ["authority_id"]
            isOneToOne: false
            referencedRelation: "authorities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "infrastructure_assets_owner_org_id_fkey"
            columns: ["owner_org_id"]
            isOneToOne: false
            referencedRelation: "organisations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "infrastructure_assets_responsible_org_id_fkey"
            columns: ["responsible_org_id"]
            isOneToOne: false
            referencedRelation: "authorities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "infrastructure_assets_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "infrastructure_assets_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "wards"
            referencedColumns: ["id"]
          },
        ]
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
          asset_id: string | null
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
          location_accuracy: string
          longitude: number
          postcode: string | null
          postcode_sector: string | null
          reference: string
          reporter_id: string | null
          resolved_at: string | null
          severity: number
          status: Database["public"]["Enums"]["issue_status"]
          title: string
          updated_at: string
          ward_id: string | null
        }
        Insert: {
          address_text?: string | null
          asset_id?: string | null
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
          location_accuracy?: string
          longitude: number
          postcode?: string | null
          postcode_sector?: string | null
          reference?: string
          reporter_id?: string | null
          resolved_at?: string | null
          severity?: number
          status?: Database["public"]["Enums"]["issue_status"]
          title: string
          updated_at?: string
          ward_id?: string | null
        }
        Update: {
          address_text?: string | null
          asset_id?: string | null
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
          location_accuracy?: string
          longitude?: number
          postcode?: string | null
          postcode_sector?: string | null
          reference?: string
          reporter_id?: string | null
          resolved_at?: string | null
          severity?: number
          status?: Database["public"]["Enums"]["issue_status"]
          title?: string
          updated_at?: string
          ward_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "issues_asset_id_fkey"
            columns: ["asset_id"]
            isOneToOne: false
            referencedRelation: "infrastructure_assets"
            referencedColumns: ["id"]
          },
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
      organisations: {
        Row: {
          authority_id: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          notes: string | null
          organisation_type: Database["public"]["Enums"]["organisation_type"]
          slug: string
          updated_at: string
          website_url: string | null
        }
        Insert: {
          authority_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          organisation_type?: Database["public"]["Enums"]["organisation_type"]
          slug: string
          updated_at?: string
          website_url?: string | null
        }
        Update: {
          authority_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          organisation_type?: Database["public"]["Enums"]["organisation_type"]
          slug?: string
          updated_at?: string
          website_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "organisations_authority_id_fkey"
            columns: ["authority_id"]
            isOneToOne: false
            referencedRelation: "authorities"
            referencedColumns: ["id"]
          },
        ]
      }
      postcode_sectors: {
        Row: {
          authority_id: string | null
          boundary: unknown
          created_at: string
          district: string
          id: string
          population: number | null
          sector: string
          updated_at: string
          ward_id: string | null
        }
        Insert: {
          authority_id?: string | null
          boundary?: unknown
          created_at?: string
          district: string
          id?: string
          population?: number | null
          sector: string
          updated_at?: string
          ward_id?: string | null
        }
        Update: {
          authority_id?: string | null
          boundary?: unknown
          created_at?: string
          district?: string
          id?: string
          population?: number | null
          sector?: string
          updated_at?: string
          ward_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "postcode_sectors_authority_id_fkey"
            columns: ["authority_id"]
            isOneToOne: false
            referencedRelation: "authorities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "postcode_sectors_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "wards"
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
      regions: {
        Row: {
          boundary: unknown
          country_id: string
          created_at: string
          gss_code: string | null
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          boundary?: unknown
          country_id: string
          created_at?: string
          gss_code?: string | null
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          boundary?: unknown
          country_id?: string
          created_at?: string
          gss_code?: string | null
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "regions_country_id_fkey"
            columns: ["country_id"]
            isOneToOne: false
            referencedRelation: "countries"
            referencedColumns: ["id"]
          },
        ]
      }
      reporting_destinations: {
        Row: {
          api_endpoint: string | null
          api_status: string
          authority_id: string | null
          category_id: string | null
          created_at: string
          id: string
          is_active: boolean
          last_verified_at: string | null
          notes: string | null
          organisation_id: string | null
          organisation_name: string
          reporting_method: string
          reporting_url: string | null
          requires_manual_condition: boolean
          service_type: string
          source: string | null
          source_url: string | null
          updated_at: string
        }
        Insert: {
          api_endpoint?: string | null
          api_status?: string
          authority_id?: string | null
          category_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_verified_at?: string | null
          notes?: string | null
          organisation_id?: string | null
          organisation_name: string
          reporting_method?: string
          reporting_url?: string | null
          requires_manual_condition?: boolean
          service_type: string
          source?: string | null
          source_url?: string | null
          updated_at?: string
        }
        Update: {
          api_endpoint?: string | null
          api_status?: string
          authority_id?: string | null
          category_id?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          last_verified_at?: string | null
          notes?: string | null
          organisation_id?: string | null
          organisation_name?: string
          reporting_method?: string
          reporting_url?: string | null
          requires_manual_condition?: boolean
          service_type?: string
          source?: string | null
          source_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "reporting_destinations_authority_id_fkey"
            columns: ["authority_id"]
            isOneToOne: false
            referencedRelation: "authorities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reporting_destinations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "issue_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reporting_destinations_organisation_id_fkey"
            columns: ["organisation_id"]
            isOneToOne: false
            referencedRelation: "organisations"
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
          code_type: string | null
          created_at: string
          effective_from: string | null
          effective_to: string | null
          geography_type: string
          gss_code: string | null
          id: string
          name: string
          source_id: string | null
          source_updated_at: string | null
          updated_at: string
        }
        Insert: {
          authority_id: string
          boundary?: unknown
          code_type?: string | null
          created_at?: string
          effective_from?: string | null
          effective_to?: string | null
          geography_type?: string
          gss_code?: string | null
          id?: string
          name: string
          source_id?: string | null
          source_updated_at?: string | null
          updated_at?: string
        }
        Update: {
          authority_id?: string
          boundary?: unknown
          code_type?: string | null
          created_at?: string
          effective_from?: string | null
          effective_to?: string | null
          geography_type?: string
          gss_code?: string | null
          id?: string
          name?: string
          source_id?: string | null
          source_updated_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "wards_authority_id_fkey"
            columns: ["authority_id"]
            isOneToOne: false
            referencedRelation: "authorities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wards_source_id_fkey"
            columns: ["source_id"]
            isOneToOne: false
            referencedRelation: "data_sources"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      area_assets_in_bounds: {
        Args: {
          _east: number
          _limit?: number
          _north: number
          _south: number
          _west: number
        }
        Returns: {
          asset_type: string
          geojson: Json
          id: string
          name: string
        }[]
      }
      authority_bng_bbox: {
        Args: { _authority_id: string }
        Returns: {
          maxx: number
          maxy: number
          minx: number
          miny: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      import_area_assets: {
        Args: { _authority_id: string; _payload: Json; _source_id: string }
        Returns: Json
      }
      import_infrastructure_assets: {
        Args: {
          _asset_type: string
          _authority_id: string
          _payload: Json
          _source_id: string
        }
        Returns: Json
      }
      insights_by_authority: {
        Args: never
        Returns: {
          authority_id: string
          name: string
          total: number
          unresolved: number
        }[]
      }
      insights_by_category: {
        Args: never
        Returns: {
          category_id: string
          emoji: string
          name: string
          total: number
          unresolved: number
        }[]
      }
      insights_by_sector: {
        Args: never
        Returns: {
          sector: string
          total: number
          unresolved: number
        }[]
      }
      insights_by_ward: {
        Args: never
        Returns: {
          name: string
          total: number
          unresolved: number
          ward_id: string
        }[]
      }
      insights_summary: {
        Args: never
        Returns: {
          confirmation_total: number
          median_age_days: number
          median_resolution_days: number
          resolved_reports: number
          total_reports: number
          unresolved_reports: number
        }[]
      }
      insights_trend: {
        Args: { _months?: number }
        Returns: {
          month: string
          reported: number
          resolved: number
        }[]
      }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      resolve_authority: {
        Args: { _lat: number; _lng: number }
        Returns: string
      }
      resolve_reporting_destination: {
        Args: { _authority_id: string; _category_id: string }
        Returns: {
          api_status: string
          id: string
          last_verified_at: string
          organisation_name: string
          reporting_method: string
          reporting_url: string
          service_type: string
          source: string
          source_url: string
        }[]
      }
      resolve_ward: { Args: { _lat: number; _lng: number }; Returns: string }
      retire_missing_source_assets: {
        Args: { _keep: string[]; _source_id: string }
        Returns: number
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
      organisation_type:
        | "local_authority"
        | "national_government"
        | "devolved_government"
        | "contractor"
        | "transport_body"
        | "utility"
        | "private_operator"
        | "other_public_body"
        | "other"
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
      organisation_type: [
        "local_authority",
        "national_government",
        "devolved_government",
        "contractor",
        "transport_body",
        "utility",
        "private_operator",
        "other_public_body",
        "other",
      ],
    },
  },
} as const
