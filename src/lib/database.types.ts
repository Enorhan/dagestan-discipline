// ============================================
// DATABASE TYPES - Auto-generated from Supabase schema
// ============================================

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          display_name: string
          avatar_url: string | null
          bio: string | null
          sport: string
          weight_unit: string
          training_days: number
          equipment: string | null
          onboarding_completed: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          username: string
          display_name: string
          avatar_url?: string | null
          bio?: string | null
          sport: string
          weight_unit: string
          training_days: number
          equipment?: string | null
          onboarding_completed?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          username?: string
          display_name?: string
          avatar_url?: string | null
          bio?: string | null
          sport?: string
          weight_unit?: string
          training_days?: number
          equipment?: string | null
          onboarding_completed?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      user_stats: {
        Row: {
          user_id: string
          workout_count: number | null
          follower_count: number | null
          following_count: number | null
          total_saves: number | null
          current_streak: number | null
          longest_streak: number | null
          last_workout_date: string | null
        }
        Insert: {
          user_id: string
          workout_count?: number | null
          follower_count?: number | null
          following_count?: number | null
          total_saves?: number | null
          current_streak?: number | null
          longest_streak?: number | null
          last_workout_date?: string | null
        }
        Update: {
          user_id?: string
          workout_count?: number | null
          follower_count?: number | null
          following_count?: number | null
          total_saves?: number | null
          current_streak?: number | null
          longest_streak?: number | null
          last_workout_date?: string | null
        }
      }
      follows: {
        Row: {
          id: string
          follower_id: string
          following_id: string
          created_at: string | null
        }
        Insert: {
          id?: string
          follower_id: string
          following_id: string
          created_at?: string | null
        }
        Update: {
          id?: string
          follower_id?: string
          following_id?: string
          created_at?: string | null
        }
      }
      custom_workouts: {
        Row: {
          id: string
          creator_id: string
          name: string
          description: string | null
          focus: string
          difficulty: string
          estimated_duration: number | null
          sport_relevance: string[] | null
          visibility: string
          save_count: number | null
          original_workout_id: string | null
          is_premium: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          creator_id: string
          name: string
          description?: string | null
          focus: string
          difficulty: string
          estimated_duration?: number | null
          sport_relevance?: string[] | null
          visibility: string
          save_count?: number | null
          original_workout_id?: string | null
          is_premium?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          creator_id?: string
          name?: string
          description?: string | null
          focus?: string
          difficulty?: string
          estimated_duration?: number | null
          sport_relevance?: string[] | null
          visibility?: string
          save_count?: number | null
          original_workout_id?: string | null
          is_premium?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      custom_workout_exercises: {
        Row: {
          id: string
          workout_id: string
          name: string
          sets: number
          reps: number | null
          duration: number | null
          rest_time: number
          notes: string | null
          video_url: string | null
          order_index: number
        }
        Insert: {
          id?: string
          workout_id: string
          name: string
          sets: number
          reps?: number | null
          duration?: number | null
          rest_time: number
          notes?: string | null
          video_url?: string | null
          order_index: number
        }
        Update: {
          id?: string
          workout_id?: string
          name?: string
          sets?: number
          reps?: number | null
          duration?: number | null
          rest_time?: number
          notes?: string | null
          video_url?: string | null
          order_index?: number
        }
      }
      saved_workouts: {
        Row: {
          id: string
          user_id: string
          workout_id: string
          saved_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          workout_id: string
          saved_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          workout_id?: string
          saved_at?: string | null
        }
      }
      session_logs: {
        Row: {
          id: string
          user_id: string
          session_id: string | null
          date: string
          completed: boolean | null
          effort_rating: number | null
          total_time: number | null
          total_volume: number | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          session_id?: string | null
          date: string
          completed?: boolean | null
          effort_rating?: number | null
          total_time?: number | null
          total_volume?: number | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          session_id?: string | null
          date?: string
          completed?: boolean | null
          effort_rating?: number | null
          total_time?: number | null
          total_volume?: number | null
          notes?: string | null
          created_at?: string | null
        }
      }
      activity_logs: {
        Row: {
          id: string
          user_id: string
          type: string
          date: string
          duration: number
          intensity: string | null
          notes: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          type: string
          date: string
          duration: number
          intensity?: string | null
          notes?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          type?: string
          date?: string
          duration?: number
          intensity?: string | null
          notes?: string | null
          created_at?: string | null
        }
      }
      drills: {
        Row: {
          id: string
          name: string
          category: string
          subcategory: string | null
          video_url: string | null
          duration: number | null
          difficulty: string | null
          sport_relevance: string[] | null
          description: string | null
          benefits: string[] | null
          muscles_worked: string[] | null
          injury_prevention: string | null
          instructions: string[] | null
          common_mistakes: string[] | null
          coaching_cues: string[] | null
          equipment: string[] | null
          related_drills: string[] | null
          is_premium: boolean | null
          created_at: string | null
        }
        Insert: {
          id: string
          name: string
          category: string
          subcategory?: string | null
          video_url?: string | null
          duration?: number | null
          difficulty?: string | null
          sport_relevance?: string[] | null
          description?: string | null
          benefits?: string[] | null
          muscles_worked?: string[] | null
          injury_prevention?: string | null
          instructions?: string[] | null
          common_mistakes?: string[] | null
          coaching_cues?: string[] | null
          equipment?: string[] | null
          related_drills?: string[] | null
          is_premium?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          category?: string
          subcategory?: string | null
          video_url?: string | null
          duration?: number | null
          difficulty?: string | null
          sport_relevance?: string[] | null
          description?: string | null
          benefits?: string[] | null
          muscles_worked?: string[] | null
          injury_prevention?: string | null
          instructions?: string[] | null
          common_mistakes?: string[] | null
          coaching_cues?: string[] | null
          equipment?: string[] | null
          related_drills?: string[] | null
          is_premium?: boolean | null
          created_at?: string | null
        }
      }
      routines: {
        Row: {
          id: string
          name: string
          type: string
          duration: number | null
          description: string | null
          for_sport: string[] | null
          for_workout_focus: string[] | null
          is_premium: boolean | null
          created_at: string | null
        }
        Insert: {
          id: string
          name: string
          type: string
          duration?: number | null
          description?: string | null
          for_sport?: string[] | null
          for_workout_focus?: string[] | null
          is_premium?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          type?: string
          duration?: number | null
          description?: string | null
          for_sport?: string[] | null
          for_workout_focus?: string[] | null
          is_premium?: boolean | null
          created_at?: string | null
        }
      }
      routine_drills: {
        Row: {
          id: string
          routine_id: string
          drill_id: string
          duration: number | null
          order_index: number
        }
        Insert: {
          id?: string
          routine_id: string
          drill_id: string
          duration?: number | null
          order_index: number
        }
        Update: {
          id?: string
          routine_id?: string
          drill_id?: string
          duration?: number | null
          order_index?: number
        }
      }
      learning_paths: {
        Row: {
          id: string
          name: string
          description: string | null
          sport: string
          difficulty: string | null
          estimated_weeks: number | null
          is_premium: boolean | null
          created_at: string | null
        }
        Insert: {
          id: string
          name: string
          description?: string | null
          sport: string
          difficulty?: string | null
          estimated_weeks?: number | null
          is_premium?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          sport?: string
          difficulty?: string | null
          estimated_weeks?: number | null
          is_premium?: boolean | null
          created_at?: string | null
        }
      }
      learning_path_drills: {
        Row: {
          id: string
          learning_path_id: string
          drill_id: string
          order_index: number
        }
        Insert: {
          id?: string
          learning_path_id: string
          drill_id: string
          order_index: number
        }
        Update: {
          id?: string
          learning_path_id?: string
          drill_id?: string
          order_index?: number
        }
      }
      user_recently_viewed: {
        Row: {
          id: string
          user_id: string
          drill_id: string
          viewed_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          drill_id: string
          viewed_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          drill_id?: string
          viewed_at?: string | null
        }
      }
      subscriptions: {
        Row: {
          id: string
          user_id: string
          plan_id: string
          status: string
          stripe_subscription_id: string | null
          stripe_customer_id: string | null
          current_period_start: string | null
          current_period_end: string | null
          cancel_at_period_end: boolean | null
          trial_end: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          user_id: string
          plan_id: string
          status: string
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean | null
          trial_end?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          user_id?: string
          plan_id?: string
          status?: string
          stripe_subscription_id?: string | null
          stripe_customer_id?: string | null
          current_period_start?: string | null
          current_period_end?: string | null
          cancel_at_period_end?: boolean | null
          trial_end?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
      }
      subscription_plans: {
        Row: {
          id: string
          name: string
          description: string | null
          price_sek: number
          interval: string
          features: Record<string, unknown> | null
          stripe_price_id: string | null
          is_active: boolean | null
          created_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          price_sek: number
          interval: string
          features?: Record<string, unknown> | null
          stripe_price_id?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          price_sek?: number
          interval?: string
          features?: Record<string, unknown> | null
          stripe_price_id?: string | null
          is_active?: boolean | null
          created_at?: string | null
        }
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}

