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
    // Echtzeit-Subscription für Order-Status-Updates
    const subscription = supabase
      .channel(`timer-${orderId}`)
      .on('postgres_changes', 
        { 
          event: 'UPDATE', 
          schema: 'public', 
          table: 'orders',
          filter: `id=eq.${orderId}`
        }, 
        (payload) => {
          const updatedOrder = payload.new as any
          if (updatedOrder.status !== 'pending') {
            setIsConfirmed(true)
            onConfirmation()
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [orderId, onConfirmation])

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
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 animate-pulse">
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
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 animate-pulse">
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

      <div className="text-center">
        <p className="text-xs text-blue-600 bg-blue-100 inline-block px-3 py-1 rounded-full">
          📋 Bestellnummer: #{orderId.slice(-6).toUpperCase()}
        </p>
      </div>
    </div>
  )
}

export default OrderTimer