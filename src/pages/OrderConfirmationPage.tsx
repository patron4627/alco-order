import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Order } from '../types'
import { playNotificationSound } from '../utils/audio'
import { User, Phone, Clock, Home } from 'lucide-react'
import OrderTimer from '../components/OrderTimer'

interface CartItem {
  name: string
  quantity: number
  price: number
}

interface ExtendedOrder extends Order {
  time_to_ready?: number
}

const OrderConfirmationPage: React.FC = () => {
  const [order, setOrder] = useState<ExtendedOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [showTimer, setShowTimer] = useState(false)
  const [timeToReady, setTimeToReady] = useState(10 * 60) // 10 Minuten in Sekunden
  const [error, setError] = useState<string | null>(null)
  const [orderChannel, setOrderChannel] = useState<any>(null)
  const [notificationChannel, setNotificationChannel] = useState<any>(null)
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()

  useEffect(() => {
    if (!orderId) {
      navigate('/home')
      return
    }

    const fetchOrder = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single()

        if (error) {
          console.error('Error fetching order:', error)
          throw error
        }
        
        if (!data) {
          console.error('Order not found:', orderId)
          throw new Error('Bestellung nicht gefunden')
        }

        setOrder(data as ExtendedOrder)
        setShowTimer(true)
      } catch (err) {
        console.error('Error in fetchOrder:', err)
        setError(err instanceof Error ? err.message : 'Fehler beim Laden der Bestellung')
      } finally {
        setLoading(false)
      }
    }

    fetchOrder()
  }, [orderId, navigate])

  useEffect(() => {
    if (!order) return

    // Cleanup existing subscriptions
    if (orderChannel) {
      try {
        orderChannel.unsubscribe()
      } catch (error) {
        console.error('Error unsubscribing from order channel:', error)
      }
      setOrderChannel(null)
    }
    if (notificationChannel) {
      try {
        notificationChannel.unsubscribe()
      } catch (error) {
        console.error('Error unsubscribing from notification channel:', error)
      }
      setNotificationChannel(null)
    }

    // Create new subscriptions only if we don't have active ones
    if (!orderChannel && !notificationChannel) {
      const newOrderChannel = supabase
        .channel('order-updates')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${order.id}`
        }, (payload) => {
          const updatedOrder = payload.new as ExtendedOrder
          setOrder(updatedOrder)
          if (updatedOrder.status === 'confirmed') {
            playNotificationSound()
          }
        })
        .subscribe()

      const newNotificationChannel = supabase
        .channel('notifications')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `order_id=eq.${order.id}`
        }, (payload) => {
          const notification = payload.new
          if (notification && !notification.read) {
            // Mark notification as read
            supabase
              .from('notifications')
              .update({ read: true })
              .eq('id', notification.id)
              .catch(error => console.error('Error marking notification as read:', error))

            // Show notification to customer
            alert(notification.message)
          }
        })
        .subscribe()

      // Store references for cleanup
      setOrderChannel(newOrderChannel)
      setNotificationChannel(newNotificationChannel)
    }

    return () => {
      // Cleanup subscriptions on unmount
      if (orderChannel) {
        try {
          orderChannel.unsubscribe()
        } catch (error) {
          console.error('Error unsubscribing from order channel:', error)
        }
        setOrderChannel(null)
      }
      if (notificationChannel) {
        try {
          notificationChannel.unsubscribe()
        } catch (error) {
          console.error('Error unsubscribing from notification channel:', error)
        }
        setNotificationChannel(null)
      }
    }
  }, [order])

  const handleConfirmation = async () => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'completed' })
        .eq('id', order.id)

      if (error) throw error
      setOrder(prev => prev ? { ...prev, status: 'completed' } : null)
      
      // Send confirmation notification
      await supabase
        .from('notifications')
        .insert({
          order_id: order.id,
          message: 'Ihre Bestellung wurde als abgeholt markiert.',
          type: 'order_status'
        })
        .then(({ error }) => {
          if (error) {
            console.error('Error sending confirmation notification:', error)
          }
        })
    } catch (err) {
      setError(err as Error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Lade Bestellung...</p>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mt-4"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-6 bg-white rounded-lg shadow-md">
          <div className="mb-4">
            <p className="text-red-500 font-semibold mb-2">Fehler beim Laden der Bestellung</p>
            <p className="text-gray-600 text-sm">{error}</p>
          </div>
          <button
            onClick={() => {
              setError(null)
              setLoading(true)
              fetchOrder()
            }}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 mr-2"
          >
            Neu laden
          </button>
          <button
            onClick={() => navigate('/home')}
            className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
          >
            Zurück zur Startseite
          </button>
        </div>
      </div>
    )
  }

  if (!order) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              Bestellbestätigung
            </h1>
            <p className="text-gray-600">
              Deine Bestellung wurde erfolgreich aufgenommen!
            </p>
          </div>

          <div className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded">
                <div className="flex items-center space-x-2 mb-2">
                  <User className="w-5 h-5 text-gray-400" />
                  <span className="font-medium">Name:</span>
                </div>
                <p className="text-gray-600">{order.customer_name}</p>
              </div>

              <div className="bg-gray-50 p-4 rounded">
                <div className="flex items-center space-x-2 mb-2">
                  <Phone className="w-5 h-5 text-gray-400" />
                  <span className="font-medium">Telefon:</span>
                </div>
                <p className="text-gray-600">{order.customer_phone}</p>
              </div>

              <div className="col-span-2 bg-gray-50 p-4 rounded">
                <div className="flex items-center space-x-2 mb-2">
                  <Clock className="w-5 h-5 text-gray-400" />
                  <span className="font-medium">Bestellzeit:</span>
                </div>
                <p className="text-gray-600">
                  {new Date(order.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {showTimer && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Bereitstellungszeit:</h2>
              <OrderTimer timeToReady={timeToReady} orderId={order.id} />
            </div>
          )}

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Bestellstatus:</h2>
            <div className="bg-gray-50 p-4 rounded">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600">Aktueller Status:</p>
                  <p className="text-xl font-bold">
                    {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                  </p>
                </div>
                {order.status === 'ready' && (
                  <button
                    onClick={handleConfirmation}
                    className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Bestellung abholbereit
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4">Bestellübersicht:</h2>
            <div className="bg-gray-50 p-4 rounded">
              {order.items.map((item: CartItem, index: number) => (
                <div key={index} className="flex justify-between text-sm mb-2">
                  <span>{item.quantity}x {item.name}</span>
                  <span>{(item.price * item.quantity).toFixed(2)}€</span>
                </div>
              ))}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex justify-between font-semibold">
                  <span>Gesamtsumme:</span>
                  <span>{order.total_amount.toFixed(2)}€</span>
                </div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <button
              onClick={() => navigate('/home')}
              className="px-6 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              <Home className="w-4 h-4 inline-block mr-2" />
              Zurück zur Startseite
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OrderConfirmationPage