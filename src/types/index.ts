export interface MenuOption {
  name: string
  price: number
}

export interface MenuItem {
  id: string
  name: string
  description: string
  price: number
  category: string
  image_url?: string
  available: boolean
  options?: MenuOption[]
}

export interface CartItem extends MenuItem {
  quantity: number
  selectedOptions?: MenuOption[]
}

export interface Order {
  id: string
  customer_name: string
  customer_phone: string
  pickup_time: string
  status: 'pending' | 'confirmed' | 'ready' | 'completed'
  total_amount: number
  items: CartItem[]
  notes?: string
  created_at: string
  // Zeitstempel, wann die Bestellung bereit sein soll (optional)
  ready_at?: string
}

export interface OrderItem {
  id: string
  name: string
  price: number
  quantity: number
  options?: MenuOption[]
}