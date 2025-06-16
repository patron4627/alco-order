import React, { useState, useEffect } from 'react'
import { Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

interface OrderTimerProps {
  orderId: string
  onConfirmation: () => void
}

const OrderTimer: React.FC<OrderTimerProps> = ({ orderId, onConfirmation }) => {
  const [timeLeft, setTimeLeft] = useState(600) // 10 Minuten in Sekunden
  const [isConfirmed, setIsConfirmed] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<string>('connecting')

  useEffect(() => {
    if (timeLeft <= 0 || isConfirmed) return

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft, isConfirmed])

  useEffect(() => {
    console.log('🔄 OrderTimer: Setting up realtime subscription for order:', orderId)
    
    const channel = supabase
      .channel(`order-timer-${orderId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
          filter: `id=eq.${orderId}`
        },
        (payload) => {
          console.log('🔔 OrderTimer: Order update received:', payload)
          setConnectionStatus('connected')
          
          const updatedOrder = payload.new as any
          console.log('📋 Order status:', updatedOrder.status)
          
          if (updatedOrder.status !== 'pending') {
            console.log('✅ Order confirmed! Hiding timer...')
            setIsConfirmed(true)
            onConfirmation()
            
            // Browser-Benachrichtigung
            if (Notification.permission === 'granted') {
              new Notification('🎉 Bestellung bestätigt!', {
                body: 'Ihre Bestellung wurde bestätigt und wird zubereitet.',
                icon: '/icon-192x192.png',
                tag: 'order-confirmed-' + orderId
              })
            }
            
            // Bestätigungston
            playConfirmationSound()
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 OrderTimer subscription status:', status)
        setConnectionStatus(status)
        
        if (status === 'CHANNEL_ERROR') {
          console.error('❌ OrderTimer: Channel error, retrying...')
          setTimeout(() => {
            // Retry subscription
          }, 3000)
        }
      })

    return () => {
      console.log('🔌 OrderTimer: Unsubscribing')
      supabase.removeChannel(channel)
    }
  }, [orderId, onConfirmation])

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

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
  }

  const getProgressPercentage = () => {
    return ((600 - timeLeft) / 600) * 100
  }

  if (isConfirmed) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 animate-bounce">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <CheckCircle className="w-8 h-8 text-green-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-green-900">
              🎉 Bestellung bestätigt!
            </h3>
            <p className="text-green-700">
              Ihre Bestellung wurde vom Restaurant bestätigt und wird zubereitet.
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (timeLeft <= 0) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <AlertCircle className="w-8 h-8 text-red-500" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-red-900">
              ⏰ Zeit abgelaufen
            </h3>
            <p className="text-red-700">
              Bitte rufen Sie das Restaurant an, um den Status Ihrer Bestellung zu erfahren.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
      <div className="text-center mb-4">
        <div className="flex items-center justify-center space-x-2 mb-2">
          <Clock className="w-6 h-6 text-blue-600 animate-spin" />
          <h3 className="text-lg font-semibold text-blue-900">
            ⏳ Warten auf Bestätigung
          </h3>
        </div>
        <p className="text-blue-700 text-sm">
          Bitte bleiben Sie auf dieser Seite. Sie erhalten eine sofortige Benachrichtigung, sobald Ihre Bestellung bestätigt wird.
        </p>
      </div>

      <div className="text-center mb-4">
        <div className="text-4xl font-bold text-blue-900 mb-2 font-mono">
          {formatTime(timeLeft)}
        </div>
        <p className="text-sm text-blue-600">
          Verbleibende Zeit für automatische Bestätigung
        </p>
      </div>

      <div className="w-full bg-blue-200 rounded-full h-3 mb-4">
        <div 
          className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all duration-1000 ease-linear"
          style={{ width: `${getProgressPercentage()}%` }}
        />
      </div>

      <div className="text-center mb-4">
        <p className="text-xs text-blue-600 bg-blue-100 inline-block px-3 py-1 rounded-full">
          📋 Bestellnummer: #{orderId.slice(-6).toUpperCase()}
        </p>
      </div>

      {/* Connection Status */}
      <div className="text-center">
        <div className="flex items-center justify-center space-x-2">
          <div className={`w-2 h-2 rounded-full ${
            connectionStatus === 'SUBSCRIBED' ? 'bg-green-500 animate-pulse' : 
            connectionStatus === 'connecting' ? 'bg-yellow-500 animate-pulse' : 
            'bg-red-500'
          }`}></div>
          <span className="text-xs text-gray-500">
            {connectionStatus === 'SUBSCRIBED' ? '🟢 Echtzeit aktiv' : 
             connectionStatus === 'connecting' ? '🟡 Verbinde...' : 
             '🔴 Verbindung getrennt'}
          </span>
        </div>
        {connectionStatus !== 'SUBSCRIBED' && (
          <p className="text-xs text-red-600 mt-2">
            ⚠️ Automatische Updates möglicherweise nicht verfügbar
          </p>
        )}
      </div>
    </div>
  )
}

export default OrderTimer