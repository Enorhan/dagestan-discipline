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
      achievement_definitions: {
        Row: {
          created_at: string
          goal: number
          id: string
          sort_order: number
          summary: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          goal: number
          id: string
          sort_order?: number
          summary: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          goal?: number
          id?: string
          sort_order?: number
          summary?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      achievement_progress: {
        Row: {
          achievement_id: string
          goal: number
          progress: number
          unlocked_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          goal?: number
          progress?: number
          unlocked_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          goal?: number
          progress?: number
          unlocked_at?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      app_store_transactions: {
        Row: {
          created_at: string
          environment: string | null
          expires_at: string | null
          id: number
          original_transaction_id: string
          product_id: string
          purchased_at: string | null
          status: string | null
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          environment?: string | null
          expires_at?: string | null
          id?: number
          original_transaction_id: string
          product_id: string
          purchased_at?: string | null
          status?: string | null
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          environment?: string | null
          expires_at?: string | null
          id?: number
          original_transaction_id?: string
          product_id?: string
          purchased_at?: string | null
          status?: string | null
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "app_store_transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      challenge_definitions: {
        Row: {
          created_at: string
          difficulty: string
          goal: number
          id: string
          sort_order: number
          summary: string
          title: string
          updated_at: string
          xp_reward: number
        }
        Insert: {
          created_at?: string
          difficulty: string
          goal: number
          id: string
          sort_order?: number
          summary: string
          title: string
          updated_at?: string
          xp_reward?: number
        }
        Update: {
          created_at?: string
          difficulty?: string
          goal?: number
          id?: string
          sort_order?: number
          summary?: string
          title?: string
          updated_at?: string
          xp_reward?: number
        }
        Relationships: []
      }
      challenge_progress: {
        Row: {
          challenge_id: string
          completed_at: string | null
          goal: number
          progress: number
          updated_at: string
          user_id: string
        }
        Insert: {
          challenge_id: string
          completed_at?: string | null
          goal?: number
          progress?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          challenge_id?: string
          completed_at?: string | null
          goal?: number
          progress?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      comments: {
        Row: {
          body: string
          created_at: string
          hashtags: string[]
          id: string
          mentioned_user_ids: string[]
          parent_comment_id: string | null
          post_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          hashtags?: string[]
          id?: string
          mentioned_user_ids?: string[]
          parent_comment_id?: string | null
          post_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          hashtags?: string[]
          id?: string
          mentioned_user_ids?: string[]
          parent_comment_id?: string | null
          post_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_parent_comment_id_fkey"
            columns: ["parent_comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_drafts: {
        Row: {
          aspect_ratio: number | null
          caption: string | null
          cover_timestamp_ms: number | null
          created_at: string
          creative_edit: Json | null
          duration_ms: number | null
          failed_reason: string | null
          id: string
          media_type: Database["public"]["Enums"]["post_media_type"]
          post_kind: Database["public"]["Enums"]["post_kind"]
          publish_target: Database["public"]["Enums"]["social_publish_target"]
          published_post_id: string | null
          render_error: string | null
          render_job_id: string | null
          render_status: string
          scheduled_for: string | null
          source_media_type:
            | Database["public"]["Enums"]["post_media_type"]
            | null
          source_media_url: string | null
          source_thumbnail_url: string | null
          thumbnail_url: string | null
          trim_end_ms: number | null
          trim_start_ms: number | null
          updated_at: string
          upload_progress: number
          upload_status: string
          upload_url: string | null
          user_id: string
          video_asset_id: string | null
          video_provider:
            | Database["public"]["Enums"]["social_video_provider"]
            | null
          visibility: Database["public"]["Enums"]["post_visibility"]
        }
        Insert: {
          aspect_ratio?: number | null
          caption?: string | null
          cover_timestamp_ms?: number | null
          created_at?: string
          creative_edit?: Json | null
          duration_ms?: number | null
          failed_reason?: string | null
          id?: string
          media_type?: Database["public"]["Enums"]["post_media_type"]
          post_kind?: Database["public"]["Enums"]["post_kind"]
          publish_target?: Database["public"]["Enums"]["social_publish_target"]
          published_post_id?: string | null
          render_error?: string | null
          render_job_id?: string | null
          render_status?: string
          scheduled_for?: string | null
          source_media_type?:
            | Database["public"]["Enums"]["post_media_type"]
            | null
          source_media_url?: string | null
          source_thumbnail_url?: string | null
          thumbnail_url?: string | null
          trim_end_ms?: number | null
          trim_start_ms?: number | null
          updated_at?: string
          upload_progress?: number
          upload_status?: string
          upload_url?: string | null
          user_id: string
          video_asset_id?: string | null
          video_provider?:
            | Database["public"]["Enums"]["social_video_provider"]
            | null
          visibility?: Database["public"]["Enums"]["post_visibility"]
        }
        Update: {
          aspect_ratio?: number | null
          caption?: string | null
          cover_timestamp_ms?: number | null
          created_at?: string
          creative_edit?: Json | null
          duration_ms?: number | null
          failed_reason?: string | null
          id?: string
          media_type?: Database["public"]["Enums"]["post_media_type"]
          post_kind?: Database["public"]["Enums"]["post_kind"]
          publish_target?: Database["public"]["Enums"]["social_publish_target"]
          published_post_id?: string | null
          render_error?: string | null
          render_job_id?: string | null
          render_status?: string
          scheduled_for?: string | null
          source_media_type?:
            | Database["public"]["Enums"]["post_media_type"]
            | null
          source_media_url?: string | null
          source_thumbnail_url?: string | null
          thumbnail_url?: string | null
          trim_end_ms?: number | null
          trim_start_ms?: number | null
          updated_at?: string
          upload_progress?: number
          upload_status?: string
          upload_url?: string | null
          user_id?: string
          video_asset_id?: string | null
          video_provider?:
            | Database["public"]["Enums"]["social_video_provider"]
            | null
          visibility?: Database["public"]["Enums"]["post_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "creator_drafts_published_post_id_fkey"
            columns: ["published_post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      follow_requests: {
        Row: {
          created_at: string
          id: string
          requester_user_id: string
          responded_at: string | null
          status: Database["public"]["Enums"]["follow_request_status"]
          target_user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          requester_user_id: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["follow_request_status"]
          target_user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          requester_user_id?: string
          responded_at?: string | null
          status?: Database["public"]["Enums"]["follow_request_status"]
          target_user_id?: string
        }
        Relationships: []
      }
      follows: {
        Row: {
          created_at: string
          follower_user_id: string
          following_user_id: string
          id: string
        }
        Insert: {
          created_at?: string
          follower_user_id: string
          following_user_id: string
          id?: string
        }
        Update: {
          created_at?: string
          follower_user_id?: string
          following_user_id?: string
          id?: string
        }
        Relationships: []
      }
      invite_links: {
        Row: {
          code: string
          created_at: string
          creator_user_id: string
          id: string
          last_shared_at: string | null
          share_count: number
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          creator_user_id: string
          id?: string
          last_shared_at?: string | null
          share_count?: number
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          creator_user_id?: string
          id?: string
          last_shared_at?: string | null
          share_count?: number
          updated_at?: string
        }
        Relationships: []
      }
      likes: {
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
            foreignKeyName: "likes_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      moment_stories: {
        Row: {
          added_at: string
          id: string
          moment_id: string
          sort_order: number
          story_id: string
        }
        Insert: {
          added_at?: string
          id?: string
          moment_id: string
          sort_order?: number
          story_id: string
        }
        Update: {
          added_at?: string
          id?: string
          moment_id?: string
          sort_order?: number
          story_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "moment_stories_moment_id_fkey"
            columns: ["moment_id"]
            isOneToOne: false
            referencedRelation: "moments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moment_stories_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      moments: {
        Row: {
          cover_story_id: string | null
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cover_story_id?: string | null
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cover_story_id?: string | null
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "moments_cover_story_id_fkey"
            columns: ["cover_story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          kind: string
          metadata: Json
          read: boolean
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          kind?: string
          metadata?: Json
          read?: boolean
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          kind?: string
          metadata?: Json
          read?: boolean
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      post_media: {
        Row: {
          aspect_ratio: number | null
          cover_timestamp_ms: number | null
          created_at: string
          duration_ms: number | null
          failed_reason: string | null
          hls_url: string | null
          id: string
          image_url: string | null
          media_processing_status: Database["public"]["Enums"]["social_media_processing_status"]
          playback_id: string | null
          playback_url: string | null
          post_id: string
          poster_url: string | null
          provider: Database["public"]["Enums"]["social_video_provider"] | null
          ready_at: string | null
          updated_at: string
          video_asset_id: string | null
          video_url: string | null
        }
        Insert: {
          aspect_ratio?: number | null
          cover_timestamp_ms?: number | null
          created_at?: string
          duration_ms?: number | null
          failed_reason?: string | null
          hls_url?: string | null
          id?: string
          image_url?: string | null
          media_processing_status?: Database["public"]["Enums"]["social_media_processing_status"]
          playback_id?: string | null
          playback_url?: string | null
          post_id: string
          poster_url?: string | null
          provider?: Database["public"]["Enums"]["social_video_provider"] | null
          ready_at?: string | null
          updated_at?: string
          video_asset_id?: string | null
          video_url?: string | null
        }
        Update: {
          aspect_ratio?: number | null
          cover_timestamp_ms?: number | null
          created_at?: string
          duration_ms?: number | null
          failed_reason?: string | null
          hls_url?: string | null
          id?: string
          image_url?: string | null
          media_processing_status?: Database["public"]["Enums"]["social_media_processing_status"]
          playback_id?: string | null
          playback_url?: string | null
          post_id?: string
          poster_url?: string | null
          provider?: Database["public"]["Enums"]["social_video_provider"] | null
          ready_at?: string | null
          updated_at?: string
          video_asset_id?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "post_media_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: true
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          allow_comments: boolean
          caption: string | null
          comment_count: number
          created_at: string
          creative_edit: Json | null
          id: string
          is_archived: boolean
          is_published: boolean
          like_count: number
          media_aspect_ratio: number | null
          media_type: Database["public"]["Enums"]["post_media_type"]
          post_kind: Database["public"]["Enums"]["post_kind"]
          published_at: string | null
          render_error: string | null
          render_status: string
          save_count: number
          scheduled_for: string | null
          session_id: string | null
          updated_at: string
          user_id: string
          visibility: Database["public"]["Enums"]["post_visibility"]
        }
        Insert: {
          allow_comments?: boolean
          caption?: string | null
          comment_count?: number
          created_at?: string
          creative_edit?: Json | null
          id?: string
          is_archived?: boolean
          is_published?: boolean
          like_count?: number
          media_aspect_ratio?: number | null
          media_type?: Database["public"]["Enums"]["post_media_type"]
          post_kind?: Database["public"]["Enums"]["post_kind"]
          published_at?: string | null
          render_error?: string | null
          render_status?: string
          save_count?: number
          scheduled_for?: string | null
          session_id?: string | null
          updated_at?: string
          user_id: string
          visibility?: Database["public"]["Enums"]["post_visibility"]
        }
        Update: {
          allow_comments?: boolean
          caption?: string | null
          comment_count?: number
          created_at?: string
          creative_edit?: Json | null
          id?: string
          is_archived?: boolean
          is_published?: boolean
          like_count?: number
          media_aspect_ratio?: number | null
          media_type?: Database["public"]["Enums"]["post_media_type"]
          post_kind?: Database["public"]["Enums"]["post_kind"]
          published_at?: string | null
          render_error?: string | null
          render_status?: string
          save_count?: number
          scheduled_for?: string | null
          session_id?: string | null
          updated_at?: string
          user_id?: string
          visibility?: Database["public"]["Enums"]["post_visibility"]
        }
        Relationships: [
          {
            foreignKeyName: "posts_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      processed_app_store_notifications: {
        Row: {
          created_at: string
          id: number
          notification_type: string | null
          notification_uuid: string
          subtype: string | null
        }
        Insert: {
          created_at?: string
          id?: number
          notification_type?: string | null
          notification_uuid: string
          subtype?: string | null
        }
        Update: {
          created_at?: string
          id?: number
          notification_type?: string | null
          notification_uuid?: string
          subtype?: string | null
        }
        Relationships: []
      }
      processed_stripe_events: {
        Row: {
          event_id: string
          event_type: string
          id: string
          processed_at: string | null
        }
        Insert: {
          event_id: string
          event_type: string
          id?: string
          processed_at?: string | null
        }
        Update: {
          event_id?: string
          event_type?: string
          id?: string
          processed_at?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          belt: string
          biggest_challenges: string[]
          bio: string | null
          bjj_coach_marks_seen: boolean
          bjj_paywall_completed: boolean
          bodyweight_kg: number | null
          combat_sessions_per_week: number
          created_at: string | null
          display_name: string
          equipment: string | null
          experience_level: string
          favorite_content_types: string[]
          first_active_at: string | null
          gym_name: string
          heard_from: string | null
	          id: string
	          injury_notes: string | null
	          is_premium: boolean | null
	          level: number
	          matflow_trial_started_at: string | null
	          onboarding_completed: boolean | null
          premium_provider_id: string | null
          premium_source: string | null
          premium_updated_at: string | null
          primary_discipline: string | null
          primary_goal: string
          privacy: string
          search_tutorial_seen: boolean
          session_minutes: number
          sport: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          stripes: number
          subscription_period_end: string | null
          subscription_status: string | null
          training_days: number
          updated_at: string | null
          username: string
          weight_unit: string
          xp: number
        }
        Insert: {
          avatar_url?: string | null
          belt?: string
          biggest_challenges?: string[]
          bio?: string | null
          bjj_coach_marks_seen?: boolean
          bjj_paywall_completed?: boolean
          bodyweight_kg?: number | null
          combat_sessions_per_week?: number
          created_at?: string | null
          display_name: string
          equipment?: string | null
          experience_level?: string
          favorite_content_types?: string[]
          first_active_at?: string | null
          gym_name?: string
          heard_from?: string | null
	          id: string
	          injury_notes?: string | null
	          is_premium?: boolean | null
	          level?: number
	          matflow_trial_started_at?: string | null
	          onboarding_completed?: boolean | null
          premium_provider_id?: string | null
          premium_source?: string | null
          premium_updated_at?: string | null
          primary_discipline?: string | null
          primary_goal?: string
          privacy?: string
          search_tutorial_seen?: boolean
          session_minutes?: number
          sport?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          stripes?: number
          subscription_period_end?: string | null
          subscription_status?: string | null
          training_days?: number
          updated_at?: string | null
          username: string
          weight_unit?: string
          xp?: number
        }
        Update: {
          avatar_url?: string | null
          belt?: string
          biggest_challenges?: string[]
          bio?: string | null
          bjj_coach_marks_seen?: boolean
          bjj_paywall_completed?: boolean
          bodyweight_kg?: number | null
          combat_sessions_per_week?: number
          created_at?: string | null
          display_name?: string
          equipment?: string | null
          experience_level?: string
          favorite_content_types?: string[]
          first_active_at?: string | null
          gym_name?: string
          heard_from?: string | null
	          id?: string
	          injury_notes?: string | null
	          is_premium?: boolean | null
	          level?: number
	          matflow_trial_started_at?: string | null
	          onboarding_completed?: boolean | null
          premium_provider_id?: string | null
          premium_source?: string | null
          premium_updated_at?: string | null
          primary_discipline?: string | null
          primary_goal?: string
          privacy?: string
          search_tutorial_seen?: boolean
          session_minutes?: number
          sport?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          stripes?: number
          subscription_period_end?: string | null
          subscription_status?: string | null
          training_days?: number
          updated_at?: string | null
          username?: string
          weight_unit?: string
          xp?: number
        }
        Relationships: []
      }
      programs: {
        Row: {
          created_at: string | null
          creator_id: string | null
          description: string | null
          difficulty: string
          duration_weeks: number | null
          id: string
          is_premium: boolean | null
          is_system: boolean | null
          name: string
          price_sek: number | null
          sport: string
        }
        Insert: {
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          difficulty: string
          duration_weeks?: number | null
          id?: string
          is_premium?: boolean | null
          is_system?: boolean | null
          name: string
          price_sek?: number | null
          sport: string
        }
        Update: {
          created_at?: string | null
          creator_id?: string | null
          description?: string | null
          difficulty?: string
          duration_weeks?: number | null
          id?: string
          is_premium?: boolean | null
          is_system?: boolean | null
          name?: string
          price_sek?: number | null
          sport?: string
        }
        Relationships: [
          {
            foreignKeyName: "programs_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          amount_sek: number
          id: string
          program_id: string
          purchased_at: string | null
          status: string
          stripe_payment_intent_id: string | null
          user_id: string
        }
        Insert: {
          amount_sek: number
          id?: string
          program_id: string
          purchased_at?: string | null
          status: string
          stripe_payment_intent_id?: string | null
          user_id: string
        }
        Update: {
          amount_sek?: number
          id?: string
          program_id?: string
          purchased_at?: string | null
          status?: string
          stripe_payment_intent_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchases_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      saves: {
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
            foreignKeyName: "saves_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_blocks: {
        Row: {
          blocked_user_id: string
          blocker_user_id: string
          created_at: string
        }
        Insert: {
          blocked_user_id: string
          blocker_user_id: string
          created_at?: string
        }
        Update: {
          blocked_user_id?: string
          blocker_user_id?: string
          created_at?: string
        }
        Relationships: []
      }
      social_feed_events: {
        Row: {
          completed_view: boolean
          created_at: string
          id: string
          post_id: string
          replayed_view: boolean
          skipped_view: boolean
          surface: Database["public"]["Enums"]["social_feed_surface"]
          viewer_user_id: string
          watch_ms: number
        }
        Insert: {
          completed_view?: boolean
          created_at?: string
          id?: string
          post_id: string
          replayed_view?: boolean
          skipped_view?: boolean
          surface: Database["public"]["Enums"]["social_feed_surface"]
          viewer_user_id: string
          watch_ms?: number
        }
        Update: {
          completed_view?: boolean
          created_at?: string
          id?: string
          post_id?: string
          replayed_view?: boolean
          skipped_view?: boolean
          surface?: Database["public"]["Enums"]["social_feed_surface"]
          viewer_user_id?: string
          watch_ms?: number
        }
        Relationships: [
          {
            foreignKeyName: "social_feed_events_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_music_tracks: {
        Row: {
          artist: string
          artwork_url: string | null
          created_at: string
          duration_ms: number
          id: string
          is_active: boolean
          preview_url: string
          slug: string
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          artist: string
          artwork_url?: string | null
          created_at?: string
          duration_ms?: number
          id: string
          is_active?: boolean
          preview_url: string
          slug: string
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          artist?: string
          artwork_url?: string | null
          created_at?: string
          duration_ms?: number
          id?: string
          is_active?: boolean
          preview_url?: string
          slug?: string
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      social_mutes: {
        Row: {
          created_at: string
          muted_user_id: string
          muter_user_id: string
        }
        Insert: {
          created_at?: string
          muted_user_id: string
          muter_user_id: string
        }
        Update: {
          created_at?: string
          muted_user_id?: string
          muter_user_id?: string
        }
        Relationships: []
      }
      social_negative_feedback: {
        Row: {
          created_at: string
          feedback_type: Database["public"]["Enums"]["social_feedback_type"]
          id: string
          post_id: string
          viewer_user_id: string
        }
        Insert: {
          created_at?: string
          feedback_type: Database["public"]["Enums"]["social_feedback_type"]
          id?: string
          post_id: string
          viewer_user_id: string
        }
        Update: {
          created_at?: string
          feedback_type?: Database["public"]["Enums"]["social_feedback_type"]
          id?: string
          post_id?: string
          viewer_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_negative_feedback_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_post_feature_rollups: {
        Row: {
          captured_at: string
          completions_7d: number
          negative_hide_7d: number
          negative_not_interested_7d: number
          negative_report_7d: number
          post_id: string
          replays_7d: number
          skips_7d: number
          views_2s_7d: number
          watch_ms_7d: number
        }
        Insert: {
          captured_at?: string
          completions_7d?: number
          negative_hide_7d?: number
          negative_not_interested_7d?: number
          negative_report_7d?: number
          post_id: string
          replays_7d?: number
          skips_7d?: number
          views_2s_7d?: number
          watch_ms_7d?: number
        }
        Update: {
          captured_at?: string
          completions_7d?: number
          negative_hide_7d?: number
          negative_not_interested_7d?: number
          negative_report_7d?: number
          post_id?: string
          replays_7d?: number
          skips_7d?: number
          views_2s_7d?: number
          watch_ms_7d?: number
        }
        Relationships: [
          {
            foreignKeyName: "social_post_feature_rollups_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: true
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_post_topics: {
        Row: {
          created_at: string
          post_id: string
          topic_id: string
          weight: number
        }
        Insert: {
          created_at?: string
          post_id: string
          topic_id: string
          weight?: number
        }
        Update: {
          created_at?: string
          post_id?: string
          topic_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "social_post_topics_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_post_topics_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "social_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      social_rate_limits: {
        Row: {
          bucket_key: string
          count: number
          created_at: string
          id: string
          surface: string
          updated_at: string
          user_id: string
          window_started_at: string
        }
        Insert: {
          bucket_key: string
          count?: number
          created_at?: string
          id?: string
          surface: string
          updated_at?: string
          user_id: string
          window_started_at: string
        }
        Update: {
          bucket_key?: string
          count?: number
          created_at?: string
          id?: string
          surface?: string
          updated_at?: string
          user_id?: string
          window_started_at?: string
        }
        Relationships: []
      }
      social_reports: {
        Row: {
          comment_id: string | null
          created_at: string
          details: string | null
          evidence_urls: string[]
          id: string
          post_id: string | null
          reason: string
          reporter_user_id: string
          status: Database["public"]["Enums"]["moderation_status"]
          target_user_id: string | null
          updated_at: string
        }
        Insert: {
          comment_id?: string | null
          created_at?: string
          details?: string | null
          evidence_urls?: string[]
          id?: string
          post_id?: string | null
          reason: string
          reporter_user_id: string
          status?: Database["public"]["Enums"]["moderation_status"]
          target_user_id?: string | null
          updated_at?: string
        }
        Update: {
          comment_id?: string | null
          created_at?: string
          details?: string | null
          evidence_urls?: string[]
          id?: string
          post_id?: string | null
          reason?: string
          reporter_user_id?: string
          status?: Database["public"]["Enums"]["moderation_status"]
          target_user_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_reports_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "social_reports_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      social_topics: {
        Row: {
          created_at: string
          id: string
          label: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          label: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          label?: string
          slug?: string
        }
        Relationships: []
      }
      social_video_uploads: {
        Row: {
          asset_id: string
          client_upload_key: string | null
          created_at: string
          id: string
          post_id: string | null
          provider: Database["public"]["Enums"]["social_video_provider"]
          status: Database["public"]["Enums"]["social_media_processing_status"]
          updated_at: string
          upload_url: string
          user_id: string
        }
        Insert: {
          asset_id: string
          client_upload_key?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          provider: Database["public"]["Enums"]["social_video_provider"]
          status?: Database["public"]["Enums"]["social_media_processing_status"]
          updated_at?: string
          upload_url: string
          user_id: string
        }
        Update: {
          asset_id?: string
          client_upload_key?: string | null
          created_at?: string
          id?: string
          post_id?: string | null
          provider?: Database["public"]["Enums"]["social_video_provider"]
          status?: Database["public"]["Enums"]["social_media_processing_status"]
          updated_at?: string
          upload_url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_video_uploads_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      stories: {
        Row: {
          caption: string | null
          created_at: string
          creative_edit: Json | null
          duration_ms: number | null
          expires_at: string
          id: string
          media_type: Database["public"]["Enums"]["post_media_type"]
          media_url: string
          render_error: string | null
          render_status: string
          thumbnail_url: string | null
          user_id: string
          visibility: Database["public"]["Enums"]["post_visibility"]
        }
        Insert: {
          caption?: string | null
          created_at?: string
          creative_edit?: Json | null
          duration_ms?: number | null
          expires_at?: string
          id?: string
          media_type: Database["public"]["Enums"]["post_media_type"]
          media_url: string
          render_error?: string | null
          render_status?: string
          thumbnail_url?: string | null
          user_id: string
          visibility?: Database["public"]["Enums"]["post_visibility"]
        }
        Update: {
          caption?: string | null
          created_at?: string
          creative_edit?: Json | null
          duration_ms?: number | null
          expires_at?: string
          id?: string
          media_type?: Database["public"]["Enums"]["post_media_type"]
          media_url?: string
          render_error?: string | null
          render_status?: string
          thumbnail_url?: string | null
          user_id?: string
          visibility?: Database["public"]["Enums"]["post_visibility"]
        }
        Relationships: []
      }
      story_views: {
        Row: {
          id: string
          story_id: string
          viewed_at: string
          viewer_user_id: string
        }
        Insert: {
          id?: string
          story_id: string
          viewed_at?: string
          viewer_user_id: string
        }
        Update: {
          id?: string
          story_id?: string
          viewed_at?: string
          viewer_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_views_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          created_at: string | null
          description: string | null
          features: Json | null
          id: string
          interval: string
          is_active: boolean | null
          name: string
          price_sek: number
          stripe_price_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          interval: string
          is_active?: boolean | null
          name: string
          price_sek: number
          stripe_price_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          features?: Json | null
          id?: string
          interval?: string
          is_active?: boolean | null
          name?: string
          price_sek?: number
          stripe_price_id?: string | null
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          cancel_at_period_end: boolean | null
          created_at: string | null
          current_period_end: string | null
          current_period_start: string | null
          id: string
          plan_id: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          trial_end: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id: string
          status: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          cancel_at_period_end?: boolean | null
          created_at?: string | null
          current_period_end?: string | null
          current_period_start?: string | null
          id?: string
          plan_id?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          trial_end?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      system_edges: {
        Row: {
          created_at: string
          from_node_id: string
          id: string
          label: string | null
          system_id: string
          to_node_id: string
        }
        Insert: {
          created_at?: string
          from_node_id: string
          id?: string
          label?: string | null
          system_id: string
          to_node_id: string
        }
        Update: {
          created_at?: string
          from_node_id?: string
          id?: string
          label?: string | null
          system_id?: string
          to_node_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_edges_from_node_id_fkey"
            columns: ["from_node_id"]
            isOneToOne: false
            referencedRelation: "system_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_edges_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_edges_to_node_id_fkey"
            columns: ["to_node_id"]
            isOneToOne: false
            referencedRelation: "system_nodes"
            referencedColumns: ["id"]
          },
        ]
      }
      system_node_techniques: {
        Row: {
          created_at: string
          id: string
          node_id: string
          system_id: string
          technique_id: string
          technique_title_snapshot: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          node_id: string
          system_id: string
          technique_id: string
          technique_title_snapshot?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          node_id?: string
          system_id?: string
          technique_id?: string
          technique_title_snapshot?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_node_techniques_node_id_fkey"
            columns: ["node_id"]
            isOneToOne: false
            referencedRelation: "system_nodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_node_techniques_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "system_node_techniques_technique_fk"
            columns: ["technique_id"]
            isOneToOne: false
            referencedRelation: "user_techniques"
            referencedColumns: ["id"]
          },
        ]
      }
      system_nodes: {
        Row: {
          color: string
          created_at: string
          id: string
          label: string
          layout_x: number | null
          layout_y: number | null
          sort_order: number
          system_id: string
        }
        Insert: {
          color: string
          created_at?: string
          id: string
          label: string
          layout_x?: number | null
          layout_y?: number | null
          sort_order?: number
          system_id: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          label?: string
          layout_x?: number | null
          layout_y?: number | null
          sort_order?: number
          system_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_nodes_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["id"]
          },
        ]
      }
      systems: {
        Row: {
          branch: string
          created_at: string
          id: string
          locked: boolean
          sort_order: number
          status: string
          summary: string
          title: string
          updated_at: string
          user_id: string | null
          visibility: string
        }
        Insert: {
          branch?: string
          created_at?: string
          id: string
          locked?: boolean
          sort_order?: number
          status?: string
          summary: string
          title: string
          updated_at?: string
          user_id?: string | null
          visibility?: string
        }
        Update: {
          branch?: string
          created_at?: string
          id?: string
          locked?: boolean
          sort_order?: number
          status?: string
          summary?: string
          title?: string
          updated_at?: string
          user_id?: string | null
          visibility?: string
        }
        Relationships: []
      }
      technique_links: {
        Row: {
          created_at: string
          from_technique_id: string
          id: string
          to_technique_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          from_technique_id: string
          id?: string
          to_technique_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          from_technique_id?: string
          id?: string
          to_technique_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "technique_links_from_technique_id_fkey"
            columns: ["from_technique_id"]
            isOneToOne: false
            referencedRelation: "user_techniques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "technique_links_to_technique_id_fkey"
            columns: ["to_technique_id"]
            isOneToOne: false
            referencedRelation: "user_techniques"
            referencedColumns: ["id"]
          },
        ]
      }
      technique_tags: {
        Row: {
          created_at: string
          id: string
          tag: string
          technique_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          tag: string
          technique_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          tag?: string
          technique_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "technique_tags_technique_id_fkey"
            columns: ["technique_id"]
            isOneToOne: false
            referencedRelation: "user_techniques"
            referencedColumns: ["id"]
          },
        ]
      }
      techniques: {
        Row: {
          branch: string
          category: string
          created_at: string
          created_by: string | null
          description: string
          id: string
          linked_technique_ids: string[]
          links: string[]
          media: string[]
          tags: string[]
          title: string
          tutorial_thumbnail: string | null
          tutorial_title: string
          updated_at: string
        }
        Insert: {
          branch?: string
          category: string
          created_at?: string
          created_by?: string | null
          description?: string
          id: string
          linked_technique_ids?: string[]
          links?: string[]
          media?: string[]
          tags?: string[]
          title: string
          tutorial_thumbnail?: string | null
          tutorial_title: string
          updated_at?: string
        }
        Update: {
          branch?: string
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          id?: string
          linked_technique_ids?: string[]
          links?: string[]
          media?: string[]
          tags?: string[]
          title?: string
          tutorial_thumbnail?: string | null
          tutorial_title?: string
          updated_at?: string
        }
        Relationships: []
      }
      training_session_comments: {
        Row: {
          body: string
          created_at: string
          id: string
          training_session_id: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          training_session_id: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          training_session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_session_comments_training_session_id_fkey"
            columns: ["training_session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      training_session_likes: {
        Row: {
          created_at: string
          id: string
          training_session_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          training_session_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          training_session_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_session_likes_training_session_id_fkey"
            columns: ["training_session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      training_session_techniques: {
        Row: {
          created_at: string
          id: string
          technique_id: string
          training_session_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          technique_id: string
          training_session_id: string
        }
        Update: {
          created_at?: string
          id?: string
          technique_id?: string
          training_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_session_techniques_technique_id_fkey"
            columns: ["technique_id"]
            isOneToOne: false
            referencedRelation: "user_techniques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_session_techniques_training_session_id_fkey"
            columns: ["training_session_id"]
            isOneToOne: false
            referencedRelation: "training_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      training_sessions: {
        Row: {
          branch: string
          caption: string | null
          client_id: string | null
          completed_at: string | null
          created_at: string
          duration_minutes: number
          effort_rating: number | null
          id: string
          kind: string
          location: string
          notes: string | null
          photo_url: string | null
          satisfaction: number
          session_date: string
          session_id: string | null
          session_type: string | null
          source: string
          started_at: string
          submission_names: string[]
          tagged_friends: string[]
          tap_names: string[]
          title: string
          total_time_seconds: number | null
          total_volume: number | null
          updated_at: string
          user_id: string
          visibility: string
          workout_template_id: string | null
        }
        Insert: {
          branch?: string
          caption?: string | null
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number
          effort_rating?: number | null
          id?: string
          kind: string
          location?: string
          notes?: string | null
          photo_url?: string | null
          satisfaction?: number
          session_date?: string
          session_id?: string | null
          session_type?: string | null
          source: string
          started_at?: string
          submission_names?: string[]
          tagged_friends?: string[]
          tap_names?: string[]
          title: string
          total_time_seconds?: number | null
          total_volume?: number | null
          updated_at?: string
          user_id: string
          visibility?: string
          workout_template_id?: string | null
        }
        Update: {
          branch?: string
          caption?: string | null
          client_id?: string | null
          completed_at?: string | null
          created_at?: string
          duration_minutes?: number
          effort_rating?: number | null
          id?: string
          kind?: string
          location?: string
          notes?: string | null
          photo_url?: string | null
          satisfaction?: number
          session_date?: string
          session_id?: string | null
          session_type?: string | null
          source?: string
          started_at?: string
          submission_names?: string[]
          tagged_friends?: string[]
          tap_names?: string[]
          title?: string
          total_time_seconds?: number | null
          total_volume?: number | null
          updated_at?: string
          user_id?: string
          visibility?: string
          workout_template_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "training_sessions_workout_template_id_fkey"
            columns: ["workout_template_id"]
            isOneToOne: false
            referencedRelation: "workout_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      user_programs: {
        Row: {
          created_at: string | null
          current_day_index: number | null
          id: string
          is_active: boolean | null
          program_id: string
          purchased_at: string | null
          user_id: string
          week_start_date: string | null
        }
        Insert: {
          created_at?: string | null
          current_day_index?: number | null
          id?: string
          is_active?: boolean | null
          program_id: string
          purchased_at?: string | null
          user_id: string
          week_start_date?: string | null
        }
        Update: {
          created_at?: string | null
          current_day_index?: number | null
          id?: string
          is_active?: boolean | null
          program_id?: string
          purchased_at?: string | null
          user_id?: string
          week_start_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_programs_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_programs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_stats: {
        Row: {
          current_streak: number | null
          flow_streak: number
          follower_count: number | null
          following_count: number | null
          last_workout_date: string | null
          longest_streak: number | null
          total_saves: number | null
          training_streak: number
          user_id: string
          workout_count: number | null
        }
        Insert: {
          current_streak?: number | null
          flow_streak?: number
          follower_count?: number | null
          following_count?: number | null
          last_workout_date?: string | null
          longest_streak?: number | null
          total_saves?: number | null
          training_streak?: number
          user_id: string
          workout_count?: number | null
        }
        Update: {
          current_streak?: number | null
          flow_streak?: number
          follower_count?: number | null
          following_count?: number | null
          last_workout_date?: string | null
          longest_streak?: number | null
          total_saves?: number | null
          training_streak?: number
          user_id?: string
          workout_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "user_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_system_access: {
        Row: {
          created_at: string
          system_id: string
          unlocked: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          system_id: string
          unlocked?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          system_id?: string
          unlocked?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_system_access_system_id_fkey"
            columns: ["system_id"]
            isOneToOne: false
            referencedRelation: "systems"
            referencedColumns: ["id"]
          },
        ]
      }
      user_techniques: {
        Row: {
          branch: string
          catalog_technique_id: string | null
          category: string
          created_at: string
          description: string
          id: string
          links: string[]
          media: string[]
          notes: string
          title: string
          tutorial_thumbnail: string | null
          tutorial_title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          branch?: string
          catalog_technique_id?: string | null
          category: string
          created_at?: string
          description?: string
          id: string
          links?: string[]
          media?: string[]
          notes?: string
          title: string
          tutorial_thumbnail?: string | null
          tutorial_title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          branch?: string
          catalog_technique_id?: string | null
          category?: string
          created_at?: string
          description?: string
          id?: string
          links?: string[]
          media?: string[]
          notes?: string
          title?: string
          tutorial_thumbnail?: string | null
          tutorial_title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_techniques_catalog_technique_id_fkey"
            columns: ["catalog_technique_id"]
            isOneToOne: false
            referencedRelation: "techniques"
            referencedColumns: ["id"]
          },
        ]
      }
      workout_templates: {
        Row: {
          archived: boolean
          created_at: string
          description: string | null
          difficulty: string
          estimated_duration: number | null
          focus: string
          id: string
          name: string
          sport_relevance: string[]
          updated_at: string
          user_id: string
          visibility: string
        }
        Insert: {
          archived?: boolean
          created_at?: string
          description?: string | null
          difficulty: string
          estimated_duration?: number | null
          focus: string
          id?: string
          name: string
          sport_relevance?: string[]
          updated_at?: string
          user_id: string
          visibility?: string
        }
        Update: {
          archived?: boolean
          created_at?: string
          description?: string | null
          difficulty?: string
          estimated_duration?: number | null
          focus?: string
          id?: string
          name?: string
          sport_relevance?: string[]
          updated_at?: string
          user_id?: string
          visibility?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _profile_display_label: { Args: { user_id: string }; Returns: string }
      activate_training_program_for_user: {
        Args: { p_program_id: string }
        Returns: undefined
      }
      bjj_leaderboard_sessions_for_month: {
        Args: { month_start: string }
        Returns: {
          handle: string
          id: string
          name: string
          score: number
        }[]
      }
      can_view_author_profile: {
        Args: { creator_id: string; viewer_id: string }
        Returns: boolean
      }
      can_view_post: {
        Args: {
          creator_id: string
          viewer_id: string
          visibility: Database["public"]["Enums"]["post_visibility"]
        }
        Returns: boolean
      }
      comments_for_post: {
        Args: {
          cursor_created_at?: string
          page_size?: number
          parent_id?: string
          target_post_id: string
        }
        Returns: {
          author_avatar_url: string
          author_display_name: string
          author_username: string
          body: string
          created_at: string
          hashtags: string[]
          id: string
          mentioned_user_ids: string[]
          parent_comment_id: string
          post_id: string
          user_id: string
        }[]
      }
      discover_public_profiles: {
        Args: { p_limit?: number; p_prefix: string }
        Returns: {
          avatar_url: string
          display_name: string
          user_id: string
          username: string
        }[]
      }
      ensure_profile_from_auth: { Args: never; Returns: undefined }
      extract_social_hashtags: { Args: { input: string }; Returns: string[] }
      feed_explore: {
        Args: {
          cursor_created_at?: string
          page_size?: number
          viewer_id: string
        }
        Returns: {
          author_avatar_url: string
          author_handle: string
          author_name: string
          caption: string
          comment_count: number
          created_at: string
          like_count: number
          media_type: Database["public"]["Enums"]["post_media_type"]
          media_url: string
          post_id: string
          post_kind: Database["public"]["Enums"]["post_kind"]
          rank_score: number
          save_count: number
          thumbnail_url: string
          user_id: string
          viewer_liked: boolean
          viewer_saved: boolean
          visibility: Database["public"]["Enums"]["post_visibility"]
        }[]
      }
      feed_following: {
        Args: {
          cursor_created_at?: string
          page_size?: number
          viewer_id: string
        }
        Returns: {
          aspect_ratio: number
          author_avatar_url: string
          author_handle: string
          author_name: string
          caption: string
          comment_count: number
          created_at: string
          duration_ms: number
          like_count: number
          media_processing_status: Database["public"]["Enums"]["social_media_processing_status"]
          media_type: Database["public"]["Enums"]["post_media_type"]
          media_url: string
          playback_id: string
          playback_url: string
          post_id: string
          post_kind: Database["public"]["Enums"]["post_kind"]
          rank_score: number
          save_count: number
          thumbnail_url: string
          user_id: string
          viewer_liked: boolean
          viewer_saved: boolean
          visibility: Database["public"]["Enums"]["post_visibility"]
        }[]
      }
      feed_for_you: {
        Args: {
          cursor_created_at?: string
          page_size?: number
          viewer_id: string
        }
        Returns: {
          aspect_ratio: number
          author_avatar_url: string
          author_handle: string
          author_name: string
          caption: string
          comment_count: number
          created_at: string
          duration_ms: number
          like_count: number
          media_processing_status: Database["public"]["Enums"]["social_media_processing_status"]
          media_type: Database["public"]["Enums"]["post_media_type"]
          media_url: string
          playback_id: string
          playback_url: string
          post_id: string
          post_kind: Database["public"]["Enums"]["post_kind"]
          rank_score: number
          save_count: number
          thumbnail_url: string
          user_id: string
          viewer_liked: boolean
          viewer_saved: boolean
          visibility: Database["public"]["Enums"]["post_visibility"]
        }[]
      }
      feed_home: {
        Args: {
          cursor_created_at?: string
          page_size?: number
          viewer_id: string
        }
        Returns: {
          author_avatar_url: string
          author_handle: string
          author_name: string
          caption: string
          comment_count: number
          created_at: string
          like_count: number
          media_type: Database["public"]["Enums"]["post_media_type"]
          media_url: string
          post_id: string
          post_kind: Database["public"]["Enums"]["post_kind"]
          rank_score: number
          save_count: number
          thumbnail_url: string
          user_id: string
          viewer_liked: boolean
          viewer_saved: boolean
          visibility: Database["public"]["Enums"]["post_visibility"]
        }[]
      }
      feed_reels: {
        Args: {
          cursor_created_at?: string
          page_size?: number
          viewer_id: string
        }
        Returns: {
          aspect_ratio: number
          author_avatar_url: string
          author_handle: string
          author_name: string
          caption: string
          comment_count: number
          created_at: string
          duration_ms: number
          like_count: number
          media_processing_status: Database["public"]["Enums"]["social_media_processing_status"]
          media_type: Database["public"]["Enums"]["post_media_type"]
          media_url: string
          playback_id: string
          playback_url: string
          post_id: string
          post_kind: Database["public"]["Enums"]["post_kind"]
          rank_score: number
          save_count: number
          thumbnail_url: string
          user_id: string
          viewer_liked: boolean
          viewer_saved: boolean
          visibility: Database["public"]["Enums"]["post_visibility"]
        }[]
      }
      feed_saved_posts: {
        Args: {
          cursor_created_at?: string
          page_size?: number
          viewer_id: string
        }
        Returns: {
          aspect_ratio: number
          author_avatar_url: string
          author_handle: string
          author_name: string
          caption: string
          comment_count: number
          created_at: string
          duration_ms: number
          like_count: number
          media_processing_status: Database["public"]["Enums"]["social_media_processing_status"]
          media_type: Database["public"]["Enums"]["post_media_type"]
          media_url: string
          playback_id: string
          playback_url: string
          post_id: string
          post_kind: Database["public"]["Enums"]["post_kind"]
          rank_score: number
          save_count: number
          thumbnail_url: string
          user_id: string
          viewer_liked: boolean
          viewer_saved: boolean
          visibility: Database["public"]["Enums"]["post_visibility"]
        }[]
      }
      feed_user_profile: {
        Args: {
          cursor_created_at?: string
          page_size?: number
          profile_id: string
          viewer_id: string
        }
        Returns: {
          caption: string
          comment_count: number
          created_at: string
          like_count: number
          media_type: Database["public"]["Enums"]["post_media_type"]
          media_url: string
          post_id: string
          post_kind: Database["public"]["Enums"]["post_kind"]
          save_count: number
          thumbnail_url: string
          user_id: string
          viewer_liked: boolean
          viewer_saved: boolean
          visibility: Database["public"]["Enums"]["post_visibility"]
        }[]
      }
      feed_user_profile_filtered: {
        Args: {
          cursor_created_at?: string
          page_size?: number
          profile_id: string
          tab_filter?: string
          viewer_id: string
        }
        Returns: {
          aspect_ratio: number
          author_avatar_url: string
          author_handle: string
          author_name: string
          caption: string
          comment_count: number
          created_at: string
          duration_ms: number
          like_count: number
          media_processing_status: Database["public"]["Enums"]["social_media_processing_status"]
          media_type: Database["public"]["Enums"]["post_media_type"]
          media_url: string
          playback_id: string
          playback_url: string
          post_id: string
          post_kind: Database["public"]["Enums"]["post_kind"]
          rank_score: number
          save_count: number
          thumbnail_url: string
          user_id: string
          viewer_liked: boolean
          viewer_saved: boolean
          visibility: Database["public"]["Enums"]["post_visibility"]
        }[]
      }
      follow_suggestions: {
        Args: { page_size?: number; viewer_id: string }
        Returns: {
          score: number
          user_id: string
        }[]
      }
      get_feature_usage: { Args: { p_feature: string }; Returns: number }
      get_public_profile: {
        Args: { p_profile_id: string }
        Returns: {
          avatar_url: string
          bio: string
          branch: string
          display_name: string
          follower_count: number
          following_count: number
          primary_discipline: string
          privacy: string
          user_id: string
          username: string
          viewer_follows: boolean
          viewer_requested: boolean
        }[]
      }
	      has_premium_or_grace_access: {
	        Args: { p_now?: string; p_user_id: string }
	        Returns: boolean
	      }
	      has_matflow_paid_or_trial_access: {
	        Args: { p_now?: string; p_user_id: string }
	        Returns: boolean
	      }
	      record_matflow_app_store_transaction: {
	        Args: { p_transaction: Json }
	        Returns: Json
	      }
	      increment_feature_usage: {
	        Args: { p_delta?: number; p_feature: string }
	        Returns: number
	      }
      is_accepted_follower: {
        Args: { creator_id: string; viewer_id: string }
        Returns: boolean
      }
      is_social_moderator: { Args: { viewer_id: string }; Returns: boolean }
      list_public_user_systems: {
        Args: { p_branch?: string; p_profile_id: string }
        Returns: {
          branch: string
          edges: Json
          nodes: Json
          sort_order: number
          summary: string
          system_id: string
          title: string
          updated_at: string
          visibility: string
        }[]
      }
      list_public_user_techniques: {
        Args: { p_branch?: string; p_profile_id: string }
        Returns: {
          branch: string
          category: string
          created_at: string
          created_by: string
          description: string
          id: string
          linked_technique_ids: string[]
          links: string[]
          media: string[]
          tags: string[]
          title: string
          tutorial_thumbnail: string
          tutorial_title: string
          updated_at: string
        }[]
      }
      mention_resolve_handles: {
        Args: { p_handles: string[]; p_viewer_id: string }
        Returns: {
          user_id: string
          username: string
        }[]
      }
      moments_list: {
        Args: { profile_id: string; viewer_id: string }
        Returns: {
          cover_media_url: string
          cover_thumbnail_url: string
          moment_id: string
          story_count: number
          title: string
          updated_at: string
          user_id: string
        }[]
      }
      normalize_martial_arts_branch: {
        Args: { p_raw: string }
        Returns: string
      }
      public_profile_cards_batch: {
        Args: { p_user_ids: string[]; p_viewer_id: string }
        Returns: {
          avatar_url: string
          display_name: string
          user_id: string
          username: string
        }[]
      }
      record_feed_event: {
        Args: {
          completed_view?: boolean
          post_id: string
          replayed_view?: boolean
          skipped_view?: boolean
          surface_name: Database["public"]["Enums"]["social_feed_surface"]
          viewer_id: string
          watch_ms?: number
        }
        Returns: undefined
      }
	      record_playback_milestone: {
        Args: {
          milestone_name: Database["public"]["Enums"]["social_playback_milestone"]
          post_id: string
          surface_name: Database["public"]["Enums"]["social_feed_surface"]
          viewer_id: string
          watch_ms?: number
        }
	        Returns: undefined
	      }
	      start_matflow_v2_trial_if_missing: { Args: never; Returns: string }
      refresh_social_post_feature_rollups: { Args: never; Returns: number }
      replace_custom_workout_exercises: {
        Args: { p_exercises: Json; p_workout_id: string }
        Returns: undefined
      }
      request_or_follow: {
        Args: { requester_id: string; target_id: string }
        Returns: string
      }
      resolve_available_username: {
        Args: { p_exclude_user_id?: string; p_raw: string }
        Returns: string
      }
      resolve_social_moderation_item: {
        Args: {
          action?: string
          next_status: Database["public"]["Enums"]["moderation_status"]
          notes?: string
          queue_item_id: string
        }
        Returns: undefined
      }
      respond_follow_request: {
        Args: { accept_request: boolean; request_id: string }
        Returns: string
      }
      save_user_system: {
        Args: {
          p_branch: string
          p_edges: Json
          p_expected_updated_at: string
          p_nodes: Json
          p_sort_order: number
          p_summary: string
          p_system_id: string
          p_title: string
          p_visibility: string
        }
        Returns: string
      }
      save_user_system_graph: { Args: { p_input: Json }; Returns: Json }
      search_public_profiles: {
        Args: {
          p_branch: string
          p_cursor?: string
          p_limit?: number
          p_query?: string
        }
        Returns: {
          avatar_url: string
          branch: string
          display_name: string
          follower_count: number
          following_count: number
          primary_discipline: string
          privacy: string
          user_id: string
          username: string
          viewer_follows: boolean
          viewer_requested: boolean
        }[]
      }
      set_first_active_if_missing: { Args: never; Returns: string }
      slugify_username: { Args: { raw: string }; Returns: string }
      social_moderation_queue_page: {
        Args: {
          page_size?: number
          status_filter?: Database["public"]["Enums"]["moderation_status"]
        }
        Returns: {
          details: string
          evidence_urls: string[]
          post_caption: string
          post_id: string
          post_media_url: string
          priority: number
          queue_id: string
          reason: string
          report_created_at: string
          report_id: string
          reporter_user_id: string
          status: Database["public"]["Enums"]["moderation_status"]
          target_author_handle: string
          target_author_name: string
          target_user_id: string
          updated_at: string
        }[]
      }
      social_profile_overview: {
        Args: { profile_id: string; viewer_id: string }
        Returns: {
          avatar_url: string
          bio: string
          display_name: string
          follower_count: number
          following_count: number
          is_self: boolean
          post_count: number
          primary_discipline: string
          reel_count: number
          saved_count: number
          user_id: string
          username: string
          viewer_follows: boolean
          viewer_requested: boolean
        }[]
      }
      social_trending_topics: {
        Args: { page_size?: number }
        Returns: {
          label: string
          post_count: number
          slug: string
        }[]
      }
      stories_active: {
        Args: { page_size?: number; viewer_id: string }
        Returns: {
          author_avatar_url: string
          author_handle: string
          author_name: string
          caption: string
          created_at: string
          expires_at: string
          media_type: Database["public"]["Enums"]["post_media_type"]
          media_url: string
          story_id: string
          thumbnail_url: string
          user_id: string
          viewer_seen: boolean
          visibility: Database["public"]["Enums"]["post_visibility"]
        }[]
      }
      submit_negative_feedback: {
        Args: {
          feedback: Database["public"]["Enums"]["social_feedback_type"]
          target_post_id: string
          viewer_id: string
        }
        Returns: undefined
      }
      sync_post_engagement_counts: {
        Args: { target_post_id: string }
        Returns: undefined
      }
      username_is_available: {
        Args: { p_exclude_user_id?: string; p_username: string }
        Returns: boolean
      }
    }
    Enums: {
      follow_request_status: "pending" | "accepted" | "rejected"
      moderation_status: "open" | "reviewing" | "actioned" | "dismissed"
      post_kind: "moment" | "reel"
      post_media_type: "image" | "video"
      post_visibility: "public" | "followers" | "private"
      social_feed_surface:
        | "for_you"
        | "following"
        | "explore"
        | "reels"
        | "profile"
      social_feedback_type: "hide" | "not_interested" | "report"
      social_media_processing_status:
        | "pending"
        | "processing"
        | "ready"
        | "failed"
      social_playback_milestone:
        | "impression"
        | "watch_start"
        | "view_2s"
        | "quartile_25"
        | "quartile_50"
        | "quartile_75"
        | "completion"
        | "skip"
        | "replay"
      social_publish_target: "post" | "reel" | "story"
      social_video_provider: "mux" | "cloudflare_stream"
      sport_type: "wrestling" | "judo" | "bjj"
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
      follow_request_status: ["pending", "accepted", "rejected"],
      moderation_status: ["open", "reviewing", "actioned", "dismissed"],
      post_kind: ["moment", "reel"],
      post_media_type: ["image", "video"],
      post_visibility: ["public", "followers", "private"],
      social_feed_surface: [
        "for_you",
        "following",
        "explore",
        "reels",
        "profile",
      ],
      social_feedback_type: ["hide", "not_interested", "report"],
      social_media_processing_status: [
        "pending",
        "processing",
        "ready",
        "failed",
      ],
      social_playback_milestone: [
        "impression",
        "watch_start",
        "view_2s",
        "quartile_25",
        "quartile_50",
        "quartile_75",
        "completion",
        "skip",
        "replay",
      ],
      social_publish_target: ["post", "reel", "story"],
      social_video_provider: ["mux", "cloudflare_stream"],
      sport_type: ["wrestling", "judo", "bjj"],
    },
  },
} as const
