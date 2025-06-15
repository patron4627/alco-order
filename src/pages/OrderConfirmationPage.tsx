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

  const handleConfirmation = async () => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'completed' })
        .eq('id', order?.id)

      if (error) throw error

      await supabase
        .from('notifications')
        .insert({
          order_id: order?.id,
          message: 'Ihre Bestellung wurde erfolgreich abgeschlossen.',
          read: false
        })
    } catch (err) {
      console.error('Error confirming order:', err)
      alert('Fehler beim Abschließen der Bestellung')
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
                </div>
              ))}
              <div className="border-t pt-2">
                <div className="flex justify-between font-semibold">
                  <span>Gesamtbetrag</span>
                  <span>{order.total_amount.toFixed(2)}€</span>
                </div>
              </div>
            </div>
          </div>
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Bestellstatus</h2>
            <div className="bg-blue-100 p-4 rounded">
              <p className="text-blue-600">Ihre Bestellung wird gerade zubereitet...</p>
              <div className="mt-2">
                <div className="text-sm text-gray-600">
                  Wenn Ihre Bestellung nicht innerhalb von 10 Minuten bestätigt wird, 
                  erhalten Sie eine Benachrichtigung.
                </div>
              </div>
            </div>
          </div>
          <div className="flex justify-between items-center">
            <button
              onClick={handleConfirmation}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              disabled={order.status !== 'confirmed'}
            >
              {order.status === 'confirmed' ? 'Bestellung abgeschlossen' : 'Warten auf Bestätigung...'}
            </button>
            <button
              onClick={() => navigate('/home')}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              Zurück zur Startseite
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OrderConfirmationPage