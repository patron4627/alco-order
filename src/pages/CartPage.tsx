import React from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ShoppingBag } from 'lucide-react'
import { useCart } from '../context/CartContext'
import CartItem from '../components/CartItem'

const CartPage: React.FC = () => {
  const navigate = useNavigate()
  const { items, getTotalPrice, getTotalItems } = useCart()

  const totalPrice = getTotalPrice()
  const totalItems = getTotalItems()

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center mb-6">
            <button
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Zurück zum Menü</span>
            </button>
          </div>

          <div className="text-center py-12">
            <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
              Ihr Warenkorb ist leer
            </h2>
            <p className="text-gray-600 mb-6">
              Fügen Sie Artikel aus unserem Menü hinzu
            </p>
            <button
              onClick={() => navigate('/')}
              className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Menü anzeigen
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Zurück zum Menü</span>
          </button>
          
          <h1 className="text-2xl font-bold text-gray-900">
            Warenkorb ({totalItems} Artikel)
          </h1>
        </div>

        <div className="space-y-4 mb-8">
          {items.map((item) => (
            <CartItem key={item.id} item={item} />
          ))}
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center text-xl font-bold text-gray-900 mb-6">
            <span>Gesamtsumme:</span>
            <span>{totalPrice.toFixed(2)}€</span>
          </div>

          <button
            onClick={() => navigate('/checkout')}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white py-3 px-6 rounded-lg font-medium text-lg transition-colors"
          >
            Zur Kasse
          </button>
        </div>
      </div>
    </div>
  )
}

export default CartPage