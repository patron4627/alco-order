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
      case 'ready': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusText = (status: Order['status']) => {
    switch (status) {
      case 'pending': return 'Neu'
      case 'confirmed': return 'Bestätigt'
      case 'ready': return 'Bereit'
      case 'completed': return 'Abgeholt'
      default: return status
    }
  }

  const handleStatusUpdate = async (newStatus: Order['status']) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
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
      case 'confirmed': return 'ready'
      case 'ready': return 'completed'
      default: return null
    }
  }

  const getNextStatusText = (currentStatus: Order['status']) => {
    switch (currentStatus) {
      case 'pending': return 'Bestätigen'
      case 'confirmed': return 'Als bereit markieren'
      case 'ready': return 'Als abgeholt markieren'
      default: return null
    }
  }

  const nextStatus = getNextStatus(order.status)
  const nextStatusText = getNextStatusText(order.status)

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
      <div className="flex justify-between items-start mb-4">
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

      <div className="space-y-3 mb-4">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <User className="w-4 h-4" />
          <span>{order.customer_name}</span>
        </div>
        
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Phone className="w-4 h-4" />
          <span>{order.customer_phone}</span>
        </div>
        
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <Clock className="w-4 h-4" />
          <span>Abholung: {formatTime(order.pickup_time)}</span>
        </div>
      </div>

      <div className="border-t pt-4 mb-4">
        <h4 className="font-medium text-gray-900 mb-2">Bestellte Artikel:</h4>
        <div className="space-y-1">
          {order.items.map((item, index) => (
            <div key={index} className="flex justify-between text-sm">
              <span>{item.quantity}x {item.name}</span>
              <span>{(item.price * item.quantity).toFixed(2)}€</span>
            </div>
          ))}
        </div>
      </div>

      {order.notes && (
        <div className="border-t pt-4 mb-4">
          <h4 className="font-medium text-gray-900 mb-1">Notizen:</h4>
          <p className="text-sm text-gray-600">{order.notes}</p>
        </div>
      )}

      {nextStatus && nextStatusText && (
        <div className="border-t pt-4">
          <button
            onClick={() => handleStatusUpdate(nextStatus)}
            className="w-full flex items-center justify-center space-x-2 bg-orange-500 hover:bg-orange-600 text-white py-2 px-4 rounded-lg font-medium transition-colors"
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