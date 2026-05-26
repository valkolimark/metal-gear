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
      ai_suggestion_feedback: {
        Row: {
          created_at: string
          field_name: string
          id: number
          source_row_id: string
          source_table: string
          suggested_value: string | null
          surface: string
          user_action: string
          user_id: string | null
          user_value: string | null
        }
        Insert: {
          created_at?: string
          field_name: string
          id?: number
          source_row_id: string
          source_table: string
          suggested_value?: string | null
          surface: string
          user_action: string
          user_id?: string | null
          user_value?: string | null
        }
        Update: {
          created_at?: string
          field_name?: string
          id?: number
          source_row_id?: string
          source_table?: string
          suggested_value?: string | null
          surface?: string
          user_action?: string
          user_id?: string | null
          user_value?: string | null
        }
        Relationships: []
      }
      ai_usage_events: {
        Row: {
          company_id: string | null
          cost_cents: number
          error_class: string | null
          id: number
          input_tokens: number | null
          latency_ms: number | null
          model: string | null
          occurred_at: string
          output_tokens: number | null
          success: boolean
          surface: string
          trace_id: string | null
          user_id: string | null
          vendor: string
          vision_units: number | null
        }
        Insert: {
          company_id?: string | null
          cost_cents?: number
          error_class?: string | null
          id?: number
          input_tokens?: number | null
          latency_ms?: number | null
          model?: string | null
          occurred_at?: string
          output_tokens?: number | null
          success?: boolean
          surface: string
          trace_id?: string | null
          user_id?: string | null
          vendor: string
          vision_units?: number | null
        }
        Update: {
          company_id?: string | null
          cost_cents?: number
          error_class?: string | null
          id?: number
          input_tokens?: number | null
          latency_ms?: number | null
          model?: string | null
          occurred_at?: string
          output_tokens?: number | null
          success?: boolean
          surface?: string
          trace_id?: string | null
          user_id?: string | null
          vendor?: string
          vision_units?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
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
          feed_post_id: string | null
          id: string
          item_type: string
          listing_id: string | null
          notes: string | null
          video_listing_id: string | null
          video_post_id: string | null
          video_ref_id: string | null
          video_source_type: string | null
          video_thumbnail_url: string | null
          video_title: string | null
        }
        Insert: {
          added_at?: string | null
          collection_id: string
          feed_post_id?: string | null
          id?: string
          item_type?: string
          listing_id?: string | null
          notes?: string | null
          video_listing_id?: string | null
          video_post_id?: string | null
          video_ref_id?: string | null
          video_source_type?: string | null
          video_thumbnail_url?: string | null
          video_title?: string | null
        }
        Update: {
          added_at?: string | null
          collection_id?: string
          feed_post_id?: string | null
          id?: string
          item_type?: string
          listing_id?: string | null
          notes?: string | null
          video_listing_id?: string | null
          video_post_id?: string | null
          video_ref_id?: string | null
          video_source_type?: string | null
          video_thumbnail_url?: string | null
          video_title?: string | null
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
            foreignKeyName: "collection_items_feed_post_id_fkey"
            columns: ["feed_post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
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
          {
            foreignKeyName: "collection_items_video_listing_id_fkey"
            columns: ["video_listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_items_video_listing_id_fkey"
            columns: ["video_listing_id"]
            isOneToOne: false
            referencedRelation: "pricing_comparables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "collection_items_video_post_id_fkey"
            columns: ["video_post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
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
          is_default: boolean
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
          is_default?: boolean
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
          is_default?: boolean
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
      company_favorites: {
        Row: {
          company_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_favorites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      company_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          company_id: string
          created_at: string
          email: string
          expires_at: string
          id: string
          invited_by: string
          role: string
          status: string
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          company_id: string
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invited_by: string
          role?: string
          status?: string
          token?: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          company_id?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invited_by?: string
          role?: string
          status?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "company_invites_accepted_by_fkey"
            columns: ["accepted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_invites_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "company_invites_invited_by_fkey"
            columns: ["invited_by"]
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
          is_public_on_profile: boolean
          joined_at: string
          role: Database["public"]["Enums"]["company_role"]
          user_id: string
        }
        Insert: {
          company_id: string
          id?: string
          invited_by?: string | null
          is_active?: boolean
          is_public_on_profile?: boolean
          joined_at?: string
          role?: Database["public"]["Enums"]["company_role"]
          user_id: string
        }
        Update: {
          company_id?: string
          id?: string
          invited_by?: string | null
          is_active?: boolean
          is_public_on_profile?: boolean
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
          industries: string[]
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
          industries?: string[]
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
          industries?: string[]
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
      contact_credits: {
        Row: {
          credits_remaining: number
          credits_used_this_month: number
          id: string
          period_start: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          credits_remaining?: number
          credits_used_this_month?: number
          id?: string
          period_start?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          credits_remaining?: number
          credits_used_this_month?: number
          id?: string
          period_start?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_credits_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      contact_reveals: {
        Row: {
          credits_spent: number
          id: string
          listing_id: string | null
          period_month: string
          revealed_at: string | null
          seller_id: string
          viewer_id: string
        }
        Insert: {
          credits_spent?: number
          id?: string
          listing_id?: string | null
          period_month?: string
          revealed_at?: string | null
          seller_id: string
          viewer_id: string
        }
        Update: {
          credits_spent?: number
          id?: string
          listing_id?: string | null
          period_month?: string
          revealed_at?: string | null
          seller_id?: string
          viewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "contact_reveals_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_reveals_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "pricing_comparables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_reveals_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contact_reveals_viewer_id_fkey"
            columns: ["viewer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          buyer_id: string | null
          created_at: string
          id: string
          last_message_at: string | null
          listing_id: string
          seller_id: string | null
        }
        Insert: {
          buyer_id?: string | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          listing_id: string
          seller_id?: string | null
        }
        Update: {
          buyer_id?: string | null
          created_at?: string
          id?: string
          last_message_at?: string | null
          listing_id?: string
          seller_id?: string | null
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
      credit_purchases: {
        Row: {
          amount_paid: number
          credits_purchased: number
          id: string
          purchased_at: string | null
          stripe_payment_intent_id: string | null
          user_id: string
        }
        Insert: {
          amount_paid: number
          credits_purchased: number
          id?: string
          purchased_at?: string | null
          stripe_payment_intent_id?: string | null
          user_id: string
        }
        Update: {
          amount_paid?: number
          credits_purchased?: number
          id?: string
          purchased_at?: string | null
          stripe_payment_intent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "credit_purchases_user_id_fkey"
            columns: ["user_id"]
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
      feed_hashtags: {
        Row: {
          last_used_at: string
          post_count: number
          tag: string
        }
        Insert: {
          last_used_at?: string
          post_count?: number
          tag: string
        }
        Update: {
          last_used_at?: string
          post_count?: number
          tag?: string
        }
        Relationships: []
      }
      feed_post_comments: {
        Row: {
          author_id: string
          company_id: string | null
          content: string
          created_at: string
          id: string
          is_deleted: boolean
          parent_comment_id: string | null
          post_id: string
        }
        Insert: {
          author_id: string
          company_id?: string | null
          content: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          parent_comment_id?: string | null
          post_id: string
        }
        Update: {
          author_id?: string
          company_id?: string | null
          content?: string
          created_at?: string
          id?: string
          is_deleted?: boolean
          parent_comment_id?: string | null
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_post_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_post_comments_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_post_comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "feed_post_comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_post_comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_post_media: {
        Row: {
          created_at: string
          id: string
          media_type: string
          media_url: string
          post_id: string
          sort_order: number
          status: string
          stream_video_id: string | null
          thumbnail_url: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          media_type: string
          media_url: string
          post_id: string
          sort_order?: number
          status?: string
          stream_video_id?: string | null
          thumbnail_url?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          media_type?: string
          media_url?: string
          post_id?: string
          sort_order?: number
          status?: string
          stream_video_id?: string | null
          thumbnail_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feed_post_media_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_post_reactions: {
        Row: {
          created_at: string
          id: string
          post_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          post_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_post_reactions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "feed_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_post_reactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      feed_posts: {
        Row: {
          author_id: string
          comments_count: number
          company_id: string | null
          content: string | null
          created_at: string
          edited_at: string | null
          hashtags: string[]
          id: string
          is_deleted: boolean
          reactions_count: number
          tagged_user_ids: string[]
          updated_at: string
        }
        Insert: {
          author_id: string
          comments_count?: number
          company_id?: string | null
          content?: string | null
          created_at?: string
          edited_at?: string | null
          hashtags?: string[]
          id?: string
          is_deleted?: boolean
          reactions_count?: number
          tagged_user_ids?: string[]
          updated_at?: string
        }
        Update: {
          author_id?: string
          comments_count?: number
          company_id?: string | null
          content?: string | null
          created_at?: string
          edited_at?: string | null
          hashtags?: string[]
          id?: string
          is_deleted?: boolean
          reactions_count?: number
          tagged_user_ids?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "feed_posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "feed_posts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
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
      listing_drafts: {
        Row: {
          analysis_stage: string | null
          clarifying_questions: Json | null
          claude_raw: Json | null
          company_id: string | null
          confidence_scores: Json
          created_at: string
          error_message: string | null
          expires_at: string
          fields: Json
          id: string
          internal_duplicate_listing_id: string | null
          nameplate_photo_index: number | null
          ocr_raw: Json | null
          owner_id: string
          photo_coach: Json | null
          photo_urls: string[]
          published_listing_id: string | null
          status: string
          stock_photo_matches: string[] | null
          updated_at: string
          web_detection_raw: Json | null
        }
        Insert: {
          analysis_stage?: string | null
          clarifying_questions?: Json | null
          claude_raw?: Json | null
          company_id?: string | null
          confidence_scores?: Json
          created_at?: string
          error_message?: string | null
          expires_at?: string
          fields?: Json
          id?: string
          internal_duplicate_listing_id?: string | null
          nameplate_photo_index?: number | null
          ocr_raw?: Json | null
          owner_id: string
          photo_coach?: Json | null
          photo_urls?: string[]
          published_listing_id?: string | null
          status?: string
          stock_photo_matches?: string[] | null
          updated_at?: string
          web_detection_raw?: Json | null
        }
        Update: {
          analysis_stage?: string | null
          clarifying_questions?: Json | null
          claude_raw?: Json | null
          company_id?: string | null
          confidence_scores?: Json
          created_at?: string
          error_message?: string | null
          expires_at?: string
          fields?: Json
          id?: string
          internal_duplicate_listing_id?: string | null
          nameplate_photo_index?: number | null
          ocr_raw?: Json | null
          owner_id?: string
          photo_coach?: Json | null
          photo_urls?: string[]
          published_listing_id?: string | null
          status?: string
          stock_photo_matches?: string[] | null
          updated_at?: string
          web_detection_raw?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "listing_drafts_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_drafts_internal_duplicate_listing_id_fkey"
            columns: ["internal_duplicate_listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_drafts_internal_duplicate_listing_id_fkey"
            columns: ["internal_duplicate_listing_id"]
            isOneToOne: false
            referencedRelation: "pricing_comparables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_drafts_published_listing_id_fkey"
            columns: ["published_listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_drafts_published_listing_id_fkey"
            columns: ["published_listing_id"]
            isOneToOne: false
            referencedRelation: "pricing_comparables"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_freshness_suggestions: {
        Row: {
          acted_on: boolean
          acted_on_at: string | null
          ai_description_tip: string | null
          ai_price_reasoning: string | null
          ai_price_suggestion: number | null
          ai_title_suggestion: string | null
          created_at: string
          email_sent_at: string | null
          id: string
          listing_id: string
          seller_id: string
        }
        Insert: {
          acted_on?: boolean
          acted_on_at?: string | null
          ai_description_tip?: string | null
          ai_price_reasoning?: string | null
          ai_price_suggestion?: number | null
          ai_title_suggestion?: string | null
          created_at?: string
          email_sent_at?: string | null
          id?: string
          listing_id: string
          seller_id: string
        }
        Update: {
          acted_on?: boolean
          acted_on_at?: string | null
          ai_description_tip?: string | null
          ai_price_reasoning?: string | null
          ai_price_suggestion?: number | null
          ai_title_suggestion?: string | null
          created_at?: string
          email_sent_at?: string | null
          id?: string
          listing_id?: string
          seller_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_freshness_suggestions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_freshness_suggestions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "pricing_comparables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listing_freshness_suggestions_seller_id_fkey"
            columns: ["seller_id"]
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
          company_id: string | null
          created_at: string
          created_listing_ids: string[] | null
          error_count: number
          error_log: Json | null
          errors: Json | null
          failed_rows: number
          file_format: string | null
          filename: string | null
          hidden_listing_count: number | null
          id: string
          image_fetch_attempted: number
          image_fetch_failed: number
          image_fetch_succeeded: number
          processed_rows: number
          status: string
          success_count: number
          successful_rows: number
          total_rows: number
          user_id: string
        }
        Insert: {
          company_id?: string | null
          created_at?: string
          created_listing_ids?: string[] | null
          error_count?: number
          error_log?: Json | null
          errors?: Json | null
          failed_rows?: number
          file_format?: string | null
          filename?: string | null
          hidden_listing_count?: number | null
          id?: string
          image_fetch_attempted?: number
          image_fetch_failed?: number
          image_fetch_succeeded?: number
          processed_rows?: number
          status?: string
          success_count?: number
          successful_rows?: number
          total_rows?: number
          user_id: string
        }
        Update: {
          company_id?: string | null
          created_at?: string
          created_listing_ids?: string[] | null
          error_count?: number
          error_log?: Json | null
          errors?: Json | null
          failed_rows?: number
          file_format?: string | null
          filename?: string | null
          hidden_listing_count?: number | null
          id?: string
          image_fetch_attempted?: number
          image_fetch_failed?: number
          image_fetch_succeeded?: number
          processed_rows?: number
          status?: string
          success_count?: number
          successful_rows?: number
          total_rows?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_imports_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
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
          ai_assisted: boolean
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
          has_media: boolean
          id: string
          industries: string[]
          is_featured: boolean
          listing_quality_score: number | null
          location_city: string
          location_lat: number
          location_lng: number
          location_state: string
          manufacturer_id: string | null
          manufacturer_model_id: string | null
          negotiable: boolean
          pinned_category: string | null
          pinned_position: number | null
          price_cents: number | null
          quantity: number | null
          refreshed_at: string | null
          registry_match_confidence: number | null
          registry_match_method: string | null
          seller_id: string
          sku: string | null
          source_draft_id: string | null
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
          ai_assisted?: boolean
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
          has_media?: boolean
          id?: string
          industries?: string[]
          is_featured?: boolean
          listing_quality_score?: number | null
          location_city?: string
          location_lat?: number
          location_lng?: number
          location_state?: string
          manufacturer_id?: string | null
          manufacturer_model_id?: string | null
          negotiable?: boolean
          pinned_category?: string | null
          pinned_position?: number | null
          price_cents?: number | null
          quantity?: number | null
          refreshed_at?: string | null
          registry_match_confidence?: number | null
          registry_match_method?: string | null
          seller_id: string
          sku?: string | null
          source_draft_id?: string | null
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
          ai_assisted?: boolean
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
          has_media?: boolean
          id?: string
          industries?: string[]
          is_featured?: boolean
          listing_quality_score?: number | null
          location_city?: string
          location_lat?: number
          location_lng?: number
          location_state?: string
          manufacturer_id?: string | null
          manufacturer_model_id?: string | null
          negotiable?: boolean
          pinned_category?: string | null
          pinned_position?: number | null
          price_cents?: number | null
          quantity?: number | null
          refreshed_at?: string | null
          registry_match_confidence?: number | null
          registry_match_method?: string | null
          seller_id?: string
          sku?: string | null
          source_draft_id?: string | null
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
            foreignKeyName: "listings_manufacturer_id_fkey"
            columns: ["manufacturer_id"]
            isOneToOne: false
            referencedRelation: "manufacturers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_manufacturer_model_id_fkey"
            columns: ["manufacturer_model_id"]
            isOneToOne: false
            referencedRelation: "manufacturer_models"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "listings_source_draft_id_fkey"
            columns: ["source_draft_id"]
            isOneToOne: false
            referencedRelation: "listing_drafts"
            referencedColumns: ["id"]
          },
        ]
      }
      manufacturer_models: {
        Row: {
          created_at: string
          equipment_type: string | null
          id: string
          manufacturer_id: string
          name: string
          notes: string | null
          series: string | null
          slug: string
          source_file: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          equipment_type?: string | null
          id?: string
          manufacturer_id: string
          name: string
          notes?: string | null
          series?: string | null
          slug: string
          source_file: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          equipment_type?: string | null
          id?: string
          manufacturer_id?: string
          name?: string
          notes?: string | null
          series?: string | null
          slug?: string
          source_file?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "manufacturer_models_manufacturer_id_fkey"
            columns: ["manufacturer_id"]
            isOneToOne: false
            referencedRelation: "manufacturers"
            referencedColumns: ["id"]
          },
        ]
      }
      manufacturers: {
        Row: {
          aliases: string[]
          country: string | null
          created_at: string
          equipment_categories: string[]
          id: string
          name: string
          notes: string | null
          parent_manufacturer_id: string | null
          slug: string
          source_file: string
          tier: number
          updated_at: string
        }
        Insert: {
          aliases?: string[]
          country?: string | null
          created_at?: string
          equipment_categories?: string[]
          id?: string
          name: string
          notes?: string | null
          parent_manufacturer_id?: string | null
          slug: string
          source_file: string
          tier: number
          updated_at?: string
        }
        Update: {
          aliases?: string[]
          country?: string | null
          created_at?: string
          equipment_categories?: string[]
          id?: string
          name?: string
          notes?: string | null
          parent_manufacturer_id?: string | null
          slug?: string
          source_file?: string
          tier?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "manufacturers_parent_manufacturer_id_fkey"
            columns: ["parent_manufacturer_id"]
            isOneToOne: false
            referencedRelation: "manufacturers"
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
          deleted_content_replacement: string | null
          id: string
          is_deleted: boolean
          read_at: string | null
          sender_id: string | null
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          deleted_content_replacement?: string | null
          id?: string
          is_deleted?: boolean
          read_at?: string | null
          sender_id?: string | null
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          deleted_content_replacement?: string | null
          id?: string
          is_deleted?: boolean
          read_at?: string | null
          sender_id?: string | null
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
          contact_email: string | null
          contact_visibility: string
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          deletion_reason: string | null
          deletion_type: string | null
          display_name: string | null
          email_notifications: Json | null
          full_name: string
          id: string
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
          contact_email?: string | null
          contact_visibility?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          deletion_type?: string | null
          display_name?: string | null
          email_notifications?: Json | null
          full_name?: string
          id: string
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
          contact_email?: string | null
          contact_visibility?: string
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          deletion_reason?: string | null
          deletion_type?: string | null
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
            foreignKeyName: "profiles_deleted_by_fkey"
            columns: ["deleted_by"]
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
      r2_cleanup_queue: {
        Row: {
          created_at: string
          error: string | null
          id: string
          processed_at: string | null
          r2_key: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          id?: string
          processed_at?: string | null
          r2_key: string
        }
        Update: {
          created_at?: string
          error?: string | null
          id?: string
          processed_at?: string | null
          r2_key?: string
        }
        Relationships: []
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
      registry_match_feedback: {
        Row: {
          created_at: string
          id: number
          source_row_id: string
          source_table: string
          suggested_manufacturer_id: string | null
          suggested_model_id: string | null
          user_action: string
          user_id: string | null
          user_text_value: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          source_row_id: string
          source_table: string
          suggested_manufacturer_id?: string | null
          suggested_model_id?: string | null
          user_action: string
          user_id?: string | null
          user_text_value?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          source_row_id?: string
          source_table?: string
          suggested_manufacturer_id?: string | null
          suggested_model_id?: string | null
          user_action?: string
          user_id?: string | null
          user_text_value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "registry_match_feedback_suggested_manufacturer_id_fkey"
            columns: ["suggested_manufacturer_id"]
            isOneToOne: false
            referencedRelation: "manufacturers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "registry_match_feedback_suggested_model_id_fkey"
            columns: ["suggested_model_id"]
            isOneToOne: false
            referencedRelation: "manufacturer_models"
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
          seller_id: string | null
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
          seller_id?: string | null
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
          seller_id?: string | null
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
      seller_services: {
        Row: {
          created_at: string
          custom_category: string | null
          custom_label: string | null
          description: string | null
          id: string
          is_active: boolean
          price_from_usd: number | null
          seller_company_id: string | null
          seller_profile_id: string | null
          sla_max_days: number | null
          sla_min_days: number | null
          sort_order: number
          taxonomy_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          custom_category?: string | null
          custom_label?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          price_from_usd?: number | null
          seller_company_id?: string | null
          seller_profile_id?: string | null
          sla_max_days?: number | null
          sla_min_days?: number | null
          sort_order?: number
          taxonomy_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          custom_category?: string | null
          custom_label?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          price_from_usd?: number | null
          seller_company_id?: string | null
          seller_profile_id?: string | null
          sla_max_days?: number | null
          sla_min_days?: number | null
          sort_order?: number
          taxonomy_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_services_seller_company_id_fkey"
            columns: ["seller_company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_services_seller_profile_id_fkey"
            columns: ["seller_profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_services_taxonomy_id_fkey"
            columns: ["taxonomy_id"]
            isOneToOne: false
            referencedRelation: "seller_services_taxonomy"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_services_taxonomy: {
        Row: {
          category: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          label: string
          slug: string
          sort_order: number
          typical_price_from_usd: number | null
          typical_sla_max_days: number | null
          typical_sla_min_days: number | null
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          label: string
          slug: string
          sort_order?: number
          typical_price_from_usd?: number | null
          typical_sla_max_days?: number | null
          typical_sla_min_days?: number | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          label?: string
          slug?: string
          sort_order?: number
          typical_price_from_usd?: number | null
          typical_sla_max_days?: number | null
          typical_sla_min_days?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      seller_followers: {
        Row: {
          created_at: string
          follower_id: string
          id: string
          seller_company_id: string | null
          seller_profile_id: string | null
        }
        Insert: {
          created_at?: string
          follower_id: string
          id?: string
          seller_company_id?: string | null
          seller_profile_id?: string | null
        }
        Update: {
          created_at?: string
          follower_id?: string
          id?: string
          seller_company_id?: string | null
          seller_profile_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_followers_follower_id_fkey"
            columns: ["follower_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_followers_seller_company_id_fkey"
            columns: ["seller_company_id"]
            isOneToOne: false
            referencedRelation: "company_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seller_followers_seller_profile_id_fkey"
            columns: ["seller_profile_id"]
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
          ein: string | null
          ein_submitted_at: string | null
          id: string
          rejection_reason: string | null
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
          ein?: string | null
          ein_submitted_at?: string | null
          id?: string
          rejection_reason?: string | null
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
          ein?: string | null
          ein_submitted_at?: string | null
          id?: string
          rejection_reason?: string | null
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
      snap_list_accuracy_reviews: {
        Row: {
          ai_value: string | null
          correct: boolean
          created_at: string
          draft_id: string
          field_name: string
          id: string
          notes: string | null
          reviewer_id: string
        }
        Insert: {
          ai_value?: string | null
          correct: boolean
          created_at?: string
          draft_id: string
          field_name: string
          id?: string
          notes?: string | null
          reviewer_id: string
        }
        Update: {
          ai_value?: string | null
          correct?: boolean
          created_at?: string
          draft_id?: string
          field_name?: string
          id?: string
          notes?: string | null
          reviewer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "snap_list_accuracy_reviews_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "listing_drafts"
            referencedColumns: ["id"]
          },
        ]
      }
      snap_list_events: {
        Row: {
          created_at: string
          draft_id: string | null
          event_type: string
          id: number
          owner_id: string
          payload: Json
        }
        Insert: {
          created_at?: string
          draft_id?: string | null
          event_type: string
          id?: number
          owner_id: string
          payload?: Json
        }
        Update: {
          created_at?: string
          draft_id?: string | null
          event_type?: string
          id?: number
          owner_id?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "snap_list_events_draft_id_fkey"
            columns: ["draft_id"]
            isOneToOne: false
            referencedRelation: "listing_drafts"
            referencedColumns: ["id"]
          },
        ]
      }
      snap_list_usage: {
        Row: {
          analysis_count: number
          created_at: string
          id: string
          month_year: string
          owner_id: string
          publish_count: number
          updated_at: string
        }
        Insert: {
          analysis_count?: number
          created_at?: string
          id?: string
          month_year: string
          owner_id: string
          publish_count?: number
          updated_at?: string
        }
        Update: {
          analysis_count?: number
          created_at?: string
          id?: string
          month_year?: string
          owner_id?: string
          publish_count?: number
          updated_at?: string
        }
        Relationships: []
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
          manufacturer_id: string | null
          manufacturer_model_id: string | null
          max_distance_miles: number | null
          model: string | null
          notes: string | null
          photos: string[] | null
          ranked_response_ids: Json | null
          requester_id: string
          status: Database["public"]["Enums"]["sos_status"] | null
          title: string
          transport_needed: boolean
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
          manufacturer_id?: string | null
          manufacturer_model_id?: string | null
          max_distance_miles?: number | null
          model?: string | null
          notes?: string | null
          photos?: string[] | null
          ranked_response_ids?: Json | null
          requester_id: string
          status?: Database["public"]["Enums"]["sos_status"] | null
          title: string
          transport_needed?: boolean
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
          manufacturer_id?: string | null
          manufacturer_model_id?: string | null
          max_distance_miles?: number | null
          model?: string | null
          notes?: string | null
          photos?: string[] | null
          ranked_response_ids?: Json | null
          requester_id?: string
          status?: Database["public"]["Enums"]["sos_status"] | null
          title?: string
          transport_needed?: boolean
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
          {
            foreignKeyName: "sos_requests_manufacturer_id_fkey"
            columns: ["manufacturer_id"]
            isOneToOne: false
            referencedRelation: "manufacturers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sos_requests_manufacturer_model_id_fkey"
            columns: ["manufacturer_model_id"]
            isOneToOne: false
            referencedRelation: "manufacturer_models"
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
          billing_period: string
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
          billing_period?: string
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
          billing_period?: string
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
          archetype: string | null
          archetype_locked: boolean
          company_name: string
          created_at: string | null
          dot_mc_number: string | null
          equipment_capabilities: string[] | null
          fleet_size: string | null
          id: string
          industries: string[] | null
          job_title: string | null
          logistics_coverage: string | null
          logistics_type: string | null
          monthly_volume: string | null
          onboarding_completed: boolean | null
          onboarding_completed_at: string | null
          onboarding_step: number | null
          pain_points: string[] | null
          pain_points_other: string | null
          primary_role: string
          quality_agreement_accepted: boolean | null
          quality_agreement_accepted_at: string | null
          secondary_roles: string[] | null
          service_area: string | null
          service_types: string[] | null
          show_company: boolean | null
          show_email_to: string | null
          show_name: boolean | null
          show_phone_to: string | null
          sos_allow_realtime_contact: boolean | null
          sos_categories: string[] | null
          sos_notify_methods: string[] | null
          sos_opted_in: boolean | null
          sos_receive_all: boolean
          sos_responder: boolean | null
          sos_urgency_level: string | null
          sourcing_methods: string[] | null
          sub_role: string | null
          trading_activities: string[] | null
          trading_intents: string[] | null
          updated_at: string | null
          user_id: string
          work_phone: string | null
        }
        Insert: {
          archetype?: string | null
          archetype_locked?: boolean
          company_name: string
          created_at?: string | null
          dot_mc_number?: string | null
          equipment_capabilities?: string[] | null
          fleet_size?: string | null
          id?: string
          industries?: string[] | null
          job_title?: string | null
          logistics_coverage?: string | null
          logistics_type?: string | null
          monthly_volume?: string | null
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_step?: number | null
          pain_points?: string[] | null
          pain_points_other?: string | null
          primary_role: string
          quality_agreement_accepted?: boolean | null
          quality_agreement_accepted_at?: string | null
          secondary_roles?: string[] | null
          service_area?: string | null
          service_types?: string[] | null
          show_company?: boolean | null
          show_email_to?: string | null
          show_name?: boolean | null
          show_phone_to?: string | null
          sos_allow_realtime_contact?: boolean | null
          sos_categories?: string[] | null
          sos_notify_methods?: string[] | null
          sos_opted_in?: boolean | null
          sos_receive_all?: boolean
          sos_responder?: boolean | null
          sos_urgency_level?: string | null
          sourcing_methods?: string[] | null
          sub_role?: string | null
          trading_activities?: string[] | null
          trading_intents?: string[] | null
          updated_at?: string | null
          user_id: string
          work_phone?: string | null
        }
        Update: {
          archetype?: string | null
          archetype_locked?: boolean
          company_name?: string
          created_at?: string | null
          dot_mc_number?: string | null
          equipment_capabilities?: string[] | null
          fleet_size?: string | null
          id?: string
          industries?: string[] | null
          job_title?: string | null
          logistics_coverage?: string | null
          logistics_type?: string | null
          monthly_volume?: string | null
          onboarding_completed?: boolean | null
          onboarding_completed_at?: string | null
          onboarding_step?: number | null
          pain_points?: string[] | null
          pain_points_other?: string | null
          primary_role?: string
          quality_agreement_accepted?: boolean | null
          quality_agreement_accepted_at?: string | null
          secondary_roles?: string[] | null
          service_area?: string | null
          service_types?: string[] | null
          show_company?: boolean | null
          show_email_to?: string | null
          show_name?: boolean | null
          show_phone_to?: string | null
          sos_allow_realtime_contact?: boolean | null
          sos_categories?: string[] | null
          sos_notify_methods?: string[] | null
          sos_opted_in?: boolean | null
          sos_receive_all?: boolean
          sos_responder?: boolean | null
          sos_urgency_level?: string | null
          sourcing_methods?: string[] | null
          sub_role?: string | null
          trading_activities?: string[] | null
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
      cleanup_expired_drafts: { Args: never; Returns: number }
      decrement_feed_hashtags: { Args: { tags: string[] }; Returns: undefined }
      decrement_post_comments: { Args: { p_post_id: string }; Returns: number }
      decrement_post_reactions: { Args: { p_post_id: string }; Returns: number }
      expire_old_sos_requests: { Args: never; Returns: undefined }
      find_sos_responders: {
        Args: { p_subcategory?: string; p_tier2: string }
        Returns: {
          notify_methods: string[]
          user_id: string
        }[]
      }
      get_auth_providers_for_email: {
        Args: { p_email: string }
        Returns: string[]
      }
      get_for_you_feed: {
        Args: { p_cursor: string; p_limit: number; p_user_id: string }
        Returns: {
          author_id: string
          comments_count: number
          company_id: string
          content: string
          created_at: string
          edited_at: string
          hashtags: string[]
          id: string
          reactions_count: number
          tagged_user_ids: string[]
        }[]
      }
      get_user_active_sos_count: {
        Args: { p_user_id: string }
        Returns: number
      }
      increment_import_counter: {
        Args: { amount?: number; column_name: string; import_id: string }
        Returns: undefined
      }
      increment_post_comments: { Args: { p_post_id: string }; Returns: number }
      increment_post_reactions: { Args: { p_post_id: string }; Returns: number }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      upsert_feed_hashtags: { Args: { tags: string[] }; Returns: undefined }
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
