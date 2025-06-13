import React from 'react'
import { ShoppingBag, Users } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { useNavigate, useLocation } from 'react-router-dom'

const Header: React.FC = () => {
  const { getTotalItems } = useCart()
  const navigate = useNavigate()
  const location = useLocation()
  const totalItems = getTotalItems()

  const isAdmin = location.pathname.startsWith('/admin')

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div 
            className="flex items-center space-x-2 cursor-pointer"
            onClick={() => navigate('/')}
          >
            <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">R</span>
            </div>
            <h1 className="text-xl font-bold text-gray-900">
              Restaurant
            </h1>
          </div>

          <div className="flex items-center space-x-4">
            {!isAdmin && (
              <button
                onClick={() => navigate('/cart')}
                className="relative p-2 text-gray-600 hover:text-orange-500 transition-colors"
              >
                <ShoppingBag className="w-6 h-6" />
                {totalItems > 0 && (
                  <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </button>
            )}

            <button
              onClick={() => navigate(isAdmin ? '/' : '/admin')}
              className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-600 hover:text-orange-500 transition-colors"
            >
              <Users className="w-4 h-4" />
              <span>{isAdmin ? 'Kunden' : 'Admin'}</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header