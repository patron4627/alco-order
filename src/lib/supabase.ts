import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      menu_items: {
        Row: {
          id: string
          name: string
          description: string
          price: number
          category: string
          image_url: string | null
          available: boolean
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          description: string
          price: number
          category: string
          image_url?: string | null
          available?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string
          price?: number
          category?: string
          image_url?: string | null
          available?: boolean
          created_at?: string
        }
      }
      orders: {
        Row: {
          id: string
          customer_name: string
          customer_phone: string
          pickup_time: string
          status: 'pending' | 'confirmed' | 'ready' | 'completed'
          total_amount: number
          items: any[]
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          customer_name: string
          customer_phone: string
          pickup_time: string
          status?: 'pending' | 'confirmed' | 'ready' | 'completed'
          total_amount: number
          items: any[]
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          customer_name?: string
          customer_phone?: string
          pickup_time?: string
          status?: 'pending' | 'confirmed' | 'ready' | 'completed'
          total_amount?: number
          items?: any[]
          notes?: string | null
          created_at?: string
        }
      }
    }
  }
}