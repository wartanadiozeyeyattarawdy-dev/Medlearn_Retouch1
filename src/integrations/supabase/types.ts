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
      abbreviations: {
        Row: {
          full_form: string
          id: string
          module_id: string
          short: string
        }
        Insert: {
          full_form: string
          id?: string
          module_id: string
          short: string
        }
        Update: {
          full_form?: string
          id?: string
          module_id?: string
          short?: string
        }
        Relationships: [
          {
            foreignKeyName: "abbreviations_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      achievements: {
        Row: {
          description: string
          emoji: string
          id: string
          ord: number
          title: string
          xp_reward: number
        }
        Insert: {
          description: string
          emoji?: string
          id: string
          ord?: number
          title: string
          xp_reward?: number
        }
        Update: {
          description?: string
          emoji?: string
          id?: string
          ord?: number
          title?: string
          xp_reward?: number
        }
        Relationships: []
      }
      attempts: {
        Row: {
          chosen_letters: string[]
          correct: boolean
          created_at: string
          id: string
          question_id: string
          user_id: string
        }
        Insert: {
          chosen_letters?: string[]
          correct?: boolean
          created_at?: string
          id?: string
          question_id: string
          user_id: string
        }
        Update: {
          chosen_letters?: string[]
          correct?: boolean
          created_at?: string
          id?: string
          question_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attempts_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      choices: {
        Row: {
          explanation: string
          id: string
          is_correct: boolean
          letter: string
          question_id: string
          text: string
        }
        Insert: {
          explanation?: string
          id?: string
          is_correct?: boolean
          letter: string
          question_id: string
          text: string
        }
        Update: {
          explanation?: string
          id?: string
          is_correct?: boolean
          letter?: string
          question_id?: string
          text?: string
        }
        Relationships: [
          {
            foreignKeyName: "choices_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      lesson_progress: {
        Row: {
          best_score: number
          completed_at: string | null
          id: string
          lesson_id: string
          module_id: string
          user_id: string
          viewed_at: string | null
        }
        Insert: {
          best_score?: number
          completed_at?: string | null
          id?: string
          lesson_id: string
          module_id: string
          user_id: string
          viewed_at?: string | null
        }
        Update: {
          best_score?: number
          completed_at?: string | null
          id?: string
          lesson_id?: string
          module_id?: string
          user_id?: string
          viewed_at?: string | null
        }
        Relationships: []
      }
      lessons: {
        Row: {
          audio_url: string | null
          created_at: string
          full_text: string
          id: string
          image_url: string | null
          mini_case: string | null
          module_id: string
          ord: number
          resource_url: string | null
          summary: string
          title: string
          traps: string | null
          video_url: string | null
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          full_text?: string
          id?: string
          image_url?: string | null
          mini_case?: string | null
          module_id: string
          ord?: number
          resource_url?: string | null
          summary?: string
          title: string
          traps?: string | null
          video_url?: string | null
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          full_text?: string
          id?: string
          image_url?: string | null
          mini_case?: string | null
          module_id?: string
          ord?: number
          resource_url?: string | null
          summary?: string
          title?: string
          traps?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      modules: {
        Row: {
          created_at: string
          description: string | null
          emoji: string | null
          id: string
          learning_info: string | null
          name: string
          published: boolean
          year_id: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          emoji?: string | null
          id?: string
          learning_info?: string | null
          name: string
          published?: boolean
          year_id?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          emoji?: string | null
          id?: string
          learning_info?: string | null
          name?: string
          published?: boolean
          year_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "modules_year_id_fkey"
            columns: ["year_id"]
            isOneToOne: false
            referencedRelation: "years"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_emoji: string
          bio: string | null
          created_at: string
          full_name: string | null
          id: string
          public_profile: boolean
          theme: string
        }
        Insert: {
          avatar_emoji?: string
          bio?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          public_profile?: boolean
          theme?: string
        }
        Update: {
          avatar_emoji?: string
          bio?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          public_profile?: boolean
          theme?: string
        }
        Relationships: []
      }
      question_reports: {
        Row: {
          admin_note: string | null
          created_at: string
          details: string | null
          id: string
          module_id: string | null
          question_id: string
          reason: string
          reviewed_at: string | null
          reviewed_by: string | null
          reward_given: boolean
          status: string
          user_id: string
        }
        Insert: {
          admin_note?: string | null
          created_at?: string
          details?: string | null
          id?: string
          module_id?: string | null
          question_id: string
          reason: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reward_given?: boolean
          status?: string
          user_id: string
        }
        Update: {
          admin_note?: string | null
          created_at?: string
          details?: string | null
          id?: string
          module_id?: string | null
          question_id?: string
          reason?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          reward_given?: boolean
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_reports_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "question_reports_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          audio_url: string | null
          created_at: string
          id: string
          image_url: string | null
          lesson_id: string | null
          module_id: string
          ord: number
          source: string
          stem: string
          teacher_note: string | null
          video_url: string | null
        }
        Insert: {
          audio_url?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          lesson_id?: string | null
          module_id: string
          ord?: number
          source?: string
          stem: string
          teacher_note?: string | null
          video_url?: string | null
        }
        Update: {
          audio_url?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          lesson_id?: string | null
          module_id?: string
          ord?: number
          source?: string
          stem?: string
          teacher_note?: string | null
          video_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "questions_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "modules"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          active: boolean
          ai_qcm_per_day: number
          created_at: string
          features: Json
          hearts_max: number
          id: string
          label: string
          ord: number
          period: string
          price_mad: number
        }
        Insert: {
          active?: boolean
          ai_qcm_per_day?: number
          created_at?: string
          features?: Json
          hearts_max?: number
          id: string
          label: string
          ord?: number
          period?: string
          price_mad?: number
        }
        Update: {
          active?: boolean
          ai_qcm_per_day?: number
          created_at?: string
          features?: Json
          hearts_max?: number
          id?: string
          label?: string
          ord?: number
          period?: string
          price_mad?: number
        }
        Relationships: []
      }
      user_achievements: {
        Row: {
          achievement_id: string
          earned_at: string
          id: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string
          id?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
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
      user_stats: {
        Row: {
          activity_date: string | null
          activity_minutes_today: number
          bonus_hearts_total: number
          created_at: string
          daily_goal: number
          daily_xp: number
          daily_xp_date: string
          hearts: number
          hearts_max: number
          hearts_updated_at: string
          last_active_date: string | null
          last_activity_ping: string | null
          level: number
          longest_streak: number
          streak_days: number
          updated_at: string
          user_id: string
          xp: number
        }
        Insert: {
          activity_date?: string | null
          activity_minutes_today?: number
          bonus_hearts_total?: number
          created_at?: string
          daily_goal?: number
          daily_xp?: number
          daily_xp_date?: string
          hearts?: number
          hearts_max?: number
          hearts_updated_at?: string
          last_active_date?: string | null
          last_activity_ping?: string | null
          level?: number
          longest_streak?: number
          streak_days?: number
          updated_at?: string
          user_id: string
          xp?: number
        }
        Update: {
          activity_date?: string | null
          activity_minutes_today?: number
          bonus_hearts_total?: number
          created_at?: string
          daily_goal?: number
          daily_xp?: number
          daily_xp_date?: string
          hearts?: number
          hearts_max?: number
          hearts_updated_at?: string
          last_active_date?: string | null
          last_activity_ping?: string | null
          level?: number
          longest_streak?: number
          streak_days?: number
          updated_at?: string
          user_id?: string
          xp?: number
        }
        Relationships: []
      }
      user_subscriptions: {
        Row: {
          created_at: string
          expires_at: string | null
          granted_by: string | null
          id: string
          note: string | null
          plan_id: string
          started_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          note?: string | null
          plan_id: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string | null
          granted_by?: string | null
          id?: string
          note?: string | null
          plan_id?: string
          started_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      years: {
        Row: {
          id: string
          label: string
          ord: number
        }
        Insert: {
          id?: string
          label: string
          ord?: number
        }
        Update: {
          id?: string
          label?: string
          ord?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      award_bonus_hearts: {
        Args: { _amount: number; _user_id: string }
        Returns: number
      }
      award_xp: {
        Args: { _amount: number; _reason?: string }
        Returns: {
          leveled_up: boolean
          new_level: number
          new_streak: number
          new_xp: number
        }[]
      }
      consume_heart: { Args: never; Returns: number }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      ping_activity: {
        Args: never
        Returns: {
          activity_minutes: number
          awarded: number
          hearts: number
          hearts_max: number
        }[]
      }
      refill_hearts_if_needed: { Args: never; Returns: undefined }
      search_modules: {
        Args: { _year?: string; q: string }
        Returns: {
          description: string
          emoji: string
          id: string
          name: string
          score: number
          year_id: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
    }
    Enums: {
      app_role: "admin" | "student"
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
      app_role: ["admin", "student"],
    },
  },
} as const
