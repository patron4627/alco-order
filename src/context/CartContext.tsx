import React, { createContext, useContext, useState, ReactNode } from 'react'
import { CartItem, MenuItem } from '../types'

interface CartContextType {
  items: CartItem[]
  addToCart: (item: MenuItem) => void
  removeFromCart: (itemId: string) => void
  updateQuantity: (itemId: string, quantity: number) => void
  clearCart: () => void
  getTotalPrice: () => number
  getTotalItems: () => number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export const useCart = () => {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error('useCart must be used within a CartProvider')
  }
  return context
}

interface CartProviderProps {
  children: ReactNode
}

export const CartProvider: React.FC<CartProviderProps> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([])

  const addToCart = (item: MenuItem) => {
    setItems(prev => {
      // Erstelle eine eindeutige ID basierend auf Item + Optionen
      const itemKey = `${item.id}-${JSON.stringify(item.selectedOptions || [])}`
      
      const existingItem = prev.find(cartItem => {
        const cartItemKey = `${cartItem.id}-${JSON.stringify(cartItem.selectedOptions || [])}`
        return cartItemKey === itemKey
      })
      
      if (existingItem) {
        return prev.map(cartItem => {
          const cartItemKey = `${cartItem.id}-${JSON.stringify(cartItem.selectedOptions || [])}`
          return cartItemKey === itemKey
            ? { ...cartItem, quantity: cartItem.quantity + 1 }
            : cartItem
        })
      }
      
      // Erstelle neues Cart Item mit eindeutiger ID
      const newCartItem: CartItem = {
        ...item,
        id: itemKey, // Verwende eindeutige ID
        quantity: 1,
        selectedOptions: item.selectedOptions
      }
      
      return [...prev, newCartItem]
    })
  }

  const removeFromCart = (itemId: string) => {
    setItems(prev => prev.filter(item => item.id !== itemId))
  }

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId)
      return
    }
    setItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, quantity } : item
      )
    )
  }

  const clearCart = () => {
    setItems([])
  }

  const getTotalPrice = () => {
    return items.reduce((total, item) => total + (item.price * item.quantity), 0)
  }

  const getTotalItems = () => {
    return items.reduce((total, item) => total + item.quantity, 0)
  }

  return (
    <CartContext.Provider value={{
      items,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      getTotalPrice,
      getTotalItems
    }}>
      {children}
    </CartContext.Provider>
  )
}