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
      activity_logs: {
        Row: {
          created_at: string | null
          date: string
          duration: number
          id: string
          intensity: string | null
          notes: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date: string
          duration: number
          id?: string
          intensity?: string | null
          notes?: string | null
          type: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string
          duration?: number
          id?: string
          intensity?: string | null
          notes?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      athlete_exercises: {
        Row: {
          athlete_id: string
          created_at: string | null
          duration: string | null
          exercise_id: string
          frequency: string | null
          id: string
          notes: string | null
          priority: number | null
          reps: string | null
          sets: string | null
          weight: string | null
        }
        Insert: {
          athlete_id: string
          created_at?: string | null
          duration?: string | null
          exercise_id: string
          frequency?: string | null
          id?: string
          notes?: string | null
          priority?: number | null
          reps?: string | null
          sets?: string | null
          weight?: string | null
        }
        Update: {
          athlete_id?: string
          created_at?: string | null
          duration?: string | null
          exercise_id?: string
          frequency?: string | null
          id?: string
          notes?: string | null
          priority?: number | null
          reps?: string | null
          sets?: string | null
          weight?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "athlete_exercises_athlete_id_fkey"
            columns: ["athlete_id"]
            isOneToOne: false
            referencedRelation: "athletes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "athlete_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      athletes: {
        Row: {
          achievements: string[] | null
          bio: string | null
          created_at: string | null
          id: string
          image_url: string | null
          name: string
          nationality: string | null
          sport: Database["public"]["Enums"]["sport_type"]
          updated_at: string | null
        }
        Insert: {
          achievements?: string[] | null
          bio?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          name: string
          nationality?: string | null
          sport: Database["public"]["Enums"]["sport_type"]
          updated_at?: string | null
        }
        Update: {
          achievements?: string[] | null
          bio?: string | null
          created_at?: string | null
          id?: string
          image_url?: string | null
          name?: string
          nationality?: string | null
          sport?: Database["public"]["Enums"]["sport_type"]
          updated_at?: string | null
        }
        Relationships: []
      }
      custom_workout_exercises: {
        Row: {
          duration: number | null
          id: string
          name: string
          notes: string | null
          order_index: number
          reps: number | null
          rest_time: number
          sets: number
          video_url: string | null
          workout_id: string
        }
        Insert: {
          duration?: number | null
          id?: string
          name: string
          notes?: string | null
          order_index: number
          reps?: number | null
          rest_time: number
          sets: number
          video_url?: string | null
          workout_id: string
        }
        Update: {
          duration?: number | null
          id?: string
          name?: string
          notes?: string | null
          order_index?: number
          reps?: number | null
          rest_time?: number
          sets?: number
          video_url?: string | null
          workout_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_workout_exercises_workout_id_fkey"
            columns: ["workout_id"]
            isOneToOne: false
            referencedRelation: "custom_workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      custom_workouts: {
        Row: {
          created_at: string | null
          creator_id: string
          description: string | null
          difficulty: string
          estimated_duration: number | null
          focus: string
          id: string
          is_premium: boolean | null
          name: string
          original_workout_id: string | null
          save_count: number | null
          sport_relevance: string[] | null
          updated_at: string | null
          visibility: string
        }
        Insert: {
          created_at?: string | null
          creator_id: string
          description?: string | null
          difficulty: string
          estimated_duration?: number | null
          focus: string
          id?: string
          is_premium?: boolean | null
          name: string
          original_workout_id?: string | null
          save_count?: number | null
          sport_relevance?: string[] | null
          updated_at?: string | null
          visibility?: string
        }
        Update: {
          created_at?: string | null
          creator_id?: string
          description?: string | null
          difficulty?: string
          estimated_duration?: number | null
          focus?: string
          id?: string
          is_premium?: boolean | null
          name?: string
          original_workout_id?: string | null
          save_count?: number | null
          sport_relevance?: string[] | null
          updated_at?: string | null
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_workouts_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "custom_workouts_original_workout_id_fkey"
            columns: ["original_workout_id"]
            isOneToOne: false
            referencedRelation: "custom_workouts"
            referencedColumns: ["id"]
          },
        ]
      }
      drills: {
        Row: {
          benefits: string[] | null
          category: string
          coaching_cues: string[] | null
          common_mistakes: string[] | null
          created_at: string | null
          description: string | null
          difficulty: string | null
          duration: number | null
          equipment: string[] | null
          id: string
          injury_prevention: string | null
          instructions: string[] | null
          is_premium: boolean | null
          muscles_worked: string[] | null
          name: string
          related_drills: string[] | null
          sport_relevance: string[] | null
          subcategory: string | null
          video_url: string | null
        }
        Insert: {
          benefits?: string[] | null
          category: string
          coaching_cues?: string[] | null
          common_mistakes?: string[] | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          duration?: number | null
          equipment?: string[] | null
          id: string
          injury_prevention?: string | null
          instructions?: string[] | null
          is_premium?: boolean | null
          muscles_worked?: string[] | null
          name: string
          related_drills?: string[] | null
          sport_relevance?: string[] | null
          subcategory?: string | null
          video_url?: string | null
        }
        Update: {
          benefits?: string[] | null
          category?: string
          coaching_cues?: string[] | null
          common_mistakes?: string[] | null
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          duration?: number | null
          equipment?: string[] | null
          id?: string
          injury_prevention?: string | null
          instructions?: string[] | null
          is_premium?: boolean | null
          muscles_worked?: string[] | null
          name?: string
          related_drills?: string[] | null
          sport_relevance?: string[] | null
          subcategory?: string | null
          video_url?: string | null
        }
        Relationships: []
      }
      exercise_completions: {
        Row: {
          completed_at: string | null
          exercise_id: string
          id: string
          session_log_id: string | null
          source: string | null
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          exercise_id: string
          id?: string
          session_log_id?: string | null
          source?: string | null
          user_id: string
        }
        Update: {
          completed_at?: string | null
          exercise_id?: string
          id?: string
          session_log_id?: string | null
          source?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_completions_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_completions_session_log_id_fkey"
            columns: ["session_log_id"]
            isOneToOne: false
            referencedRelation: "session_logs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_completions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_favorites: {
        Row: {
          created_at: string | null
          exercise_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          exercise_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          exercise_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exercise_favorites_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exercise_favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_recommendations: {
        Row: {
          created_at: string | null
          exercise_id: string
          experience_level: string
          id: string
          progression_notes: string | null
          regression_notes: string | null
          reps_max: number | null
          reps_min: number | null
          rest_seconds_max: number | null
          rest_seconds_min: number | null
          sets_max: number | null
          sets_min: number | null
          tempo: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          exercise_id: string
          experience_level: string
          id?: string
          progression_notes?: string | null
          regression_notes?: string | null
          reps_max?: number | null
          reps_min?: number | null
          rest_seconds_max?: number | null
          rest_seconds_min?: number | null
          sets_max?: number | null
          sets_min?: number | null
          tempo?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          exercise_id?: string
          experience_level?: string
          id?: string
          progression_notes?: string | null
          regression_notes?: string | null
          reps_max?: number | null
          reps_min?: number | null
          rest_seconds_max?: number | null
          rest_seconds_min?: number | null
          sets_max?: number | null
          sets_min?: number | null
          tempo?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "exercise_recommendations_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
        ]
      }
      exercises: {
        Row: {
          athlete_specific: boolean | null
          category: string
          created_at: string | null
          description: string | null
          equipment: string[] | null
          id: string
          is_weighted: boolean | null
          muscle_groups: string[] | null
          name: string
          sport: Database["public"]["Enums"]["sport_type"] | null
          video_url: string | null
        }
        Insert: {
          athlete_specific?: boolean | null
          category: string
          created_at?: string | null
          description?: string | null
          equipment?: string[] | null
          id?: string
          is_weighted?: boolean | null
          muscle_groups?: string[] | null
          name: string
          sport?: Database["public"]["Enums"]["sport_type"] | null
          video_url?: string | null
        }
        Update: {
          athlete_specific?: boolean | null
          category?: string
          created_at?: string | null
          description?: string | null
          equipment?: string[] | null
          id?: string
          is_weighted?: boolean | null
          muscle_groups?: string[] | null
          name?: string
          sport?: Database["public"]["Enums"]["sport_type"] | null
          video_url?: string | null
        }
        Relationships: []
      }
      learning_path_drills: {
        Row: {
          drill_id: string
          id: string
          learning_path_id: string
          order_index: number
        }
        Insert: {
          drill_id: string
          id?: string
          learning_path_id: string
          order_index: number
        }
        Update: {
          drill_id?: string
          id?: string
          learning_path_id?: string
          order_index?: number
        }
        Relationships: [
          {
            foreignKeyName: "learning_path_drills_drill_id_fkey"
            columns: ["drill_id"]
            isOneToOne: false
            referencedRelation: "drills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "learning_path_drills_learning_path_id_fkey"
            columns: ["learning_path_id"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_paths: {
        Row: {
          created_at: string | null
          description: string | null
          difficulty: string | null
          estimated_weeks: number | null
          id: string
          is_premium: boolean | null
          name: string
          sport: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          estimated_weeks?: number | null
          id: string
          is_premium?: boolean | null
          name: string
          sport: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          difficulty?: string | null
          estimated_weeks?: number | null
          id?: string
          is_premium?: boolean | null
          name?: string
          sport?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string | null
          display_name: string
          equipment: string | null
          id: string
          onboarding_completed: boolean | null
          sport: string
          training_days: number
          updated_at: string | null
          username: string
          weight_unit: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name: string
          equipment?: string | null
          id: string
          onboarding_completed?: boolean | null
          sport?: string
          training_days?: number
          updated_at?: string | null
          username: string
          weight_unit?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string | null
          display_name?: string
          equipment?: string | null
          id?: string
          onboarding_completed?: boolean | null
          sport?: string
          training_days?: number
          updated_at?: string | null
          username?: string
          weight_unit?: string
        }
        Relationships: []
      }
      program_sessions: {
        Row: {
          day_number: number
          duration_estimate: number | null
          focus: string | null
          id: string
          name: string
          order_index: number
          program_id: string
        }
        Insert: {
          day_number: number
          duration_estimate?: number | null
          focus?: string | null
          id?: string
          name: string
          order_index: number
          program_id: string
        }
        Update: {
          day_number?: number
          duration_estimate?: number | null
          focus?: string | null
          id?: string
          name?: string
          order_index?: number
          program_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_sessions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
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
      routine_drills: {
        Row: {
          drill_id: string
          duration: number | null
          id: string
          order_index: number
          routine_id: string
        }
        Insert: {
          drill_id: string
          duration?: number | null
          id?: string
          order_index: number
          routine_id: string
        }
        Update: {
          drill_id?: string
          duration?: number | null
          id?: string
          order_index?: number
          routine_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "routine_drills_drill_id_fkey"
            columns: ["drill_id"]
            isOneToOne: false
            referencedRelation: "drills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "routine_drills_routine_id_fkey"
            columns: ["routine_id"]
            isOneToOne: false
            referencedRelation: "routines"
            referencedColumns: ["id"]
          },
        ]
      }
      routines: {
        Row: {
          created_at: string | null
          description: string | null
          duration: number | null
          for_sport: string[] | null
          for_workout_focus: string[] | null
          id: string
          is_premium: boolean | null
          name: string
          type: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          duration?: number | null
          for_sport?: string[] | null
          for_workout_focus?: string[] | null
          id: string
          is_premium?: boolean | null
          name: string
          type: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          duration?: number | null
          for_sport?: string[] | null
          for_workout_focus?: string[] | null
          id?: string
          is_premium?: boolean | null
          name?: string
          type?: string
        }
        Relationships: []
      }
      session_exercises: {
        Row: {
          duration: number | null
          exercise_id: string
          id: string
          order_index: number
          reps: number | null
          rest_time: number
          session_id: string
          sets: number
        }
        Insert: {
          duration?: number | null
          exercise_id: string
          id?: string
          order_index: number
          reps?: number | null
          rest_time?: number
          session_id: string
          sets: number
        }
        Update: {
          duration?: number | null
          exercise_id?: string
          id?: string
          order_index?: number
          reps?: number | null
          rest_time?: number
          session_id?: string
          sets?: number
        }
        Relationships: [
          {
            foreignKeyName: "session_exercises_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_exercises_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "program_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      session_log_weights: {
        Row: {
          exercise_id: string
          id: string
          session_log_id: string
          sets_completed: number | null
          weights: number[] | null
        }
        Insert: {
          exercise_id: string
          id?: string
          session_log_id: string
          sets_completed?: number | null
          weights?: number[] | null
        }
        Update: {
          exercise_id?: string
          id?: string
          session_log_id?: string
          sets_completed?: number | null
          weights?: number[] | null
        }
        Relationships: [
          {
            foreignKeyName: "session_log_weights_exercise_id_fkey"
            columns: ["exercise_id"]
            isOneToOne: false
            referencedRelation: "exercises"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_log_weights_session_log_id_fkey"
            columns: ["session_log_id"]
            isOneToOne: false
            referencedRelation: "session_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      session_logs: {
        Row: {
          completed: boolean | null
          created_at: string | null
          date: string
          effort_rating: number | null
          id: string
          notes: string | null
          session_id: string | null
          total_time: number | null
          total_volume: number | null
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          created_at?: string | null
          date: string
          effort_rating?: number | null
          id?: string
          notes?: string | null
          session_id?: string | null
          total_time?: number | null
          total_volume?: number | null
          user_id: string
        }
        Update: {
          completed?: boolean | null
          created_at?: string | null
          date?: string
          effort_rating?: number | null
          id?: string
          notes?: string | null
          session_id?: string | null
          total_time?: number | null
          total_volume?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "session_logs_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "program_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "session_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      training_program_state: {
        Row: {
          program_id: string | null
          updated_at: string | null
          user_id: string
          week_progress: Json
        }
        Insert: {
          program_id?: string | null
          updated_at?: string | null
          user_id: string
          week_progress: Json
        }
        Update: {
          program_id?: string | null
          updated_at?: string | null
          user_id?: string
          week_progress?: Json
        }
        Relationships: [
          {
            foreignKeyName: "training_program_state_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "training_programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_program_state_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      training_program_versions: {
        Row: {
          created_at: string | null
          created_by: string | null
          data: Json
          id: string
          is_original: boolean
          label: string | null
          program_id: string
          version_number: number
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          data: Json
          id?: string
          is_original?: boolean
          label?: string | null
          program_id: string
          version_number: number
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          data?: Json
          id?: string
          is_original?: boolean
          label?: string | null
          program_id?: string
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "training_program_versions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_program_versions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "training_programs"
            referencedColumns: ["id"]
          },
        ]
      }
      training_programs: {
        Row: {
          created_at: string | null
          current_version_id: string | null
          id: string
          original_version_id: string | null
          sport: Database["public"]["Enums"]["sport_type"]
          status: string
          training_days: number
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          current_version_id?: string | null
          id?: string
          original_version_id?: string | null
          sport: Database["public"]["Enums"]["sport_type"]
          status?: string
          training_days: number
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          current_version_id?: string | null
          id?: string
          original_version_id?: string | null
          sport?: Database["public"]["Enums"]["sport_type"]
          status?: string
          training_days?: number
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_programs_current_version_fkey"
            columns: ["current_version_id"]
            isOneToOne: false
            referencedRelation: "training_program_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_programs_original_version_fkey"
            columns: ["original_version_id"]
            isOneToOne: false
            referencedRelation: "training_program_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "training_programs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_learning_progress: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          current_drill_index: number | null
          id: string
          learning_path_id: string
          started_at: string | null
          user_id: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          current_drill_index?: number | null
          id?: string
          learning_path_id: string
          started_at?: string | null
          user_id: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          current_drill_index?: number | null
          id?: string
          learning_path_id?: string
          started_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_learning_progress_learning_path_id_fkey"
            columns: ["learning_path_id"]
            isOneToOne: false
            referencedRelation: "learning_paths"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_learning_progress_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
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
      user_recently_viewed: {
        Row: {
          drill_id: string
          id: string
          user_id: string
          viewed_at: string | null
        }
        Insert: {
          drill_id: string
          id?: string
          user_id: string
          viewed_at?: string | null
        }
        Update: {
          drill_id?: string
          id?: string
          user_id?: string
          viewed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_recently_viewed_drill_id_fkey"
            columns: ["drill_id"]
            isOneToOne: false
            referencedRelation: "drills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_recently_viewed_user_id_fkey"
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
          follower_count: number | null
          following_count: number | null
          last_workout_date: string | null
          longest_streak: number | null
          total_saves: number | null
          user_id: string
          workout_count: number | null
        }
        Insert: {
          current_streak?: number | null
          follower_count?: number | null
          following_count?: number | null
          last_workout_date?: string | null
          longest_streak?: number | null
          total_saves?: number | null
          user_id: string
          workout_count?: number | null
        }
        Update: {
          current_streak?: number | null
          follower_count?: number | null
          following_count?: number | null
          last_workout_date?: string | null
          longest_streak?: number | null
          total_saves?: number | null
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
      week_progress: {
        Row: {
          completed: boolean | null
          completed_at: string | null
          day_of_week: number
          id: string
          planned: boolean | null
          user_program_id: string
        }
        Insert: {
          completed?: boolean | null
          completed_at?: string | null
          day_of_week: number
          id?: string
          planned?: boolean | null
          user_program_id: string
        }
        Update: {
          completed?: boolean | null
          completed_at?: string | null
          day_of_week?: number
          id?: string
          planned?: boolean | null
          user_program_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "week_progress_user_program_id_fkey"
            columns: ["user_program_id"]
            isOneToOne: false
            referencedRelation: "user_programs"
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
      sport_type: ["wrestling", "judo", "bjj"],
    },
  },
} as const
