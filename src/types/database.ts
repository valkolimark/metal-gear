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
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string
          created_at: string | null
          details: Json | null
          id: string
          ip_address: unknown
          metadata: Json | null
          target_id: string
          target_type: string
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          target_id: string
          target_type: string
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          ip_address?: unknown
          metadata?: Json | null
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_log_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      boost_purchases: {
        Row: {
          admin_override: boolean | null
          amount_cents: number
          boost_type: string
          created_at: string | null
          duration_days: number
          expires_at: string
          id: string
          listing_id: string | null
          starts_at: string | null
          status: string | null
          stripe_payment_intent_id: string | null
          user_id: string
        }
        Insert: {
          admin_override?: boolean | null
          amount_cents: number
          boost_type: string
          created_at?: string | null
          duration_days: number
          expires_at: string
          id?: string
          listing_id?: string | null
          starts_at?: string | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          user_id: string
        }
        Update: {
          admin_override?: boolean | null
          amount_cents?: number
          boost_type?: string
          created_at?: string | null
          duration_days?: number
          expires_at?: string
          id?: string
          listing_id?: string | null
          starts_at?: string | null
          status?: string | null
          stripe_payment_intent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "boost_purchases_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boost_purchases_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "pricing_comparables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boost_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      churn_risk: {
        Row: {
          id: string
          last_calculated_at: string | null
          outreach_sent_at: string | null
          retained: boolean | null
          risk_level: string
          risk_score: number
          signals: Json
          user_id: string | null
        }
        Insert: {
          id?: string
          last_calculated_at?: string | null
          outreach_sent_at?: string | null
          retained?: boolean | null
          risk_level: string
          risk_score: number
          signals: Json
          user_id?: string | null
        }
        Update: {
          id?: string
          last_calculated_at?: string | null
          outreach_sent_at?: string | null
          retained?: boolean | null
          risk_level?: string
          risk_score?: number
          signals?: Json
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "churn_risk_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      collection_items: {
        Row: {
          added_at: string | null
          collection_id: string
          id: string
          listing_id: string
          notes: string | null
        }
        Insert: {
          added_at?: string | null
          collection_id: string
          id?: string
          listing_id: string
          notes?: string | null
        }
        Update: {
          added_at?: string | null
          collection_id?: string
          id?: string
          listing_id?: string
          notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "collection_items_collection_id_fkey"
            columns: ["collection_id"]
            isOneToOne: false
            referencedRelation: "collections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_items_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_items_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "pricing_comparables"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          cover_image_url: string | null
          created_at: string | null
          description: string | null
          id: string
          is_public: boolean | null
          name: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string | null
          description?: string | null
          id?: string
          is_public?: boolean | null
          name?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "collections_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_memberships: {
        Row: {
          company_id: string
          id: string
          invited_by: string | null
          is_active: boolean
          joined_at: string
          role: Database["public"]["Enums"]["company_role"]
          user_id: string
        }
        Insert: {
          company_id: string
          id?: string
          invited_by?: string | null
          is_active?: boolean
          joined_at?: string
          role?: Database["public"]["Enums"]["company_role"]
          user_id: string
        }
        Update: {
          company_id?: string
          id?: string
          invited_by?: string | null
          is_active?: boolean
          joined_at?: string
          role?: Database["public"]["Enums"]["company_role"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_memberships_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_memberships_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_memberships_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_profiles: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          banner_url: string | null
          city: string | null
          company_size: string | null
          country: string
          created_at: string
          created_by: string
          description: string | null
          id: string
          industry: string | null
          is_suspended: boolean
          is_verified: boolean
          logo_url: string | null
          name: string
          phone: string | null
          slug: string
          state: string | null
          tagline: string | null
          updated_at: string
          verified_at: string | null
          verified_by: string | null
          website: string | null
          zip: string | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          banner_url?: string | null
          city?: string | null
          company_size?: string | null
          country?: string
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          industry?: string | null
          is_suspended?: boolean
          is_verified?: boolean
          logo_url?: string | null
          name: string
          phone?: string | null
          slug: string
          state?: string | null
          tagline?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
          website?: string | null
          zip?: string | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          banner_url?: string | null
          city?: string | null
          company_size?: string | null
          country?: string
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          industry?: string | null
          is_suspended?: boolean
          is_verified?: boolean
          logo_url?: string | null
          name?: string
          phone?: string | null
          slug?: string
          state?: string | null
          tagline?: string | null
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
          website?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "company_profiles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_profiles_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      condition_reports: {
        Row: {
          cosmetic_score: number
          created_at: string | null
          created_by: string
          electrical_score: number
          hours_of_use: number | null
          id: string
          last_service_date: string | null
          listing_id: string
          mechanical_score: number
          notes: string | null
          overall_grade: string
          photo_urls: string[] | null
        }
        Insert: {
          cosmetic_score: number
          created_at?: string | null
          created_by: string
          electrical_score: number
          hours_of_use?: number | null
          id?: string
          last_service_date?: string | null
          listing_id: string
          mechanical_score: number
          notes?: string | null
          overall_grade: string
          photo_urls?: string[] | null
        }
        Update: {
          cosmetic_score?: number
          created_at?: string | null
          created_by?: string
          electrical_score?: number
          hours_of_use?: number | null
          id?: string
          last_service_date?: string | null
          listing_id?: string
          mechanical_score?: number
          notes?: string | null
          overall_grade?: string
          photo_urls?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "condition_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "condition_reports_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "condition_reports_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "pricing_comparables"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          buyer_id: string
          created_at: string
          id: string
          last_message_at: string | null
          listing_id: string
          seller_id: string
        }
        Insert: {
          buyer_id: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          listing_id: string
          seller_id: string
        }
        Update: {
          buyer_id?: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          listing_id?: string
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "pricing_comparables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversations_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          ai_summary: Json | null
          created_at: string | null
          description: string
          evidence_urls: string[] | null
          id: string
          opened_by: string
          reason: string
          resolution_notes: string | null
          resolved_by: string | null
          seller_evidence_urls: string[] | null
          seller_response: string | null
          status: string
          transaction_id: string
          updated_at: string | null
        }
        Insert: {
          ai_summary?: Json | null
          created_at?: string | null
          description: string
          evidence_urls?: string[] | null
          id?: string
          opened_by: string
          reason: string
          resolution_notes?: string | null
          resolved_by?: string | null
          seller_evidence_urls?: string[] | null
          seller_response?: string | null
          status?: string
          transaction_id: string
          updated_at?: string | null
        }
        Update: {
          ai_summary?: Json | null
          created_at?: string | null
          description?: string
          evidence_urls?: string[] | null
          id?: string
          opened_by?: string
          reason?: string
          resolution_notes?: string | null
          resolved_by?: string | null
          seller_evidence_urls?: string[] | null
          seller_response?: string | null
          status?: string
          transaction_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "disputes_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "pricing_comparables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      help_articles: {
        Row: {
          body_markdown: string
          category: string
          created_at: string | null
          id: string
          published: boolean | null
          slug: string
          sort_order: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          body_markdown: string
          category: string
          created_at?: string | null
          id?: string
          published?: boolean | null
          slug: string
          sort_order?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          body_markdown?: string
          category?: string
          created_at?: string | null
          id?: string
          published?: boolean | null
          slug?: string
          sort_order?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      homepage_featured_slots: {
        Row: {
          active: boolean | null
          created_at: string | null
          created_by: string | null
          ends_at: string | null
          id: string
          label: string | null
          position: number
          slot_type: string
          starts_at: string | null
          target_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          created_by?: string | null
          ends_at?: string | null
          id?: string
          label?: string | null
          position: number
          slot_type: string
          starts_at?: string | null
          target_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          created_by?: string | null
          ends_at?: string | null
          id?: string
          label?: string | null
          position?: number
          slot_type?: string
          starts_at?: string | null
          target_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "homepage_featured_slots_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_images: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          position: number
          storage_path: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          position?: number
          storage_path: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          position?: number
          storage_path?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_images_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_images_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "pricing_comparables"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_imports: {
        Row: {
          created_at: string
          error_count: number
          errors: Json | null
          filename: string
          id: string
          success_count: number
          total_rows: number
          user_id: string
        }
        Insert: {
          created_at?: string
          error_count?: number
          errors?: Json | null
          filename: string
          id?: string
          success_count?: number
          total_rows?: number
          user_id: string
        }
        Update: {
          created_at?: string
          error_count?: number
          errors?: Json | null
          filename?: string
          id?: string
          success_count?: number
          total_rows?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_imports_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_videos: {
        Row: {
          created_at: string
          duration_seconds: number | null
          embed_url: string | null
          hls_url: string | null
          id: string
          listing_id: string
          position: number | null
          status: string | null
          storage_path: string
          stream_video_id: string | null
          thumbnail_url: string | null
          url: string
        }
        Insert: {
          created_at?: string
          duration_seconds?: number | null
          embed_url?: string | null
          hls_url?: string | null
          id?: string
          listing_id: string
          position?: number | null
          status?: string | null
          storage_path: string
          stream_video_id?: string | null
          thumbnail_url?: string | null
          url: string
        }
        Update: {
          created_at?: string
          duration_seconds?: number | null
          embed_url?: string | null
          hls_url?: string | null
          id?: string
          listing_id?: string
          position?: number | null
          status?: string | null
          storage_path?: string
          stream_video_id?: string | null
          thumbnail_url?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_videos_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_videos_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "pricing_comparables"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_views: {
        Row: {
          id: string
          listing_id: string
          viewed_at: string
          viewer_id: string | null
        }
        Insert: {
          id?: string
          listing_id: string
          viewed_at?: string
          viewer_id?: string | null
        }
        Update: {
          id?: string
          listing_id?: string
          viewed_at?: string
          viewer_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_views_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_views_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "pricing_comparables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_views_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      listings: {
        Row: {
          admin_boost: boolean
          admin_flag_reason: string | null
          admin_reviewed_at: string | null
          ai_analyzed: boolean | null
          ai_assist_accepted: boolean | null
          ai_assist_used: boolean | null
          ai_fraud_flagged: boolean | null
          ai_fraud_reason: string | null
          ai_price_accepted: boolean | null
          ai_price_suggested: number | null
          auto_renew: boolean | null
          category: string
          company_id: string | null
          condition: string
          contact_for_price: boolean
          created_at: string
          description: string
          display_name_override: string | null
          expires_at: string | null
          favorites_count: number
          featured_until: string | null
          fts: unknown
          id: string
          industry: string | null
          is_featured: boolean
          listing_quality_score: number | null
          location_city: string
          location_lat: number
          location_lng: number
          location_state: string
          negotiable: boolean
          pinned_category: string | null
          pinned_position: number | null
          price_cents: number | null
          quantity: number | null
          seller_id: string
          sku: string | null
          specifications: Json | null
          specs: Json | null
          status: string
          title: string
          updated_at: string
          views_count: number
          warehouse_location: string | null
        }
        Insert: {
          admin_boost?: boolean
          admin_flag_reason?: string | null
          admin_reviewed_at?: string | null
          ai_analyzed?: boolean | null
          ai_assist_accepted?: boolean | null
          ai_assist_used?: boolean | null
          ai_fraud_flagged?: boolean | null
          ai_fraud_reason?: string | null
          ai_price_accepted?: boolean | null
          ai_price_suggested?: number | null
          auto_renew?: boolean | null
          category: string
          company_id?: string | null
          condition?: string
          contact_for_price?: boolean
          created_at?: string
          description?: string
          display_name_override?: string | null
          expires_at?: string | null
          favorites_count?: number
          featured_until?: string | null
          fts?: unknown
          id?: string
          industry?: string | null
          is_featured?: boolean
          listing_quality_score?: number | null
          location_city?: string
          location_lat?: number
          location_lng?: number
          location_state?: string
          negotiable?: boolean
          pinned_category?: string | null
          pinned_position?: number | null
          price_cents?: number | null
          quantity?: number | null
          seller_id: string
          sku?: string | null
          specifications?: Json | null
          specs?: Json | null
          status?: string
          title: string
          updated_at?: string
          views_count?: number
          warehouse_location?: string | null
        }
        Update: {
          admin_boost?: boolean
          admin_flag_reason?: string | null
          admin_reviewed_at?: string | null
          ai_analyzed?: boolean | null
          ai_assist_accepted?: boolean | null
          ai_assist_used?: boolean | null
          ai_fraud_flagged?: boolean | null
          ai_fraud_reason?: string | null
          ai_price_accepted?: boolean | null
          ai_price_suggested?: number | null
          auto_renew?: boolean | null
          category?: string
          company_id?: string | null
          condition?: string
          contact_for_price?: boolean
          created_at?: string
          description?: string
          display_name_override?: string | null
          expires_at?: string | null
          favorites_count?: number
          featured_until?: string | null
          fts?: unknown
          id?: string
          industry?: string | null
          is_featured?: boolean
          listing_quality_score?: number | null
          location_city?: string
          location_lat?: number
          location_lng?: number
          location_state?: string
          negotiable?: boolean
          pinned_category?: string | null
          pinned_position?: number | null
          price_cents?: number | null
          quantity?: number | null
          seller_id?: string
          sku?: string | null
          specifications?: Json | null
          specs?: Json | null
          status?: string
          title?: string
          updated_at?: string
          views_count?: number
          warehouse_location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      market_gap_reports: {
        Row: {
          ai_analysis: Json
          created_at: string | null
          gaps: Json
          id: string
          period_end: string
          period_start: string
        }
        Insert: {
          ai_analysis: Json
          created_at?: string | null
          gaps: Json
          id?: string
          period_end: string
          period_start: string
        }
        Update: {
          ai_analysis?: Json
          created_at?: string | null
          gaps?: Json
          id?: string
          period_end?: string
          period_start?: string
        }
        Relationships: []
      }
      message_attachments: {
        Row: {
          created_at: string
          file_name: string
          file_size_bytes: number
          file_type: string
          file_url: string
          id: string
          message_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_size_bytes?: number
          file_type: string
          file_url: string
          id?: string
          message_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_size_bytes?: number
          file_type?: string
          file_url?: string
          id?: string
          message_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_attachments_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "messages"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          read_at: string | null
          sender_id: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          read_at?: string | null
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          data: Json | null
          id: string
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          data?: Json | null
          id?: string
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          data?: Json | null
          id?: string
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_coaching_log: {
        Row: {
          created_at: string | null
          id: string
          offer_id: string | null
          reasoning: string | null
          recommended_price: number | null
          side: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          offer_id?: string | null
          reasoning?: string | null
          recommended_price?: number | null
          side: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          offer_id?: string | null
          reasoning?: string | null
          recommended_price?: number | null
          side?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offer_coaching_log_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offer_coaching_log_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          amount_cents: number
          buyer_id: string
          counter_amount_cents: number | null
          counter_message: string | null
          created_at: string
          expires_at: string
          id: string
          listing_id: string
          message: string | null
          parent_offer_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount_cents: number
          buyer_id: string
          counter_amount_cents?: number | null
          counter_message?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          listing_id: string
          message?: string | null
          parent_offer_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          buyer_id?: string
          counter_amount_cents?: number | null
          counter_message?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          listing_id?: string
          message?: string | null
          parent_offer_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "pricing_comparables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_parent_offer_id_fkey"
            columns: ["parent_offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
        ]
      }
      onboarding_progress: {
        Row: {
          completed_at: string | null
          created_at: string | null
          dismissed: boolean | null
          steps_completed: string[] | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string | null
          dismissed?: boolean | null
          steps_completed?: string[] | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string | null
          dismissed?: boolean | null
          steps_completed?: string[] | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "onboarding_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cents: number
          created_at: string
          currency: string
          description: string | null
          id: string
          status: string
          stripe_invoice_id: string | null
          stripe_payment_intent_id: string | null
          subscription_id: string | null
          user_id: string
        }
        Insert: {
          amount_cents: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          status?: string
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          subscription_id?: string | null
          user_id: string
        }
        Update: {
          amount_cents?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          status?: string
          stripe_invoice_id?: string | null
          stripe_payment_intent_id?: string | null
          subscription_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      price_history: {
        Row: {
          changed_at: string
          id: string
          listing_id: string
          price_cents: number
        }
        Insert: {
          changed_at?: string
          id?: string
          listing_id: string
          price_cents: number
        }
        Update: {
          changed_at?: string
          id?: string
          listing_id?: string
          price_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "price_history_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_history_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "pricing_comparables"
            referencedColumns: ["id"]
          },
        ]
      }
      price_watches: {
        Row: {
          created_at: string
          id: string
          listing_id: string
          original_price_cents: number
          target_price_cents: number | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          listing_id: string
          original_price_cents: number
          target_price_cents?: number | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          listing_id?: string
          original_price_cents?: number
          target_price_cents?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_watches_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_watches_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "pricing_comparables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_watches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          active_company_id: string | null
          admin_granted_at: string | null
          admin_granted_by: string | null
          admin_notes: string | null
          admin_role: Database["public"]["Enums"]["admin_role"] | null
          avatar_url: string | null
          bio: string | null
          company_name: string | null
          created_at: string
          display_name: string | null
          email_notifications: Json | null
          full_name: string
          id: string
          industry: string | null
          is_admin: boolean
          is_banned: boolean
          is_suspended: boolean
          is_verified_dealer: boolean
          last_login_at: string | null
          location_city: string | null
          location_lat: number | null
          location_lng: number | null
          location_state: string | null
          notification_preferences: Json | null
          phone: string | null
          preferred_locale: string
          priority_score: number | null
          priority_set_at: string | null
          priority_set_by: string | null
          priority_tier:
            | Database["public"]["Enums"]["company_priority_tier"]
            | null
          referral_code: string | null
          reputation_summary: Json | null
          reputation_summary_updated_at: string | null
          stripe_customer_id: string | null
          subscription_tier: string
          trust_score: number | null
          updated_at: string
        }
        Insert: {
          active_company_id?: string | null
          admin_granted_at?: string | null
          admin_granted_by?: string | null
          admin_notes?: string | null
          admin_role?: Database["public"]["Enums"]["admin_role"] | null
          avatar_url?: string | null
          bio?: string | null
          company_name?: string | null
          created_at?: string
          display_name?: string | null
          email_notifications?: Json | null
          full_name?: string
          id: string
          industry?: string | null
          is_admin?: boolean
          is_banned?: boolean
          is_suspended?: boolean
          is_verified_dealer?: boolean
          last_login_at?: string | null
          location_city?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_state?: string | null
          notification_preferences?: Json | null
          phone?: string | null
          preferred_locale?: string
          priority_score?: number | null
          priority_set_at?: string | null
          priority_set_by?: string | null
          priority_tier?:
            | Database["public"]["Enums"]["company_priority_tier"]
            | null
          referral_code?: string | null
          reputation_summary?: Json | null
          reputation_summary_updated_at?: string | null
          stripe_customer_id?: string | null
          subscription_tier?: string
          trust_score?: number | null
          updated_at?: string
        }
        Update: {
          active_company_id?: string | null
          admin_granted_at?: string | null
          admin_granted_by?: string | null
          admin_notes?: string | null
          admin_role?: Database["public"]["Enums"]["admin_role"] | null
          avatar_url?: string | null
          bio?: string | null
          company_name?: string | null
          created_at?: string
          display_name?: string | null
          email_notifications?: Json | null
          full_name?: string
          id?: string
          industry?: string | null
          is_admin?: boolean
          is_banned?: boolean
          is_suspended?: boolean
          is_verified_dealer?: boolean
          last_login_at?: string | null
          location_city?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_state?: string | null
          notification_preferences?: Json | null
          phone?: string | null
          preferred_locale?: string
          priority_score?: number | null
          priority_set_at?: string | null
          priority_set_by?: string | null
          priority_tier?:
            | Database["public"]["Enums"]["company_priority_tier"]
            | null
          referral_code?: string | null
          reputation_summary?: Json | null
          reputation_summary_updated_at?: string | null
          stripe_customer_id?: string | null
          subscription_tier?: string
          trust_score?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_active_company_id_fkey"
            columns: ["active_company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_admin_granted_by_fkey"
            columns: ["admin_granted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_priority_set_by_fkey"
            columns: ["priority_set_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string | null
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string | null
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string | null
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string | null
          id: string
          referred_id: string | null
          referrer_id: string
          reward_cents: number | null
          status: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          referred_id?: string | null
          referrer_id: string
          reward_cents?: number | null
          status?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          referred_id?: string | null
          referrer_id?: string
          reward_cents?: number | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reply_templates: {
        Row: {
          body: string
          created_at: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reply_templates_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          admin_notes: string | null
          created_at: string
          details: string | null
          id: string
          reason: string
          reporter_id: string
          status: string
          target_id: string
          target_type: string
        }
        Insert: {
          admin_notes?: string | null
          created_at?: string
          details?: string | null
          id?: string
          reason: string
          reporter_id: string
          status?: string
          target_id: string
          target_type: string
        }
        Update: {
          admin_notes?: string | null
          created_at?: string
          details?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          status?: string
          target_id?: string
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          comment: string | null
          conversation_id: string | null
          created_at: string
          id: string
          listing_id: string | null
          rating: number
          review_type: string | null
          reviewer_id: string
          seller_id: string
          transaction_id: string | null
        }
        Insert: {
          comment?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          listing_id?: string | null
          rating: number
          review_type?: string | null
          reviewer_id: string
          seller_id: string
          transaction_id?: string | null
        }
        Update: {
          comment?: string | null
          conversation_id?: string | null
          created_at?: string
          id?: string
          listing_id?: string | null
          rating?: number
          review_type?: string | null
          reviewer_id?: string
          seller_id?: string
          transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "pricing_comparables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reviewer_id_fkey"
            columns: ["reviewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_search_alert_log: {
        Row: {
          ai_explanation: string | null
          ai_relevance_score: number | null
          alert_sent: boolean | null
          created_at: string | null
          id: string
          listing_id: string | null
          saved_search_id: string | null
          skip_reason: string | null
        }
        Insert: {
          ai_explanation?: string | null
          ai_relevance_score?: number | null
          alert_sent?: boolean | null
          created_at?: string | null
          id?: string
          listing_id?: string | null
          saved_search_id?: string | null
          skip_reason?: string | null
        }
        Update: {
          ai_explanation?: string | null
          ai_relevance_score?: number | null
          alert_sent?: boolean | null
          created_at?: string | null
          id?: string
          listing_id?: string | null
          saved_search_id?: string | null
          skip_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saved_search_alert_log_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_search_alert_log_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "pricing_comparables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "saved_search_alert_log_saved_search_id_fkey"
            columns: ["saved_search_id"]
            isOneToOne: false
            referencedRelation: "saved_searches"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_searches: {
        Row: {
          ai_filters: Json | null
          ai_query: string | null
          created_at: string
          filters: Json
          frequency: string | null
          id: string
          is_ai_search: boolean | null
          last_notified_at: string | null
          name: string
          notify_email: boolean
          user_id: string
        }
        Insert: {
          ai_filters?: Json | null
          ai_query?: string | null
          created_at?: string
          filters?: Json
          frequency?: string | null
          id?: string
          is_ai_search?: boolean | null
          last_notified_at?: string | null
          name: string
          notify_email?: boolean
          user_id: string
        }
        Update: {
          ai_filters?: Json | null
          ai_query?: string | null
          created_at?: string
          filters?: Json
          frequency?: string | null
          id?: string
          is_ai_search?: boolean | null
          last_notified_at?: string | null
          name?: string
          notify_email?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_searches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_availability: {
        Row: {
          day_of_week: number
          end_time: string
          id: string
          start_time: string
          timezone: string
          user_id: string
        }
        Insert: {
          day_of_week: number
          end_time: string
          id?: string
          start_time: string
          timezone?: string
          user_id: string
        }
        Update: {
          day_of_week?: number
          end_time?: string
          id?: string
          start_time?: string
          timezone?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_availability_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_demand_insights: {
        Row: {
          generated_at: string | null
          id: string
          insights: Json
          user_id: string
          valid_until: string | null
        }
        Insert: {
          generated_at?: string | null
          id?: string
          insights: Json
          user_id: string
          valid_until?: string | null
        }
        Update: {
          generated_at?: string | null
          id?: string
          insights?: Json
          user_id?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_demand_insights_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_storefronts: {
        Row: {
          banner_url: string | null
          company_id: string | null
          created_at: string
          featured_listing_ids: string[] | null
          tagline: string | null
          theme_color: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          banner_url?: string | null
          company_id?: string | null
          created_at?: string
          featured_listing_ids?: string[] | null
          tagline?: string | null
          theme_color?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          banner_url?: string | null
          company_id?: string | null
          created_at?: string
          featured_listing_ids?: string[] | null
          tagline?: string | null
          theme_color?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_storefronts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_storefronts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_verifications: {
        Row: {
          admin_notes: string | null
          business_name: string
          created_at: string
          document_url: string | null
          id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          tax_id_hash: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          business_name: string
          created_at?: string
          document_url?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tax_id_hash: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          business_name?: string
          created_at?: string
          document_url?: string | null
          id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          tax_id_hash?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_verifications_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sos_notifications: {
        Row: {
          id: string
          notified_user_id: string
          notify_method: string
          read_at: string | null
          sent_at: string | null
          sos_request_id: string
        }
        Insert: {
          id?: string
          notified_user_id: string
          notify_method: string
          read_at?: string | null
          sent_at?: string | null
          sos_request_id: string
        }
        Update: {
          id?: string
          notified_user_id?: string
          notify_method?: string
          read_at?: string | null
          sent_at?: string | null
          sos_request_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sos_notifications_sos_request_id_fkey"
            columns: ["sos_request_id"]
            isOneToOne: false
            referencedRelation: "sos_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      sos_requests: {
        Row: {
          ai_categorized: boolean | null
          brand: string | null
          company_id: string | null
          created_at: string | null
          description: string | null
          equipment_category: string
          equipment_subcategory: string | null
          expires_at: string | null
          fulfilled_at: string | null
          fulfilled_by: string | null
          id: string
          location_city: string | null
          location_lat: number | null
          location_lng: number | null
          location_state: string | null
          max_distance_miles: number | null
          model: string | null
          notes: string | null
          photos: string[] | null
          ranked_response_ids: Json | null
          requester_id: string
          status: Database["public"]["Enums"]["sos_status"] | null
          title: string
          updated_at: string | null
          urgency: Database["public"]["Enums"]["sos_urgency"] | null
          videos: string[] | null
        }
        Insert: {
          ai_categorized?: boolean | null
          brand?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          equipment_category: string
          equipment_subcategory?: string | null
          expires_at?: string | null
          fulfilled_at?: string | null
          fulfilled_by?: string | null
          id?: string
          location_city?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_state?: string | null
          max_distance_miles?: number | null
          model?: string | null
          notes?: string | null
          photos?: string[] | null
          ranked_response_ids?: Json | null
          requester_id: string
          status?: Database["public"]["Enums"]["sos_status"] | null
          title: string
          updated_at?: string | null
          urgency?: Database["public"]["Enums"]["sos_urgency"] | null
          videos?: string[] | null
        }
        Update: {
          ai_categorized?: boolean | null
          brand?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string | null
          equipment_category?: string
          equipment_subcategory?: string | null
          expires_at?: string | null
          fulfilled_at?: string | null
          fulfilled_by?: string | null
          id?: string
          location_city?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_state?: string | null
          max_distance_miles?: number | null
          model?: string | null
          notes?: string | null
          photos?: string[] | null
          ranked_response_ids?: Json | null
          requester_id?: string
          status?: Database["public"]["Enums"]["sos_status"] | null
          title?: string
          updated_at?: string | null
          urgency?: Database["public"]["Enums"]["sos_urgency"] | null
          videos?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "sos_requests_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sos_responses: {
        Row: {
          condition: string | null
          created_at: string | null
          id: string
          lead_time: string | null
          message: string
          photos: string[] | null
          price_estimate: string | null
          responder_id: string
          sos_request_id: string
          status: Database["public"]["Enums"]["sos_response_status"] | null
          updated_at: string | null
        }
        Insert: {
          condition?: string | null
          created_at?: string | null
          id?: string
          lead_time?: string | null
          message: string
          photos?: string[] | null
          price_estimate?: string | null
          responder_id: string
          sos_request_id: string
          status?: Database["public"]["Enums"]["sos_response_status"] | null
          updated_at?: string | null
        }
        Update: {
          condition?: string | null
          created_at?: string | null
          id?: string
          lead_time?: string | null
          message?: string
          photos?: string[] | null
          price_estimate?: string | null
          responder_id?: string
          sos_request_id?: string
          status?: Database["public"]["Enums"]["sos_response_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sos_responses_sos_request_id_fkey"
            columns: ["sos_request_id"]
            isOneToOne: false
            referencedRelation: "sos_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          canceled_at: string | null
          company_id: string | null
          created_at: string
          current_period_end: string | null
          current_period_start: string | null
          id: string
          status: string
          stripe_price_id: string
          stripe_subscription_id: string
          tier: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          company_id?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: string
          stripe_price_id: string
          stripe_subscription_id: string
          tier: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          canceled_at?: string | null
          company_id?: string | null
          created_at?: string
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          status?: string
          stripe_price_id?: string
          stripe_subscription_id?: string
          tier?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_config: {
        Row: {
          description: string | null
          key: string
          updated_at: string | null
          updated_by: string | null
          value: Json
        }
        Insert: {
          description?: string | null
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: Json
        }
        Update: {
          description?: string | null
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: Json
        }
        Relationships: [
          {
            foreignKeyName: "system_config_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount_cents: number
          buyer_id: string
          carrier: string | null
          created_at: string
          id: string
          listing_id: string
          notes: string | null
          offer_id: string | null
          platform_fee_cents: number | null
          seller_id: string
          status: string
          stripe_payment_intent_id: string | null
          stripe_payment_intent_status: string | null
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          amount_cents: number
          buyer_id: string
          carrier?: string | null
          created_at?: string
          id?: string
          listing_id: string
          notes?: string | null
          offer_id?: string | null
          platform_fee_cents?: number | null
          seller_id: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_payment_intent_status?: string | null
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          amount_cents?: number
          buyer_id?: string
          carrier?: string | null
          created_at?: string
          id?: string
          listing_id?: string
          notes?: string | null
          offer_id?: string | null
          platform_fee_cents?: number | null
          seller_id?: string
          status?: string
          stripe_payment_intent_id?: string | null
          stripe_payment_intent_status?: string | null
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "pricing_comparables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_offer_id_fkey"
            columns: ["offer_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_activity: {
        Row: {
          action: string
          created_at: string
          id: string
          listing_id: string | null
          metadata: Json | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          listing_id?: string | null
          metadata?: Json | null
          user_id: string
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          listing_id?: string | null
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_activity_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "pricing_comparables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_activity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_business_profiles: {
        Row: {
          company_name: string
          created_at: string | null
          id: string
          industries: string[] | null
          job_title: string | null
          onboarding_completed: boolean | null
          onboarding_completed_at: string | null
          onboarding_step: number | null
          pain_points: string[] | null
          pain_points_other: string | null
          primary_role: string
          quality_agreement_accepted: boolean | null
          quality_agreement_accepted_at: string | null
          secondary_roles: string[] | null
          show_company: boolean | null
          show_email_to: string | null
          show_name: boolean | null
          show_phone_to: string | null
          sos_allow_realtime_contact: boolean | null
          sos_categories: string[] | null
          sos_notify_methods: string[] | null
          sos_responder: boolean | null
          sos_urgency_level: string | null
          trading_intents: string[] | null
          updated_at: string | null
          user_id: string
          work_phone: string | null
        }
        Insert: {
          company_name: string
          created_at?: string | null
          id?: string
          industries?: string[] | null
          job_title?: string | null
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_step?: number | null
          pain_points?: string[] | null
          pain_points_other?: string | null
          primary_role: string
          quality_agreement_accepted?: boolean | null
          quality_agreement_accepted_at?: string | null
          secondary_roles?: string[] | null
          show_company?: boolean | null
          show_email_to?: string | null
          show_name?: boolean | null
          show_phone_to?: string | null
          sos_allow_realtime_contact?: boolean | null
          sos_categories?: string[] | null
          sos_notify_methods?: string[] | null
          sos_responder?: boolean | null
          sos_urgency_level?: string | null
          trading_intents?: string[] | null
          updated_at?: string | null
          user_id: string
          work_phone?: string | null
        }
        Update: {
          company_name?: string
          created_at?: string | null
          id?: string
          industries?: string[] | null
          job_title?: string | null
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_step?: number | null
          pain_points?: string[] | null
          pain_points_other?: string | null
          primary_role?: string
          quality_agreement_accepted?: boolean | null
          quality_agreement_accepted_at?: string | null
          secondary_roles?: string[] | null
          show_company?: boolean | null
          show_email_to?: string | null
          show_name?: boolean | null
          show_phone_to?: string | null
          sos_allow_realtime_contact?: boolean | null
          sos_categories?: string[] | null
          sos_notify_methods?: string[] | null
          sos_responder?: boolean | null
          sos_urgency_level?: string | null
          trading_intents?: string[] | null
          updated_at?: string | null
          user_id?: string
          work_phone?: string | null
        }
        Relationships: []
      }
      user_equipment_interests: {
        Row: {
          brands: string[] | null
          created_at: string | null
          id: string
          subcategories: string[] | null
          tier1: string
          tier2: string
          user_id: string
        }
        Insert: {
          brands?: string[] | null
          created_at?: string | null
          id?: string
          subcategories?: string[] | null
          tier1: string
          tier2: string
          user_id: string
        }
        Update: {
          brands?: string[] | null
          created_at?: string | null
          id?: string
          subcategories?: string[] | null
          tier1?: string
          tier2?: string
          user_id?: string
        }
        Relationships: []
      }
      view_sessions: {
        Row: {
          id: string
          listing_id: string
          session_id: string
          user_id: string | null
          viewed_at: string | null
        }
        Insert: {
          id?: string
          listing_id: string
          session_id: string
          user_id?: string | null
          viewed_at?: string | null
        }
        Update: {
          id?: string
          listing_id?: string
          session_id?: string
          user_id?: string | null
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "view_sessions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "view_sessions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "pricing_comparables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "view_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      viewing_requests: {
        Row: {
          buyer_id: string
          created_at: string | null
          id: string
          listing_id: string
          message: string | null
          proposed_datetime: string
          seller_id: string
          status: string
        }
        Insert: {
          buyer_id: string
          created_at?: string | null
          id?: string
          listing_id: string
          message?: string | null
          proposed_datetime: string
          seller_id: string
          status?: string
        }
        Update: {
          buyer_id?: string
          created_at?: string | null
          id?: string
          listing_id?: string
          message?: string | null
          proposed_datetime?: string
          seller_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "viewing_requests_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viewing_requests_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viewing_requests_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "pricing_comparables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viewing_requests_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_briefs: {
        Row: {
          ai_brief: string
          created_at: string | null
          id: string
          period_end: string
          period_start: string
          raw_data: Json
          sent_to: string[]
        }
        Insert: {
          ai_brief: string
          created_at?: string | null
          id?: string
          period_end: string
          period_start: string
          raw_data: Json
          sent_to?: string[]
        }
        Update: {
          ai_brief?: string
          created_at?: string | null
          id?: string
          period_end?: string
          period_start?: string
          raw_data?: Json
          sent_to?: string[]
        }
        Relationships: []
      }
    }
    Views: {
      pricing_comparables: {
        Row: {
          category: string | null
          condition: string | null
          created_at: string | null
          days_on_market: number | null
          id: string | null
          location_city: string | null
          location_state: string | null
          manufacturer: string | null
          model: string | null
          price_cents: number | null
          region: string | null
          specifications: Json | null
          status: string | null
          title: string | null
          updated_at: string | null
          year: string | null
        }
        Insert: {
          category?: string | null
          condition?: string | null
          created_at?: string | null
          days_on_market?: never
          id?: string | null
          location_city?: string | null
          location_state?: string | null
          manufacturer?: never
          model?: never
          price_cents?: number | null
          region?: never
          specifications?: Json | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          year?: never
        }
        Update: {
          category?: string | null
          condition?: string | null
          created_at?: string | null
          days_on_market?: never
          id?: string | null
          location_city?: string | null
          location_state?: string | null
          manufacturer?: never
          model?: never
          price_cents?: number | null
          region?: never
          specifications?: Json | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
          year?: never
        }
        Relationships: []
      }
    }
    Functions: {
      expire_old_sos_requests: { Args: never; Returns: undefined }
      find_sos_responders: {
        Args: { p_subcategory?: string; p_tier2: string }
        Returns: {
          notify_methods: string[]
          user_id: string
        }[]
      }
      get_user_active_sos_count: {
        Args: { p_user_id: string }
        Returns: number
      }
    }
    Enums: {
      admin_role: "superadmin" | "moderator" | "analyst"
      company_priority_tier: "standard" | "preferred" | "featured" | "platinum"
      company_role: "owner" | "admin" | "member"
      sos_response_status: "pending" | "accepted" | "declined" | "expired"
      sos_status: "active" | "fulfilled" | "expired" | "cancelled"
      sos_urgency: "critical" | "normal"
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
      admin_role: ["superadmin", "moderator", "analyst"],
      company_priority_tier: ["standard", "preferred", "featured", "platinum"],
      company_role: ["owner", "admin", "member"],
      sos_response_status: ["pending", "accepted", "declined", "expired"],
      sos_status: ["active", "fulfilled", "expired", "cancelled"],
      sos_urgency: ["critical", "normal"],
    },
  },
} as const
