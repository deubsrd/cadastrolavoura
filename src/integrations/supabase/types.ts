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
      app_role: ["admin", "franqueado"],
      tipo_socio: ["administrador", "cotista"],
    },
  },
} as const
