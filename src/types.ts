export interface Order {
  id: string
  customer_name: string
  customer_phone: string
  total_amount: number
  status: 'pending' | 'confirmed' | 'ready' | 'completed'
  created_at: string
  items: {
    id: string
    name: string
    price: number
    quantity: number
    options?: {
      name: string
      price: number
    }[]
  }[]
  notes?: string
}

export interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  category: string
  image_url: string
  available: boolean
  options?: MenuOption[]
}

export interface MenuOption {
  name: string
  price: number
}

export interface CartItem extends MenuItem {
  quantity: number
  selectedOptions?: MenuOption[]
}

export interface Database {
  public: {
    Tables: {
      menu_items: {
        Row: MenuItem
      }
      orders: {
        Row: Order
      }
    }
  }
}

export interface RealtimePayload {
  eventType: string
  new: Order
  old?: Order
}

export interface RealtimeChannelStatus {
  status: string
  channel: string
  error?: string
}
