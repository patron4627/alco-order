import React from 'react'
import { useState, useEffect } from 'react'
import { Clock, CheckCircle, AlertCircle } from 'lucide-react'
import { JSX } from 'react/jsx-runtime'

interface OrderTimerProps {
  timeToReady: number
  orderId: string
}

const getProgressPercentage = (timeLeft: number, totalTime: number): number => {
  const progress = ((totalTime - timeLeft) / totalTime) * 100
  return Math.min(Math.max(progress, 0), 100)
}

const OrderTimer = ({ timeToReady, orderId }: OrderTimerProps) => {
  const [timeLeft, setTimeLeft] = useState<number>(timeToReady)
  const totalTime = timeToReady

  useEffect(() => {
    if (timeLeft <= 0) return

    const timer = setInterval(() => {
      setTimeLeft((prev: number) => {
        if (prev <= 1) {
          clearInterval(timer)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft])

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
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
          style={{ width: `${getProgressPercentage(timeLeft, totalTime)}%` }}
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