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
      agenda_events: {
        Row: {
          created_at: string
          duration_min: number | null
          episode_id: string | null
          episode_title: string | null
          id: string
          legacy_id: string | null
          location: string | null
          notes: string | null
          participants_summary: string | null
          program_id: string | null
          program_title: string | null
          scheduled_date: string | null
          scheduled_time: string | null
          status: string | null
          title: string | null
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          duration_min?: number | null
          episode_id?: string | null
          episode_title?: string | null
          id?: string
          legacy_id?: string | null
          location?: string | null
          notes?: string | null
          participants_summary?: string | null
          program_id?: string | null
          program_title?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          status?: string | null
          title?: string | null
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          duration_min?: number | null
          episode_id?: string | null
          episode_title?: string | null
          id?: string
          legacy_id?: string | null
          location?: string | null
          notes?: string | null
          participants_summary?: string | null
          program_id?: string | null
          program_title?: string | null
          scheduled_date?: string | null
          scheduled_time?: string | null
          status?: string | null
          title?: string | null
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_events_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_events_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_generations: {
        Row: {
          applied_at: string | null
          applied_by: string | null
          created_at: string
          created_by: string | null
          episode_id: string | null
          id: string
          kind: string
          model: string | null
          organization_id: string
          program_id: string | null
          prompt: Json | null
          result: Json | null
          status: string
        }
        Insert: {
          applied_at?: string | null
          applied_by?: string | null
          created_at?: string
          created_by?: string | null
          episode_id?: string | null
          id?: string
          kind: string
          model?: string | null
          organization_id: string
          program_id?: string | null
          prompt?: Json | null
          result?: Json | null
          status?: string
        }
        Update: {
          applied_at?: string | null
          applied_by?: string | null
          created_at?: string
          created_by?: string | null
          episode_id?: string | null
          id?: string
          kind?: string
          model?: string | null
          organization_id?: string
          program_id?: string | null
          prompt?: Json | null
          result?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_generations_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_generations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ai_generations_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_user_id: string | null
          created_at: string
          episode_id: string | null
          id: number
          metadata: Json
          organization_id: string
          row_id: string | null
          table_name: string | null
        }
        Insert: {
          action: string
          actor_user_id?: string | null
          created_at?: string
          episode_id?: string | null
          id?: never
          metadata?: Json
          organization_id: string
          row_id?: string | null
          table_name?: string | null
        }
        Update: {
          action?: string
          actor_user_id?: string | null
          created_at?: string
          episode_id?: string | null
          id?: never
          metadata?: Json
          organization_id?: string
          row_id?: string | null
          table_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_log_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      cameras: {
        Row: {
          active: boolean
          created_at: string
          focal_length: string | null
          framing: string | null
          id: string
          label: string | null
          legacy_id: string | null
          lens_notes: string | null
          name: string
          notes: string | null
          position: string | null
          program_id: string
          purpose: string | null
          role: string | null
          shot_type: string | null
          shot_types: string[]
          sort_order: number
          target: string | null
          type: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          focal_length?: string | null
          framing?: string | null
          id?: string
          label?: string | null
          legacy_id?: string | null
          lens_notes?: string | null
          name: string
          notes?: string | null
          position?: string | null
          program_id: string
          purpose?: string | null
          role?: string | null
          shot_type?: string | null
          shot_types?: string[]
          sort_order?: number
          target?: string | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          focal_length?: string | null
          framing?: string | null
          id?: string
          label?: string | null
          legacy_id?: string | null
          lens_notes?: string | null
          name?: string
          notes?: string | null
          position?: string | null
          program_id?: string
          purpose?: string | null
          role?: string | null
          shot_type?: string | null
          shot_types?: string[]
          sort_order?: number
          target?: string | null
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cameras_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      commercial_plans: {
        Row: {
          active: boolean
          billing_period: string
          code: string
          created_at: string
          currency: string
          description: string
          id: string
          name: string
          price_cents: number | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          billing_period?: string
          code: string
          created_at?: string
          currency?: string
          description?: string
          id?: string
          name: string
          price_cents?: number | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          billing_period?: string
          code?: string
          created_at?: string
          currency?: string
          description?: string
          id?: string
          name?: string
          price_cents?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      crew_members: {
        Row: {
          active: boolean
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          organization_id: string
          phone: string | null
          role: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          organization_id: string
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          organization_id?: string
          phone?: string | null
          role?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "crew_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      episode_crew: {
        Row: {
          call_time: string | null
          created_at: string
          crew_member_id: string
          episode_id: string
          id: string
          notes: string | null
          role: string | null
          status: string
        }
        Insert: {
          call_time?: string | null
          created_at?: string
          crew_member_id: string
          episode_id: string
          id?: string
          notes?: string | null
          role?: string | null
          status?: string
        }
        Update: {
          call_time?: string | null
          created_at?: string
          crew_member_id?: string
          episode_id?: string
          id?: string
          notes?: string | null
          role?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "episode_crew_crew_member_id_fkey"
            columns: ["crew_member_id"]
            isOneToOne: false
            referencedRelation: "crew_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "episode_crew_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      episode_participants: {
        Row: {
          bio: string | null
          created_at: string
          entry_segment_id: string | null
          episode_id: string
          estimated_time_min: number | null
          exit_segment_id: string | null
          id: string
          is_featured: boolean
          legacy_id: string | null
          name: string
          notes: string | null
          order_pos: number
          participant_id: string | null
          role: string | null
          type: string | null
          updated_at: string
        }
        Insert: {
          bio?: string | null
          created_at?: string
          entry_segment_id?: string | null
          episode_id: string
          estimated_time_min?: number | null
          exit_segment_id?: string | null
          id?: string
          is_featured?: boolean
          legacy_id?: string | null
          name: string
          notes?: string | null
          order_pos?: number
          participant_id?: string | null
          role?: string | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          bio?: string | null
          created_at?: string
          entry_segment_id?: string | null
          episode_id?: string
          estimated_time_min?: number | null
          exit_segment_id?: string | null
          id?: string
          is_featured?: boolean
          legacy_id?: string | null
          name?: string
          notes?: string | null
          order_pos?: number
          participant_id?: string | null
          role?: string | null
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "episode_participants_entry_segment_id_fkey"
            columns: ["entry_segment_id"]
            isOneToOne: false
            referencedRelation: "segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "episode_participants_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "episode_participants_exit_segment_id_fkey"
            columns: ["exit_segment_id"]
            isOneToOne: false
            referencedRelation: "segments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "episode_participants_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
        ]
      }
      episode_versions: {
        Row: {
          change_summary: string | null
          changed_by: string | null
          created_at: string
          episode_id: string
          id: string
          snapshot: Json
          version: number
        }
        Insert: {
          change_summary?: string | null
          changed_by?: string | null
          created_at?: string
          episode_id: string
          id?: string
          snapshot: Json
          version: number
        }
        Update: {
          change_summary?: string | null
          changed_by?: string | null
          created_at?: string
          episode_id?: string
          id?: string
          snapshot?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "episode_versions_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      episodes: {
        Row: {
          additional_info: string | null
          checklist: Json | null
          created_at: string
          diagnosis: Json | null
          editor_script_synthesis: string | null
          editorial_notes_for_post: string | null
          episode_number: number | null
          format: string
          host: string | null
          id: string
          idea: string | null
          legacy_id: string | null
          objective: string | null
          presenter_name: string | null
          production_status: string
          program_id: string
          recording_time_elapsed: number | null
          research: Json | null
          scheduled_date: string | null
          season_id: string | null
          status: string
          synopsis: string | null
          target_duration_min: number | null
          target_duration_minutes: number | null
          technical_checklist: Json | null
          title: string
          tone: string | null
          topic: string | null
          updated_at: string
          version: number
        }
        Insert: {
          additional_info?: string | null
          checklist?: Json | null
          created_at?: string
          diagnosis?: Json | null
          editor_script_synthesis?: string | null
          editorial_notes_for_post?: string | null
          episode_number?: number | null
          format: string
          host?: string | null
          id?: string
          idea?: string | null
          legacy_id?: string | null
          objective?: string | null
          presenter_name?: string | null
          production_status?: string
          program_id: string
          recording_time_elapsed?: number | null
          research?: Json | null
          scheduled_date?: string | null
          season_id?: string | null
          status: string
          synopsis?: string | null
          target_duration_min?: number | null
          target_duration_minutes?: number | null
          technical_checklist?: Json | null
          title: string
          tone?: string | null
          topic?: string | null
          updated_at?: string
          version?: number
        }
        Update: {
          additional_info?: string | null
          checklist?: Json | null
          created_at?: string
          diagnosis?: Json | null
          editor_script_synthesis?: string | null
          editorial_notes_for_post?: string | null
          episode_number?: number | null
          format?: string
          host?: string | null
          id?: string
          idea?: string | null
          legacy_id?: string | null
          objective?: string | null
          presenter_name?: string | null
          production_status?: string
          program_id?: string
          recording_time_elapsed?: number | null
          research?: Json | null
          scheduled_date?: string | null
          season_id?: string | null
          status?: string
          synopsis?: string | null
          target_duration_min?: number | null
          target_duration_minutes?: number | null
          technical_checklist?: Json | null
          title?: string
          tone?: string | null
          topic?: string | null
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "episodes_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "episodes_season_id_fkey"
            columns: ["season_id"]
            isOneToOne: false
            referencedRelation: "seasons"
            referencedColumns: ["id"]
          },
        ]
      }
      library_assets: {
        Row: {
          category: string | null
          content: string | null
          created_at: string
          description: string | null
          id: string
          legacy_id: string | null
          organization_id: string | null
          program_id: string | null
          tags: string[]
          title: string
          type: string | null
          updated_at: string
          url: string | null
        }
        Insert: {
          category?: string | null
          content?: string | null
          created_at?: string
          description?: string | null
          id?: string
          legacy_id?: string | null
          organization_id?: string | null
          program_id?: string | null
          tags?: string[]
          title: string
          type?: string | null
          updated_at?: string
          url?: string | null
        }
        Update: {
          category?: string | null
          content?: string | null
          created_at?: string
          description?: string | null
          id?: string
          legacy_id?: string | null
          organization_id?: string | null
          program_id?: string | null
          tags?: string[]
          title?: string
          type?: string | null
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "library_assets_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "library_assets_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_members: {
        Row: {
          active: boolean
          created_at: string
          id: string
          organization_id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          organization_id: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          organization_id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_programs: {
        Row: {
          catalog_program_id: string
          created_at: string
          ends_at: string | null
          organization_id: string
          program_id: string | null
          starts_at: string
          status: string
          subscription_id: string | null
          updated_at: string
        }
        Insert: {
          catalog_program_id: string
          created_at?: string
          ends_at?: string | null
          organization_id: string
          program_id?: string | null
          starts_at?: string
          status?: string
          subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          catalog_program_id?: string
          created_at?: string
          ends_at?: string | null
          organization_id?: string
          program_id?: string | null
          starts_at?: string
          status?: string
          subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_programs_catalog_program_id_fkey"
            columns: ["catalog_program_id"]
            isOneToOne: false
            referencedRelation: "program_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_programs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_programs_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_programs_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "organization_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      organization_subscriptions: {
        Row: {
          created_at: string
          ends_at: string | null
          external_reference: string | null
          id: string
          organization_id: string
          plan_id: string
          starts_at: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          ends_at?: string | null
          external_reference?: string | null
          id?: string
          organization_id: string
          plan_id: string
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          ends_at?: string | null
          external_reference?: string | null
          id?: string
          organization_id?: string
          plan_id?: string
          starts_at?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_subscriptions_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "commercial_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      participants: {
        Row: {
          bio: string | null
          company: string | null
          company_or_group: string | null
          contacts: string | null
          created_at: string
          entity_type: string | null
          group_type: string | null
          id: string
          legacy_id: string | null
          links: string[]
          members: string[]
          name: string
          notes: string | null
          previous_episodes: number | null
          program_id: string
          role: string | null
          social_handles: Json
          type: string | null
          updated_at: string
        }
        Insert: {
          bio?: string | null
          company?: string | null
          company_or_group?: string | null
          contacts?: string | null
          created_at?: string
          entity_type?: string | null
          group_type?: string | null
          id?: string
          legacy_id?: string | null
          links?: string[]
          members?: string[]
          name: string
          notes?: string | null
          previous_episodes?: number | null
          program_id: string
          role?: string | null
          social_handles?: Json
          type?: string | null
          updated_at?: string
        }
        Update: {
          bio?: string | null
          company?: string | null
          company_or_group?: string | null
          contacts?: string | null
          created_at?: string
          entity_type?: string | null
          group_type?: string | null
          id?: string
          legacy_id?: string | null
          links?: string[]
          members?: string[]
          name?: string
          notes?: string | null
          previous_episodes?: number | null
          program_id?: string
          role?: string | null
          social_handles?: Json
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "participants_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      plan_programs: {
        Row: {
          catalog_program_id: string
          created_at: string
          plan_id: string
        }
        Insert: {
          catalog_program_id: string
          created_at?: string
          plan_id: string
        }
        Update: {
          catalog_program_id?: string
          created_at?: string
          plan_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plan_programs_catalog_program_id_fkey"
            columns: ["catalog_program_id"]
            isOneToOne: false
            referencedRelation: "program_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plan_programs_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "commercial_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      planned_shorts: {
        Row: {
          b_roll_notes: string | null
          camera_focus: string | null
          created_at: string
          episode_id: string
          estimated_duration: string | null
          expected_duration_seconds: number | null
          generating_question: string | null
          hook: string | null
          id: string
          legacy_id: string | null
          narrative_arc: string | null
          notes: string | null
          segment_id: string | null
          status: string | null
          suggested_hook: string | null
          target_participant: string | null
          target_platform: string[]
          title: string
          updated_at: string
        }
        Insert: {
          b_roll_notes?: string | null
          camera_focus?: string | null
          created_at?: string
          episode_id: string
          estimated_duration?: string | null
          expected_duration_seconds?: number | null
          generating_question?: string | null
          hook?: string | null
          id?: string
          legacy_id?: string | null
          narrative_arc?: string | null
          notes?: string | null
          segment_id?: string | null
          status?: string | null
          suggested_hook?: string | null
          target_participant?: string | null
          target_platform?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          b_roll_notes?: string | null
          camera_focus?: string | null
          created_at?: string
          episode_id?: string
          estimated_duration?: string | null
          expected_duration_seconds?: number | null
          generating_question?: string | null
          hook?: string | null
          id?: string
          legacy_id?: string | null
          narrative_arc?: string | null
          notes?: string | null
          segment_id?: string | null
          status?: string | null
          suggested_hook?: string | null
          target_participant?: string | null
          target_platform?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "planned_shorts_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planned_shorts_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "segments"
            referencedColumns: ["id"]
          },
        ]
      }
      postproduction_jobs: {
        Row: {
          assigned_crew_member_id: string | null
          completed_at: string | null
          created_at: string
          episode_id: string
          id: string
          notes: string | null
          stage: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          assigned_crew_member_id?: string | null
          completed_at?: string | null
          created_at?: string
          episode_id: string
          id?: string
          notes?: string | null
          stage: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_crew_member_id?: string | null
          completed_at?: string | null
          created_at?: string
          episode_id?: string
          id?: string
          notes?: string | null
          stage?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "postproduction_jobs_assigned_crew_member_id_fkey"
            columns: ["assigned_crew_member_id"]
            isOneToOne: false
            referencedRelation: "crew_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "postproduction_jobs_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      production_assets: {
        Row: {
          block_id: string | null
          content: string | null
          created_at: string
          description: string | null
          display_time: string | null
          episode_id: string
          file_url: string | null
          id: string
          legacy_id: string | null
          moment: string | null
          notes: string | null
          segment_id: string | null
          status: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          block_id?: string | null
          content?: string | null
          created_at?: string
          description?: string | null
          display_time?: string | null
          episode_id: string
          file_url?: string | null
          id?: string
          legacy_id?: string | null
          moment?: string | null
          notes?: string | null
          segment_id?: string | null
          status?: string | null
          title: string
          type: string
          updated_at?: string
        }
        Update: {
          block_id?: string | null
          content?: string | null
          created_at?: string
          description?: string | null
          display_time?: string | null
          episode_id?: string
          file_url?: string | null
          id?: string
          legacy_id?: string | null
          moment?: string | null
          notes?: string | null
          segment_id?: string | null
          status?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_assets_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_assets_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "segments"
            referencedColumns: ["id"]
          },
        ]
      }
      production_tasks: {
        Row: {
          assigned_crew_member_id: string | null
          category: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_at: string | null
          episode_id: string | null
          id: string
          organization_id: string
          priority: string
          program_id: string | null
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          assigned_crew_member_id?: string | null
          category?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          episode_id?: string | null
          id?: string
          organization_id: string
          priority?: string
          program_id?: string | null
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          assigned_crew_member_id?: string | null
          category?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_at?: string | null
          episode_id?: string | null
          id?: string
          organization_id?: string
          priority?: string
          program_id?: string | null
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "production_tasks_assigned_crew_member_id_fkey"
            columns: ["assigned_crew_member_id"]
            isOneToOne: false
            referencedRelation: "crew_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_tasks_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_tasks_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "production_tasks_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      program_catalog: {
        Row: {
          active: boolean
          contractable: boolean
          created_at: string
          description: string
          format: string | null
          host: string | null
          id: string
          metadata: Json
          name: string
          slug: string
          source_name: string
          source_scraped_at: string
          source_url: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          contractable?: boolean
          created_at?: string
          description?: string
          format?: string | null
          host?: string | null
          id?: string
          metadata?: Json
          name: string
          slug: string
          source_name?: string
          source_scraped_at?: string
          source_url?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          contractable?: boolean
          created_at?: string
          description?: string
          format?: string | null
          host?: string | null
          id?: string
          metadata?: Json
          name?: string
          slug?: string
          source_name?: string
          source_scraped_at?: string
          source_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      program_crew: {
        Row: {
          active: boolean
          created_at: string
          crew_member_id: string
          id: string
          program_id: string
          role: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          crew_member_id: string
          id?: string
          program_id: string
          role?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          crew_member_id?: string
          id?: string
          program_id?: string
          role?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "program_crew_crew_member_id_fkey"
            columns: ["crew_member_id"]
            isOneToOne: false
            referencedRelation: "crew_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_crew_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      program_user_access: {
        Row: {
          catalog_program_id: string
          created_at: string
          ends_at: string | null
          organization_id: string
          role: string
          starts_at: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          catalog_program_id: string
          created_at?: string
          ends_at?: string | null
          organization_id: string
          role?: string
          starts_at?: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          catalog_program_id?: string
          created_at?: string
          ends_at?: string | null
          organization_id?: string
          role?: string
          starts_at?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_user_access_catalog_program_id_fkey"
            columns: ["catalog_program_id"]
            isOneToOne: false
            referencedRelation: "program_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_user_access_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          catalog_program_id: string | null
          created_at: string
          default_closing: string | null
          default_duration_min: number | null
          default_episode_duration_minutes: number | null
          default_opening: string | null
          default_presenter_name: string | null
          default_segments: Json
          description: string
          editorial_style: string | null
          format: string
          host: string | null
          id: string
          legacy_id: string | null
          name: string | null
          organization_id: string | null
          scenario: string | null
          standard_segments: Json
          standard_structure: string[]
          target_audience: string | null
          title: string | null
          tone: string | null
          updated_at: string
        }
        Insert: {
          catalog_program_id?: string | null
          created_at?: string
          default_closing?: string | null
          default_duration_min?: number | null
          default_episode_duration_minutes?: number | null
          default_opening?: string | null
          default_presenter_name?: string | null
          default_segments?: Json
          description: string
          editorial_style?: string | null
          format: string
          host?: string | null
          id?: string
          legacy_id?: string | null
          name?: string | null
          organization_id?: string | null
          scenario?: string | null
          standard_segments?: Json
          standard_structure?: string[]
          target_audience?: string | null
          title?: string | null
          tone?: string | null
          updated_at?: string
        }
        Update: {
          catalog_program_id?: string | null
          created_at?: string
          default_closing?: string | null
          default_duration_min?: number | null
          default_episode_duration_minutes?: number | null
          default_opening?: string | null
          default_presenter_name?: string | null
          default_segments?: Json
          description?: string
          editorial_style?: string | null
          format?: string
          host?: string | null
          id?: string
          legacy_id?: string | null
          name?: string | null
          organization_id?: string | null
          scenario?: string | null
          standard_segments?: Json
          standard_structure?: string[]
          target_audience?: string | null
          title?: string | null
          tone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "programs_catalog_program_id_fkey"
            columns: ["catalog_program_id"]
            isOneToOne: false
            referencedRelation: "program_catalog"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      question_follow_ups: {
        Row: {
          action: string | null
          action_or_question: string | null
          camera_cue: string | null
          condition: string | null
          created_at: string
          id: string
          legacy_id: string | null
          order_pos: number
          question_id: string
          tag: string | null
          target_participant: string | null
          trigger_condition: string | null
          updated_at: string
        }
        Insert: {
          action?: string | null
          action_or_question?: string | null
          camera_cue?: string | null
          condition?: string | null
          created_at?: string
          id?: string
          legacy_id?: string | null
          order_pos?: number
          question_id: string
          tag?: string | null
          target_participant?: string | null
          trigger_condition?: string | null
          updated_at?: string
        }
        Update: {
          action?: string | null
          action_or_question?: string | null
          camera_cue?: string | null
          condition?: string | null
          created_at?: string
          id?: string
          legacy_id?: string | null
          order_pos?: number
          question_id?: string
          tag?: string | null
          target_participant?: string | null
          trigger_condition?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "question_follow_ups_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
        ]
      }
      questions: {
        Row: {
          block_id: string | null
          created_at: string
          episode_id: string
          eye_direction: string | null
          id: string
          legacy_id: string | null
          objective: string | null
          order_pos: number
          participant_id: string | null
          recommended_camera: string | null
          segment_id: string | null
          speaker: string | null
          status: string | null
          suggested_camera: string | null
          target_participant_name: string | null
          text: string
          updated_at: string
        }
        Insert: {
          block_id?: string | null
          created_at?: string
          episode_id: string
          eye_direction?: string | null
          id?: string
          legacy_id?: string | null
          objective?: string | null
          order_pos?: number
          participant_id?: string | null
          recommended_camera?: string | null
          segment_id?: string | null
          speaker?: string | null
          status?: string | null
          suggested_camera?: string | null
          target_participant_name?: string | null
          text: string
          updated_at?: string
        }
        Update: {
          block_id?: string | null
          created_at?: string
          episode_id?: string
          eye_direction?: string | null
          id?: string
          legacy_id?: string | null
          objective?: string | null
          order_pos?: number
          participant_id?: string | null
          recommended_camera?: string | null
          segment_id?: string | null
          speaker?: string | null
          status?: string | null
          suggested_camera?: string | null
          target_participant_name?: string | null
          text?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "questions_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "questions_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "segments"
            referencedColumns: ["id"]
          },
        ]
      }
      recording_markers: {
        Row: {
          block_title: string
          comment: string | null
          created_at: string
          episode_id: string
          formatted_time: string
          id: string
          legacy_id: string | null
          reference_text: string
          timestamp_sec: number
          type: string
          updated_at: string
        }
        Insert: {
          block_title: string
          comment?: string | null
          created_at?: string
          episode_id: string
          formatted_time: string
          id?: string
          legacy_id?: string | null
          reference_text: string
          timestamp_sec: number
          type: string
          updated_at?: string
        }
        Update: {
          block_title?: string
          comment?: string | null
          created_at?: string
          episode_id?: string
          formatted_time?: string
          id?: string
          legacy_id?: string | null
          reference_text?: string
          timestamp_sec?: number
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recording_markers_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      recording_sessions: {
        Row: {
          actual_end: string | null
          actual_start: string | null
          created_at: string
          created_by: string | null
          episode_id: string
          id: string
          location: string | null
          notes: string | null
          scheduled_start: string | null
          status: string
          updated_at: string
        }
        Insert: {
          actual_end?: string | null
          actual_start?: string | null
          created_at?: string
          created_by?: string | null
          episode_id: string
          id?: string
          location?: string | null
          notes?: string | null
          scheduled_start?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          actual_end?: string | null
          actual_start?: string | null
          created_at?: string
          created_by?: string | null
          episode_id?: string
          id?: string
          location?: string | null
          notes?: string | null
          scheduled_start?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "recording_sessions_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      script_items: {
        Row: {
          alternative_camera: string | null
          block_id: string | null
          camera: string | null
          camera_instruction: string | null
          content: string | null
          created_at: string
          directional_markers: string[]
          episode_id: string
          estimated_duration_seconds: number | null
          eye_direction: string | null
          id: string
          is_teleprompter: boolean
          legacy_id: string | null
          notes: string | null
          order_pos: number
          question_id: string | null
          segment_id: string | null
          shot_type: string | null
          speaker: string
          target_person: string | null
          teleprompter_text: string | null
          timestamp: string | null
          transition: string | null
          type: string | null
          updated_at: string
        }
        Insert: {
          alternative_camera?: string | null
          block_id?: string | null
          camera?: string | null
          camera_instruction?: string | null
          content?: string | null
          created_at?: string
          directional_markers?: string[]
          episode_id: string
          estimated_duration_seconds?: number | null
          eye_direction?: string | null
          id?: string
          is_teleprompter?: boolean
          legacy_id?: string | null
          notes?: string | null
          order_pos?: number
          question_id?: string | null
          segment_id?: string | null
          shot_type?: string | null
          speaker: string
          target_person?: string | null
          teleprompter_text?: string | null
          timestamp?: string | null
          transition?: string | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          alternative_camera?: string | null
          block_id?: string | null
          camera?: string | null
          camera_instruction?: string | null
          content?: string | null
          created_at?: string
          directional_markers?: string[]
          episode_id?: string
          estimated_duration_seconds?: number | null
          eye_direction?: string | null
          id?: string
          is_teleprompter?: boolean
          legacy_id?: string | null
          notes?: string | null
          order_pos?: number
          question_id?: string | null
          segment_id?: string | null
          shot_type?: string | null
          speaker?: string
          target_person?: string | null
          teleprompter_text?: string | null
          timestamp?: string | null
          transition?: string | null
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "script_items_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "script_items_question_id_fkey"
            columns: ["question_id"]
            isOneToOne: false
            referencedRelation: "questions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "script_items_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "segments"
            referencedColumns: ["id"]
          },
        ]
      }
      seasons: {
        Row: {
          created_at: string
          end_date: string | null
          id: string
          number: number
          program_id: string
          start_date: string | null
          status: string
          title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          end_date?: string | null
          id?: string
          number: number
          program_id: string
          start_date?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          end_date?: string | null
          id?: string
          number?: number
          program_id?: string
          start_date?: string | null
          status?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seasons_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      segment_participants: {
        Row: {
          created_at: string
          order_pos: number
          participant_id: string
          segment_id: string
        }
        Insert: {
          created_at?: string
          order_pos?: number
          participant_id: string
          segment_id: string
        }
        Update: {
          created_at?: string
          order_pos?: number
          participant_id?: string
          segment_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "segment_participants_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "segment_participants_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "segments"
            referencedColumns: ["id"]
          },
        ]
      }
      segments: {
        Row: {
          actual_duration_min: number | null
          actual_start_sec: number | null
          b_roll_notes: string | null
          block_number: number | null
          created_at: string
          description: string | null
          episode_id: string
          estimated_duration_min: number | null
          estimated_duration_minutes: number | null
          id: string
          key_themes: string[]
          legacy_id: string | null
          notes: string | null
          order_pos: number
          planned_start_sec: number | null
          primary_camera: string | null
          status: string
          suggested_camera_id: string | null
          title: string
          transition_text: string | null
          type: string | null
          updated_at: string
        }
        Insert: {
          actual_duration_min?: number | null
          actual_start_sec?: number | null
          b_roll_notes?: string | null
          block_number?: number | null
          created_at?: string
          description?: string | null
          episode_id: string
          estimated_duration_min?: number | null
          estimated_duration_minutes?: number | null
          id?: string
          key_themes?: string[]
          legacy_id?: string | null
          notes?: string | null
          order_pos?: number
          planned_start_sec?: number | null
          primary_camera?: string | null
          status?: string
          suggested_camera_id?: string | null
          title: string
          transition_text?: string | null
          type?: string | null
          updated_at?: string
        }
        Update: {
          actual_duration_min?: number | null
          actual_start_sec?: number | null
          b_roll_notes?: string | null
          block_number?: number | null
          created_at?: string
          description?: string | null
          episode_id?: string
          estimated_duration_min?: number | null
          estimated_duration_minutes?: number | null
          id?: string
          key_themes?: string[]
          legacy_id?: string | null
          notes?: string | null
          order_pos?: number
          planned_start_sec?: number | null
          primary_camera?: string | null
          status?: string
          suggested_camera_id?: string | null
          title?: string
          transition_text?: string | null
          type?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "segments_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "segments_suggested_camera_id_fkey"
            columns: ["suggested_camera_id"]
            isOneToOne: false
            referencedRelation: "cameras"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_program_access: { Args: { p_program_id: string }; Returns: boolean }
      is_org_member: { Args: { p_organization_id: string }; Returns: boolean }
      save_episode: { Args: { p_payload: Json }; Returns: Json }
      save_program: { Args: { p_payload: Json }; Returns: Json }
      tm_delete_missing: {
        Args: {
          p_keep: string[]
          p_parent_col: string
          p_parent_id: string
          p_table: string
        }
        Returns: number
      }
      tm_row_upsert: {
        Args: { p_conflict?: string[]; p_rows: Json; p_table: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
