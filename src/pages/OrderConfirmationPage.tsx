import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Order } from '../types'
import { playNotificationSound } from '../utils/audio'

interface CartItem {
  name: string
  quantity: number
  price: number
}

interface ExtendedOrder extends Order {
  time_to_ready?: number
}

const OrderConfirmationPage = () => {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState<ExtendedOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showTimer, setShowTimer] = useState(false)

  const fetchOrder = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()

      if (error) throw error
      
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

  useEffect(() => {
    if (!orderId) return
    fetchOrder()
  }, [orderId, navigate])

  useEffect(() => {
    let orderChannel: any = null
    let notificationChannel: any = null

    if (!order) return

    try {
      // Cleanup existing subscriptions
      if (orderChannel) {
        orderChannel.unsubscribe()
      }
      if (notificationChannel) {
        notificationChannel.unsubscribe()
      }

      // Create new subscriptions
      orderChannel = supabase
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

      notificationChannel = supabase
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

      return () => {
        // Cleanup subscriptions on unmount
        if (orderChannel) {
          try {
            orderChannel.unsubscribe()
          } catch (error) {
            console.error('Error unsubscribing from order channel:', error)
          }
        }
        if (notificationChannel) {
          try {
            notificationChannel.unsubscribe()
          } catch (error) {
            console.error('Error unsubscribing from notification channel:', error)
          }
        }
      }
    } catch (error) {
      console.error('Error setting up subscriptions:', error)
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
          message: 'Ihre Bestellung wurde erfolgreich abgeschlossen.',
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

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Bestellung nicht gefunden</p>
          <button
            onClick={() => navigate('/home')}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Zurück zur Startseite
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h1 className="text-2xl font-bold mb-4">Bestellbestätigung</h1>
          
          <div className="mb-6">
            <p className="text-gray-600">Bestellnummer: {order.id}</p>
            <p className="text-gray-600">Bestelldatum: {new Date(order.pickup_time).toLocaleString()}</p>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Bestellpositionen</h2>
            <div className="space-y-2">
              {order.items.map((item, index) => (
                <div key={index} className="flex justify-between items-center">
                  <span>{item.name}</span>
                  <span>{item.quantity} x {item.price.toFixed(2)}€</span>
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