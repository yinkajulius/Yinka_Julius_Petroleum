export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      expenses: {
        Row: {
          amount: number
          category: string | null
          created_at: string | null
          created_by: string | null
          description: string
          expense_date: string
          id: string
          station_id: string
        }
        Insert: {
          amount: number
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description: string
          expense_date?: string
          id?: string
          station_id: string
        }
        Update: {
          amount?: number
          category?: string | null
          created_at?: string | null
          created_by?: string | null
          description?: string
          expense_date?: string
          id?: string
          station_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      fuel_records: {
        Row: {
          closing_stock: number
          created_at: string | null
          created_by: string | null
          id: string
          input_mode: string
          meter_closing: number | null
          meter_opening: number | null
          opening_stock: number
          price_per_litre: number | null
          product_type: string | null
          pump_id: string
          record_date: string
          sales_volume: number
          station_code: string
          total_sales: number | null
        }
        Insert: {
          closing_stock: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          input_mode: string
          meter_closing?: number | null
          meter_opening?: number | null
          opening_stock: number
          price_per_litre?: number | null
          product_type?: string | null
          pump_id: string
          record_date: string
          sales_volume: number
          station_code: string
          total_sales?: number | null
        }
        Update: {
          closing_stock?: number
          created_at?: string | null
          created_by?: string | null
          id?: string
          input_mode?: string
          meter_closing?: number | null
          meter_opening?: number | null
          opening_stock?: number
          price_per_litre?: number | null
          product_type?: string | null
          pump_id?: string
          record_date?: string
          sales_volume?: number
          station_code?: string
          total_sales?: number | null
        }
        Relationships: []
      }
      monthly_stock: {
        Row: {
          actual_closing_stock: number | null
          created_at: string | null
          excess: number | null
          id: string
          month_year: string
          opening_stock: number
          product_type: string
          station_id: string
        }
        Insert: {
          actual_closing_stock?: number | null
          created_at?: string | null
          excess?: number | null
          id?: string
          month_year: string
          opening_stock?: number
          product_type: string
          station_id: string
        }
        Update: {
          actual_closing_stock?: number | null
          created_at?: string | null
          excess?: number | null
          id?: string
          month_year?: string
          opening_stock?: number
          product_type?: string
          station_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "monthly_stock_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_prices: {
        Row: {
          created_at: string | null
          effective_date: string
          id: string
          price_per_litre: number
          product_type: string
        }
        Insert: {
          created_at?: string | null
          effective_date?: string
          id?: string
          price_per_litre: number
          product_type: string
        }
        Update: {
          created_at?: string | null
          effective_date?: string
          id?: string
          price_per_litre?: number
          product_type?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          full_name: string | null
          id: string
          role: string
        }
        Insert: {
          full_name?: string | null
          id: string
          role?: string
        }
        Update: {
          full_name?: string | null
          id?: string
          role?: string
        }
        Relationships: []
      }
      pumps: {
        Row: {
          created_at: string | null
          id: string
          product_type: string
          pump_number: number
          station_id: string
          tank_id: string
          capacity: number
        }
        Insert: {
          created_at?: string | null
          id: string
          product_type: string
          pump_number: number
          station_id: string
          tank_id: string
          capacity?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          product_type?: string
          pump_number?: number
          station_id?: string
          tank_id?: string
          capacity?: number
        }
        Relationships: [
          {
            foreignKeyName: "pumps_station_id_fkey"
            columns: ["station_id"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          },
        ]
      }
      stations: {
        Row: {
          created_at: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          id: string
          name: string
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      user_stations: {
        Row: {
          created_at: string | null
          id: number
          station_code: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: never
          station_code: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: never
          station_code?: string
          user_id?: string | null
        }
        Relationships: []
      }
      tank_capacities: {
        Row: {
          id: string;
          station_code: string;
          product_type: string;
          capacity: number;
          created_at: string;
          updated_at: string;
        }
        Insert: {
          id?: string;
          station_code: string;
          product_type: string;
          capacity: number;
          created_at?: string;
          updated_at?: string;
        }
        Update: {
          id?: string;
          station_code?: string;
          product_type?: string;
          capacity?: number;
          created_at?: string;
          updated_at?: string;
        }
        Relationships: [
          {
            foreignKeyName: "tank_capacities_station_code_fkey"
            columns: ["station_code"]
            isOneToOne: false
            referencedRelation: "stations"
            referencedColumns: ["id"]
          }
        ]
      }
      staff: {
        Row: {
          id: string;
          station_id: string;
          name: string;
          position: string;
          phone: string | null;
          social_media: any | null;
          picture: string | null;
          date_of_employment: string | null;
          birthday: string | null;
          inserted_at: string | null;
          updated_at: string | null;
        };
        Insert: {
          id?: string;
          station_id: string;
          name: string;
          position: string;
          phone?: string | null;
          social_media?: any | null;
          picture?: string | null;
          date_of_employment?: string | null;
          birthday?: string | null;
          inserted_at?: string | null;
          updated_at?: string | null;
        };
        Update: {
          id?: string;
          station_id?: string;
          name?: string;
          position?: string;
          phone?: string | null;
          social_media?: any | null;
          picture?: string | null;
          date_of_employment?: string | null;
          birthday?: string | null;
          inserted_at?: string | null;
          updated_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "staff_station_id_fkey";
            columns: ["station_id"];
            isOneToOne: false;
            referencedRelation: "stations";
            referencedColumns: ["id"];
          }
        ];
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
