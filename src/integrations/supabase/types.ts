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
      camisa_pedido_itens: {
        Row: {
          genero: string
          id: string
          pedido_id: string
          quantidade: number
          tamanho: string
        }
        Insert: {
          genero?: string
          id?: string
          pedido_id: string
          quantidade: number
          tamanho: string
        }
        Update: {
          genero?: string
          id?: string
          pedido_id?: string
          quantidade?: number
          tamanho?: string
        }
        Relationships: [
          {
            foreignKeyName: "camisa_pedido_itens_pedido_id_fkey"
            columns: ["pedido_id"]
            isOneToOne: false
            referencedRelation: "camisa_pedidos"
            referencedColumns: ["id"]
          },
        ]
      }
      camisa_pedidos: {
        Row: {
          created_at: string
          id: string
          observacoes: string | null
          socio_id: string
          status: string
          unidade_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          observacoes?: string | null
          socio_id: string
          status?: string
          unidade_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          observacoes?: string | null
          socio_id?: string
          status?: string
          unidade_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "camisa_pedidos_socio_id_fkey"
            columns: ["socio_id"]
            isOneToOne: false
            referencedRelation: "socios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "camisa_pedidos_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conhecimento: {
        Row: {
          created_at: string
          id: string
          pergunta: string
          resposta: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          pergunta: string
          resposta: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          pergunta?: string
          resposta?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_duvidas_pendentes: {
        Row: {
          created_at: string
          id: string
          pergunta: string
          respondida_em: string | null
          resposta: string | null
          socio_id: string | null
          status: string
          unidade_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          pergunta: string
          respondida_em?: string | null
          resposta?: string | null
          socio_id?: string | null
          status?: string
          unidade_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          pergunta?: string
          respondida_em?: string | null
          resposta?: string | null
          socio_id?: string | null
          status?: string
          unidade_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "chat_duvidas_pendentes_socio_id_fkey"
            columns: ["socio_id"]
            isOneToOne: false
            referencedRelation: "socios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_duvidas_pendentes_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      financeiro_mensal: {
        Row: {
          created_at: string
          created_by: string | null
          custom_items: Json
          data: Json
          id: string
          label: string
          month: number
          removed_items: Json
          unidade_id: string
          updated_at: string
          year: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          custom_items?: Json
          data?: Json
          id?: string
          label: string
          month: number
          removed_items?: Json
          unidade_id: string
          updated_at?: string
          year: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          custom_items?: Json
          data?: Json
          id?: string
          label?: string
          month?: number
          removed_items?: Json
          unidade_id?: string
          updated_at?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "financeiro_mensal_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      generated_posts: {
        Row: {
          briefing_id: string
          caption: string | null
          created_at: string
          hashtags: string[] | null
          headline: string | null
          id: string
          image_path: string | null
          image_url: string | null
          pillar: string | null
          socio_id: string
          status: string
          updated_at: string
        }
        Insert: {
          briefing_id: string
          caption?: string | null
          created_at?: string
          hashtags?: string[] | null
          headline?: string | null
          id?: string
          image_path?: string | null
          image_url?: string | null
          pillar?: string | null
          socio_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          briefing_id?: string
          caption?: string | null
          created_at?: string
          hashtags?: string[] | null
          headline?: string | null
          id?: string
          image_path?: string | null
          image_url?: string | null
          pillar?: string | null
          socio_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "generated_posts_briefing_id_fkey"
            columns: ["briefing_id"]
            isOneToOne: false
            referencedRelation: "post_briefings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "generated_posts_socio_id_fkey"
            columns: ["socio_id"]
            isOneToOne: false
            referencedRelation: "socios"
            referencedColumns: ["id"]
          },
        ]
      }
      jornada_etapas: {
        Row: {
          descricao: string | null
          id: string
          nome: string
          numero: number
          ordem: number
          video_url: string | null
        }
        Insert: {
          descricao?: string | null
          id?: string
          nome: string
          numero: number
          ordem?: number
          video_url?: string | null
        }
        Update: {
          descricao?: string | null
          id?: string
          nome?: string
          numero?: number
          ordem?: number
          video_url?: string | null
        }
        Relationships: []
      }
      jornada_progresso: {
        Row: {
          concluido: boolean
          concluido_em: string | null
          id: string
          subitem_id: string
          unidade_id: string
        }
        Insert: {
          concluido?: boolean
          concluido_em?: string | null
          id?: string
          subitem_id: string
          unidade_id: string
        }
        Update: {
          concluido?: boolean
          concluido_em?: string | null
          id?: string
          subitem_id?: string
          unidade_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jornada_progresso_subitem_id_fkey"
            columns: ["subitem_id"]
            isOneToOne: false
            referencedRelation: "jornada_subitens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jornada_progresso_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      jornada_subitens: {
        Row: {
          etapa_id: string
          id: string
          ordem: number
          texto: string
        }
        Insert: {
          etapa_id: string
          id?: string
          ordem?: number
          texto: string
        }
        Update: {
          etapa_id?: string
          id?: string
          ordem?: number
          texto?: string
        }
        Relationships: [
          {
            foreignKeyName: "jornada_subitens_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "jornada_etapas"
            referencedColumns: ["id"]
          },
        ]
      }
      marketing_calendario: {
        Row: {
          created_at: string
          id: string
          mes: string
          pilar: string
          post_id: string | null
          socio_id: string
          status: string
          tema: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          mes: string
          pilar: string
          post_id?: string | null
          socio_id: string
          status?: string
          tema: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          mes?: string
          pilar?: string
          post_id?: string | null
          socio_id?: string
          status?: string
          tema?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "marketing_calendario_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "generated_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "marketing_calendario_socio_id_fkey"
            columns: ["socio_id"]
            isOneToOne: false
            referencedRelation: "socios"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_checklist_itens: {
        Row: {
          categoria: string
          created_at: string
          foto_url: string | null
          id: string
          item: string
          link_compra: string | null
          observacao: string | null
          ordem: number
          quantidade_sugerida: string | null
          status: string
          unidade_id: string
          updated_at: string
        }
        Insert: {
          categoria: string
          created_at?: string
          foto_url?: string | null
          id?: string
          item: string
          link_compra?: string | null
          observacao?: string | null
          ordem?: number
          quantidade_sugerida?: string | null
          status?: string
          unidade_id: string
          updated_at?: string
        }
        Update: {
          categoria?: string
          created_at?: string
          foto_url?: string | null
          id?: string
          item?: string
          link_compra?: string | null
          observacao?: string | null
          ordem?: number
          quantidade_sugerida?: string | null
          status?: string
          unidade_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "obra_checklist_itens_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_gastos: {
        Row: {
          categoria: string
          created_at: string
          descricao: string
          id: string
          ordem: number
          quantidade: string | null
          unidade_id: string
          updated_at: string
          valor_pago: number | null
          valor_previsto: number | null
        }
        Insert: {
          categoria: string
          created_at?: string
          descricao: string
          id?: string
          ordem?: number
          quantidade?: string | null
          unidade_id: string
          updated_at?: string
          valor_pago?: number | null
          valor_previsto?: number | null
        }
        Update: {
          categoria?: string
          created_at?: string
          descricao?: string
          id?: string
          ordem?: number
          quantidade?: string | null
          unidade_id?: string
          updated_at?: string
          valor_pago?: number | null
          valor_previsto?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "obra_gastos_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      obra_itens_biblioteca: {
        Row: {
          categoria: string
          created_at: string
          id: string
          item: string
          link_compra: string | null
          observacao: string | null
          quantidade_sugerida: string | null
        }
        Insert: {
          categoria: string
          created_at?: string
          id?: string
          item: string
          link_compra?: string | null
          observacao?: string | null
          quantidade_sugerida?: string | null
        }
        Update: {
          categoria?: string
          created_at?: string
          id?: string
          item?: string
          link_compra?: string | null
          observacao?: string | null
          quantidade_sugerida?: string | null
        }
        Relationships: []
      }
      post_briefings: {
        Row: {
          briefing_text: string
          created_at: string
          id: string
          photo_url: string | null
          pillar: string | null
          socio_id: string
          status: string
        }
        Insert: {
          briefing_text: string
          created_at?: string
          id?: string
          photo_url?: string | null
          pillar?: string | null
          socio_id: string
          status?: string
        }
        Update: {
          briefing_text?: string
          created_at?: string
          id?: string
          photo_url?: string | null
          pillar?: string | null
          socio_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_briefings_socio_id_fkey"
            columns: ["socio_id"]
            isOneToOne: false
            referencedRelation: "socios"
            referencedColumns: ["id"]
          },
        ]
      }
      post_caption_versions: {
        Row: {
          caption: string
          created_at: string
          hashtags: string[] | null
          headline: string | null
          id: string
          post_id: string
          version: number
        }
        Insert: {
          caption: string
          created_at?: string
          hashtags?: string[] | null
          headline?: string | null
          id?: string
          post_id: string
          version: number
        }
        Update: {
          caption?: string
          created_at?: string
          hashtags?: string[] | null
          headline?: string | null
          id?: string
          post_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "post_caption_versions_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "generated_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      sdr_config: {
        Row: {
          base_conhecimento: string
          cidades_plano: string
          closer_email: string | null
          ia_ligada: boolean
          id: boolean
          instrucoes: string
          mensagem_abertura: string
          sdr_whatsapp: string | null
          updated_at: string
        }
        Insert: {
          base_conhecimento?: string
          cidades_plano?: string
          closer_email?: string | null
          ia_ligada?: boolean
          id?: boolean
          instrucoes?: string
          mensagem_abertura?: string
          sdr_whatsapp?: string | null
          updated_at?: string
        }
        Update: {
          base_conhecimento?: string
          cidades_plano?: string
          closer_email?: string | null
          ia_ligada?: boolean
          id?: boolean
          instrucoes?: string
          mensagem_abertura?: string
          sdr_whatsapp?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sdr_leads: {
        Row: {
          anuncio: Json | null
          bairro: string | null
          cidade: string | null
          created_at: string
          entrou_em: string
          etapa: string
          faixa: string | null
          ia_ativa: boolean
          id: string
          last_inbound_at: string | null
          last_message_at: string | null
          last_message_preview: string | null
          motivo_humano: string | null
          motivo_perda: string | null
          nome: string | null
          nome_perfil: string | null
          nota: number | null
          observacoes: string | null
          opt_out: boolean
          origem: string
          precisa_humano: boolean
          primeiro_contato_em: string | null
          qualificado_em: string | null
          respostas: Json
          unread: number
          updated_at: string
          wa_id: string
        }
        Insert: {
          anuncio?: Json | null
          bairro?: string | null
          cidade?: string | null
          created_at?: string
          entrou_em?: string
          etapa?: string
          faixa?: string | null
          ia_ativa?: boolean
          id?: string
          last_inbound_at?: string | null
          last_message_at?: string | null
          last_message_preview?: string | null
          motivo_humano?: string | null
          motivo_perda?: string | null
          nome?: string | null
          nome_perfil?: string | null
          nota?: number | null
          observacoes?: string | null
          opt_out?: boolean
          origem?: string
          precisa_humano?: boolean
          primeiro_contato_em?: string | null
          qualificado_em?: string | null
          respostas?: Json
          unread?: number
          updated_at?: string
          wa_id: string
        }
        Update: {
          anuncio?: Json | null
          bairro?: string | null
          cidade?: string | null
          created_at?: string
          entrou_em?: string
          etapa?: string
          faixa?: string | null
          ia_ativa?: boolean
          id?: string
          last_inbound_at?: string | null
          last_message_at?: string | null
          last_message_preview?: string | null
          motivo_humano?: string | null
          motivo_perda?: string | null
          nome?: string | null
          nome_perfil?: string | null
          nota?: number | null
          observacoes?: string | null
          opt_out?: boolean
          origem?: string
          precisa_humano?: boolean
          primeiro_contato_em?: string | null
          qualificado_em?: string | null
          respostas?: Json
          unread?: number
          updated_at?: string
          wa_id?: string
        }
        Relationships: []
      }
      sdr_messages: {
        Row: {
          body: string | null
          created_at: string
          direction: string
          error: string | null
          id: string
          lead_id: string
          payload: Json | null
          sent_by: string
          status: string | null
          type: string
          wa_message_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string
          direction: string
          error?: string | null
          id?: string
          lead_id: string
          payload?: Json | null
          sent_by: string
          status?: string | null
          type?: string
          wa_message_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string
          direction?: string
          error?: string | null
          id?: string
          lead_id?: string
          payload?: Json | null
          sent_by?: string
          status?: string | null
          type?: string
          wa_message_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sdr_messages_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "sdr_leads"
            referencedColumns: ["id"]
          },
        ]
      }
      socio_app_state: {
        Row: {
          socio_id: string
          tour_completo: boolean
          ultima_atualizacao_vista_em: string | null
          updated_at: string
        }
        Insert: {
          socio_id: string
          tour_completo?: boolean
          ultima_atualizacao_vista_em?: string | null
          updated_at?: string
        }
        Update: {
          socio_id?: string
          tour_completo?: boolean
          ultima_atualizacao_vista_em?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "socio_app_state_socio_id_fkey"
            columns: ["socio_id"]
            isOneToOne: true
            referencedRelation: "socios"
            referencedColumns: ["id"]
          },
        ]
      }
      socios: {
        Row: {
          bairro: string
          cep: string
          cidade: string
          cpf: string
          created_at: string
          data_nascimento: string
          documento_cpf_path: string | null
          documento_identidade_path: string | null
          email: string
          estado_civil: string
          id: string
          logradouro: string
          nacionalidade: string
          nome_completo: string
          numero_casa: string
          numero_unidade: string
          profissao: string | null
          rg: string
          rg_orgao: string
          telefone: string
          tipo: Database["public"]["Enums"]["tipo_socio"]
          uf: string
          unidade_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          bairro: string
          cep: string
          cidade: string
          cpf: string
          created_at?: string
          data_nascimento: string
          documento_cpf_path?: string | null
          documento_identidade_path?: string | null
          email: string
          estado_civil: string
          id?: string
          logradouro: string
          nacionalidade: string
          nome_completo: string
          numero_casa: string
          numero_unidade: string
          profissao?: string | null
          rg: string
          rg_orgao: string
          telefone: string
          tipo: Database["public"]["Enums"]["tipo_socio"]
          uf: string
          unidade_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          bairro?: string
          cep?: string
          cidade?: string
          cpf?: string
          created_at?: string
          data_nascimento?: string
          documento_cpf_path?: string | null
          documento_identidade_path?: string | null
          email?: string
          estado_civil?: string
          id?: string
          logradouro?: string
          nacionalidade?: string
          nome_completo?: string
          numero_casa?: string
          numero_unidade?: string
          profissao?: string | null
          rg?: string
          rg_orgao?: string
          telefone?: string
          tipo?: Database["public"]["Enums"]["tipo_socio"]
          uf?: string
          unidade_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "socios_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_channel_secrets: {
        Row: {
          access_token: string
          channel_id: string
          ig_user_id: string | null
          ig_username: string | null
          page_id: string | null
          updated_at: string
        }
        Insert: {
          access_token: string
          channel_id: string
          ig_user_id?: string | null
          ig_username?: string | null
          page_id?: string | null
          updated_at?: string
        }
        Update: {
          access_token?: string
          channel_id?: string
          ig_user_id?: string | null
          ig_username?: string | null
          page_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ss_channel_secrets_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: true
            referencedRelation: "ss_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_channels: {
        Row: {
          avatar_url: string | null
          created_at: string
          external_id: string
          id: string
          kind: string
          name: string | null
          status: string
          timezone: string
          token_expires_at: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          external_id: string
          id?: string
          kind?: string
          name?: string | null
          status?: string
          timezone?: string
          token_expires_at?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          external_id?: string
          id?: string
          kind?: string
          name?: string | null
          status?: string
          timezone?: string
          token_expires_at?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      ss_consultor: {
        Row: {
          ativo: boolean
          id: boolean
          igsid: string | null
          status: string
          ultima_mensagem_em: string | null
          ultimo_envio_em: string | null
          ultimo_erro: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          ativo?: boolean
          id?: boolean
          igsid?: string | null
          status?: string
          ultima_mensagem_em?: string | null
          ultimo_envio_em?: string | null
          ultimo_erro?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          ativo?: boolean
          id?: boolean
          igsid?: string | null
          status?: string
          ultima_mensagem_em?: string | null
          ultimo_envio_em?: string | null
          ultimo_erro?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: []
      }
      ss_consultor_fila: {
        Row: {
          created_at: string
          enviada_em: string | null
          id: string
          status: string
          tentativas: number
          texto: string
          ultimo_erro: string | null
        }
        Insert: {
          created_at?: string
          enviada_em?: string | null
          id?: string
          status?: string
          tentativas?: number
          texto: string
          ultimo_erro?: string | null
        }
        Update: {
          created_at?: string
          enviada_em?: string | null
          id?: string
          status?: string
          tentativas?: number
          texto?: string
          ultimo_erro?: string | null
        }
        Relationships: []
      }
      ss_contact_tags: {
        Row: {
          contact_id: string
          created_at: string
          tag_id: string
        }
        Insert: {
          contact_id: string
          created_at?: string
          tag_id: string
        }
        Update: {
          contact_id?: string
          created_at?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ss_contact_tags_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "ss_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ss_contact_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "ss_tags"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_contacts: {
        Row: {
          automation_paused_until: string | null
          avatar_url: string | null
          blocked: boolean
          channel_id: string
          created_at: string
          email: string | null
          external_id: string
          fields: Json
          follows_business: boolean | null
          id: string
          last_inbound_at: string | null
          last_interaction_at: string | null
          name: string | null
          score: number
          updated_at: string
          username: string | null
          whatsapp: string | null
        }
        Insert: {
          automation_paused_until?: string | null
          avatar_url?: string | null
          blocked?: boolean
          channel_id: string
          created_at?: string
          email?: string | null
          external_id: string
          fields?: Json
          follows_business?: boolean | null
          id?: string
          last_inbound_at?: string | null
          last_interaction_at?: string | null
          name?: string | null
          score?: number
          updated_at?: string
          username?: string | null
          whatsapp?: string | null
        }
        Update: {
          automation_paused_until?: string | null
          avatar_url?: string | null
          blocked?: boolean
          channel_id?: string
          created_at?: string
          email?: string | null
          external_id?: string
          fields?: Json
          follows_business?: boolean | null
          id?: string
          last_inbound_at?: string | null
          last_interaction_at?: string | null
          name?: string | null
          score?: number
          updated_at?: string
          username?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ss_contacts_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "ss_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_conversations: {
        Row: {
          channel_id: string
          column_id: string | null
          contact_id: string
          created_at: string
          id: string
          last_message_at: string | null
          last_message_preview: string | null
          starred: boolean
          status: string
          unread: number
        }
        Insert: {
          channel_id: string
          column_id?: string | null
          contact_id: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          starred?: boolean
          status?: string
          unread?: number
        }
        Update: {
          channel_id?: string
          column_id?: string | null
          contact_id?: string
          created_at?: string
          id?: string
          last_message_at?: string | null
          last_message_preview?: string | null
          starred?: boolean
          status?: string
          unread?: number
        }
        Relationships: [
          {
            foreignKeyName: "ss_conversations_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "ss_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ss_conversations_column_id_fkey"
            columns: ["column_id"]
            isOneToOne: false
            referencedRelation: "ss_inbox_columns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ss_conversations_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "ss_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_custom_fields: {
        Row: {
          created_at: string
          id: string
          key: string
          label: string
          type: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          label: string
          type?: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          label?: string
          type?: string
        }
        Relationships: []
      }
      ss_events: {
        Row: {
          channel_id: string
          contact_id: string | null
          created_at: string
          external_id: string
          id: string
          kind: string
          media_id: string | null
          payload: Json
          sentiment: string | null
          text: string | null
        }
        Insert: {
          channel_id: string
          contact_id?: string | null
          created_at?: string
          external_id: string
          id?: string
          kind: string
          media_id?: string | null
          payload?: Json
          sentiment?: string | null
          text?: string | null
        }
        Update: {
          channel_id?: string
          contact_id?: string | null
          created_at?: string
          external_id?: string
          id?: string
          kind?: string
          media_id?: string | null
          payload?: Json
          sentiment?: string | null
          text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ss_events_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "ss_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ss_events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "ss_contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_folders: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      ss_ice_breakers: {
        Row: {
          created_at: string
          id: string
          position: number
          question: string
          workflow_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          position?: number
          question: string
          workflow_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          position?: number
          question?: string
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ss_ice_breakers_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "ss_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_inbox_columns: {
        Row: {
          color: string
          created_at: string
          criteria: string
          id: string
          name: string
          position: number
        }
        Insert: {
          color?: string
          created_at?: string
          criteria?: string
          id?: string
          name: string
          position?: number
        }
        Update: {
          color?: string
          created_at?: string
          criteria?: string
          id?: string
          name?: string
          position?: number
        }
        Relationships: []
      }
      ss_link_clicks: {
        Row: {
          created_at: string
          id: string
          link_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          link_id: string
        }
        Update: {
          created_at?: string
          id?: string
          link_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ss_link_clicks_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "ss_links"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_links: {
        Row: {
          code: string
          contact_id: string | null
          created_at: string
          id: string
          run_id: string | null
          url: string
          workflow_id: string | null
        }
        Insert: {
          code?: string
          contact_id?: string | null
          created_at?: string
          id?: string
          run_id?: string | null
          url: string
          workflow_id?: string | null
        }
        Update: {
          code?: string
          contact_id?: string | null
          created_at?: string
          id?: string
          run_id?: string | null
          url?: string
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ss_links_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "ss_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ss_links_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "ss_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_messages: {
        Row: {
          content: Json
          conversation_id: string
          created_at: string
          direction: string
          error: string | null
          external_id: string | null
          id: string
          sent_by: string
          workflow_id: string | null
        }
        Insert: {
          content: Json
          conversation_id: string
          created_at?: string
          direction: string
          error?: string | null
          external_id?: string | null
          id?: string
          sent_by?: string
          workflow_id?: string | null
        }
        Update: {
          content?: Json
          conversation_id?: string
          created_at?: string
          direction?: string
          error?: string | null
          external_id?: string | null
          id?: string
          sent_by?: string
          workflow_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ss_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "ss_conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ss_messages_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "ss_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_reply_lists: {
        Row: {
          created_at: string
          id: string
          name: string
          replies: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          replies?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          replies?: string[]
          updated_at?: string
        }
        Relationships: []
      }
      ss_runs: {
        Row: {
          contact_id: string
          context: Json
          created_at: string
          current_node: string | null
          error: string | null
          event_id: string | null
          id: string
          resume_at: string | null
          status: string
          steps: number
          updated_at: string
          workflow_id: string
        }
        Insert: {
          contact_id: string
          context?: Json
          created_at?: string
          current_node?: string | null
          error?: string | null
          event_id?: string | null
          id?: string
          resume_at?: string | null
          status?: string
          steps?: number
          updated_at?: string
          workflow_id: string
        }
        Update: {
          contact_id?: string
          context?: Json
          created_at?: string
          current_node?: string | null
          error?: string | null
          event_id?: string | null
          id?: string
          resume_at?: string | null
          status?: string
          steps?: number
          updated_at?: string
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ss_runs_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "ss_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ss_runs_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "ss_workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      ss_settings: {
        Row: {
          ai_tone: string
          blocked_words: string[]
          id: boolean
          minutes_saved_per_reply: number
          score_points: Json
          updated_at: string
        }
        Insert: {
          ai_tone?: string
          blocked_words?: string[]
          id?: boolean
          minutes_saved_per_reply?: number
          score_points?: Json
          updated_at?: string
        }
        Update: {
          ai_tone?: string
          blocked_words?: string[]
          id?: boolean
          minutes_saved_per_reply?: number
          score_points?: Json
          updated_at?: string
        }
        Relationships: []
      }
      ss_shortcuts: {
        Row: {
          created_at: string
          id: string
          shortcut: string
          text: string
        }
        Insert: {
          created_at?: string
          id?: string
          shortcut: string
          text: string
        }
        Update: {
          created_at?: string
          id?: string
          shortcut?: string
          text?: string
        }
        Relationships: []
      }
      ss_tags: {
        Row: {
          color: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          color?: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      ss_templates: {
        Row: {
          category: string
          created_at: string
          description: string | null
          graph: Json
          id: string
          name: string
        }
        Insert: {
          category?: string
          created_at?: string
          description?: string | null
          graph: Json
          id?: string
          name: string
        }
        Update: {
          category?: string
          created_at?: string
          description?: string | null
          graph?: Json
          id?: string
          name?: string
        }
        Relationships: []
      }
      ss_variables: {
        Row: {
          created_at: string
          id: string
          key: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          value?: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          value?: string
        }
        Relationships: []
      }
      ss_workflows: {
        Row: {
          created_at: string
          folder_id: string | null
          graph: Json
          id: string
          name: string
          published_at: string | null
          runs_count: number
          status: string
          trigger_types: string[]
          updated_at: string
        }
        Insert: {
          created_at?: string
          folder_id?: string | null
          graph?: Json
          id?: string
          name?: string
          published_at?: string | null
          runs_count?: number
          status?: string
          trigger_types?: string[]
          updated_at?: string
        }
        Update: {
          created_at?: string
          folder_id?: string | null
          graph?: Json
          id?: string
          name?: string
          published_at?: string | null
          runs_count?: number
          status?: string
          trigger_types?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ss_workflows_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "ss_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      unidade_documentos: {
        Row: {
          arquivado: boolean
          created_at: string
          data_vencimento: string | null
          id: string
          mime_type: string | null
          nome: string
          storage_path: string
          substituido_por: string | null
          tamanho_bytes: number | null
          tipo: string
          unidade_id: string
          updated_at: string
          versao: number
        }
        Insert: {
          arquivado?: boolean
          created_at?: string
          data_vencimento?: string | null
          id?: string
          mime_type?: string | null
          nome: string
          storage_path: string
          substituido_por?: string | null
          tamanho_bytes?: number | null
          tipo: string
          unidade_id: string
          updated_at?: string
          versao?: number
        }
        Update: {
          arquivado?: boolean
          created_at?: string
          data_vencimento?: string | null
          id?: string
          mime_type?: string | null
          nome?: string
          storage_path?: string
          substituido_por?: string | null
          tamanho_bytes?: number | null
          tipo?: string
          unidade_id?: string
          updated_at?: string
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "unidade_documentos_substituido_por_fkey"
            columns: ["substituido_por"]
            isOneToOne: false
            referencedRelation: "unidade_documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "unidade_documentos_unidade_id_fkey"
            columns: ["unidade_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      unidades: {
        Row: {
          ativo: boolean
          cnpj: string | null
          created_at: string
          endereco: string | null
          id: string
          link_projeto_3d: string | null
          nome: string | null
          numero: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cnpj?: string | null
          created_at?: string
          endereco?: string | null
          id?: string
          link_projeto_3d?: string | null
          nome?: string | null
          numero: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cnpj?: string | null
          created_at?: string
          endereco?: string | null
          id?: string
          link_projeto_3d?: string | null
          nome?: string | null
          numero?: string
          updated_at?: string
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
      [_ in never]: never
    }
    Functions: {
      get_my_unidade_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      popular_gastos_padrao: {
        Args: { p_unidade_id: string }
        Returns: undefined
      }
      ss_dashboard: { Args: { _from: string; _to: string }; Returns: Json }
    }
    Enums: {
      app_role: "admin" | "franqueado"
      tipo_socio: "administrador" | "cotista"
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
      app_role: ["admin", "franqueado"],
      tipo_socio: ["administrador", "cotista"],
    },
  },
} as const
