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
      access_accounts: {
        Row: {
          blocked_reason: string | null
          created_at: string
          lifecycle_status: Database["public"]["Enums"]["access_lifecycle_status"]
          updated_at: string
          user_id: string
        }
        Insert: {
          blocked_reason?: string | null
          created_at?: string
          lifecycle_status?: Database["public"]["Enums"]["access_lifecycle_status"]
          updated_at?: string
          user_id: string
        }
        Update: {
          blocked_reason?: string | null
          created_at?: string
          lifecycle_status?: Database["public"]["Enums"]["access_lifecycle_status"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      access_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          detail: string | null
          id: string
          metadata: Json
          user_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          metadata?: Json
          user_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          metadata?: Json
          user_id?: string
        }
        Relationships: []
      }
      agency_client_tags: {
        Row: {
          cadastro_cliente_id: number
          created_at: string
          tag_id: string
        }
        Insert: {
          cadastro_cliente_id: number
          created_at?: string
          tag_id: string
        }
        Update: {
          cadastro_cliente_id?: number
          created_at?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_client_tags_cadastro_cliente_id_fkey"
            columns: ["cadastro_cliente_id"]
            isOneToOne: false
            referencedRelation: "cadastro_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_client_tags_cadastro_cliente_id_fkey"
            columns: ["cadastro_cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_agency_client_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_client_tags_cadastro_cliente_id_fkey"
            columns: ["cadastro_cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_client_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "agency_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_leads: {
        Row: {
          cadastro_cliente_id: number | null
          converted_at: string | null
          created_at: string
          created_by: string | null
          empresa: string | null
          id: string
          interacoes_count: number
          kanban_ordem: number
          nome: string
          notas: string | null
          origem: Database["public"]["Enums"]["agency_lead_origem"]
          pipeline_stage: Database["public"]["Enums"]["agency_pipeline_stage"]
          probabilidade_manual: number | null
          probabilidade_score: number
          proxima_acao: string | null
          proximo_contato: string | null
          responsavel_user_id: string | null
          reunioes_count: number
          ultima_interacao: string | null
          updated_at: string
          valor_estimado: number | null
        }
        Insert: {
          cadastro_cliente_id?: number | null
          converted_at?: string | null
          created_at?: string
          created_by?: string | null
          empresa?: string | null
          id?: string
          interacoes_count?: number
          kanban_ordem?: number
          nome: string
          notas?: string | null
          origem?: Database["public"]["Enums"]["agency_lead_origem"]
          pipeline_stage?: Database["public"]["Enums"]["agency_pipeline_stage"]
          probabilidade_manual?: number | null
          probabilidade_score?: number
          proxima_acao?: string | null
          proximo_contato?: string | null
          responsavel_user_id?: string | null
          reunioes_count?: number
          ultima_interacao?: string | null
          updated_at?: string
          valor_estimado?: number | null
        }
        Update: {
          cadastro_cliente_id?: number | null
          converted_at?: string | null
          created_at?: string
          created_by?: string | null
          empresa?: string | null
          id?: string
          interacoes_count?: number
          kanban_ordem?: number
          nome?: string
          notas?: string | null
          origem?: Database["public"]["Enums"]["agency_lead_origem"]
          pipeline_stage?: Database["public"]["Enums"]["agency_pipeline_stage"]
          probabilidade_manual?: number | null
          probabilidade_score?: number
          proxima_acao?: string | null
          proximo_contato?: string | null
          responsavel_user_id?: string | null
          reunioes_count?: number
          ultima_interacao?: string | null
          updated_at?: string
          valor_estimado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agency_leads_cadastro_cliente_id_fkey"
            columns: ["cadastro_cliente_id"]
            isOneToOne: false
            referencedRelation: "cadastro_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_leads_cadastro_cliente_id_fkey"
            columns: ["cadastro_cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_agency_client_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_leads_cadastro_cliente_id_fkey"
            columns: ["cadastro_cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_admin"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_notes: {
        Row: {
          author_email: string | null
          author_user_id: string | null
          body: string
          cadastro_cliente_id: number
          created_at: string
          id: string
        }
        Insert: {
          author_email?: string | null
          author_user_id?: string | null
          body: string
          cadastro_cliente_id: number
          created_at?: string
          id?: string
        }
        Update: {
          author_email?: string | null
          author_user_id?: string | null
          body?: string
          cadastro_cliente_id?: number
          created_at?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_notes_cadastro_cliente_id_fkey"
            columns: ["cadastro_cliente_id"]
            isOneToOne: false
            referencedRelation: "cadastro_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_notes_cadastro_cliente_id_fkey"
            columns: ["cadastro_cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_agency_client_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_notes_cadastro_cliente_id_fkey"
            columns: ["cadastro_cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_admin"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_projects: {
        Row: {
          cadastro_cliente_id: number
          checklist: Json
          created_at: string
          created_by: string | null
          etiqueta: string | null
          id: string
          kanban_ordem: number
          prazo: string | null
          prioridade: Database["public"]["Enums"]["agency_priority"]
          responsavel_user_id: string | null
          status_kanban: Database["public"]["Enums"]["agency_project_status"]
          tipo: Database["public"]["Enums"]["agency_project_type"]
          titulo: string
          updated_at: string
        }
        Insert: {
          cadastro_cliente_id: number
          checklist?: Json
          created_at?: string
          created_by?: string | null
          etiqueta?: string | null
          id?: string
          kanban_ordem?: number
          prazo?: string | null
          prioridade?: Database["public"]["Enums"]["agency_priority"]
          responsavel_user_id?: string | null
          status_kanban?: Database["public"]["Enums"]["agency_project_status"]
          tipo?: Database["public"]["Enums"]["agency_project_type"]
          titulo: string
          updated_at?: string
        }
        Update: {
          cadastro_cliente_id?: number
          checklist?: Json
          created_at?: string
          created_by?: string | null
          etiqueta?: string | null
          id?: string
          kanban_ordem?: number
          prazo?: string | null
          prioridade?: Database["public"]["Enums"]["agency_priority"]
          responsavel_user_id?: string | null
          status_kanban?: Database["public"]["Enums"]["agency_project_status"]
          tipo?: Database["public"]["Enums"]["agency_project_type"]
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_projects_cadastro_cliente_id_fkey"
            columns: ["cadastro_cliente_id"]
            isOneToOne: false
            referencedRelation: "cadastro_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_projects_cadastro_cliente_id_fkey"
            columns: ["cadastro_cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_agency_client_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_projects_cadastro_cliente_id_fkey"
            columns: ["cadastro_cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_admin"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_tags: {
        Row: {
          cor: string
          created_at: string
          id: string
          nome: string
        }
        Insert: {
          cor?: string
          created_at?: string
          id?: string
          nome: string
        }
        Update: {
          cor?: string
          created_at?: string
          id?: string
          nome?: string
        }
        Relationships: []
      }
      agency_tasks: {
        Row: {
          agenda_date: string | null
          cadastro_cliente_id: number
          completed_at: string | null
          completed_on_date: string | null
          created_at: string
          created_by: string | null
          descricao: string | null
          due_at: string | null
          id: string
          prioridade: Database["public"]["Enums"]["agency_priority"]
          responsavel_user_id: string | null
          status: Database["public"]["Enums"]["agency_task_status"]
          titulo: string
          updated_at: string
        }
        Insert: {
          agenda_date?: string | null
          cadastro_cliente_id: number
          completed_at?: string | null
          completed_on_date?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          due_at?: string | null
          id?: string
          prioridade?: Database["public"]["Enums"]["agency_priority"]
          responsavel_user_id?: string | null
          status?: Database["public"]["Enums"]["agency_task_status"]
          titulo: string
          updated_at?: string
        }
        Update: {
          agenda_date?: string | null
          cadastro_cliente_id?: number
          completed_at?: string | null
          completed_on_date?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          due_at?: string | null
          id?: string
          prioridade?: Database["public"]["Enums"]["agency_priority"]
          responsavel_user_id?: string | null
          status?: Database["public"]["Enums"]["agency_task_status"]
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_tasks_cadastro_cliente_id_fkey"
            columns: ["cadastro_cliente_id"]
            isOneToOne: false
            referencedRelation: "cadastro_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_tasks_cadastro_cliente_id_fkey"
            columns: ["cadastro_cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_agency_client_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_tasks_cadastro_cliente_id_fkey"
            columns: ["cadastro_cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_admin"
            referencedColumns: ["id"]
          },
        ]
      }
      agency_timeline_events: {
        Row: {
          actor_email: string | null
          actor_user_id: string | null
          cadastro_cliente_id: number | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          event_type: Database["public"]["Enums"]["agency_timeline_event_type"]
          id: string
          payload: Json
          summary: string | null
          title: string
        }
        Insert: {
          actor_email?: string | null
          actor_user_id?: string | null
          cadastro_cliente_id?: number | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type: Database["public"]["Enums"]["agency_timeline_event_type"]
          id?: string
          payload?: Json
          summary?: string | null
          title: string
        }
        Update: {
          actor_email?: string | null
          actor_user_id?: string | null
          cadastro_cliente_id?: number | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          event_type?: Database["public"]["Enums"]["agency_timeline_event_type"]
          id?: string
          payload?: Json
          summary?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "agency_timeline_events_cadastro_cliente_id_fkey"
            columns: ["cadastro_cliente_id"]
            isOneToOne: false
            referencedRelation: "cadastro_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_timeline_events_cadastro_cliente_id_fkey"
            columns: ["cadastro_cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_agency_client_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_timeline_events_cadastro_cliente_id_fkey"
            columns: ["cadastro_cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_admin"
            referencedColumns: ["id"]
          },
        ]
      }
      app_notifications: {
        Row: {
          body: string | null
          created_at: string
          href: string | null
          id: string
          kind: string
          payload: Json
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          href?: string | null
          id?: string
          kind: string
          payload?: Json
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          href?: string | null
          id?: string
          kind?: string
          payload?: Json
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: []
      }
      base_metricas_backup: {
        Row: {
          campanha: string | null
          cliente: string | null
          created_at: string | null
          data: string | null
          id: number | null
          metrica: string | null
          plataforma: string | null
          valor: number | null
        }
        Insert: {
          campanha?: string | null
          cliente?: string | null
          created_at?: string | null
          data?: string | null
          id?: number | null
          metrica?: string | null
          plataforma?: string | null
          valor?: number | null
        }
        Update: {
          campanha?: string | null
          cliente?: string | null
          created_at?: string | null
          data?: string | null
          id?: number | null
          metrica?: string | null
          plataforma?: string | null
          valor?: number | null
        }
        Relationships: []
      }
      base_metricas_hub: {
        Row: {
          campanha: string | null
          cliente: string
          created_at: string | null
          data: string
          id: number
          metrica: string
          plataforma: string
          valor: number | null
        }
        Insert: {
          campanha?: string | null
          cliente: string
          created_at?: string | null
          data: string
          id?: number
          metrica: string
          plataforma: string
          valor?: number | null
        }
        Update: {
          campanha?: string | null
          cliente?: string
          created_at?: string | null
          data?: string
          id?: number
          metrica?: string
          plataforma?: string
          valor?: number | null
        }
        Relationships: []
      }
      base_metricas_make: {
        Row: {
          campanha: string | null
          cliente: string
          created_at: string | null
          data: string
          id: number
          metrica: string
          plataforma: string
          valor: number | null
        }
        Insert: {
          campanha?: string | null
          cliente: string
          created_at?: string | null
          data: string
          id?: number
          metrica: string
          plataforma: string
          valor?: number | null
        }
        Update: {
          campanha?: string | null
          cliente?: string
          created_at?: string | null
          data?: string
          id?: number
          metrica?: string
          plataforma?: string
          valor?: number | null
        }
        Relationships: []
      }
      cadastro_clientes: {
        Row: {
          ativo: boolean
          avatar_url: string | null
          categoria: string | null
          created_at: string | null
          data_inicio: string | null
          email_principal: string | null
          empresa: string | null
          facebook_ad_account_id: string | null
          ga4_ativo: string | null
          ga4_property_id: string | null
          google_ads_ativo: string | null
          google_ads_customer_id: string | null
          google_business_ativo: string | null
          google_business_location_id: string | null
          id: number
          instagram_ativo: boolean
          instagram_page_id: string | null
          instagram_username: string | null
          meta_ativo: string | null
          mlabs_url: string | null
          nome_cliente: string
          observacoes: string | null
          prioridade: Database["public"]["Enums"]["agency_priority"]
          proxima_acao: string | null
          proxima_reuniao: string | null
          responsavel_user_id: string | null
          slug: string | null
          status_operacional: Database["public"]["Enums"]["agency_client_status"]
          telefone: string | null
          tiktok_ad_account_id: string | null
          tiktok_ativo: boolean
          ultimo_contato: string | null
          updated_at: string
          valor_mensal: number | null
        }
        Insert: {
          ativo?: boolean
          avatar_url?: string | null
          categoria?: string | null
          created_at?: string | null
          data_inicio?: string | null
          email_principal?: string | null
          empresa?: string | null
          facebook_ad_account_id?: string | null
          ga4_ativo?: string | null
          ga4_property_id?: string | null
          google_ads_ativo?: string | null
          google_ads_customer_id?: string | null
          google_business_ativo?: string | null
          google_business_location_id?: string | null
          id?: number
          instagram_ativo?: boolean
          instagram_page_id?: string | null
          instagram_username?: string | null
          meta_ativo?: string | null
          mlabs_url?: string | null
          nome_cliente: string
          observacoes?: string | null
          prioridade?: Database["public"]["Enums"]["agency_priority"]
          proxima_acao?: string | null
          proxima_reuniao?: string | null
          responsavel_user_id?: string | null
          slug?: string | null
          status_operacional?: Database["public"]["Enums"]["agency_client_status"]
          telefone?: string | null
          tiktok_ad_account_id?: string | null
          tiktok_ativo?: boolean
          ultimo_contato?: string | null
          updated_at?: string
          valor_mensal?: number | null
        }
        Update: {
          ativo?: boolean
          avatar_url?: string | null
          categoria?: string | null
          created_at?: string | null
          data_inicio?: string | null
          email_principal?: string | null
          empresa?: string | null
          facebook_ad_account_id?: string | null
          ga4_ativo?: string | null
          ga4_property_id?: string | null
          google_ads_ativo?: string | null
          google_ads_customer_id?: string | null
          google_business_ativo?: string | null
          google_business_location_id?: string | null
          id?: number
          instagram_ativo?: boolean
          instagram_page_id?: string | null
          instagram_username?: string | null
          meta_ativo?: string | null
          mlabs_url?: string | null
          nome_cliente?: string
          observacoes?: string | null
          prioridade?: Database["public"]["Enums"]["agency_priority"]
          proxima_acao?: string | null
          proxima_reuniao?: string | null
          responsavel_user_id?: string | null
          slug?: string | null
          status_operacional?: Database["public"]["Enums"]["agency_client_status"]
          telefone?: string | null
          tiktok_ad_account_id?: string | null
          tiktok_ativo?: boolean
          ultimo_contato?: string | null
          updated_at?: string
          valor_mensal?: number | null
        }
        Relationships: []
      }
      client_access: {
        Row: {
          cadastro_cliente_id: number | null
          cliente_id: string | null
          cliente_nome: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          cadastro_cliente_id?: number | null
          cliente_id?: string | null
          cliente_nome: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          cadastro_cliente_id?: number | null
          cliente_id?: string | null
          cliente_nome?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_access_cadastro_cliente_id_fkey"
            columns: ["cadastro_cliente_id"]
            isOneToOne: false
            referencedRelation: "cadastro_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_access_cadastro_cliente_id_fkey"
            columns: ["cadastro_cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_agency_client_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_access_cadastro_cliente_id_fkey"
            columns: ["cadastro_cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_admin"
            referencedColumns: ["id"]
          },
        ]
      }
      cliente_aliases: {
        Row: {
          alias_metricas: string
          created_at: string
          id: number
          nome_canonico: string
        }
        Insert: {
          alias_metricas: string
          created_at?: string
          id?: number
          nome_canonico: string
        }
        Update: {
          alias_metricas?: string
          created_at?: string
          id?: number
          nome_canonico?: string
        }
        Relationships: []
      }
      cliente_diretrizes: {
        Row: {
          cadastro_cliente_id: number
          file_name: string
          file_size: number
          id: string
          mime_type: string
          storage_path: string
          uploaded_at: string
          uploaded_by: string | null
        }
        Insert: {
          cadastro_cliente_id: number
          file_name: string
          file_size: number
          id?: string
          mime_type?: string
          storage_path: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Update: {
          cadastro_cliente_id?: number
          file_name?: string
          file_size?: number
          id?: string
          mime_type?: string
          storage_path?: string
          uploaded_at?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cliente_diretrizes_cadastro_cliente_id_fkey"
            columns: ["cadastro_cliente_id"]
            isOneToOne: true
            referencedRelation: "cadastro_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_diretrizes_cadastro_cliente_id_fkey"
            columns: ["cadastro_cliente_id"]
            isOneToOne: true
            referencedRelation: "vw_agency_client_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_diretrizes_cadastro_cliente_id_fkey"
            columns: ["cadastro_cliente_id"]
            isOneToOne: true
            referencedRelation: "vw_clientes_admin"
            referencedColumns: ["id"]
          },
        ]
      }
      cliente_servicos: {
        Row: {
          ativo: boolean
          cadastro_cliente_id: number
          created_at: string
          id: string
          observacoes: string | null
          servico_id: string
          updated_at: string
          valor: number | null
        }
        Insert: {
          ativo?: boolean
          cadastro_cliente_id: number
          created_at?: string
          id?: string
          observacoes?: string | null
          servico_id: string
          updated_at?: string
          valor?: number | null
        }
        Update: {
          ativo?: boolean
          cadastro_cliente_id?: number
          created_at?: string
          id?: string
          observacoes?: string | null
          servico_id?: string
          updated_at?: string
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cliente_servicos_cadastro_cliente_id_fkey"
            columns: ["cadastro_cliente_id"]
            isOneToOne: false
            referencedRelation: "cadastro_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_servicos_cadastro_cliente_id_fkey"
            columns: ["cadastro_cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_agency_client_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_servicos_cadastro_cliente_id_fkey"
            columns: ["cadastro_cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cliente_servicos_servico_id_fkey"
            columns: ["servico_id"]
            isOneToOne: false
            referencedRelation: "servicos"
            referencedColumns: ["id"]
          },
        ]
      }
      content_card_attachments: {
        Row: {
          card_id: string
          created_at: string
          duration_seconds: number | null
          file_name: string | null
          file_size: number | null
          height: number | null
          id: string
          kind: string
          legacy_media_id: string | null
          media_role: string
          mime_type: string
          ordem: number
          poster_path: string | null
          storage_path: string
          width: number | null
        }
        Insert: {
          card_id: string
          created_at?: string
          duration_seconds?: number | null
          file_name?: string | null
          file_size?: number | null
          height?: number | null
          id?: string
          kind: string
          legacy_media_id?: string | null
          media_role?: string
          mime_type: string
          ordem?: number
          poster_path?: string | null
          storage_path: string
          width?: number | null
        }
        Update: {
          card_id?: string
          created_at?: string
          duration_seconds?: number | null
          file_name?: string | null
          file_size?: number | null
          height?: number | null
          id?: string
          kind?: string
          legacy_media_id?: string | null
          media_role?: string
          mime_type?: string
          ordem?: number
          poster_path?: string | null
          storage_path?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "content_card_attachments_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "content_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_card_attachments_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "vw_content_workflow_library"
            referencedColumns: ["id"]
          },
        ]
      }
      content_card_events: {
        Row: {
          actor_email: string | null
          actor_id: string | null
          card_id: string
          created_at: string
          event_type: Database["public"]["Enums"]["content_card_event_type"]
          id: string
          payload: Json
        }
        Insert: {
          actor_email?: string | null
          actor_id?: string | null
          card_id: string
          created_at?: string
          event_type: Database["public"]["Enums"]["content_card_event_type"]
          id?: string
          payload?: Json
        }
        Update: {
          actor_email?: string | null
          actor_id?: string | null
          card_id?: string
          created_at?: string
          event_type?: Database["public"]["Enums"]["content_card_event_type"]
          id?: string
          payload?: Json
        }
        Relationships: [
          {
            foreignKeyName: "content_card_events_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "content_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_card_events_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "vw_content_workflow_library"
            referencedColumns: ["id"]
          },
        ]
      }
      content_cards: {
        Row: {
          ai_metadata: Json
          archived_at: string | null
          cadastro_cliente_id: number
          capa_url: string | null
          checklist: Json
          cliente_nome: string
          copy_text: string | null
          created_at: string
          created_by: string | null
          cta: string | null
          data_publicacao: string
          direcao_arte: string | null
          estrategia_id: string | null
          external_post_id: string | null
          formato: string | null
          hora_publicacao: string | null
          id: string
          integration_metadata: Json
          kanban_ordem: number
          legacy_post_id: string | null
          legenda: string | null
          linha_editorial: string | null
          localizacao: string | null
          observacoes: string | null
          pilar_id: string | null
          plataforma: string
          publish_attempted_at: string | null
          publish_container_id: string | null
          publish_error: string | null
          publish_status: string
          publish_target: string | null
          published_at: string | null
          responsavel_email: string | null
          responsavel_user_id: string | null
          roteiro: string | null
          scheduled_publish_at: string | null
          status: Database["public"]["Enums"]["content_card_status"]
          tags: string[] | null
          tema: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          ai_metadata?: Json
          archived_at?: string | null
          cadastro_cliente_id: number
          capa_url?: string | null
          checklist?: Json
          cliente_nome: string
          copy_text?: string | null
          created_at?: string
          created_by?: string | null
          cta?: string | null
          data_publicacao: string
          direcao_arte?: string | null
          estrategia_id?: string | null
          external_post_id?: string | null
          formato?: string | null
          hora_publicacao?: string | null
          id?: string
          integration_metadata?: Json
          kanban_ordem?: number
          legacy_post_id?: string | null
          legenda?: string | null
          linha_editorial?: string | null
          localizacao?: string | null
          observacoes?: string | null
          pilar_id?: string | null
          plataforma?: string
          publish_attempted_at?: string | null
          publish_container_id?: string | null
          publish_error?: string | null
          publish_status?: string
          publish_target?: string | null
          published_at?: string | null
          responsavel_email?: string | null
          responsavel_user_id?: string | null
          roteiro?: string | null
          scheduled_publish_at?: string | null
          status?: Database["public"]["Enums"]["content_card_status"]
          tags?: string[] | null
          tema?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          ai_metadata?: Json
          archived_at?: string | null
          cadastro_cliente_id?: number
          capa_url?: string | null
          checklist?: Json
          cliente_nome?: string
          copy_text?: string | null
          created_at?: string
          created_by?: string | null
          cta?: string | null
          data_publicacao?: string
          direcao_arte?: string | null
          estrategia_id?: string | null
          external_post_id?: string | null
          formato?: string | null
          hora_publicacao?: string | null
          id?: string
          integration_metadata?: Json
          kanban_ordem?: number
          legacy_post_id?: string | null
          legenda?: string | null
          linha_editorial?: string | null
          localizacao?: string | null
          observacoes?: string | null
          pilar_id?: string | null
          plataforma?: string
          publish_attempted_at?: string | null
          publish_container_id?: string | null
          publish_error?: string | null
          publish_status?: string
          publish_target?: string | null
          published_at?: string | null
          responsavel_email?: string | null
          responsavel_user_id?: string | null
          roteiro?: string | null
          scheduled_publish_at?: string | null
          status?: Database["public"]["Enums"]["content_card_status"]
          tags?: string[] | null
          tema?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "content_cards_cadastro_cliente_id_fkey"
            columns: ["cadastro_cliente_id"]
            isOneToOne: false
            referencedRelation: "cadastro_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_cards_cadastro_cliente_id_fkey"
            columns: ["cadastro_cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_agency_client_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_cards_cadastro_cliente_id_fkey"
            columns: ["cadastro_cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_cards_estrategia_id_fkey"
            columns: ["estrategia_id"]
            isOneToOne: false
            referencedRelation: "plano_estrategias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_cards_pilar_id_fkey"
            columns: ["pilar_id"]
            isOneToOne: false
            referencedRelation: "editorial_pillars"
            referencedColumns: ["id"]
          },
        ]
      }
      core_audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_id: string | null
          after_state: Json | null
          before_state: Json | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          ip: unknown
          module: string
          source: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip?: unknown
          module: string
          source?: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_id?: string | null
          after_state?: Json | null
          before_state?: Json | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          ip?: unknown
          module?: string
          source?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      core_feature_flags: {
        Row: {
          created_at: string
          description: string | null
          flag_key: string
          id: string
          module: string | null
          scope: string
          status: string
          target_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          flag_key: string
          id?: string
          module?: string | null
          scope: string
          status: string
          target_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          flag_key?: string
          id?: string
          module?: string | null
          scope?: string
          status?: string
          target_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      editorial_pillars: {
        Row: {
          ativo: boolean
          cadastro_cliente_id: number
          cor: string
          created_at: string
          explicacao: string | null
          id: string
          objetivo: string | null
          ordem: number
          titulo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cadastro_cliente_id: number
          cor?: string
          created_at?: string
          explicacao?: string | null
          id?: string
          objetivo?: string | null
          ordem?: number
          titulo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cadastro_cliente_id?: number
          cor?: string
          created_at?: string
          explicacao?: string | null
          id?: string
          objetivo?: string | null
          ordem?: number
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "editorial_pillars_cadastro_cliente_id_fkey"
            columns: ["cadastro_cliente_id"]
            isOneToOne: false
            referencedRelation: "cadastro_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "editorial_pillars_cadastro_cliente_id_fkey"
            columns: ["cadastro_cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_agency_client_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "editorial_pillars_cadastro_cliente_id_fkey"
            columns: ["cadastro_cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_admin"
            referencedColumns: ["id"]
          },
        ]
      }
      ig_media: {
        Row: {
          cadastro_cliente_id: number
          caption: string | null
          content_card_id: string | null
          created_at: string
          id: string
          ig_media_id: string
          last_synced_at: string | null
          media_product_type: string
          media_type: string
          media_url: string | null
          metrics: Json
          metrics_collected_at: string | null
          permalink: string | null
          published_at: string
          thumbnail_storage_path: string | null
          thumbnail_url: string | null
          updated_at: string
        }
        Insert: {
          cadastro_cliente_id: number
          caption?: string | null
          content_card_id?: string | null
          created_at?: string
          id?: string
          ig_media_id: string
          last_synced_at?: string | null
          media_product_type: string
          media_type: string
          media_url?: string | null
          metrics?: Json
          metrics_collected_at?: string | null
          permalink?: string | null
          published_at: string
          thumbnail_storage_path?: string | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Update: {
          cadastro_cliente_id?: number
          caption?: string | null
          content_card_id?: string | null
          created_at?: string
          id?: string
          ig_media_id?: string
          last_synced_at?: string | null
          media_product_type?: string
          media_type?: string
          media_url?: string | null
          metrics?: Json
          metrics_collected_at?: string | null
          permalink?: string | null
          published_at?: string
          thumbnail_storage_path?: string | null
          thumbnail_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ig_media_cadastro_cliente_id_fkey"
            columns: ["cadastro_cliente_id"]
            isOneToOne: false
            referencedRelation: "cadastro_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ig_media_cadastro_cliente_id_fkey"
            columns: ["cadastro_cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_agency_client_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ig_media_cadastro_cliente_id_fkey"
            columns: ["cadastro_cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ig_media_content_card_id_fkey"
            columns: ["content_card_id"]
            isOneToOne: false
            referencedRelation: "content_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ig_media_content_card_id_fkey"
            columns: ["content_card_id"]
            isOneToOne: false
            referencedRelation: "vw_content_workflow_library"
            referencedColumns: ["id"]
          },
        ]
      }
      ig_media_metrics_history: {
        Row: {
          collected_at: string
          id: string
          ig_media_id: string
          metric_key: string
          value: number
        }
        Insert: {
          collected_at?: string
          id?: string
          ig_media_id: string
          metric_key: string
          value: number
        }
        Update: {
          collected_at?: string
          id?: string
          ig_media_id?: string
          metric_key?: string
          value?: number
        }
        Relationships: [
          {
            foreignKeyName: "ig_media_metrics_history_ig_media_id_fkey"
            columns: ["ig_media_id"]
            isOneToOne: false
            referencedRelation: "ig_media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ig_media_metrics_history_ig_media_id_fkey"
            columns: ["ig_media_id"]
            isOneToOne: false
            referencedRelation: "vw_ig_media_dashboard"
            referencedColumns: ["id"]
          },
        ]
      }
      ph_comparison_reports: {
        Row: {
          baseline_source: string
          candidate_source: string
          connection_id: string
          coverage: number | null
          created_at: string
          duration_ms: number | null
          extra_metrics: number
          from_date: string
          id: string
          matched_metrics: number
          missing_metrics: number
          normalization_differences: Json
          plugin_key: string
          provider_type: string
          rows_hub: number
          rows_make: number
          status: string
          summary: string | null
          to_date: string
          value_differences: Json
        }
        Insert: {
          baseline_source?: string
          candidate_source?: string
          connection_id: string
          coverage?: number | null
          created_at?: string
          duration_ms?: number | null
          extra_metrics?: number
          from_date: string
          id?: string
          matched_metrics?: number
          missing_metrics?: number
          normalization_differences?: Json
          plugin_key: string
          provider_type?: string
          rows_hub?: number
          rows_make?: number
          status?: string
          summary?: string | null
          to_date: string
          value_differences?: Json
        }
        Update: {
          baseline_source?: string
          candidate_source?: string
          connection_id?: string
          coverage?: number | null
          created_at?: string
          duration_ms?: number | null
          extra_metrics?: number
          from_date?: string
          id?: string
          matched_metrics?: number
          missing_metrics?: number
          normalization_differences?: Json
          plugin_key?: string
          provider_type?: string
          rows_hub?: number
          rows_make?: number
          status?: string
          summary?: string | null
          to_date?: string
          value_differences?: Json
        }
        Relationships: [
          {
            foreignKeyName: "ph_comparison_reports_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "ph_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      ph_connections: {
        Row: {
          active_provider_type: string
          api_version: string | null
          avg_collect_ms: number | null
          cadastro_id: number | null
          capability: string
          coverage: number | null
          created_at: string
          dual_run_started_at: string | null
          health_score: number | null
          health_status: Database["public"]["Enums"]["ph_health_status"]
          homologation_status: Database["public"]["Enums"]["ph_homologation_status"]
          id: string
          label: string
          last_comparison_at: string | null
          last_coverage: number | null
          last_error: string | null
          last_sync_at: string | null
          last_sync_status: string | null
          metrics_count: number
          migration_stage: Database["public"]["Enums"]["ph_migration_stage"]
          plugin_key: string
          scope_ref: string
          status: Database["public"]["Enums"]["ph_connection_status"]
          updated_at: string
        }
        Insert: {
          active_provider_type: string
          api_version?: string | null
          avg_collect_ms?: number | null
          cadastro_id?: number | null
          capability: string
          coverage?: number | null
          created_at?: string
          dual_run_started_at?: string | null
          health_score?: number | null
          health_status?: Database["public"]["Enums"]["ph_health_status"]
          homologation_status?: Database["public"]["Enums"]["ph_homologation_status"]
          id: string
          label: string
          last_comparison_at?: string | null
          last_coverage?: number | null
          last_error?: string | null
          last_sync_at?: string | null
          last_sync_status?: string | null
          metrics_count?: number
          migration_stage?: Database["public"]["Enums"]["ph_migration_stage"]
          plugin_key: string
          scope_ref: string
          status?: Database["public"]["Enums"]["ph_connection_status"]
          updated_at?: string
        }
        Update: {
          active_provider_type?: string
          api_version?: string | null
          avg_collect_ms?: number | null
          cadastro_id?: number | null
          capability?: string
          coverage?: number | null
          created_at?: string
          dual_run_started_at?: string | null
          health_score?: number | null
          health_status?: Database["public"]["Enums"]["ph_health_status"]
          homologation_status?: Database["public"]["Enums"]["ph_homologation_status"]
          id?: string
          label?: string
          last_comparison_at?: string | null
          last_coverage?: number | null
          last_error?: string | null
          last_sync_at?: string | null
          last_sync_status?: string | null
          metrics_count?: number
          migration_stage?: Database["public"]["Enums"]["ph_migration_stage"]
          plugin_key?: string
          scope_ref?: string
          status?: Database["public"]["Enums"]["ph_connection_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ph_connections_cadastro_id_fkey"
            columns: ["cadastro_id"]
            isOneToOne: false
            referencedRelation: "cadastro_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ph_connections_cadastro_id_fkey"
            columns: ["cadastro_id"]
            isOneToOne: false
            referencedRelation: "vw_agency_client_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ph_connections_cadastro_id_fkey"
            columns: ["cadastro_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_admin"
            referencedColumns: ["id"]
          },
        ]
      }
      ph_credentials: {
        Row: {
          connection_id: string
          created_at: string
          credential_key: string
          payload_encrypted: string
          updated_at: string
        }
        Insert: {
          connection_id: string
          created_at?: string
          credential_key: string
          payload_encrypted: string
          updated_at?: string
        }
        Update: {
          connection_id?: string
          created_at?: string
          credential_key?: string
          payload_encrypted?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ph_credentials_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "ph_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      ph_debug_traces: {
        Row: {
          connection_id: string
          created_at: string
          duration_ms: number | null
          id: string
          operation: string
          pages_fetched: number
          plugin_key: string
          rate_limit: Json | null
          request_summary: Json
          response_summary: Json
          retries: number
          rows_collected: number
          rows_discarded: number
        }
        Insert: {
          connection_id: string
          created_at?: string
          duration_ms?: number | null
          id?: string
          operation: string
          pages_fetched?: number
          plugin_key: string
          rate_limit?: Json | null
          request_summary?: Json
          response_summary?: Json
          retries?: number
          rows_collected?: number
          rows_discarded?: number
        }
        Update: {
          connection_id?: string
          created_at?: string
          duration_ms?: number | null
          id?: string
          operation?: string
          pages_fetched?: number
          plugin_key?: string
          rate_limit?: Json | null
          request_summary?: Json
          response_summary?: Json
          retries?: number
          rows_collected?: number
          rows_discarded?: number
        }
        Relationships: [
          {
            foreignKeyName: "ph_debug_traces_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "ph_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      ph_homologation_reports: {
        Row: {
          connection_id: string
          coverage: number | null
          created_at: string
          duration_ms: number | null
          id: string
          overall: string | null
          payload: Json
          plugin_key: string
          report_kind: Database["public"]["Enums"]["ph_homologation_report_kind"]
          rows_ignored: number
          rows_produced: number
          warnings: Json
        }
        Insert: {
          connection_id: string
          coverage?: number | null
          created_at?: string
          duration_ms?: number | null
          id?: string
          overall?: string | null
          payload?: Json
          plugin_key: string
          report_kind: Database["public"]["Enums"]["ph_homologation_report_kind"]
          rows_ignored?: number
          rows_produced?: number
          warnings?: Json
        }
        Update: {
          connection_id?: string
          coverage?: number | null
          created_at?: string
          duration_ms?: number | null
          id?: string
          overall?: string | null
          payload?: Json
          plugin_key?: string
          report_kind?: Database["public"]["Enums"]["ph_homologation_report_kind"]
          rows_ignored?: number
          rows_produced?: number
          warnings?: Json
        }
        Relationships: [
          {
            foreignKeyName: "ph_homologation_reports_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "ph_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      ph_identities: {
        Row: {
          connection_id: string
          created_at: string
          external_id: string
          id: string
          identity_type: string
          is_primary: boolean
          label: string
          updated_at: string
        }
        Insert: {
          connection_id: string
          created_at?: string
          external_id: string
          id: string
          identity_type: string
          is_primary?: boolean
          label: string
          updated_at?: string
        }
        Update: {
          connection_id?: string
          created_at?: string
          external_id?: string
          id?: string
          identity_type?: string
          is_primary?: boolean
          label?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ph_identities_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "ph_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      ph_metricas_source: {
        Row: {
          active_source: string
          id: number
          updated_at: string
        }
        Insert: {
          active_source?: string
          id?: number
          updated_at?: string
        }
        Update: {
          active_source?: string
          id?: number
          updated_at?: string
        }
        Relationships: []
      }
      ph_oauth_states: {
        Row: {
          connection_id: string
          created_at: string
          expires_at: string
          plugin_key: string
          redirect_after: string
          state: string
        }
        Insert: {
          connection_id: string
          created_at?: string
          expires_at: string
          plugin_key: string
          redirect_after: string
          state: string
        }
        Update: {
          connection_id?: string
          created_at?: string
          expires_at?: string
          plugin_key?: string
          redirect_after?: string
          state?: string
        }
        Relationships: [
          {
            foreignKeyName: "ph_oauth_states_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "ph_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      ph_sync_runs: {
        Row: {
          connection_id: string
          created_at: string
          duration_ms: number | null
          error_message: string | null
          execution_id: string
          finished_at: string | null
          id: string
          provider_type: string
          rows_collected: number
          started_at: string
          status: string
        }
        Insert: {
          connection_id: string
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          execution_id: string
          finished_at?: string | null
          id: string
          provider_type: string
          rows_collected?: number
          started_at: string
          status: string
        }
        Update: {
          connection_id?: string
          created_at?: string
          duration_ms?: number | null
          error_message?: string | null
          execution_id?: string
          finished_at?: string | null
          id?: string
          provider_type?: string
          rows_collected?: number
          started_at?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "ph_sync_runs_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "ph_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      ph_timeline_events: {
        Row: {
          actor_email: string | null
          cadastro_id: number | null
          connection_id: string | null
          created_at: string
          detail: string | null
          id: string
          kind: Database["public"]["Enums"]["ph_timeline_event_kind"]
          metadata: Json
          title: string
        }
        Insert: {
          actor_email?: string | null
          cadastro_id?: number | null
          connection_id?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          kind: Database["public"]["Enums"]["ph_timeline_event_kind"]
          metadata?: Json
          title: string
        }
        Update: {
          actor_email?: string | null
          cadastro_id?: number | null
          connection_id?: string | null
          created_at?: string
          detail?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["ph_timeline_event_kind"]
          metadata?: Json
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "ph_timeline_events_cadastro_id_fkey"
            columns: ["cadastro_id"]
            isOneToOne: false
            referencedRelation: "cadastro_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ph_timeline_events_cadastro_id_fkey"
            columns: ["cadastro_id"]
            isOneToOne: false
            referencedRelation: "vw_agency_client_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ph_timeline_events_cadastro_id_fkey"
            columns: ["cadastro_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ph_timeline_events_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "ph_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      plano_acoes: {
        Row: {
          created_at: string
          data_prevista: string | null
          descricao: string | null
          estrategia_id: string | null
          id: string
          motivo_estrategico: string
          ordem: number
          plano_id: string
          responsavel_email: string | null
          status: Database["public"]["Enums"]["plano_item_status"]
          sugerido: boolean
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_prevista?: string | null
          descricao?: string | null
          estrategia_id?: string | null
          id?: string
          motivo_estrategico: string
          ordem?: number
          plano_id: string
          responsavel_email?: string | null
          status?: Database["public"]["Enums"]["plano_item_status"]
          sugerido?: boolean
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_prevista?: string | null
          descricao?: string | null
          estrategia_id?: string | null
          id?: string
          motivo_estrategico?: string
          ordem?: number
          plano_id?: string
          responsavel_email?: string | null
          status?: Database["public"]["Enums"]["plano_item_status"]
          sugerido?: boolean
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plano_acoes_estrategia_id_fkey"
            columns: ["estrategia_id"]
            isOneToOne: false
            referencedRelation: "plano_estrategias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plano_acoes_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos_estrategicos"
            referencedColumns: ["id"]
          },
        ]
      }
      plano_alinhamentos: {
        Row: {
          cadastro_cliente_id: number
          cliente_nome: string
          created_at: string
          has_active_plan: boolean
          id: string
          plan_approved_at: string | null
          plan_data: Json | null
          plano_id: string | null
          quiz_completed_at: string | null
          quiz_data: Json | null
          updated_at: string
        }
        Insert: {
          cadastro_cliente_id: number
          cliente_nome: string
          created_at?: string
          has_active_plan?: boolean
          id?: string
          plan_approved_at?: string | null
          plan_data?: Json | null
          plano_id?: string | null
          quiz_completed_at?: string | null
          quiz_data?: Json | null
          updated_at?: string
        }
        Update: {
          cadastro_cliente_id?: number
          cliente_nome?: string
          created_at?: string
          has_active_plan?: boolean
          id?: string
          plan_approved_at?: string | null
          plan_data?: Json | null
          plano_id?: string | null
          quiz_completed_at?: string | null
          quiz_data?: Json | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plano_alinhamentos_cadastro_cliente_id_fkey"
            columns: ["cadastro_cliente_id"]
            isOneToOne: true
            referencedRelation: "cadastro_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plano_alinhamentos_cadastro_cliente_id_fkey"
            columns: ["cadastro_cliente_id"]
            isOneToOne: true
            referencedRelation: "vw_agency_client_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plano_alinhamentos_cadastro_cliente_id_fkey"
            columns: ["cadastro_cliente_id"]
            isOneToOne: true
            referencedRelation: "vw_clientes_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plano_alinhamentos_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos_estrategicos"
            referencedColumns: ["id"]
          },
        ]
      }
      plano_aprendizados: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          mes_referencia: string
          plano_id: string
          tags: string[]
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          mes_referencia: string
          plano_id: string
          tags?: string[]
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          mes_referencia?: string
          plano_id?: string
          tags?: string[]
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plano_aprendizados_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos_estrategicos"
            referencedColumns: ["id"]
          },
        ]
      }
      plano_decisoes: {
        Row: {
          created_at: string
          data_decisao: string
          estrategia_id: string | null
          id: string
          motivo: string
          plano_id: string
          responsavel_email: string | null
          resultado_status: Database["public"]["Enums"]["decisao_resultado_status"]
          resultado_texto: string | null
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_decisao?: string
          estrategia_id?: string | null
          id?: string
          motivo: string
          plano_id: string
          responsavel_email?: string | null
          resultado_status?: Database["public"]["Enums"]["decisao_resultado_status"]
          resultado_texto?: string | null
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_decisao?: string
          estrategia_id?: string | null
          id?: string
          motivo?: string
          plano_id?: string
          responsavel_email?: string | null
          resultado_status?: Database["public"]["Enums"]["decisao_resultado_status"]
          resultado_texto?: string | null
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plano_decisoes_estrategia_id_fkey"
            columns: ["estrategia_id"]
            isOneToOne: false
            referencedRelation: "plano_estrategias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plano_decisoes_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos_estrategicos"
            referencedColumns: ["id"]
          },
        ]
      }
      plano_estrategias: {
        Row: {
          comentarios: string | null
          created_at: string
          data_prevista: string | null
          descricao: string | null
          id: string
          objetivo_id: string | null
          ordem: number
          peso_percentual: number
          plano_id: string
          prioridade: Database["public"]["Enums"]["plano_prioridade"]
          responsavel_email: string | null
          status: Database["public"]["Enums"]["plano_item_status"]
          titulo: string
          updated_at: string
        }
        Insert: {
          comentarios?: string | null
          created_at?: string
          data_prevista?: string | null
          descricao?: string | null
          id?: string
          objetivo_id?: string | null
          ordem?: number
          peso_percentual?: number
          plano_id: string
          prioridade?: Database["public"]["Enums"]["plano_prioridade"]
          responsavel_email?: string | null
          status?: Database["public"]["Enums"]["plano_item_status"]
          titulo: string
          updated_at?: string
        }
        Update: {
          comentarios?: string | null
          created_at?: string
          data_prevista?: string | null
          descricao?: string | null
          id?: string
          objetivo_id?: string | null
          ordem?: number
          peso_percentual?: number
          plano_id?: string
          prioridade?: Database["public"]["Enums"]["plano_prioridade"]
          responsavel_email?: string | null
          status?: Database["public"]["Enums"]["plano_item_status"]
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plano_estrategias_objetivo_id_fkey"
            columns: ["objetivo_id"]
            isOneToOne: false
            referencedRelation: "plano_objetivos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plano_estrategias_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos_estrategicos"
            referencedColumns: ["id"]
          },
        ]
      }
      plano_eventos: {
        Row: {
          autor_email: string | null
          autor_id: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          mensagem: string | null
          payload: Json | null
          plano_id: string
          tipo: Database["public"]["Enums"]["plano_evento_tipo"]
        }
        Insert: {
          autor_email?: string | null
          autor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          mensagem?: string | null
          payload?: Json | null
          plano_id: string
          tipo: Database["public"]["Enums"]["plano_evento_tipo"]
        }
        Update: {
          autor_email?: string | null
          autor_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          mensagem?: string | null
          payload?: Json | null
          plano_id?: string
          tipo?: Database["public"]["Enums"]["plano_evento_tipo"]
        }
        Relationships: [
          {
            foreignKeyName: "plano_eventos_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos_estrategicos"
            referencedColumns: ["id"]
          },
        ]
      }
      plano_hipoteses: {
        Row: {
          conclusao: string | null
          created_at: string
          estrategia_id: string | null
          hipotese: string
          id: string
          objetivo_id: string | null
          ordem: number
          plano_id: string
          resultado_percentual: number | null
          resultado_texto: string | null
          status: Database["public"]["Enums"]["hipotese_status"]
          updated_at: string
        }
        Insert: {
          conclusao?: string | null
          created_at?: string
          estrategia_id?: string | null
          hipotese: string
          id?: string
          objetivo_id?: string | null
          ordem?: number
          plano_id: string
          resultado_percentual?: number | null
          resultado_texto?: string | null
          status?: Database["public"]["Enums"]["hipotese_status"]
          updated_at?: string
        }
        Update: {
          conclusao?: string | null
          created_at?: string
          estrategia_id?: string | null
          hipotese?: string
          id?: string
          objetivo_id?: string | null
          ordem?: number
          plano_id?: string
          resultado_percentual?: number | null
          resultado_texto?: string | null
          status?: Database["public"]["Enums"]["hipotese_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plano_hipoteses_estrategia_id_fkey"
            columns: ["estrategia_id"]
            isOneToOne: false
            referencedRelation: "plano_estrategias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plano_hipoteses_objetivo_id_fkey"
            columns: ["objetivo_id"]
            isOneToOne: false
            referencedRelation: "plano_objetivos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plano_hipoteses_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos_estrategicos"
            referencedColumns: ["id"]
          },
        ]
      }
      plano_metric_refs: {
        Row: {
          created_at: string
          id: string
          kpi_key: string | null
          meta_numerica: number | null
          metric_key: string | null
          objetivo_id: string | null
          plano_id: string
          platform_key: string
          positive_is_good: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          kpi_key?: string | null
          meta_numerica?: number | null
          metric_key?: string | null
          objetivo_id?: string | null
          plano_id: string
          platform_key: string
          positive_is_good?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          kpi_key?: string | null
          meta_numerica?: number | null
          metric_key?: string | null
          objetivo_id?: string | null
          plano_id?: string
          platform_key?: string
          positive_is_good?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "plano_metric_refs_objetivo_id_fkey"
            columns: ["objetivo_id"]
            isOneToOne: false
            referencedRelation: "plano_objetivos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plano_metric_refs_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos_estrategicos"
            referencedColumns: ["id"]
          },
        ]
      }
      plano_objetivo_estrategias: {
        Row: {
          estrategia_id: string
          objetivo_id: string
        }
        Insert: {
          estrategia_id: string
          objetivo_id: string
        }
        Update: {
          estrategia_id?: string
          objetivo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plano_objetivo_estrategias_estrategia_id_fkey"
            columns: ["estrategia_id"]
            isOneToOne: false
            referencedRelation: "plano_estrategias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plano_objetivo_estrategias_objetivo_id_fkey"
            columns: ["objetivo_id"]
            isOneToOne: false
            referencedRelation: "plano_objetivos"
            referencedColumns: ["id"]
          },
        ]
      }
      plano_objetivos: {
        Row: {
          created_at: string
          data_alvo: string | null
          descricao: string | null
          id: string
          meta_numerica: number | null
          ordem: number
          periodo_inicio: string | null
          plano_id: string
          progresso_manual: number | null
          status: Database["public"]["Enums"]["plano_item_status"]
          titulo: string
          updated_at: string
          workflow_fase: string | null
        }
        Insert: {
          created_at?: string
          data_alvo?: string | null
          descricao?: string | null
          id?: string
          meta_numerica?: number | null
          ordem?: number
          periodo_inicio?: string | null
          plano_id: string
          progresso_manual?: number | null
          status?: Database["public"]["Enums"]["plano_item_status"]
          titulo: string
          updated_at?: string
          workflow_fase?: string | null
        }
        Update: {
          created_at?: string
          data_alvo?: string | null
          descricao?: string | null
          id?: string
          meta_numerica?: number | null
          ordem?: number
          periodo_inicio?: string | null
          plano_id?: string
          progresso_manual?: number | null
          status?: Database["public"]["Enums"]["plano_item_status"]
          titulo?: string
          updated_at?: string
          workflow_fase?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plano_objetivos_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos_estrategicos"
            referencedColumns: ["id"]
          },
        ]
      }
      plano_oportunidades: {
        Row: {
          acao_sugerida: string
          created_at: string
          id: string
          insight: string
          ordem: number
          origem: Database["public"]["Enums"]["oportunidade_origem"]
          plano_id: string
          platform_key: string | null
          status: Database["public"]["Enums"]["plano_item_status"]
          updated_at: string
        }
        Insert: {
          acao_sugerida: string
          created_at?: string
          id?: string
          insight: string
          ordem?: number
          origem?: Database["public"]["Enums"]["oportunidade_origem"]
          plano_id: string
          platform_key?: string | null
          status?: Database["public"]["Enums"]["plano_item_status"]
          updated_at?: string
        }
        Update: {
          acao_sugerida?: string
          created_at?: string
          id?: string
          insight?: string
          ordem?: number
          origem?: Database["public"]["Enums"]["oportunidade_origem"]
          plano_id?: string
          platform_key?: string | null
          status?: Database["public"]["Enums"]["plano_item_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plano_oportunidades_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos_estrategicos"
            referencedColumns: ["id"]
          },
        ]
      }
      plano_roadmap_marcos: {
        Row: {
          created_at: string
          data_prevista: string | null
          descricao: string | null
          id: string
          objetivo_id: string | null
          ordem: number
          plano_id: string
          semana_numero: number | null
          status: Database["public"]["Enums"]["plano_item_status"]
          tipo: Database["public"]["Enums"]["roadmap_marco_tipo"]
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_prevista?: string | null
          descricao?: string | null
          id?: string
          objetivo_id?: string | null
          ordem?: number
          plano_id: string
          semana_numero?: number | null
          status?: Database["public"]["Enums"]["plano_item_status"]
          tipo?: Database["public"]["Enums"]["roadmap_marco_tipo"]
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_prevista?: string | null
          descricao?: string | null
          id?: string
          objetivo_id?: string | null
          ordem?: number
          plano_id?: string
          semana_numero?: number | null
          status?: Database["public"]["Enums"]["plano_item_status"]
          tipo?: Database["public"]["Enums"]["roadmap_marco_tipo"]
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plano_roadmap_marcos_objetivo_id_fkey"
            columns: ["objetivo_id"]
            isOneToOne: false
            referencedRelation: "plano_objetivos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "plano_roadmap_marcos_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos_estrategicos"
            referencedColumns: ["id"]
          },
        ]
      }
      plano_snapshots: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          plano_id: string
          snapshot: Json
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          plano_id: string
          snapshot: Json
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          plano_id?: string
          snapshot?: Json
        }
        Relationships: [
          {
            foreignKeyName: "plano_snapshots_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "planos_estrategicos"
            referencedColumns: ["id"]
          },
        ]
      }
      planos_estrategicos: {
        Row: {
          ai_metadata: Json | null
          cadastro_cliente_id: number
          cliente_nome: string
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          objetivo_principal: string | null
          observacoes: string | null
          periodo_fim: string
          periodo_inicio: string
          status: Database["public"]["Enums"]["plano_status"]
          titulo: string
          updated_at: string
        }
        Insert: {
          ai_metadata?: Json | null
          cadastro_cliente_id: number
          cliente_nome: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          objetivo_principal?: string | null
          observacoes?: string | null
          periodo_fim: string
          periodo_inicio: string
          status?: Database["public"]["Enums"]["plano_status"]
          titulo: string
          updated_at?: string
        }
        Update: {
          ai_metadata?: Json | null
          cadastro_cliente_id?: number
          cliente_nome?: string
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          objetivo_principal?: string | null
          observacoes?: string | null
          periodo_fim?: string
          periodo_inicio?: string
          status?: Database["public"]["Enums"]["plano_status"]
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "planos_estrategicos_cadastro_cliente_id_fkey"
            columns: ["cadastro_cliente_id"]
            isOneToOne: false
            referencedRelation: "cadastro_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planos_estrategicos_cadastro_cliente_id_fkey"
            columns: ["cadastro_cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_agency_client_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planos_estrategicos_cadastro_cliente_id_fkey"
            columns: ["cadastro_cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_admin"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          id: string
          nome: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id: string
          nome?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      prospecting_prospects: {
        Row: {
          address: string | null
          city: string | null
          company_name: string
          created_at: string
          email: string | null
          first_seen_at: string
          id: string
          metadata: Json
          phone: string | null
          place_id: string | null
          source: string
          status: string
          updated_at: string
          website: string | null
        }
        Insert: {
          address?: string | null
          city?: string | null
          company_name: string
          created_at?: string
          email?: string | null
          first_seen_at?: string
          id?: string
          metadata?: Json
          phone?: string | null
          place_id?: string | null
          source?: string
          status?: string
          updated_at?: string
          website?: string | null
        }
        Update: {
          address?: string | null
          city?: string | null
          company_name?: string
          created_at?: string
          email?: string | null
          first_seen_at?: string
          id?: string
          metadata?: Json
          phone?: string | null
          place_id?: string | null
          source?: string
          status?: string
          updated_at?: string
          website?: string | null
        }
        Relationships: []
      }
      prospecting_runs: {
        Row: {
          created_at: string
          id: string
          inserted_count: number
          metadata: Json
          provider: string
          query_scope: string
          skipped_count: number
          status: string
          total_candidates: number
        }
        Insert: {
          created_at?: string
          id?: string
          inserted_count?: number
          metadata?: Json
          provider?: string
          query_scope: string
          skipped_count?: number
          status?: string
          total_candidates?: number
        }
        Update: {
          created_at?: string
          id?: string
          inserted_count?: number
          metadata?: Json
          provider?: string
          query_scope?: string
          skipped_count?: number
          status?: string
          total_candidates?: number
        }
        Relationships: []
      }
      servicos: {
        Row: {
          ativo: boolean
          created_at: string
          descricao: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      story_plan_rows: {
        Row: {
          cadastro_cliente_id: number
          card_id: string | null
          checklist: Json
          created_at: string
          created_by: string | null
          dia_semana: number
          id: string
          observacoes: string | null
          ordem: number
          periodo: string | null
          semana_inicio: string
          titulo: string | null
          updated_at: string
        }
        Insert: {
          cadastro_cliente_id: number
          card_id?: string | null
          checklist?: Json
          created_at?: string
          created_by?: string | null
          dia_semana: number
          id?: string
          observacoes?: string | null
          ordem?: number
          periodo?: string | null
          semana_inicio: string
          titulo?: string | null
          updated_at?: string
        }
        Update: {
          cadastro_cliente_id?: number
          card_id?: string | null
          checklist?: Json
          created_at?: string
          created_by?: string | null
          dia_semana?: number
          id?: string
          observacoes?: string | null
          ordem?: number
          periodo?: string | null
          semana_inicio?: string
          titulo?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_plan_rows_cadastro_cliente_id_fkey"
            columns: ["cadastro_cliente_id"]
            isOneToOne: false
            referencedRelation: "cadastro_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_plan_rows_cadastro_cliente_id_fkey"
            columns: ["cadastro_cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_agency_client_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_plan_rows_cadastro_cliente_id_fkey"
            columns: ["cadastro_cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_plan_rows_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "content_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "story_plan_rows_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "vw_content_workflow_library"
            referencedColumns: ["id"]
          },
        ]
      }
      system_metadata: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
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
    }
    Views: {
      vw_agency_client_cards: {
        Row: {
          ativo: boolean | null
          avatar_url: string | null
          categoria: string | null
          created_at: string | null
          data_inicio: string | null
          email_principal: string | null
          empresa: string | null
          health_tier: string | null
          id: number | null
          nome_cliente: string | null
          observacoes: string | null
          prioridade: Database["public"]["Enums"]["agency_priority"] | null
          proxima_acao: string | null
          proxima_reuniao: string | null
          responsavel_user_id: string | null
          servicos: string[] | null
          slug: string | null
          status_operacional:
            | Database["public"]["Enums"]["agency_client_status"]
            | null
          tags: string[] | null
          telefone: string | null
          ultimo_contato: string | null
          updated_at: string | null
          valor_mensal: number | null
        }
        Insert: {
          ativo?: boolean | null
          avatar_url?: string | null
          categoria?: string | null
          created_at?: string | null
          data_inicio?: string | null
          email_principal?: string | null
          empresa?: string | null
          health_tier?: never
          id?: number | null
          nome_cliente?: string | null
          observacoes?: string | null
          prioridade?: Database["public"]["Enums"]["agency_priority"] | null
          proxima_acao?: string | null
          proxima_reuniao?: string | null
          responsavel_user_id?: string | null
          servicos?: never
          slug?: string | null
          status_operacional?:
            | Database["public"]["Enums"]["agency_client_status"]
            | null
          tags?: never
          telefone?: string | null
          ultimo_contato?: string | null
          updated_at?: string | null
          valor_mensal?: number | null
        }
        Update: {
          ativo?: boolean | null
          avatar_url?: string | null
          categoria?: string | null
          created_at?: string | null
          data_inicio?: string | null
          email_principal?: string | null
          empresa?: string | null
          health_tier?: never
          id?: number | null
          nome_cliente?: string | null
          observacoes?: string | null
          prioridade?: Database["public"]["Enums"]["agency_priority"] | null
          proxima_acao?: string | null
          proxima_reuniao?: string | null
          responsavel_user_id?: string | null
          servicos?: never
          slug?: string | null
          status_operacional?:
            | Database["public"]["Enums"]["agency_client_status"]
            | null
          tags?: never
          telefone?: string | null
          ultimo_contato?: string | null
          updated_at?: string | null
          valor_mensal?: number | null
        }
        Relationships: []
      }
      vw_agency_executive_summary: {
        Row: {
          campanhas_ativas: number | null
          campanhas_pausadas: number | null
          clientes_atencao: number | null
          clientes_ativos: number | null
          clientes_implantacao: number | null
          leads_negociacao: number | null
          leads_quentes: number | null
          projetos_andamento: number | null
          projetos_atrasados: number | null
          receita_mensal: number | null
        }
        Relationships: []
      }
      vw_agency_leads_pipeline: {
        Row: {
          cadastro_cliente_id: number | null
          converted_at: string | null
          created_at: string | null
          created_by: string | null
          empresa: string | null
          id: string | null
          interacoes_count: number | null
          kanban_ordem: number | null
          nome: string | null
          notas: string | null
          origem: Database["public"]["Enums"]["agency_lead_origem"] | null
          pipeline_stage:
            | Database["public"]["Enums"]["agency_pipeline_stage"]
            | null
          probabilidade_efetiva: number | null
          probabilidade_manual: number | null
          probabilidade_score: number | null
          proxima_acao: string | null
          proximo_contato: string | null
          responsavel_user_id: string | null
          reunioes_count: number | null
          ultima_interacao: string | null
          updated_at: string | null
          valor_estimado: number | null
        }
        Insert: {
          cadastro_cliente_id?: number | null
          converted_at?: string | null
          created_at?: string | null
          created_by?: string | null
          empresa?: string | null
          id?: string | null
          interacoes_count?: number | null
          kanban_ordem?: number | null
          nome?: string | null
          notas?: string | null
          origem?: Database["public"]["Enums"]["agency_lead_origem"] | null
          pipeline_stage?:
            | Database["public"]["Enums"]["agency_pipeline_stage"]
            | null
          probabilidade_efetiva?: never
          probabilidade_manual?: number | null
          probabilidade_score?: number | null
          proxima_acao?: string | null
          proximo_contato?: string | null
          responsavel_user_id?: string | null
          reunioes_count?: number | null
          ultima_interacao?: string | null
          updated_at?: string | null
          valor_estimado?: number | null
        }
        Update: {
          cadastro_cliente_id?: number | null
          converted_at?: string | null
          created_at?: string | null
          created_by?: string | null
          empresa?: string | null
          id?: string | null
          interacoes_count?: number | null
          kanban_ordem?: number | null
          nome?: string | null
          notas?: string | null
          origem?: Database["public"]["Enums"]["agency_lead_origem"] | null
          pipeline_stage?:
            | Database["public"]["Enums"]["agency_pipeline_stage"]
            | null
          probabilidade_efetiva?: never
          probabilidade_manual?: number | null
          probabilidade_score?: number | null
          proxima_acao?: string | null
          proximo_contato?: string | null
          responsavel_user_id?: string | null
          reunioes_count?: number | null
          ultima_interacao?: string | null
          updated_at?: string | null
          valor_estimado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "agency_leads_cadastro_cliente_id_fkey"
            columns: ["cadastro_cliente_id"]
            isOneToOne: false
            referencedRelation: "cadastro_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_leads_cadastro_cliente_id_fkey"
            columns: ["cadastro_cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_agency_client_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agency_leads_cadastro_cliente_id_fkey"
            columns: ["cadastro_cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_admin"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_clientes_admin: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          data_inicio: string | null
          email_principal: string | null
          empresa: string | null
          facebook_ad_account_id: string | null
          ga4_ativo: string | null
          ga4_property_id: string | null
          google_ads_ativo: string | null
          google_ads_customer_id: string | null
          google_business_ativo: string | null
          google_business_location_id: string | null
          id: number | null
          instagram_ativo: boolean | null
          instagram_page_id: string | null
          instagram_username: string | null
          meta_ativo: string | null
          mlabs_url: string | null
          nome_cliente: string | null
          observacoes: string | null
          qtd_acessos: number | null
          servicos: string[] | null
          slug: string | null
          telefone: string | null
          tiktok_ad_account_id: string | null
          tiktok_ativo: boolean | null
          updated_at: string | null
          valor_mensal: number | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          data_inicio?: string | null
          email_principal?: string | null
          empresa?: string | null
          facebook_ad_account_id?: string | null
          ga4_ativo?: string | null
          ga4_property_id?: string | null
          google_ads_ativo?: string | null
          google_ads_customer_id?: string | null
          google_business_ativo?: string | null
          google_business_location_id?: string | null
          id?: number | null
          instagram_ativo?: boolean | null
          instagram_page_id?: string | null
          instagram_username?: string | null
          meta_ativo?: string | null
          mlabs_url?: string | null
          nome_cliente?: string | null
          observacoes?: string | null
          qtd_acessos?: never
          servicos?: never
          slug?: string | null
          telefone?: string | null
          tiktok_ad_account_id?: string | null
          tiktok_ativo?: boolean | null
          updated_at?: string | null
          valor_mensal?: number | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          data_inicio?: string | null
          email_principal?: string | null
          empresa?: string | null
          facebook_ad_account_id?: string | null
          ga4_ativo?: string | null
          ga4_property_id?: string | null
          google_ads_ativo?: string | null
          google_ads_customer_id?: string | null
          google_business_ativo?: string | null
          google_business_location_id?: string | null
          id?: number | null
          instagram_ativo?: boolean | null
          instagram_page_id?: string | null
          instagram_username?: string | null
          meta_ativo?: string | null
          mlabs_url?: string | null
          nome_cliente?: string | null
          observacoes?: string | null
          qtd_acessos?: never
          servicos?: never
          slug?: string | null
          telefone?: string | null
          tiktok_ad_account_id?: string | null
          tiktok_ativo?: boolean | null
          updated_at?: string | null
          valor_mensal?: number | null
        }
        Relationships: []
      }
      vw_clientes_ativos: {
        Row: {
          cliente: string | null
          plataformas_ativas: string[] | null
          total_registros: number | null
          ultima_data_recebida: string | null
          ultima_ingestao: string | null
        }
        Relationships: []
      }
      vw_content_workflow_library: {
        Row: {
          ai_metadata: Json | null
          archived_at: string | null
          cadastro_cliente_id: number | null
          capa_url: string | null
          checklist: Json | null
          cliente_nome: string | null
          copy_text: string | null
          created_at: string | null
          created_by: string | null
          cta: string | null
          data_publicacao: string | null
          direcao_arte: string | null
          estrategia_id: string | null
          formato: string | null
          hora_publicacao: string | null
          id: string | null
          integration_metadata: Json | null
          kanban_ordem: number | null
          legacy_post_id: string | null
          legenda: string | null
          localizacao: string | null
          observacoes: string | null
          pilar_id: string | null
          plataforma: string | null
          published_at: string | null
          responsavel_email: string | null
          responsavel_user_id: string | null
          roteiro: string | null
          status: Database["public"]["Enums"]["content_card_status"] | null
          tags: string[] | null
          titulo: string | null
          updated_at: string | null
        }
        Insert: {
          ai_metadata?: Json | null
          archived_at?: string | null
          cadastro_cliente_id?: number | null
          capa_url?: string | null
          checklist?: Json | null
          cliente_nome?: string | null
          copy_text?: string | null
          created_at?: string | null
          created_by?: string | null
          cta?: string | null
          data_publicacao?: string | null
          direcao_arte?: string | null
          estrategia_id?: string | null
          formato?: string | null
          hora_publicacao?: string | null
          id?: string | null
          integration_metadata?: Json | null
          kanban_ordem?: number | null
          legacy_post_id?: string | null
          legenda?: string | null
          localizacao?: string | null
          observacoes?: string | null
          pilar_id?: string | null
          plataforma?: string | null
          published_at?: string | null
          responsavel_email?: string | null
          responsavel_user_id?: string | null
          roteiro?: string | null
          status?: Database["public"]["Enums"]["content_card_status"] | null
          tags?: string[] | null
          titulo?: string | null
          updated_at?: string | null
        }
        Update: {
          ai_metadata?: Json | null
          archived_at?: string | null
          cadastro_cliente_id?: number | null
          capa_url?: string | null
          checklist?: Json | null
          cliente_nome?: string | null
          copy_text?: string | null
          created_at?: string | null
          created_by?: string | null
          cta?: string | null
          data_publicacao?: string | null
          direcao_arte?: string | null
          estrategia_id?: string | null
          formato?: string | null
          hora_publicacao?: string | null
          id?: string | null
          integration_metadata?: Json | null
          kanban_ordem?: number | null
          legacy_post_id?: string | null
          legenda?: string | null
          localizacao?: string | null
          observacoes?: string | null
          pilar_id?: string | null
          plataforma?: string | null
          published_at?: string | null
          responsavel_email?: string | null
          responsavel_user_id?: string | null
          roteiro?: string | null
          status?: Database["public"]["Enums"]["content_card_status"] | null
          tags?: string[] | null
          titulo?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "content_cards_cadastro_cliente_id_fkey"
            columns: ["cadastro_cliente_id"]
            isOneToOne: false
            referencedRelation: "cadastro_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_cards_cadastro_cliente_id_fkey"
            columns: ["cadastro_cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_agency_client_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_cards_cadastro_cliente_id_fkey"
            columns: ["cadastro_cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_cards_estrategia_id_fkey"
            columns: ["estrategia_id"]
            isOneToOne: false
            referencedRelation: "plano_estrategias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_cards_pilar_id_fkey"
            columns: ["pilar_id"]
            isOneToOne: false
            referencedRelation: "editorial_pillars"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_content_workflow_ops_status: {
        Row: {
          cadastro_cliente_id: number | null
          card_count: number | null
          cliente_nome: string | null
          responsavel_email: string | null
          status: Database["public"]["Enums"]["content_card_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "content_cards_cadastro_cliente_id_fkey"
            columns: ["cadastro_cliente_id"]
            isOneToOne: false
            referencedRelation: "cadastro_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_cards_cadastro_cliente_id_fkey"
            columns: ["cadastro_cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_agency_client_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "content_cards_cadastro_cliente_id_fkey"
            columns: ["cadastro_cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_admin"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_estrategia_editorial_stats: {
        Row: {
          estrategia_id: string | null
          status: string | null
          total: number | null
        }
        Relationships: [
          {
            foreignKeyName: "content_cards_estrategia_id_fkey"
            columns: ["estrategia_id"]
            isOneToOne: false
            referencedRelation: "plano_estrategias"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_ga4_diario: {
        Row: {
          active_users: number | null
          cliente: string | null
          conversions: number | null
          data: string | null
          engaged_sessions: number | null
          engagement_rate: number | null
          event_count: number | null
          pageviews: number | null
          sessions: number | null
        }
        Relationships: []
      }
      vw_ga4_normalizada_prefer_hub: {
        Row: {
          cliente: string | null
          data: string | null
          metrica: string | null
          valor: number | null
        }
        Relationships: []
      }
      vw_google_ads_diario: {
        Row: {
          campanha: string | null
          clicks: number | null
          cliente: string | null
          cpc: number | null
          cpm: number | null
          ctr: number | null
          data: string | null
          impressions: number | null
          spend: number | null
        }
        Relationships: []
      }
      vw_google_ads_normalizada_prefer_hub: {
        Row: {
          campanha: string | null
          cliente: string | null
          data: string | null
          metrica: string | null
          valor: number | null
        }
        Relationships: []
      }
      vw_google_business_diario: {
        Row: {
          cliente: string | null
          data: string | null
          direction_requests: number | null
          messages: number | null
          phone_calls: number | null
          photo_views: number | null
          profile_views: number | null
          reviews_count: number | null
          reviews_rating: number | null
          searches: number | null
          website_clicks: number | null
        }
        Relationships: []
      }
      vw_ig_media_dashboard: {
        Row: {
          cadastro_cliente_id: number | null
          caption: string | null
          cliente_nome: string | null
          cliente_slug: string | null
          content_card_id: string | null
          id: string | null
          ig_media_id: string | null
          last_synced_at: string | null
          media_product_type: string | null
          media_type: string | null
          media_url: string | null
          metrics: Json | null
          metrics_collected_at: string | null
          permalink: string | null
          published_at: string | null
          thumbnail_storage_path: string | null
          thumbnail_url: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ig_media_cadastro_cliente_id_fkey"
            columns: ["cadastro_cliente_id"]
            isOneToOne: false
            referencedRelation: "cadastro_clientes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ig_media_cadastro_cliente_id_fkey"
            columns: ["cadastro_cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_agency_client_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ig_media_cadastro_cliente_id_fkey"
            columns: ["cadastro_cliente_id"]
            isOneToOne: false
            referencedRelation: "vw_clientes_admin"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ig_media_content_card_id_fkey"
            columns: ["content_card_id"]
            isOneToOne: false
            referencedRelation: "content_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ig_media_content_card_id_fkey"
            columns: ["content_card_id"]
            isOneToOne: false
            referencedRelation: "vw_content_workflow_library"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_instagram_diario: {
        Row: {
          accounts_engaged: number | null
          cliente: string | null
          comments: number | null
          data: string | null
          engagement_rate: number | null
          follows: number | null
          interactions: number | null
          likes: number | null
          profile_links_taps: number | null
          reach: number | null
          replies: number | null
          saves: number | null
          shares: number | null
          views: number | null
          website_clicks: number | null
        }
        Relationships: []
      }
      vw_instagram_normalizada_prefer_hub: {
        Row: {
          cliente: string | null
          data: string | null
          metrica: string | null
          valor: number | null
        }
        Relationships: []
      }
      vw_meta_ads_diario: {
        Row: {
          campanha: string | null
          clicks: number | null
          cliente: string | null
          conversions: number | null
          cpc: number | null
          cpm: number | null
          ctr: number | null
          data: string | null
          frequency: number | null
          impressions: number | null
          inline_link_clicks: number | null
          landing_page_views: number | null
          link_clicks: number | null
          post_engagements: number | null
          reach: number | null
          results: number | null
          spend: number | null
          unique_clicks: number | null
          video_views: number | null
        }
        Relationships: []
      }
      vw_meta_ads_normalizada_prefer_hub: {
        Row: {
          campanha: string | null
          cliente: string | null
          data: string | null
          metrica: string | null
          valor: number | null
        }
        Relationships: []
      }
      vw_metricas: {
        Row: {
          campanha: string | null
          cliente: string | null
          created_at: string | null
          data: string | null
          id: number | null
          metrica: string | null
          plataforma: string | null
          valor: number | null
        }
        Relationships: []
      }
      vw_metricas_normalizadas: {
        Row: {
          campanha: string | null
          cliente: string | null
          created_at: string | null
          data: string | null
          id: number | null
          metrica: string | null
          plataforma: string | null
          valor: number | null
        }
        Relationships: []
      }
      vw_overview_cliente: {
        Row: {
          cliente: string | null
          data: string | null
          ga4_conversions: number | null
          ga4_sessions: number | null
          google_conversions: number | null
          google_spend: number | null
          instagram_interactions: number | null
          instagram_reach: number | null
          meta_conversions: number | null
          meta_results: number | null
          meta_spend: number | null
          total_clicks: number | null
          total_impressions: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      access_invalidate_auth_sessions: {
        Args: { _user_id: string }
        Returns: undefined
      }
      current_user_cadastro_cliente_ids: { Args: never; Returns: number[] }
      current_user_clientes: {
        Args: never
        Returns: {
          cliente_nome: string
        }[]
      }
      ensure_owner_admin_for_user: {
        Args: { _user_id: string }
        Returns: undefined
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_platform_owner: { Args: { _user_id: string }; Returns: boolean }
      portfolio_clientes_ativos: {
        Args: never
        Returns: {
          cliente: string
          plataformas_ativas: string[]
          total_registros: number
          ultima_data_recebida: string
          ultima_ingestao: string
        }[]
      }
      portfolio_overview: {
        Args: { p_from: string; p_to: string }
        Returns: {
          cliente: string
          data: string
          ga4_conversions: number
          ga4_sessions: number
          google_spend: number
          instagram_interactions: number
          instagram_reach: number
          meta_conversions: number
          meta_results: number
          meta_spend: number
          google_conversions: number
          total_clicks: number
          total_impressions: number
        }[]
      }
      replace_hub_metric_days: {
        Args: {
          p_cliente: string
          p_dates: string[]
          p_plataforma: string
          p_rows: Json
        }
        Returns: number
      }
    }
    Enums: {
      access_lifecycle_status:
        | "invite_pending"
        | "awaiting_password"
        | "invite_expired"
        | "active"
        | "revoked"
        | "disabled"
      agency_client_status:
        | "ativo"
        | "implantacao"
        | "negociacao"
        | "pausado"
        | "atencao"
      agency_lead_origem:
        | "indicacao"
        | "inbound"
        | "outbound"
        | "site"
        | "evento"
        | "parceiro"
        | "outro"
      agency_pipeline_stage:
        | "lead"
        | "reuniao"
        | "proposta"
        | "negociacao"
        | "contrato"
        | "onboarding"
        | "cliente_ativo"
      agency_priority: "A" | "B" | "C" | "D"
      agency_project_status: "producao" | "revisao" | "finalizado"
      agency_project_type:
        | "landing"
        | "site"
        | "sistema"
        | "automacao"
        | "seo"
        | "design"
        | "outro"
      agency_task_status: "open" | "completed" | "cancelled"
      agency_timeline_event_type:
        | "client_created"
        | "client_updated"
        | "status_changed"
        | "note_added"
        | "contact_logged"
        | "meeting_scheduled"
        | "task_created"
        | "task_completed"
        | "project_created"
        | "project_moved"
        | "project_completed"
        | "lead_created"
        | "lead_converted"
        | "contract_sent"
        | "contract_signed"
        | "campaign_created"
        | "campaign_paused"
        | "payment_received"
        | "payment_overdue"
        | "report_sent"
        | "landing_published"
      app_role: "admin" | "cliente"
      content_card_event_type:
        | "created"
        | "updated"
        | "commented"
        | "moved"
        | "approval_requested"
        | "approved"
        | "rejected"
        | "published"
        | "archived"
        | "attachment_added"
        | "attachment_removed"
        | "checklist_changed"
        | "changes_requested"
        | "publish_queued"
        | "publish_succeeded"
        | "publish_failed"
        | "material_submitted"
      content_card_status:
        | "producao"
        | "edicao"
        | "aguardando_aprovacao"
        | "aprovado"
        | "publicado"
        | "arquivado"
        | "roteiro"
        | "aguardando_material"
        | "aguardando_aprovacao_final"
        | "agendado"
        | "alteracoes_roteiro"
        | "alteracoes_design"
      decisao_resultado_status: "pendente" | "positivo" | "negativo" | "neutro"
      hipotese_status: "aberta" | "em_teste" | "validada" | "invalidada"
      oportunidade_origem: "manual" | "regra" | "ia"
      ph_connection_status: "active" | "disabled"
      ph_health_status: "healthy" | "degraded" | "unhealthy" | "unknown"
      ph_homologation_report_kind:
        | "sync"
        | "comparison"
        | "coverage"
        | "health"
        | "provider"
        | "dual_run"
      ph_homologation_status:
        | "validating"
        | "blocked"
        | "ready"
        | "official_ready"
        | "make_active"
        | "make_disabled"
        | "cutover_ready"
      ph_migration_stage:
        | "make_passive"
        | "parity"
        | "dual_run"
        | "ready"
        | "official_only"
        | "make_off"
      ph_timeline_event_kind:
        | "connection_created"
        | "connection_updated"
        | "provider_changed"
        | "oauth_completed"
        | "oauth_failed"
        | "credential_updated"
        | "identity_attached"
        | "sync_started"
        | "sync_finished"
        | "sync_failed"
        | "health_changed"
        | "migration_stage_changed"
        | "diagnostic_run"
        | "reconnect"
        | "connection_disabled"
        | "connection_deleted"
      plano_evento_tipo:
        | "criacao"
        | "edicao"
        | "comentario"
        | "conclusao"
        | "mudanca_meta"
        | "mudanca_responsavel"
        | "mudanca_status"
        | "decisao"
        | "aprendizado"
        | "proposta_edicao"
      plano_item_status: "pendente" | "em_andamento" | "concluido" | "cancelado"
      plano_prioridade: "alta" | "media" | "baixa"
      plano_status: "rascunho" | "ativo" | "pausado" | "concluido" | "arquivado"
      post_revision_tipo:
        | "comentario"
        | "solicitacao_alteracao"
        | "aprovacao"
        | "mudanca_status"
        | "reprovacao"
      post_status:
        | "rascunho"
        | "em_producao"
        | "aguardando_aprovacao"
        | "aprovado"
        | "publicado"
      roadmap_marco_tipo: "inicio" | "semana" | "marco" | "conclusao"
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
      access_lifecycle_status: [
        "invite_pending",
        "awaiting_password",
        "invite_expired",
        "active",
        "revoked",
        "disabled",
      ],
      agency_client_status: [
        "ativo",
        "implantacao",
        "negociacao",
        "pausado",
        "atencao",
      ],
      agency_lead_origem: [
        "indicacao",
        "inbound",
        "outbound",
        "site",
        "evento",
        "parceiro",
        "outro",
      ],
      agency_pipeline_stage: [
        "lead",
        "reuniao",
        "proposta",
        "negociacao",
        "contrato",
        "onboarding",
        "cliente_ativo",
      ],
      agency_priority: ["A", "B", "C", "D"],
      agency_project_status: ["producao", "revisao", "finalizado"],
      agency_project_type: [
        "landing",
        "site",
        "sistema",
        "automacao",
        "seo",
        "design",
        "outro",
      ],
      agency_task_status: ["open", "completed", "cancelled"],
      agency_timeline_event_type: [
        "client_created",
        "client_updated",
        "status_changed",
        "note_added",
        "contact_logged",
        "meeting_scheduled",
        "task_created",
        "task_completed",
        "project_created",
        "project_moved",
        "project_completed",
        "lead_created",
        "lead_converted",
        "contract_sent",
        "contract_signed",
        "campaign_created",
        "campaign_paused",
        "payment_received",
        "payment_overdue",
        "report_sent",
        "landing_published",
      ],
      app_role: ["admin", "cliente"],
      content_card_event_type: [
        "created",
        "updated",
        "commented",
        "moved",
        "approval_requested",
        "approved",
        "rejected",
        "published",
        "archived",
        "attachment_added",
        "attachment_removed",
        "checklist_changed",
        "changes_requested",
        "publish_queued",
        "publish_succeeded",
        "publish_failed",
        "material_submitted",
      ],
      content_card_status: [
        "producao",
        "edicao",
        "aguardando_aprovacao",
        "aprovado",
        "publicado",
        "arquivado",
        "roteiro",
        "aguardando_material",
        "aguardando_aprovacao_final",
        "agendado",
        "alteracoes_roteiro",
        "alteracoes_design",
      ],
      decisao_resultado_status: ["pendente", "positivo", "negativo", "neutro"],
      hipotese_status: ["aberta", "em_teste", "validada", "invalidada"],
      oportunidade_origem: ["manual", "regra", "ia"],
      ph_connection_status: ["active", "disabled"],
      ph_health_status: ["healthy", "degraded", "unhealthy", "unknown"],
      ph_homologation_report_kind: [
        "sync",
        "comparison",
        "coverage",
        "health",
        "provider",
        "dual_run",
      ],
      ph_homologation_status: [
        "validating",
        "blocked",
        "ready",
        "official_ready",
        "make_active",
        "make_disabled",
        "cutover_ready",
      ],
      ph_migration_stage: [
        "make_passive",
        "parity",
        "dual_run",
        "ready",
        "official_only",
        "make_off",
      ],
      ph_timeline_event_kind: [
        "connection_created",
        "connection_updated",
        "provider_changed",
        "oauth_completed",
        "oauth_failed",
        "credential_updated",
        "identity_attached",
        "sync_started",
        "sync_finished",
        "sync_failed",
        "health_changed",
        "migration_stage_changed",
        "diagnostic_run",
        "reconnect",
        "connection_disabled",
        "connection_deleted",
      ],
      plano_evento_tipo: [
        "criacao",
        "edicao",
        "comentario",
        "conclusao",
        "mudanca_meta",
        "mudanca_responsavel",
        "mudanca_status",
        "decisao",
        "aprendizado",
        "proposta_edicao",
      ],
      plano_item_status: ["pendente", "em_andamento", "concluido", "cancelado"],
      plano_prioridade: ["alta", "media", "baixa"],
      plano_status: ["rascunho", "ativo", "pausado", "concluido", "arquivado"],
      post_revision_tipo: [
        "comentario",
        "solicitacao_alteracao",
        "aprovacao",
        "mudanca_status",
        "reprovacao",
      ],
      post_status: [
        "rascunho",
        "em_producao",
        "aguardando_aprovacao",
        "aprovado",
        "publicado",
      ],
      roadmap_marco_tipo: ["inicio", "semana", "marco", "conclusao"],
    },
  },
} as const
