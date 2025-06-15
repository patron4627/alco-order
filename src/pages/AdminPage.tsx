import React, { useState, useEffect, useRef } from 'react'
import { Bell, RefreshCw, Filter, LogOut, Settings, Plus } from 'lucide-react'
import { Order } from '../types'
import { supabase } from '../lib/supabase'
import OrderCard from '../components/OrderCard'
import AdminLogin from '../components/AdminLogin'
import MenuManagement from '../components/MenuManagement'
import { useAuth } from '../context/AuthContext'
import '../styles/animations.css'

const AdminPage: React.FC = () => {
  const { isAdminAuthenticated, logout } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'confirmed' | 'completed'>('confirmed')
  const [activeTab, setActiveTab] = useState<'orders' | 'menu'>('orders')
  const [audioEnabled, setAudioEnabled] = useState(true)
  const audioUnlockedRef = useRef(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  const getStatusCount = (status: Order['status']): number => {
    return orders.filter(order => order.status === status).length
  }

  // Überprüfe, ob der Benutzer authentifiziert ist
  if (!isAdminAuthenticated) {
    return <AdminLogin />
  }

  useEffect(() => {
    // Audio-Datei im Public-Ordner
    audioRef.current = new Audio('/notification.mp3')

    // Einmalige Geste zum Entsperren des Audio-Kontexts abwarten
    const unlockAudio = () => {
      if (audioUnlockedRef.current || !audioRef.current) return
      audioRef.current.volume = 0
      audioRef.current.play().then(() => {
        audioRef.current!.pause()
        audioRef.current!.currentTime = 0
        audioRef.current!.volume = 1
        audioUnlockedRef.current = true
      }).catch(() => {
        // Fallback: Erstelle kurze Web-Audio-Biep um trotzdem AudioContext zu entsperren
        try {
          const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
          const osc = ctx.createOscillator()
          const gain = ctx.createGain()
          osc.connect(gain)
          gain.connect(ctx.destination)
          gain.gain.value = 0
        } catch (error) {
          console.error('Error unlocking audio:', error)
        }
      })
    }

    // Event Listener für die erste Benutzerinteraktion
    const handleFirstInteraction = () => {
      unlockAudio()
    }

    window.addEventListener('click', handleFirstInteraction)
    window.addEventListener('touchstart', handleFirstInteraction)

    const fetchOrders = async () => {
      try {
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error
        setOrders(data || [])
      } catch (error) {
        console.error('Error fetching orders:', error)
      }
    }

    fetchOrders()

    // Realtime updates
    const channel = supabase
      .channel('orders_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
        },
        (payload: { new: Order }) => {
          if (payload.new) {
            const updatedOrder = payload.new
            setOrders((prev) => [
              updatedOrder,
              ...prev.filter((order) => order.id !== updatedOrder.id),
            ])

            // Play notification sound if audio is enabled
            if (audioEnabled) {
              playNotificationSound()
            }
          }
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
      window.removeEventListener('click', handleFirstInteraction)
      window.removeEventListener('touchstart', handleFirstInteraction)
    }
  }, [isAdminAuthenticated, audioEnabled])

  const filteredOrders = orders.filter((order) => {
    if (statusFilter === 'confirmed') return order.status === 'confirmed'
    return order.status === 'completed'
  })

  const handleStatusUpdate = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)

      if (error) throw error

      // Send notification to client
      const order = orders.find(o => o.id === orderId)
      if (order && newStatus === 'confirmed') {
        const { error: notificationError } = await supabase
          .from('notifications')
          .insert({
            order_id: orderId,
            message: 'Ihre Bestellung wurde bestätigt und wird zubereitet.',
            type: 'order_status'
          })

        if (notificationError) {
          console.error('Error sending notification:', notificationError)
        }
      }
    } catch (error) {
      console.error('Error updating order status:', error)
    }
  }

  const handleLogout = () => {
    logout()
    window.location.href = '/login'
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <span className="text-xl font-bold text-gray-900">Admin Dashboard</span>
              </div>
              <div className="ml-4 space-x-2">
                <button
                  onClick={() => setStatusFilter('confirmed')}
                  className={`px-3 py-1 text-sm rounded-full whitespace-nowrap transition-colors ${
                    statusFilter === 'confirmed'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Bestätigte ({getStatusCount('confirmed')})
                </button>

                <button
                  onClick={() => setStatusFilter('completed')}
                  className={`px-3 py-1 text-sm rounded-full whitespace-nowrap transition-colors ${
                    statusFilter === 'completed'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Abgeholt ({getStatusCount('completed')})
                </button>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={handleLogout}
                className="text-gray-600 hover:text-gray-900"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Bestellungen</h1>
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-4 py-2 rounded-lg ${
                activeTab === 'orders' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              Bestellungen
            </button>
            <button
              onClick={() => setActiveTab('menu')}
              className={`px-4 py-2 rounded-lg ${
                activeTab === 'menu' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600'
              }`}
            >
              Menü
            </button>
            <button
              onClick={() => setAudioEnabled(!audioEnabled)}
              className={`px-4 py-2 rounded-lg ${
                audioEnabled ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-600'
              }`}
              title="Benachrichtigungston an/aus"
            >
              <Bell className={`w-5 h-5 ${audioEnabled ? 'animate-bell' : ''}`} />
            </button>
            <button
              onClick={() => {
                fetchOrders()
              }}
              className="px-4 py-2 rounded-lg bg-blue-500 text-white hover:bg-blue-600"
              title="Bestellungen aktualisieren"
            >
              <RefreshCw className="w-5 h-5 animate-spin-slow" />
            </button>
          </div>
        </div>

        {activeTab === 'orders' ? (
          <div className="bg-white shadow rounded-lg p-6">
            {filteredOrders.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <Bell className="w-16 h-16 mx-auto" />
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {statusFilter === 'all' ? 'Keine Bestellungen vorhanden' : `Keine ${statusFilter} Bestellungen`}
                </h3>
                <p className="text-gray-600">
                  {statusFilter === 'all' 
                    ? 'Sobald Kunden bestellen, erscheinen die Bestellungen hier automatisch.'
                    : 'Bestellungen mit diesem Status werden hier angezeigt.'
                  }
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredOrders.map((order) => (
                  <OrderCard 
                    key={order.id} 
                    order={order} 
                    onStatusUpdate={handleStatusUpdate}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          <MenuManagement />
        )}
      </div>
    </div>
  )
}

export default AdminPage