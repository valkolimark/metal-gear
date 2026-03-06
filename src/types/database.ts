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
          id: string
          admin_id: string
          action: string
          target_type: string
          target_id: string
          details: Json | null
          metadata: Json | null
          ip_address: string | null
          created_at: string
        }
        Insert: {
          id?: string
          admin_id: string
          action: string
          target_type: string
          target_id: string
          details?: Json | null
          metadata?: Json | null
          ip_address?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          admin_id?: string
          action?: string
          target_type?: string
          target_id?: string
          details?: Json | null
          metadata?: Json | null
          ip_address?: string | null
          created_at?: string
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
            foreignKeyName: "conversations_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      collections: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string | null
          is_public: boolean
          cover_image_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          description?: string | null
          is_public?: boolean
          cover_image_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          description?: string | null
          is_public?: boolean
          cover_image_url?: string | null
          created_at?: string
          updated_at?: string
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
      collection_items: {
        Row: {
          id: string
          collection_id: string
          listing_id: string
          notes: string | null
          added_at: string
        }
        Insert: {
          id?: string
          collection_id: string
          listing_id: string
          notes?: string | null
          added_at?: string
        }
        Update: {
          id?: string
          collection_id?: string
          listing_id?: string
          notes?: string | null
          added_at?: string
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
        ]
      }
      boost_purchases: {
        Row: {
          id: string
          user_id: string
          listing_id: string | null
          boost_type: string
          stripe_payment_intent_id: string | null
          amount_cents: number
          duration_days: number
          starts_at: string
          expires_at: string
          status: string
          admin_override: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          listing_id?: string | null
          boost_type: string
          stripe_payment_intent_id?: string | null
          amount_cents: number
          duration_days: number
          starts_at?: string
          expires_at: string
          status?: string
          admin_override?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          listing_id?: string | null
          boost_type?: string
          stripe_payment_intent_id?: string | null
          amount_cents?: number
          duration_days?: number
          starts_at?: string
          expires_at?: string
          status?: string
          admin_override?: boolean
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "boost_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boost_purchases_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      homepage_featured_slots: {
        Row: {
          id: string
          slot_type: string
          target_id: string
          position: number
          label: string | null
          active: boolean
          starts_at: string
          ends_at: string | null
          created_by: string | null
          created_at: string
        }
        Insert: {
          id?: string
          slot_type: string
          target_id: string
          position: number
          label?: string | null
          active?: boolean
          starts_at?: string
          ends_at?: string | null
          created_by?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          slot_type?: string
          target_id?: string
          position?: number
          label?: string | null
          active?: boolean
          starts_at?: string
          ends_at?: string | null
          created_by?: string | null
          created_at?: string
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
      condition_reports: {
        Row: {
          id: string
          listing_id: string
          created_by: string
          overall_grade: string
          mechanical_score: number
          cosmetic_score: number
          electrical_score: number
          hours_of_use: number | null
          last_service_date: string | null
          notes: string | null
          photo_urls: string[]
          created_at: string
        }
        Insert: {
          id?: string
          listing_id: string
          created_by: string
          overall_grade: string
          mechanical_score: number
          cosmetic_score: number
          electrical_score: number
          hours_of_use?: number | null
          last_service_date?: string | null
          notes?: string | null
          photo_urls?: string[]
          created_at?: string
        }
        Update: {
          id?: string
          listing_id?: string
          created_by?: string
          overall_grade?: string
          mechanical_score?: number
          cosmetic_score?: number
          electrical_score?: number
          hours_of_use?: number | null
          last_service_date?: string | null
          notes?: string | null
          photo_urls?: string[]
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "condition_reports_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: true
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "condition_reports_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          id: string
          transaction_id: string
          opened_by: string
          reason: string
          description: string
          evidence_urls: string[]
          status: string
          seller_response: string | null
          seller_evidence_urls: string[]
          resolution_notes: string | null
          resolved_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          transaction_id: string
          opened_by: string
          reason: string
          description: string
          evidence_urls?: string[]
          status?: string
          seller_response?: string | null
          seller_evidence_urls?: string[]
          resolution_notes?: string | null
          resolved_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          transaction_id?: string
          opened_by?: string
          reason?: string
          description?: string
          evidence_urls?: string[]
          status?: string
          seller_response?: string | null
          seller_evidence_urls?: string[]
          resolution_notes?: string | null
          resolved_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      view_sessions: {
        Row: {
          id: string
          session_id: string
          user_id: string | null
          listing_id: string
          viewed_at: string
        }
        Insert: {
          id?: string
          session_id: string
          user_id?: string | null
          listing_id: string
          viewed_at?: string
        }
        Update: {
          id?: string
          session_id?: string
          user_id?: string | null
          listing_id?: string
          viewed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "view_sessions_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          endpoint?: string
          p256dh?: string
          auth?: string
          created_at?: string
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
      onboarding_progress: {
        Row: {
          user_id: string
          steps_completed: string[]
          completed_at: string | null
          dismissed: boolean
          created_at: string
        }
        Insert: {
          user_id: string
          steps_completed?: string[]
          completed_at?: string | null
          dismissed?: boolean
          created_at?: string
        }
        Update: {
          user_id?: string
          steps_completed?: string[]
          completed_at?: string | null
          dismissed?: boolean
          created_at?: string
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
      help_articles: {
        Row: {
          id: string
          slug: string
          title: string
          category: string
          body_markdown: string
          sort_order: number
          published: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          slug: string
          title: string
          category: string
          body_markdown: string
          sort_order?: number
          published?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          slug?: string
          title?: string
          category?: string
          body_markdown?: string
          sort_order?: number
          published?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
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
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_imports: {
        Row: {
          id: string
          user_id: string
          filename: string
          total_rows: number
          success_count: number
          error_count: number
          errors: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          filename: string
          total_rows?: number
          success_count?: number
          error_count?: number
          errors?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          filename?: string
          total_rows?: number
          success_count?: number
          error_count?: number
          errors?: Json
          created_at?: string
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
          id: string
          listing_id: string
          url: string
          storage_path: string
          position: number
          created_at: string
        }
        Insert: {
          id?: string
          listing_id: string
          url: string
          storage_path: string
          position?: number
          created_at?: string
        }
        Update: {
          id?: string
          listing_id?: string
          url?: string
          storage_path?: string
          position?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "listing_videos_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      listing_views: {
        Row: {
          id: string
          listing_id: string
          viewer_id: string | null
          viewed_at: string
        }
        Insert: {
          id?: string
          listing_id: string
          viewer_id?: string | null
          viewed_at?: string
        }
        Update: {
          id?: string
          listing_id?: string
          viewer_id?: string | null
          viewed_at?: string
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
            foreignKeyName: "listing_views_viewer_id_fkey"
            columns: ["viewer_id"]
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
        ]
      }
      listings: {
        Row: {
          admin_boost: number
          admin_flag_reason: string | null
          admin_reviewed_at: string | null
          admin_reviewed_by: string | null
          ai_analyzed: boolean
          ai_fraud_flagged: boolean
          ai_fraud_reason: string | null
          auto_renew: boolean
          category: string
          condition: string
          contact_for_price: boolean
          created_at: string
          description: string
          expires_at: string | null
          favorites_count: number
          featured_until: string | null
          fts: unknown
          id: string
          industry: string | null
          is_featured: boolean
          location_city: string
          location_lat: number
          location_lng: number
          location_state: string
          negotiable: boolean
          pinned_category: string | null
          pinned_position: number | null
          price_cents: number | null
          quantity: number
          seller_id: string
          sku: string | null
          specifications: Json | null
          status: string
          title: string
          updated_at: string
          views_count: number
          warehouse_location: string | null
        }
        Insert: {
          admin_boost?: number
          admin_flag_reason?: string | null
          admin_reviewed_at?: string | null
          admin_reviewed_by?: string | null
          ai_analyzed?: boolean
          ai_fraud_flagged?: boolean
          ai_fraud_reason?: string | null
          auto_renew?: boolean
          category: string
          condition?: string
          contact_for_price?: boolean
          created_at?: string
          description?: string
          expires_at?: string | null
          favorites_count?: number
          featured_until?: string | null
          fts?: unknown
          id?: string
          industry?: string | null
          is_featured?: boolean
          location_city?: string
          location_lat?: number
          location_lng?: number
          location_state?: string
          negotiable?: boolean
          pinned_category?: string | null
          pinned_position?: number | null
          price_cents?: number | null
          quantity?: number
          seller_id: string
          sku?: string | null
          specifications?: Json | null
          status?: string
          title: string
          updated_at?: string
          views_count?: number
          warehouse_location?: string | null
        }
        Update: {
          admin_boost?: number
          admin_flag_reason?: string | null
          admin_reviewed_at?: string | null
          admin_reviewed_by?: string | null
          ai_analyzed?: boolean
          ai_fraud_flagged?: boolean
          ai_fraud_reason?: string | null
          auto_renew?: boolean
          category?: string
          condition?: string
          contact_for_price?: boolean
          created_at?: string
          description?: string
          expires_at?: string | null
          favorites_count?: number
          featured_until?: string | null
          fts?: unknown
          id?: string
          industry?: string | null
          is_featured?: boolean
          location_city?: string
          location_lat?: number
          location_lng?: number
          location_state?: string
          negotiable?: boolean
          pinned_category?: string | null
          pinned_position?: number | null
          price_cents?: number | null
          quantity?: number
          seller_id?: string
          sku?: string | null
          specifications?: Json | null
          status?: string
          title?: string
          updated_at?: string
          views_count?: number
          warehouse_location?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "listings_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      seller_verifications: {
        Row: {
          id: string
          user_id: string
          business_name: string
          tax_id_hash: string
          document_url: string | null
          status: string
          admin_notes: string | null
          reviewed_by: string | null
          reviewed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          business_name: string
          tax_id_hash: string
          document_url?: string | null
          status?: string
          admin_notes?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          business_name?: string
          tax_id_hash?: string
          document_url?: string | null
          status?: string
          admin_notes?: string | null
          reviewed_by?: string | null
          reviewed_at?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_storefronts: {
        Row: {
          user_id: string
          banner_url: string | null
          tagline: string | null
          featured_listing_ids: string[]
          theme_color: string
          created_at: string
          updated_at: string
        }
        Insert: {
          user_id: string
          banner_url?: string | null
          tagline?: string | null
          featured_listing_ids?: string[]
          theme_color?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          user_id?: string
          banner_url?: string | null
          tagline?: string | null
          featured_listing_ids?: string[]
          theme_color?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_storefronts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_searches: {
        Row: {
          id: string
          user_id: string
          name: string
          filters: Json
          notify_email: boolean
          frequency: string
          last_notified_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          filters?: Json
          notify_email?: boolean
          frequency?: string
          last_notified_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          filters?: Json
          notify_email?: boolean
          frequency?: string
          last_notified_at?: string | null
          created_at?: string
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
      user_activity: {
        Row: {
          id: string
          user_id: string
          action: string
          listing_id: string | null
          metadata: Json
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          action: string
          listing_id?: string | null
          metadata?: Json
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          action?: string
          listing_id?: string | null
          metadata?: Json
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_activity_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_activity_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_availability: {
        Row: {
          id: string
          user_id: string
          day_of_week: number
          start_time: string
          end_time: string
          timezone: string
        }
        Insert: {
          id?: string
          user_id: string
          day_of_week: number
          start_time: string
          end_time: string
          timezone?: string
        }
        Update: {
          id?: string
          user_id?: string
          day_of_week?: number
          start_time?: string
          end_time?: string
          timezone?: string
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
      reviews: {
        Row: {
          id: string
          reviewer_id: string
          seller_id: string
          conversation_id: string | null
          transaction_id: string | null
          listing_id: string | null
          review_type: string
          rating: number
          comment: string | null
          created_at: string
        }
        Insert: {
          id?: string
          reviewer_id: string
          seller_id: string
          conversation_id?: string | null
          transaction_id?: string | null
          listing_id?: string | null
          review_type?: string
          rating: number
          comment?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          reviewer_id?: string
          seller_id?: string
          conversation_id?: string | null
          transaction_id?: string | null
          listing_id?: string | null
          review_type?: string
          rating?: number
          comment?: string | null
          created_at?: string
        }
        Relationships: [
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
            foreignKeyName: "reviews_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          id: string
          reporter_id: string
          target_type: string
          target_id: string
          reason: string
          details: string | null
          status: string
          admin_notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          reporter_id: string
          target_type: string
          target_id: string
          reason: string
          details?: string | null
          status?: string
          admin_notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          reporter_id?: string
          target_type?: string
          target_id?: string
          reason?: string
          details?: string | null
          status?: string
          admin_notes?: string | null
          created_at?: string
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
      referrals: {
        Row: {
          id: string
          referrer_id: string
          referred_id: string | null
          status: string
          reward_cents: number
          created_at: string
        }
        Insert: {
          id?: string
          referrer_id: string
          referred_id?: string | null
          status?: string
          reward_cents?: number
          created_at?: string
        }
        Update: {
          id?: string
          referrer_id?: string
          referred_id?: string | null
          status?: string
          reward_cents?: number
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      price_watches: {
        Row: {
          id: string
          user_id: string
          listing_id: string
          original_price_cents: number
          target_price_cents: number | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          listing_id: string
          original_price_cents: number
          target_price_cents?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          listing_id?: string
          original_price_cents?: number
          target_price_cents?: number | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_watches_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_watches_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      price_history: {
        Row: {
          id: string
          listing_id: string
          price_cents: number
          changed_at: string
        }
        Insert: {
          id?: string
          listing_id: string
          price_cents: number
          changed_at?: string
        }
        Update: {
          id?: string
          listing_id?: string
          price_cents?: number
          changed_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_history_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
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
          location_city: string | null
          location_lat: number | null
          location_lng: number | null
          location_state: string | null
          phone: string | null
          referral_code: string | null
          stripe_customer_id: string | null
          subscription_tier: string
          suspended_until: string | null
          preferred_locale: string
          trust_score: number
          last_login_at: string | null
          notification_preferences: Json | null
          priority_tier: Database["public"]["Enums"]["company_priority_tier"]
          priority_score: number
          priority_set_by: string | null
          priority_set_at: string | null
          updated_at: string
        }
        Insert: {
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
          location_city?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_state?: string | null
          notification_preferences?: Json | null
          phone?: string | null
          preferred_locale?: string
          priority_tier?: Database["public"]["Enums"]["company_priority_tier"]
          priority_score?: number
          priority_set_by?: string | null
          priority_set_at?: string | null
          referral_code?: string | null
          stripe_customer_id?: string | null
          subscription_tier?: string
          suspended_until?: string | null
          trust_score?: number
          last_login_at?: string | null
          updated_at?: string
        }
        Update: {
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
          location_city?: string | null
          location_lat?: number | null
          location_lng?: number | null
          location_state?: string | null
          notification_preferences?: Json | null
          phone?: string | null
          preferred_locale?: string
          priority_tier?: Database["public"]["Enums"]["company_priority_tier"]
          priority_score?: number
          priority_set_by?: string | null
          priority_set_at?: string | null
          referral_code?: string | null
          stripe_customer_id?: string | null
          subscription_tier?: string
          suspended_until?: string | null
          trust_score?: number
          last_login_at?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      offers: {
        Row: {
          id: string
          buyer_id: string
          listing_id: string
          amount_cents: number
          message: string | null
          status: string
          counter_amount_cents: number | null
          counter_message: string | null
          parent_offer_id: string | null
          expires_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          buyer_id: string
          listing_id: string
          amount_cents: number
          message?: string | null
          status?: string
          counter_amount_cents?: number | null
          counter_message?: string | null
          parent_offer_id?: string | null
          expires_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          buyer_id?: string
          listing_id?: string
          amount_cents?: number
          message?: string | null
          status?: string
          counter_amount_cents?: number | null
          counter_message?: string | null
          parent_offer_id?: string | null
          expires_at?: string
          created_at?: string
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
        ]
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: string
          title: string
          body: string
          data: Json | null
          read_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          title: string
          body: string
          data?: Json | null
          read_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          title?: string
          body?: string
          data?: Json | null
          read_at?: string | null
          created_at?: string
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
      message_attachments: {
        Row: {
          id: string
          message_id: string
          file_url: string
          file_name: string
          file_type: string
          file_size_bytes: number
          created_at: string
        }
        Insert: {
          id?: string
          message_id: string
          file_url: string
          file_name: string
          file_type: string
          file_size_bytes?: number
          created_at?: string
        }
        Update: {
          id?: string
          message_id?: string
          file_url?: string
          file_name?: string
          file_type?: string
          file_size_bytes?: number
          created_at?: string
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
      reply_templates: {
        Row: {
          id: string
          user_id: string
          name: string
          body: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          name: string
          body: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          name?: string
          body?: string
          created_at?: string
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
      viewing_requests: {
        Row: {
          id: string
          listing_id: string
          buyer_id: string
          seller_id: string
          proposed_datetime: string
          status: string
          message: string | null
          created_at: string
        }
        Insert: {
          id?: string
          listing_id: string
          buyer_id: string
          seller_id: string
          proposed_datetime: string
          status?: string
          message?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          listing_id?: string
          buyer_id?: string
          seller_id?: string
          proposed_datetime?: string
          status?: string
          message?: string | null
          created_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "viewing_requests_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "viewing_requests_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      transactions: {
        Row: {
          id: string
          buyer_id: string
          seller_id: string
          listing_id: string
          offer_id: string | null
          amount_cents: number
          status: string
          stripe_payment_intent_id: string | null
          platform_fee_cents: number
          stripe_payment_intent_status: string
          tracking_number: string | null
          carrier: string | null
          notes: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          buyer_id: string
          seller_id: string
          listing_id: string
          offer_id?: string | null
          amount_cents: number
          status?: string
          stripe_payment_intent_id?: string | null
          platform_fee_cents?: number
          stripe_payment_intent_status?: string
          tracking_number?: string | null
          carrier?: string | null
          notes?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          buyer_id?: string
          seller_id?: string
          listing_id?: string
          offer_id?: string | null
          amount_cents?: number
          status?: string
          stripe_payment_intent_id?: string | null
          platform_fee_cents?: number
          stripe_payment_intent_status?: string
          tracking_number?: string | null
          carrier?: string | null
          notes?: string | null
          created_at?: string
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
            foreignKeyName: "transactions_seller_id_fkey"
            columns: ["seller_id"]
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
        ]
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          canceled_at: string | null
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
        Relationships: []
      }
      user_business_profiles: {
        Row: {
          id: string
          user_id: string
          company_name: string
          job_title: string | null
          work_phone: string | null
          show_phone_to: string
          show_email_to: string
          show_company: boolean
          show_name: boolean
          primary_role: string
          secondary_roles: string[]
          industries: string[]
          pain_points: string[]
          pain_points_other: string | null
          trading_intents: string[]
          sos_responder: boolean
          sos_categories: string[]
          sos_urgency_level: string
          sos_notify_methods: string[]
          sos_allow_realtime_contact: boolean
          quality_agreement_accepted: boolean
          quality_agreement_accepted_at: string | null
          onboarding_completed: boolean
          onboarding_completed_at: string | null
          onboarding_step: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          user_id: string
          company_name: string
          job_title?: string | null
          work_phone?: string | null
          show_phone_to?: string
          show_email_to?: string
          show_company?: boolean
          show_name?: boolean
          primary_role: string
          secondary_roles?: string[]
          industries?: string[]
          pain_points?: string[]
          pain_points_other?: string | null
          trading_intents?: string[]
          sos_responder?: boolean
          sos_categories?: string[]
          sos_urgency_level?: string
          sos_notify_methods?: string[]
          sos_allow_realtime_contact?: boolean
          quality_agreement_accepted?: boolean
          quality_agreement_accepted_at?: string | null
          onboarding_completed?: boolean
          onboarding_completed_at?: string | null
          onboarding_step?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          company_name?: string
          job_title?: string | null
          work_phone?: string | null
          show_phone_to?: string
          show_email_to?: string
          show_company?: boolean
          show_name?: boolean
          primary_role?: string
          secondary_roles?: string[]
          industries?: string[]
          pain_points?: string[]
          pain_points_other?: string | null
          trading_intents?: string[]
          sos_responder?: boolean
          sos_categories?: string[]
          sos_urgency_level?: string
          sos_notify_methods?: string[]
          sos_allow_realtime_contact?: boolean
          quality_agreement_accepted?: boolean
          quality_agreement_accepted_at?: string | null
          onboarding_completed?: boolean
          onboarding_completed_at?: string | null
          onboarding_step?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_equipment_interests: {
        Row: {
          id: string
          user_id: string
          tier1: string
          tier2: string
          subcategories: string[]
          brands: string[]
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          tier1: string
          tier2: string
          subcategories?: string[]
          brands?: string[]
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          tier1?: string
          tier2?: string
          subcategories?: string[]
          brands?: string[]
          created_at?: string
        }
        Relationships: []
      }
      sos_requests: {
        Row: {
          id: string
          requester_id: string
          title: string
          description: string | null
          equipment_category: string
          equipment_subcategory: string | null
          brand: string | null
          model: string | null
          urgency: string
          status: string
          photos: string[]
          videos: string[]
          notes: string | null
          location_city: string | null
          location_state: string | null
          location_lat: number | null
          location_lng: number | null
          max_distance_miles: number
          expires_at: string
          fulfilled_at: string | null
          fulfilled_by: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          requester_id: string
          title: string
          description?: string | null
          equipment_category: string
          equipment_subcategory?: string | null
          brand?: string | null
          model?: string | null
          urgency?: string
          status?: string
          photos?: string[]
          videos?: string[]
          notes?: string | null
          location_city?: string | null
          location_state?: string | null
          location_lat?: number | null
          location_lng?: number | null
          max_distance_miles?: number
          expires_at?: string
          fulfilled_at?: string | null
          fulfilled_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          requester_id?: string
          title?: string
          description?: string | null
          equipment_category?: string
          equipment_subcategory?: string | null
          brand?: string | null
          model?: string | null
          urgency?: string
          status?: string
          photos?: string[]
          videos?: string[]
          notes?: string | null
          location_city?: string | null
          location_state?: string | null
          location_lat?: number | null
          location_lng?: number | null
          max_distance_miles?: number
          expires_at?: string
          fulfilled_at?: string | null
          fulfilled_by?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sos_requests_requester_id_fkey"
            columns: ["requester_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sos_responses: {
        Row: {
          id: string
          sos_request_id: string
          responder_id: string
          message: string
          price_estimate: string | null
          lead_time: string | null
          condition: string | null
          photos: string[]
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          sos_request_id: string
          responder_id: string
          message: string
          price_estimate?: string | null
          lead_time?: string | null
          condition?: string | null
          photos?: string[]
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          sos_request_id?: string
          responder_id?: string
          message?: string
          price_estimate?: string | null
          lead_time?: string | null
          condition?: string | null
          photos?: string[]
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sos_responses_sos_request_id_fkey"
            columns: ["sos_request_id"]
            isOneToOne: false
            referencedRelation: "sos_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sos_responses_responder_id_fkey"
            columns: ["responder_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sos_notifications: {
        Row: {
          id: string
          sos_request_id: string
          notified_user_id: string
          notify_method: string
          sent_at: string
          read_at: string | null
        }
        Insert: {
          id?: string
          sos_request_id: string
          notified_user_id: string
          notify_method: string
          sent_at?: string
          read_at?: string | null
        }
        Update: {
          id?: string
          sos_request_id?: string
          notified_user_id?: string
          notify_method?: string
          sent_at?: string
          read_at?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      admin_role: "superadmin" | "moderator" | "analyst"
      company_priority_tier: "standard" | "preferred" | "featured" | "platinum"
      listing_status:
        | "draft"
        | "active"
        | "sold"
        | "expired"
        | "archived"
        | "pending_review"
        | "flagged"
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
