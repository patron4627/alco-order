import React, { useState, useEffect, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CheckCircle, Clock, Phone, User, Home } from 'lucide-react'
import { Order } from '../types'
import { supabase } from '../lib/supabase'
import OrderTimer from '../components/OrderTimer'

const OrderConfirmationPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [showTimer, setShowTimer] = useState(true)
  const [timeToReady, setTimeToReady] = useState<number | null>(null)

  // iOS-kompatibles Audioelement
  const audioRef = useRef<HTMLAudioElement | null>(null)

  // Beim ersten Rendern Audiodatei laden
  useEffect(() => {
    audioRef.current = new Audio('/notification.mp3')
  }, [])

  useEffect(() => {
    if (orderId) {
      const fetchOrder = async () => {
        if (!orderId) return null
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single()
        if (!error && data) {
          setOrder(data as Order)
          setLoading(false)
          return data as Order
        }
        return null
      }

      // Ref für Polling-Interval damit wir ihn stoppen können
      const pollRef: { current: ReturnType<typeof setInterval> | null } = { current: null }

      // Hilfsfunktion zum Start/Stop Polling anhand Order-Status
      const startOrStopPolling = (status: Order['status']) => {
        if (status === 'pending') {
          if (!pollRef.current) {
            pollRef.current = setInterval(fetchOrder, 7000)
          }
        } else if (pollRef.current) {
          clearInterval(pollRef.current)
          pollRef.current = null
        }
      }

      // Initial fetch & Poll-Entscheidung
      fetchOrder().then((initial) => {
        if (initial) startOrStopPolling(initial.status)
      })

      // Fallback-Polling alle 7 Sekunden bis Bestellung nicht mehr 'pending' ist
      // let poll: ReturnType<typeof setInterval> | undefined
      // if (order?.status === 'pending') {
      //   poll = setInterval(fetchOrder, 7000)
      // }

      // Supabase-Realtime Subscription für Updates dieser Bestellung
      const channel = supabase
        .channel(`order-${orderId}`)
        .on('postgres_changes', 
          { 
            event: 'UPDATE', 
            schema: 'public', 
            table: 'orders',
            filter: `id=eq.${orderId}`
          }, 
          (payload) => {
            console.log('Order update received:', payload)
            const updatedOrder = payload.new as Order
            setOrder(updatedOrder)
            setLoading(false)
            // Polling nach Status anpassen
            startOrStopPolling(updatedOrder.status)
            // Timer ausblenden und Benachrichtigung zeigen wenn bestätigt
            if (updatedOrder.status !== 'pending') {
              setShowTimer(false)
              
              // Browser-Benachrichtigung
              if (Notification.permission === 'granted') {
                new Notification('Bestellung bestätigt!', {
                  body: `Ihre Bestellung wurde bestätigt und wird zubereitet.`,
                })
              }
              
              // Akustisches Signal
              playNotificationSound()
            }
          }
        )
        .subscribe()

      // Notification Permission anfragen
      if (Notification.permission === 'default') {
        Notification.requestPermission()
      }

      return () => {
        if (pollRef.current) clearInterval(pollRef.current)
        channel.unsubscribe()
      }
    }
  }, [orderId])

  useEffect(() => {
    // Update remaining minutes every 30s when Bestellung bestätigt ist
    if (order?.status === 'confirmed' && order.ready_at) {
      const update = () => {
        const diffMs = new Date(order.ready_at).getTime() - Date.now()
        setTimeToReady(Math.max(0, Math.ceil(diffMs / 60000)))
      }
      update()
      const t = setInterval(update, 30000)
      return () => clearInterval(t)
    }
  }, [order?.status, order?.ready_at])

  const playNotificationSound = () => {
    // Versuche zuerst die vorgefertigte Audio-Datei (funktioniert besser auf Mobilgeräten)
    if (audioRef.current) {
      audioRef.current.currentTime = 0
      audioRef.current.play().catch(() => {
        // Fallback: kurzer Web-Audio Biep
        try {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
          const oscillator = audioContext.createOscillator()
          const gainNode = audioContext.createGain()
          oscillator.connect(gainNode)
          gainNode.connect(audioContext.destination)
          oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)
          oscillator.start()
          oscillator.stop(audioContext.currentTime + 0.3)
        } catch (err) {
          console.error('AudioContext error:', err)
        }
      })
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
          message: 'Ihre Bestellung wird bearbeitet. Sie erhalten eine Bestätigung, sobald sie bereit ist.',
          color: 'text-yellow-600',
          bgColor: 'bg-yellow-100'
        }
      case 'confirmed':
        return {
          title: 'Bestellung bestätigt!',
          message: 'Ihre Bestellung wird zubereitet und ist pünktlich zur Abholzeit fertig.',
          color: 'text-blue-600',
          bgColor: 'bg-blue-100'
        }
      case 'ready':
        return {
          title: 'Bestellung ist bereit!',
          message: 'Ihre Bestellung ist fertig und kann abgeholt werden.',
          color: 'text-green-600',
          bgColor: 'bg-green-100'
        }
      case 'completed':
        return {
          title: 'Bestellung abgeholt!',
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
  let statusMessage = statusInfo.message
  if (order.status === 'confirmed' && order.ready_at && timeToReady !== null) {
    statusMessage = `Ihre Bestellung ist in ca. ${timeToReady} Minuten fertig (≈ ${formatTime(order.ready_at)}).`
  }

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
            {statusMessage}
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
                <div key={index} className="flex justify-between items-center">
                  <div>
                    <span className="font-medium">{item.quantity}x {item.name}</span>
                    {item.options && item.options.length > 0 && (
                      <div className="text-sm text-gray-600 ml-4">
                        {item.options.map((option, optIndex) => (
                          <div key={optIndex}>+ {option.name} (+{option.price.toFixed(2)}€)</div>
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