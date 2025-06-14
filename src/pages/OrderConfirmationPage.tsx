import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Order } from '../types'
import { playNotificationSound } from '../utils/audio'
import OrderTimer from '../components/OrderTimer'
import { User, Clock } from 'lucide-react'

interface ExtendedOrder extends Order {
  time_to_ready?: number;
}

const OrderConfirmationPage: React.FC = () => {
  const [order, setOrder] = useState<ExtendedOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [showTimer, setShowTimer] = useState(false)
  const [timeToReady, setTimeToReady] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const navigate = useNavigate()

  useEffect(() => {
    const orderId = useParams<{ orderId: string }>()
    if (!orderId) {
      navigate('/home')
      return
    }

    const fetchAndSubscribe = async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .eq('id', orderId)
          .single()

        if (error) throw error
        setOrder(data as ExtendedOrder)
        setLoading(false)

        if (data.status === 'ready') {
          setShowTimer(true)
          setTimeToReady(data.time_to_ready || 0)
          playNotificationSound()
        }
      } catch (error) {
        setError('Fehler beim Laden der Bestellung')
        setLoading(false)
      }

      // Realtime Subscription
      const channel = supabase
        .channel('order_updates')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders',
          },
          (payload: { new: ExtendedOrder }) => {
            if (payload.new.id === orderId) {
              setOrder(payload.new)
              setShowTimer(payload.new.status === 'confirmed')
              setTimeToReady(payload.new.time_to_ready || 0)

              if (payload.new.status === 'ready') {
                playNotificationSound()
              }
            }
          }
        )
        .subscribe()

      return () => {
        channel.unsubscribe()
      }
    }

    fetchAndSubscribe()
  }, [navigate])

  const handleConfirmation = async () => {
    if (!order) return

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'completed' })
        .eq('id', order.id)

      if (error) throw error
      navigate('/home')
    } catch (error) {
      console.error('Error confirming order:', error)
      setError('Fehler beim Bestätigen der Bestellung')
    }
  }

  if (loading) return <div>Loading...</div>
  if (error) return <div>{error}</div>

  if (!order) return <div>Bestellung nicht gefunden</div>

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/home')}
                className="text-gray-500 hover:text-gray-700"
              >
                <User className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg p-6">
          <h1 className="text-2xl font-bold mb-4">Bestellbestätigung</h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Bestelldetails</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Kundenname
                  </label>
                  <p className="mt-1 text-lg text-gray-900">{order.customer_name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Telefonnummer
                  </label>
                  <p className="mt-1 text-lg text-gray-900">{order.customer_phone}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Bestellzeit
                  </label>
                  <p className="mt-1 text-lg text-gray-900">
                    {new Date(order.pickup_time).toLocaleString('de-DE')}
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-xl font-semibold mb-2">Bestellstatus</h2>
              <div className="space-y-4">
                <div className="flex items-center">
                  <Clock className="h-6 w-6 text-gray-400" />
                  <span className="ml-3 text-lg text-gray-900">
                    {order.status === 'pending' && 'Wird bearbeitet...'}
                    {order.status === 'confirmed' && 'Zubereitung läuft...'}
                    {order.status === 'ready' && 'Fertig zum Abholen'}
                    {order.status === 'completed' && 'Abgeholt'}
                  </span>
                </div>
                
                {showTimer && (
                  <div className="mt-4">
                    <OrderTimer timeToReady={timeToReady} />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-xl font-semibold mb-4">Bestellpositionen</h2>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between items-center">
                  <span className="text-lg">{item.name}</span>
                  <span className="text-lg font-medium">{item.price}€</span>
                </div>
              ))}
              <div className="flex justify-between items-center border-t pt-4">
                <span className="text-lg">Gesamt</span>
                <span className="text-lg font-bold">{order.total_amount}€</span>
              </div>
            </div>
          </div>

          {order.status === 'ready' && (
            <div className="mt-8">
              <button
                onClick={handleConfirmation}
                className="w-full bg-green-500 text-white py-2 px-4 rounded-lg hover:bg-green-600"
              >
                Bestellung abgeholt
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500">Fehler: {error}</p>
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
              <OrderTimer timeToReady={timeToReady} />
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
              {order.items.map((item, index) => (
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