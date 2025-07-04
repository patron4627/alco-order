import React from 'react'
import { Clock, Phone, User, CheckCircle, AlertCircle } from 'lucide-react'
import { Order } from '../types'
import { supabase } from '../lib/supabase'

interface OrderCardProps {
  order: Order
  onStatusUpdate?: (orderId: string, status: Order['status']) => void
}

const OrderCard: React.FC<OrderCardProps> = ({ order, onStatusUpdate }) => {
  const formatTime = (timeString: string) => {
    const date = new Date(timeString)
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'confirmed': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: Order['status']) => {
    switch (status) {
      case 'pending': return 'Neu'
      case 'confirmed': return 'Bestätigt'
      case 'completed': return 'Abgeholt'
      default: return status
    }
  }

  const handleStatusUpdate = async (newStatus: Order['status']) => {
    try {
      const updateData: any = { status: newStatus }

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', order.id)

      if (error) throw error
      
      if (onStatusUpdate) {
        onStatusUpdate(order.id, newStatus)
      }
    } catch (error) {
      console.error('Error updating order status:', error)
    }
  }

  const getNextStatus = (currentStatus: Order['status']) => {
    switch (currentStatus) {
      case 'pending': return 'confirmed'
      case 'confirmed': return 'completed'
      default: return null
    }
  }

  const getNextStatusText = (currentStatus: Order['status']) => {
    switch (currentStatus) {
      case 'pending': return 'Bestätigen'
      case 'confirmed': return 'Als abgeholt markieren'
      default: return null
    }
  }

  const nextStatus = getNextStatus(order.status)
  const nextStatusText = getNextStatusText(order.status)

  return (
    <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 border-l-4 border-orange-500">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-4 space-y-2 sm:space-y-0">
        <div className="flex items-center space-x-2">
          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
            {getStatusText(order.status)}
          </span>
          <span className="text-sm text-gray-500">
            #{order.id.slice(-6)}
          </span>
        </div>
        <span className="text-lg font-bold text-gray-900">
          {order.total_amount.toFixed(2)}€
        </span>
      </div>

      <div className="space-y-2 sm:space-y-3 mb-4">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <User className="w-4 h-4 flex-shrink-0" />
          <span className="break-words">{order.customer_name}</span>
        </div>
        
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Phone className="w-4 h-4 flex-shrink-0" />
          <span className="break-all">{order.customer_phone}</span>
        </div>
        
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Clock className="w-4 h-4 flex-shrink-0" />
          <span>Abholung: {formatTime(order.pickup_time)}</span>
        </div>
      </div>

      <div className="border-t pt-4 mb-4">
        <h4 className="font-medium text-gray-900 mb-2">Bestellte Artikel:</h4>
        <div className="space-y-2">
          {order.items.map((item, index) => (
            <div key={index} className="text-sm">
              <div className="flex justify-between items-start">
                <span className="font-medium flex-1 pr-2">{item.quantity}x {item.name}</span>
                <span className="flex-shrink-0">{(item.price * item.quantity).toFixed(2)}€</span>
              </div>
              {/* Zeige gewählte Optionen an */}
              {item.selectedOptions && item.selectedOptions.length > 0 && (
                <div className="ml-4 mt-1 space-y-1">
                  {item.selectedOptions.map((option, optIndex) => (
                    <div key={optIndex} className="flex justify-between text-xs text-gray-600">
                      <span className="flex-1 pr-2">+ {option.name}</span>
                      <span className="flex-shrink-0">+{option.price.toFixed(2)}€</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {order.notes && (
        <div className="border-t pt-4 mb-4">
          <h4 className="font-medium text-gray-900 mb-1">Notizen:</h4>
          <p className="text-sm text-gray-600 break-words">{order.notes}</p>
        </div>
      )}

      {nextStatus && nextStatusText && (
        <div className="border-t pt-4">
          <button
            onClick={() => handleStatusUpdate(nextStatus)}
            className="w-full flex items-center justify-center space-x-2 bg-orange-500 hover:bg-orange-600 text-white py-3 px-4 rounded-lg font-medium transition-colors touch-manipulation"
          >
            <CheckCircle className="w-4 h-4" />
            <span>{nextStatusText}</span>
          </button>
        </div>
      )}

      <div className="text-xs text-gray-500 mt-2">
        Bestellt: {formatTime(order.created_at)}
      </div>
    </div>
  )
}

export default OrderCard