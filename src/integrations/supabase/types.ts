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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      agencies: {
        Row: {
          country_partner_id: string | null
          created_at: string
          id: string
          is_main: boolean | null
          logo_url: string | null
          name: string
          owner_user_id: string | null
          settings: Json | null
          slug: string
          updated_at: string
          white_label_config: Json | null
        }
        Insert: {
          country_partner_id?: string | null
          created_at?: string
          id?: string
          is_main?: boolean | null
          logo_url?: string | null
          name: string
          owner_user_id?: string | null
          settings?: Json | null
          slug: string
          updated_at?: string
          white_label_config?: Json | null
        }
        Update: {
          country_partner_id?: string | null
          created_at?: string
          id?: string
          is_main?: boolean | null
          logo_url?: string | null
          name?: string
          owner_user_id?: string | null
          settings?: Json | null
          slug?: string
          updated_at?: string
          white_label_config?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "agencies_country_partner_id_fkey"
            columns: ["country_partner_id"]
            isOneToOne: false
            referencedRelation: "country_partners"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_invites: {
        Row: {
          accepted_at: string | null
          accepted_by: string | null
          country_partner_id: string | null
          created_at: string | null
          email: string | null
          expires_at: string
          id: string
          invite_type: string
          inviting_user_id: string
          status: string | null
          target_agency_id: string | null
          token: string
        }
        Insert: {
          accepted_at?: string | null
          accepted_by?: string | null
          country_partner_id?: string | null
          created_at?: string | null
          email?: string | null
          expires_at: string
          id?: string
          invite_type: string
          inviting_user_id: string
          status?: string | null
          target_agency_id?: string | null
          token: string
        }
        Update: {
          accepted_at?: string | null
          accepted_by?: string | null
          country_partner_id?: string | null
          created_at?: string | null
          email?: string | null
          expires_at?: string
          id?: string
          invite_type?: string
          inviting_user_id?: string
          status?: string | null
          target_agency_id?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_invites_country_partner_id_fkey"
            columns: ["country_partner_id"]
            isOneToOne: false
            referencedRelation: "country_partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_invites_target_agency_id_fkey"
            columns: ["target_agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      announcement_reads: {
        Row: {
          announcement_id: string
          id: string
          read_at: string | null
          user_id: string
        }
        Insert: {
          announcement_id: string
          id?: string
          read_at?: string | null
          user_id: string
        }
        Update: {
          announcement_id?: string
          id?: string
          read_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey"
            columns: ["announcement_id"]
            isOneToOne: false
            referencedRelation: "announcements"
            referencedColumns: ["id"]
          },
        ]
      }
      announcements: {
        Row: {
          audience: string[]
          created_at: string | null
          created_by: string | null
          cta_text: string | null
          cta_url: string | null
          description: string
          id: string
          image_url: string | null
          is_draft: boolean | null
          published_at: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          audience?: string[]
          created_at?: string | null
          created_by?: string | null
          cta_text?: string | null
          cta_url?: string | null
          description: string
          id?: string
          image_url?: string | null
          is_draft?: boolean | null
          published_at?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          audience?: string[]
          created_at?: string | null
          created_by?: string | null
          cta_text?: string | null
          cta_url?: string | null
          description?: string
          id?: string
          image_url?: string | null
          is_draft?: boolean | null
          published_at?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      article_publications: {
        Row: {
          article_airtable_id: string
          connection_id: string | null
          created_at: string | null
          id: string
          publish_status: string
          published_at: string | null
          subaccount_id: string
          wordpress_post_id: number
          wordpress_post_url: string
        }
        Insert: {
          article_airtable_id: string
          connection_id?: string | null
          created_at?: string | null
          id?: string
          publish_status?: string
          published_at?: string | null
          subaccount_id: string
          wordpress_post_id: number
          wordpress_post_url: string
        }
        Update: {
          article_airtable_id?: string
          connection_id?: string | null
          created_at?: string | null
          id?: string
          publish_status?: string
          published_at?: string | null
          subaccount_id?: string
          wordpress_post_id?: number
          wordpress_post_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "article_publications_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "wordpress_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "article_publications_subaccount_id_fkey"
            columns: ["subaccount_id"]
            isOneToOne: false
            referencedRelation: "subaccounts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_posts: {
        Row: {
          categories: string[] | null
          content: string
          created_at: string
          excerpt: string | null
          featured_image: string | null
          id: string
          project_id: string | null
          published_at: string | null
          status: string
          subaccount_id: string
          tags: string[] | null
          title: string
          updated_at: string
          wordpress_post_id: string | null
          wordpress_url: string | null
        }
        Insert: {
          categories?: string[] | null
          content: string
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          project_id?: string | null
          published_at?: string | null
          status?: string
          subaccount_id: string
          tags?: string[] | null
          title: string
          updated_at?: string
          wordpress_post_id?: string | null
          wordpress_url?: string | null
        }
        Update: {
          categories?: string[] | null
          content?: string
          created_at?: string
          excerpt?: string | null
          featured_image?: string | null
          id?: string
          project_id?: string | null
          published_at?: string | null
          status?: string
          subaccount_id?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          wordpress_post_id?: string | null
          wordpress_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "blog_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_posts_subaccount_id_fkey"
            columns: ["subaccount_id"]
            isOneToOne: false
            referencedRelation: "subaccounts"
            referencedColumns: ["id"]
          },
        ]
      }
      blog_projects: {
        Row: {
          airtable_record_id: string | null
          created_at: string
          id: string
          language: string | null
          language_engine: string | null
          name: string
          project_type: string | null
          subaccount_id: string
          updated_at: string
        }
        Insert: {
          airtable_record_id?: string | null
          created_at?: string
          id?: string
          language?: string | null
          language_engine?: string | null
          name: string
          project_type?: string | null
          subaccount_id: string
          updated_at?: string
        }
        Update: {
          airtable_record_id?: string | null
          created_at?: string
          id?: string
          language?: string | null
          language_engine?: string | null
          name?: string
          project_type?: string | null
          subaccount_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_projects_subaccount_id_fkey"
            columns: ["subaccount_id"]
            isOneToOne: false
            referencedRelation: "subaccounts"
            referencedColumns: ["id"]
          },
        ]
      }
      campaign_pages: {
        Row: {
          campaign_id: string
          created_at: string
          data_values: Json | null
          id: string
          keywords: Json | null
          meta_description: string | null
          meta_title: string | null
          preview_token: string | null
          published_at: string | null
          published_url: string | null
          sections_content: Json | null
          slug: string | null
          status: string
          subaccount_id: string
          title: string
          updated_at: string
        }
        Insert: {
          campaign_id: string
          created_at?: string
          data_values?: Json | null
          id?: string
          keywords?: Json | null
          meta_description?: string | null
          meta_title?: string | null
          preview_token?: string | null
          published_at?: string | null
          published_url?: string | null
          sections_content?: Json | null
          slug?: string | null
          status?: string
          subaccount_id: string
          title: string
          updated_at?: string
        }
        Update: {
          campaign_id?: string
          created_at?: string
          data_values?: Json | null
          id?: string
          keywords?: Json | null
          meta_description?: string | null
          meta_title?: string | null
          preview_token?: string | null
          published_at?: string | null
          published_url?: string | null
          sections_content?: Json | null
          slug?: string | null
          status?: string
          subaccount_id?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "campaign_pages_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_pages_subaccount_id_fkey"
            columns: ["subaccount_id"]
            isOneToOne: false
            referencedRelation: "subaccounts"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          business_address: string | null
          business_logo_url: string | null
          business_name: string | null
          business_type: string | null
          clicks: number | null
          column_mappings: Json | null
          created_at: string
          data_columns: Json | null
          data_source_type: string | null
          deployment_settings: Json | null
          description: string | null
          id: string
          is_finalized: boolean | null
          name: string
          pages_generated: number | null
          preview_settings: Json | null
          seo_connection_id: string | null
          static_pages: Json | null
          status: string
          subaccount_id: string
          template_config: Json | null
          template_id: string | null
          total_pages: number | null
          updated_at: string
          website_url: string | null
          wizard_state: Json | null
          wizard_step: number | null
        }
        Insert: {
          business_address?: string | null
          business_logo_url?: string | null
          business_name?: string | null
          business_type?: string | null
          clicks?: number | null
          column_mappings?: Json | null
          created_at?: string
          data_columns?: Json | null
          data_source_type?: string | null
          deployment_settings?: Json | null
          description?: string | null
          id?: string
          is_finalized?: boolean | null
          name: string
          pages_generated?: number | null
          preview_settings?: Json | null
          seo_connection_id?: string | null
          static_pages?: Json | null
          status?: string
          subaccount_id: string
          template_config?: Json | null
          template_id?: string | null
          total_pages?: number | null
          updated_at?: string
          website_url?: string | null
          wizard_state?: Json | null
          wizard_step?: number | null
        }
        Update: {
          business_address?: string | null
          business_logo_url?: string | null
          business_name?: string | null
          business_type?: string | null
          clicks?: number | null
          column_mappings?: Json | null
          created_at?: string
          data_columns?: Json | null
          data_source_type?: string | null
          deployment_settings?: Json | null
          description?: string | null
          id?: string
          is_finalized?: boolean | null
          name?: string
          pages_generated?: number | null
          preview_settings?: Json | null
          seo_connection_id?: string | null
          static_pages?: Json | null
          status?: string
          subaccount_id?: string
          template_config?: Json | null
          template_id?: string | null
          total_pages?: number | null
          updated_at?: string
          website_url?: string | null
          wizard_state?: Json | null
          wizard_step?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "campaigns_seo_connection_id_fkey"
            columns: ["seo_connection_id"]
            isOneToOne: false
            referencedRelation: "seo_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaigns_subaccount_id_fkey"
            columns: ["subaccount_id"]
            isOneToOne: false
            referencedRelation: "subaccounts"
            referencedColumns: ["id"]
          },
        ]
      }
      country_partners: {
        Row: {
          country: string | null
          created_at: string | null
          id: string
          name: string
          owner_user_id: string | null
          settings: Json | null
          updated_at: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string | null
          id?: string
          name: string
          owner_user_id?: string | null
          settings?: Json | null
          updated_at?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string | null
          id?: string
          name?: string
          owner_user_id?: string | null
          settings?: Json | null
          updated_at?: string | null
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          created_at: string | null
          html_content: string
          id: string
          is_active: boolean | null
          name: string
          subject: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          html_content: string
          id?: string
          is_active?: boolean | null
          name: string
          subject: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          html_content?: string
          id?: string
          is_active?: boolean | null
          name?: string
          subject?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      feature_requests: {
        Row: {
          category: string | null
          created_at: string | null
          created_by: string | null
          deadline: string | null
          description: string | null
          id: string
          implemented_at: string | null
          position: number
          priority: string | null
          stage_id: string | null
          title: string
          updated_at: string | null
        }
        Insert: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          implemented_at?: string | null
          position?: number
          priority?: string | null
          stage_id?: string | null
          title: string
          updated_at?: string | null
        }
        Update: {
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          deadline?: string | null
          description?: string | null
          id?: string
          implemented_at?: string | null
          position?: number
          priority?: string | null
          stage_id?: string | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "feature_requests_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "feature_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_stages: {
        Row: {
          color: string
          created_at: string | null
          id: string
          name: string
          position: number
        }
        Insert: {
          color?: string
          created_at?: string | null
          id?: string
          name: string
          position?: number
        }
        Update: {
          color?: string
          created_at?: string | null
          id?: string
          name?: string
          position?: number
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          created_at: string | null
          id: string
          key: string
          updated_at: string | null
          value: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          key: string
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          key?: string
          updated_at?: string | null
          value?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          agency_id: string | null
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          marketing_consent: boolean | null
          marketing_consent_date: string | null
          onboarding_completed: boolean | null
          role: Database["public"]["Enums"]["app_role"] | null
          sub_account_id: string | null
          updated_at: string
        }
        Insert: {
          agency_id?: string | null
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          marketing_consent?: boolean | null
          marketing_consent_date?: string | null
          onboarding_completed?: boolean | null
          role?: Database["public"]["Enums"]["app_role"] | null
          sub_account_id?: string | null
          updated_at?: string
        }
        Update: {
          agency_id?: string | null
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          marketing_consent?: boolean | null
          marketing_consent_date?: string | null
          onboarding_completed?: boolean | null
          role?: Database["public"]["Enums"]["app_role"] | null
          sub_account_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_sub_account_id_fkey"
            columns: ["sub_account_id"]
            isOneToOne: false
            referencedRelation: "subaccounts"
            referencedColumns: ["id"]
          },
        ]
      }
      project_knowledge_base: {
        Row: {
          ai_agent_prompt: string | null
          brand_name: string | null
          brand_voice: string | null
          created_at: string | null
          id: string
          industry: string | null
          key_differentiators: string | null
          project_id: string
          subaccount_id: string
          system_prompt: string | null
          tagline: string | null
          target_audience: string | null
          updated_at: string | null
        }
        Insert: {
          ai_agent_prompt?: string | null
          brand_name?: string | null
          brand_voice?: string | null
          created_at?: string | null
          id?: string
          industry?: string | null
          key_differentiators?: string | null
          project_id: string
          subaccount_id: string
          system_prompt?: string | null
          tagline?: string | null
          target_audience?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_agent_prompt?: string | null
          brand_name?: string | null
          brand_voice?: string | null
          created_at?: string | null
          id?: string
          industry?: string | null
          key_differentiators?: string | null
          project_id?: string
          subaccount_id?: string
          system_prompt?: string | null
          tagline?: string | null
          target_audience?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_knowledge_base_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: true
            referencedRelation: "blog_projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_knowledge_base_subaccount_id_fkey"
            columns: ["subaccount_id"]
            isOneToOne: false
            referencedRelation: "subaccounts"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_connections: {
        Row: {
          created_at: string | null
          credentials: Json
          id: string
          last_checked_at: string | null
          last_error: string | null
          name: string
          provider: string
          status: string
          subaccount_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          credentials?: Json
          id?: string
          last_checked_at?: string | null
          last_error?: string | null
          name: string
          provider?: string
          status?: string
          subaccount_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          credentials?: Json
          id?: string
          last_checked_at?: string | null
          last_error?: string | null
          name?: string
          provider?: string
          status?: string
          subaccount_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seo_connections_subaccount_id_fkey"
            columns: ["subaccount_id"]
            isOneToOne: false
            referencedRelation: "subaccounts"
            referencedColumns: ["id"]
          },
        ]
      }
      subaccount_knowledge_base: {
        Row: {
          ai_agent_prompt: string | null
          brand_name: string | null
          brand_voice: string | null
          created_at: string | null
          id: string
          industry: string | null
          key_differentiators: string | null
          subaccount_id: string
          system_prompt: string | null
          tagline: string | null
          target_audience: string | null
          updated_at: string | null
        }
        Insert: {
          ai_agent_prompt?: string | null
          brand_name?: string | null
          brand_voice?: string | null
          created_at?: string | null
          id?: string
          industry?: string | null
          key_differentiators?: string | null
          subaccount_id: string
          system_prompt?: string | null
          tagline?: string | null
          target_audience?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_agent_prompt?: string | null
          brand_name?: string | null
          brand_voice?: string | null
          created_at?: string | null
          id?: string
          industry?: string | null
          key_differentiators?: string | null
          subaccount_id?: string
          system_prompt?: string | null
          tagline?: string | null
          target_audience?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subaccount_knowledge_base_subaccount_id_fkey"
            columns: ["subaccount_id"]
            isOneToOne: true
            referencedRelation: "subaccounts"
            referencedColumns: ["id"]
          },
        ]
      }
      subaccount_subscriptions: {
        Row: {
          articles_used: number | null
          billing_period_end: string | null
          billing_period_start: string | null
          created_at: string | null
          id: string
          is_trial: boolean | null
          other_credits: number | null
          payment_method_added: boolean | null
          plan_id: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subaccount_id: string
          trial_ends_at: string | null
          trial_started_at: string | null
          updated_at: string | null
        }
        Insert: {
          articles_used?: number | null
          billing_period_end?: string | null
          billing_period_start?: string | null
          created_at?: string | null
          id?: string
          is_trial?: boolean | null
          other_credits?: number | null
          payment_method_added?: boolean | null
          plan_id: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subaccount_id: string
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string | null
        }
        Update: {
          articles_used?: number | null
          billing_period_end?: string | null
          billing_period_start?: string | null
          created_at?: string | null
          id?: string
          is_trial?: boolean | null
          other_credits?: number | null
          payment_method_added?: boolean | null
          plan_id?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subaccount_id?: string
          trial_ends_at?: string | null
          trial_started_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subaccount_subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subaccount_subscriptions_subaccount_id_fkey"
            columns: ["subaccount_id"]
            isOneToOne: true
            referencedRelation: "subaccounts"
            referencedColumns: ["id"]
          },
        ]
      }
      subaccounts: {
        Row: {
          agency_id: string
          airtable_base_id: string | null
          business_settings: Json | null
          created_at: string
          id: string
          integration_settings: Json | null
          location_id: string
          name: string
          updated_at: string
        }
        Insert: {
          agency_id: string
          airtable_base_id?: string | null
          business_settings?: Json | null
          created_at?: string
          id?: string
          integration_settings?: Json | null
          location_id?: string
          name: string
          updated_at?: string
        }
        Update: {
          agency_id?: string
          airtable_base_id?: string | null
          business_settings?: Json | null
          created_at?: string
          id?: string
          integration_settings?: Json | null
          location_id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "subaccounts_agency_id_fkey"
            columns: ["agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      subscription_plans: {
        Row: {
          article_limit: number
          can_publish: boolean | null
          created_at: string | null
          id: string
          name: string
          price_monthly: number | null
        }
        Insert: {
          article_limit: number
          can_publish?: boolean | null
          created_at?: string | null
          id?: string
          name: string
          price_monthly?: number | null
        }
        Update: {
          article_limit?: number
          can_publish?: boolean | null
          created_at?: string | null
          id?: string
          name?: string
          price_monthly?: number | null
        }
        Relationships: []
      }
      transfer_requests: {
        Row: {
          created_at: string | null
          from_agency_id: string
          id: string
          notes: string | null
          requested_by: string
          resolved_at: string | null
          resolved_by: string | null
          status: string | null
          subaccount_id: string
          to_agency_id: string
        }
        Insert: {
          created_at?: string | null
          from_agency_id: string
          id?: string
          notes?: string | null
          requested_by: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          subaccount_id: string
          to_agency_id: string
        }
        Update: {
          created_at?: string | null
          from_agency_id?: string
          id?: string
          notes?: string | null
          requested_by?: string
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string | null
          subaccount_id?: string
          to_agency_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transfer_requests_from_agency_id_fkey"
            columns: ["from_agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_requests_subaccount_id_fkey"
            columns: ["subaccount_id"]
            isOneToOne: false
            referencedRelation: "subaccounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transfer_requests_to_agency_id_fkey"
            columns: ["to_agency_id"]
            isOneToOne: false
            referencedRelation: "agencies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          context_id: string | null
          context_type: string | null
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          context_id?: string | null
          context_type?: string | null
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          context_id?: string | null
          context_type?: string | null
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wordpress_connections: {
        Row: {
          api_key: string
          base_url: string
          created_at: string | null
          id: string
          last_checked_at: string | null
          last_error: string | null
          name: string
          status: string
          subaccount_id: string
          updated_at: string | null
        }
        Insert: {
          api_key: string
          base_url: string
          created_at?: string | null
          id?: string
          last_checked_at?: string | null
          last_error?: string | null
          name: string
          status?: string
          subaccount_id: string
          updated_at?: string | null
        }
        Update: {
          api_key?: string
          base_url?: string
          created_at?: string | null
          id?: string
          last_checked_at?: string | null
          last_error?: string | null
          name?: string
          status?: string
          subaccount_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wordpress_connections_subaccount_id_fkey"
            columns: ["subaccount_id"]
            isOneToOne: false
            referencedRelation: "subaccounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_user_agency: {
        Args: {
          _agency_name: string
          _agency_slug: string
          _settings?: Json
          _user_id: string
        }
        Returns: string
      }
      create_user_subaccount: {
        Args: {
          _business_name: string
          _business_settings?: Json
          _user_id: string
        }
        Returns: string
      }
      get_user_agency_id: { Args: { _user_id: string }; Returns: string }
      get_user_country_partner_id: {
        Args: { _user_id: string }
        Returns: string
      }
      get_user_subaccount_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_articles_used: {
        Args: { p_subaccount_id: string }
        Returns: undefined
      }
      reset_articles_if_period_ended: {
        Args: { p_subaccount_id: string }
        Returns: undefined
      }
      user_agency_id: { Args: { _user_id: string }; Returns: string }
      user_has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      user_subaccount_id: { Args: { _user_id: string }; Returns: string }
    }
    Enums: {
      app_role:
        | "super_admin"
        | "agency_admin"
        | "sub_account_user"
        | "country_partner"
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
      app_role: [
        "super_admin",
        "agency_admin",
        "sub_account_user",
        "country_partner",
      ],
    },
  },
} as const
