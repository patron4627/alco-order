import React from 'react'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { CartItem as CartItemType } from '../types'
import { useCart } from '../context/CartContext'

interface CartItemProps {
  item: CartItemType
}

const CartItem: React.FC<CartItemProps> = ({ item }) => {
  const { updateQuantity, removeFromCart } = useCart()

  return (
    <div className="flex items-center space-x-4 bg-white p-4 rounded-lg shadow-sm">
      {item.image_url && (
        <img 
          src={item.image_url} 
          alt={item.name}
          className="w-16 h-16 object-cover rounded-lg"
        />
      )}
      
      <div className="flex-1">
        <h3 className="font-semibold text-gray-900">{item.name}</h3>
        <p className="text-sm text-gray-600">{item.price.toFixed(2)}€</p>
      </div>
      
      <div className="flex items-center space-x-2">
        <button
          onClick={() => updateQuantity(item.id, item.quantity - 1)}
          className="p-1 rounded-full hover:bg-gray-100 transition-colors"
        >
          <Minus className="w-4 h-4 text-gray-600" />
        </button>
        
        <span className="w-8 text-center font-medium">{item.quantity}</span>
        
        <button
          onClick={() => updateQuantity(item.id, item.quantity + 1)}
          className="p-1 rounded-full hover:bg-gray-100 transition-colors"
        >
          <Plus className="w-4 h-4 text-gray-600" />
        </button>
      </div>
      
      <button
        onClick={() => removeFromCart(item.id)}
        className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
      >
        <Trash2 className="w-4 h-4" />
      </button>
      
      <div className="text-right">
        <p className="font-semibold text-gray-900">
          {(item.price * item.quantity).toFixed(2)}€
        </p>
      </div>
    </div>
  )
}

export default CartItem