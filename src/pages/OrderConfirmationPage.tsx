import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CheckCircle, Clock, Phone, User, Home } from 'lucide-react'
import { Order } from '../types'
import { supabase } from '../lib/supabase'
import OrderTimer from '../components/OrderTimer'
import { webPushService } from '../lib/webPushService'

const OrderConfirmationPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [showTimer, setShowTimer] = useState(true)

  useEffect(() => {
    if (orderId) {
      initializeWebPush()
      fetchOrder()
      setupRealtimeConnection()
    }
  }, [orderId])

  const initializeWebPush = async () => {
    console.log('📱 Initializing Web Push for customer...')
    
    try {
      await webPushService.initialize()
      console.log('✅ Web Push ready for customer')
    } catch (error) {
      console.error('❌ Failed to initialize Web Push:', error)
    }
  }

  const setupRealtimeConnection = () => {
    if (!orderId) return

    console.log('🔄 OrderConfirmation: Setting up optimized realtime connection for:', orderId)
    
    // Eindeutiger Channel-Name für diese Bestellung
    const channelName = `order-confirmation-${orderId}-${Date.now()}`
    
    const channel = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: false },
          presence: { key: `customer-${orderId}` },
          private: false
        }
      })
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`
        },
        async (payload) => {
          console.log('🔔 OrderConfirmation: Order update received:', payload)
          
          const updatedOrder = payload.new as Order
          console.log('📋 Updated order status:', updatedOrder.status)
          
          // Sofort Order State aktualisieren
          setOrder(updatedOrder)
          
          // Timer ausblenden wenn bestätigt
          if (updatedOrder.status !== 'pending') {
            console.log('✅ Order confirmed! Hiding timer...')
            setShowTimer(false)
            
            // Web Push Notification für Bestätigung
            try {
              await webPushService.sendOrderConfirmationNotification(orderId)
              console.log('✅ Push notification sent for order confirmation')
            } catch (error) {
              console.error('❌ Failed to send push notification:', error)
            }
            
            // Bestätigungston
            playConfirmationSound()
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 OrderConfirmation subscription status:', status)
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Customer successfully subscribed to order updates')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ OrderConfirmation: Channel error, retrying...')
          // Automatisch nach 2 Sekunden neu verbinden
          setTimeout(() => {
            console.log('🔄 Customer attempting to reconnect...')
            setupRealtimeConnection()
          }, 2000)
        } else if (status === 'TIMED_OUT') {
          console.error('⏰ OrderConfirmation: Channel timed out')
        }
      })

    return () => {
      console.log('🔌 OrderConfirmation: Unsubscribing')
      supabase.removeChannel(channel)
    }
  }

  const fetchOrder = async () => {
    if (!orderId) return

    try {
      console.log('📥 Fetching order:', orderId)
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('id', orderId)
        .single()

      if (error) {
        console.error('❌ Error fetching order:', error)
        throw error
      }
      
      console.log('✅ Order fetched:', data)
      setOrder(data)
      
      // Timer nur anzeigen wenn Status noch pending ist
      if (data.status !== 'pending') {
        setShowTimer(false)
      }
    } catch (error) {
      console.error('Error fetching order:', error)
    } finally {
      setLoading(false)
    }
  }

  const playConfirmationSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      // Freudiger Bestätigungston
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime)
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.1)
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.2)
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.3)
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.5)
    } catch (error) {
      console.log('Could not play confirmation sound:', error)
    }
  }

  const formatTime = (timeString: string) => {
    const date = new Date(timeString)
    return date.toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusMessage = (status: Order['status']) => {
    switch (status) {
      case 'pending':
        return {
          title: 'Bestellung eingegangen!',
          message: 'Ihre Bestellung wird bearbeitet. Sie erhalten automatisch eine Bestätigung.',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100'
        }
      case 'confirmed':
        return {
          title: '🎉 Bestellung bestätigt!',
          message: 'Ihre Bestellung wird zubereitet und ist pünktlich zur Abholzeit fertig.',
          color: 'text-blue-600',
          bgColor: 'bg-blue-100'
        }
      case 'ready':
        return {
          title: '✅ Bestellung ist bereit!',
          message: 'Ihre Bestellung ist fertig und kann abgeholt werden.',
          color: 'text-green-600',
          bgColor: 'bg-green-100'
        }
      case 'completed':
        return {
          title: '👍 Bestellung abgeholt!',
          message: 'Vielen Dank für Ihren Besuch. Wir freuen uns auf Ihren nächsten Besuch!',
          color: 'text-gray-600',
          bgColor: 'bg-gray-100'
        }
      default:
        return {
          title: 'Bestellung eingegangen!',
          message: 'Ihre Bestellung wird bearbeitet.',
          color: 'text-gray-600',
          bgColor: 'bg-gray-100'
        }
    }
  }

  const handleConfirmation = () => {
    setShowTimer(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Bestellung wird geladen...</p>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Bestellung nicht gefunden</h1>
          <p className="text-gray-600 mb-6">Die angegebene Bestellung existiert nicht.</p>
          <button
            onClick={() => navigate('/')}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Zur Startseite
          </button>
        </div>
      </div>
    )
  }

  const statusInfo = getStatusMessage(order.status)

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full ${statusInfo.bgColor} mb-4`}>
            <CheckCircle className={`w-8 h-8 ${statusInfo.color}`} />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {statusInfo.title}
          </h1>
          <p className="text-gray-600">
            {statusInfo.message}
          </p>
        </div>

        {/* Timer Component - nur anzeigen wenn Status pending ist */}
        {showTimer && order.status === 'pending' && orderId && (
          <div className="mb-8">
            <OrderTimer 
              orderId={orderId} 
              onConfirmation={handleConfirmation}
            />
          </div>
        )}

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Bestelldetails</h2>
              <div className="space-y-3">
                <div className="flex items-center space-x-2 text-sm">
                  <User className="w-4 h-4 text-gray-500" />
                  <span>{order.customer_name}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <Phone className="w-4 h-4 text-gray-500" />
                  <span>{order.customer_phone}</span>
                </div>
                <div className="flex items-center space-x-2 text-sm">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span>Abholung: {formatTime(order.pickup_time)}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Bestellnummer</h3>
              <div className="bg-gray-100 rounded-lg p-4">
                <p className="text-2xl font-mono font-bold text-center">
                  #{order.id.slice(-6).toUpperCase()}
                </p>
                <p className="text-sm text-gray-600 text-center mt-1">
                  Bestellung vom {formatTime(order.created_at)}
                </p>
              </div>
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Ihre Artikel</h3>
            <div className="space-y-3">
              {order.items.map((item, index) => (
                <div key={index} className="flex justify-between items-start">
                  <div className="flex-1">
                    <span className="font-medium">{item.quantity}x {item.name}</span>
                    {item.selectedOptions && item.selectedOptions.length > 0 && (
                      <div className="text-sm text-gray-600 ml-4 mt-1">
                        {item.selectedOptions.map((option, optIndex) => (
                          <div key={optIndex} className="flex justify-between">
                            <span>+ {option.name}</span>
                            <span>+{option.price.toFixed(2)}€</span>
                          </div>
                        ))}
                      </div>
                    )}
                    <span className="text-sm text-gray-600 block">
                      {item.price.toFixed(2)}€ pro Stück
                    </span>
                  </div>
                  <span className="font-medium">
                    {(item.price * item.quantity).toFixed(2)}€
                  </span>
                </div>
              ))}
            </div>
            <div className="border-t mt-4 pt-4">
              <div className="flex justify-between items-center text-xl font-bold">
                <span>Gesamtsumme:</span>
                <span>{order.total_amount.toFixed(2)}€</span>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Barzahlung bei Abholung
              </p>
            </div>
          </div>

          {order.notes && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Ihre Notizen</h3>
              <p className="text-gray-600">{order.notes}</p>
            </div>
          )}
        </div>

        <div className="text-center">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center space-x-2 bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            <Home className="w-4 h-4" />
            <span>Zurück zur Startseite</span>
          </button>
        </div>
      </div>
    </div>
  )
}

export default OrderConfirmationPage