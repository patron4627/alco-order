import React, { useState } from 'react'
import { Plus, Minus } from 'lucide-react'
import { MenuItem, MenuOption } from '../types'
import { useCart } from '../context/CartContext'

interface MenuCardProps {
  item: MenuItem
}

const MenuCard: React.FC<MenuCardProps> = ({ item }) => {
  const { addToCart } = useCart()
  const [showOptions, setShowOptions] = useState(false)
  const [selectedOptions, setSelectedOptions] = useState<MenuOption[]>([])
  const [quantity, setQuantity] = useState(1)

  const hasOptions = item.options && item.options.length > 0

  const handleOptionToggle = (option: MenuOption) => {
    setSelectedOptions(prev => {
      const exists = prev.find(opt => opt.name === option.name)
      if (exists) {
        return prev.filter(opt => opt.name !== option.name)
      } else {
        return [...prev, option]
      }
    })
  }

  const getTotalPrice = () => {
    const basePrice = item.price
    const optionsPrice = selectedOptions.reduce((sum, option) => sum + option.price, 0)
    return (basePrice + optionsPrice) * quantity
  }

  const handleAddToCart = () => {
    const cartItem = {
      ...item,
      selectedOptions: selectedOptions.length > 0 ? selectedOptions : undefined,
      price: item.price + selectedOptions.reduce((sum, option) => sum + option.price, 0)
    }

    for (let i = 0; i < quantity; i++) {
      addToCart(cartItem)
    }

    // Reset form
    setSelectedOptions([])
    setQuantity(1)
    setShowOptions(false)
  }

  const handleQuickAdd = () => {
    if (hasOptions) {
      setShowOptions(true)
    } else {
      addToCart(item)
    }
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
        {item.image_url && (
          <div className="h-48 bg-gray-200 overflow-hidden">
            <img 
              src={item.image_url} 
              alt={item.name}
              className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
            />
          </div>
        )}
        
        <div className="p-4">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
              {item.name}
            </h3>
            <span className="text-lg font-bold text-orange-500 ml-2">
              {item.price.toFixed(2)}€
            </span>
          </div>
          
          <p className="text-gray-600 text-sm mb-4 line-clamp-2">
            {item.description}
          </p>

          {hasOptions && (
            <div className="mb-4">
              <p className="text-sm text-gray-500">
                {item.options!.length} Optionen verfügbar
              </p>
            </div>
          )}
          
          <button
            onClick={handleQuickAdd}
            disabled={!item.available}
            className={`w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-lg font-medium transition-colors ${
              item.available
                ? 'bg-orange-500 hover:bg-orange-600 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>
              {item.available 
                ? hasOptions 
                  ? 'Optionen wählen' 
                  : 'In den Warenkorb'
                : 'Nicht verfügbar'
              }
            </span>
          </button>
        </div>
      </div>

      {/* Options Modal */}
      {showOptions && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{item.name}</h3>
                  <p className="text-gray-600 text-sm">{item.description}</p>
                </div>
                <button
                  onClick={() => setShowOptions(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              {/* Quantity Selector */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Anzahl
                </label>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <Minus className="w-4 h-4 text-gray-600" />
                  </button>
                  <span className="text-lg font-medium w-8 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <Plus className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>

              {/* Options */}
              {hasOptions && (
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Optionen wählen
                  </label>
                  <div className="space-y-2">
                    {item.options!.map((option, index) => (
                      <label key={index} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedOptions.some(opt => opt.name === option.name)}
                          onChange={() => handleOptionToggle(option)}
                          className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                        />
                        <div className="flex-1 flex justify-between">
                          <span className="text-sm font-medium text-gray-900">{option.name}</span>
                          <span className="text-sm text-gray-600">+{option.price.toFixed(2)}€</span>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Total Price */}
              <div className="border-t pt-4 mb-6">
                <div className="flex justify-between items-center text-lg font-semibold">
                  <span>Gesamtpreis:</span>
                  <span className="text-orange-500">{getTotalPrice().toFixed(2)}€</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowOptions(false)}
                  className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleAddToCart}
                  className="flex-1 py-3 px-4 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium transition-colors"
                >
                  In den Warenkorb
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default MenuCard