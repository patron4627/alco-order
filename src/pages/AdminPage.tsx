import React, { useState, useEffect } from 'react'
import { Bell, RefreshCw, Filter, LogOut, Settings, Plus } from 'lucide-react'
import { Order } from '../types'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const AdminPage: React.FC = () => {
  const { isAdminAuthenticated, logout } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | Order['status']>('all')
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [activeTab, setActiveTab] = useState<'orders' | 'menu'>('orders')

  useEffect(() => {
    if (!isAdminAuthenticated) return

    // Echtzeit-Subscription für Bestellungen
    const channel = supabase
      .channel('admin-orders')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'orders' 
        }, 
        (payload) => {
          console.log('🔔 Admin: Real-time order update:', payload)
          
          try {
            // Aktualisiere die gesamte Liste
            fetchOrders()
            
            // Wenn es eine neue Bestellung ist
            if (payload.eventType === 'INSERT') {
              // Browser Notification
              if (Notification.permission === 'granted') {
                new Notification('🔔 Neue Bestellung!', {
                  body: `Bestellung ${payload.new.id} wurde aufgegeben`,
                  icon: '/icon-192x192.png',
                  tag: 'new-order',
                  requireInteraction: true
                })
              }
              
              // Akustisches Signal
              playNewOrderSound()
            }
          } catch (error) {
            console.error('Error fetching orders:', error)
          }
        }
      )
      .subscribe((status: any) => {
        console.log('📡 Admin subscription status:', status)
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to real-time updates')
        }
      })

    // Initialer Datenlad
    fetchOrders()

    return () => {
      console.log('🔌 Unsubscribing from orders')
      supabase.removeChannel(channel)
    }
  }, [isAdminAuthenticated])

  // Automatische Aktualisierung alle 5 Sekunden
  useEffect(() => {
    if (!isAdminAuthenticated) return

    const interval = setInterval(() => {
      fetchOrders()
    }, 5000) // 5 Sekunden

    return () => clearInterval(interval)
  }, [isAdminAuthenticated])

  // Funktion zum Abspielen eines neuen Bestellungs-Tons
  const playNewOrderSound = () => {
    if (!audioEnabled) return

    const audio = new Audio('/sounds/new-order.mp3')
    audio.play()
      .catch(error => console.error('Error playing sound:', error))
  }

  // Hauptfunktion zum Laden der Bestellungen
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
    } finally {
      setLoading(false)
    }
  }

  // Notification Permission anfragen
  if (Notification.permission === 'default') {
    Notification.requestPermission()
  }
  }

  const handleStatusUpdate = (orderId: string, newStatus: Order['status']) => {
    setOrders(prev => prev.map(order => 
      order.id === orderId ? { ...order, status: newStatus } : order
    ))
  }

  const handleLogout = () => {
    logout()
  }

  if (!isAdminAuthenticated) {
    return <AdminLogin />
  }

  // Filter orders based on status
  const filteredOrders = statusFilter === 'all' 
    ? orders 
    : orders.filter(order => order.status === statusFilter)

  // Get count of orders with specific status
  const getStatusCount = (status: Order['status']) => {
    return orders.filter(order => order.status === status).length
  }

  if (loading && activeTab === 'orders') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <RefreshCw className="w-6 h-6 animate-spin text-orange-500" />
          <span className="text-gray-600">Bestellungen werden geladen...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600">
              {activeTab === 'orders' ? 'Verwalten Sie eingehende Bestellungen' : 'Verwalten Sie Ihr Menü'}
            </p>
          </div>

          <div className="flex items-center space-x-4">
            {activeTab === 'orders' && (
              <>
                <button
                  onClick={() => setAudioEnabled(!audioEnabled)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg border transition-colors ${
                    audioEnabled 
                      ? 'bg-orange-500 text-white border-orange-500' 
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <Bell className="w-4 h-4" />
                  <span>{audioEnabled ? '🔊 Ton an' : '🔇 Ton aus'}</span>
                </button>

                <button
                  onClick={fetchOrders}
                  className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Aktualisieren</span>
                </button>
              </>
            )}

            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Abmelden</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm p-1 mb-6 inline-flex">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'orders'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Bell className="w-4 h-4" />
            <span>Bestellungen</span>
            {orders.filter(o => o.status === 'pending').length > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                {orders.filter(o => o.status === 'pending').length}
              </span>
            )}
          </button>
          
          <button
            onClick={() => setActiveTab('menu')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'menu'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Menü verwalten</span>
          </button>
        </div>

        {activeTab === 'orders' ? (
          <>
            {/* Status Filter */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
              <div className="flex items-center space-x-4 overflow-x-auto">
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Filter:</span>
                </div>
                
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1 text-sm rounded-full whitespace-nowrap transition-colors ${
                    statusFilter === 'all'
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Alle ({orders.length})
                </button>

                <button
                  onClick={() => setStatusFilter('pending')}
                  className={`px-3 py-1 text-sm rounded-full whitespace-nowrap transition-colors ${
                    statusFilter === 'pending'
                      ? 'bg-yellow-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  🔔 Neu ({getStatusCount('pending')})
                </button>

                <button
                  onClick={() => setStatusFilter('confirmed')}
                  className={`px-3 py-1 text-sm rounded-full whitespace-nowrap transition-colors ${
                    statusFilter === 'confirmed'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  ✅ Bestätigt ({getStatusCount('confirmed')})
                </button>

                <button
                  onClick={() => setStatusFilter('ready')}
                  className={`px-3 py-1 text-sm rounded-full whitespace-nowrap transition-colors ${
                    statusFilter === 'ready'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  🍽️ Bereit ({getStatusCount('ready')})
                </button>

                <button
                  onClick={() => setStatusFilter('completed')}
                  className={`px-3 py-1 text-sm rounded-full whitespace-nowrap transition-colors ${
                    statusFilter === 'completed'
                      ? 'bg-gray-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  👍 Abgeholt ({getStatusCount('completed')})
                </button>
              </div>
            </div>

            {/* Orders List */}
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
                    ? 'Sobald Kunden bestellen, erscheinen die Bestellungen hier automatisch mit Ton.'
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
          </>
        ) : (
          <MenuManagement />
        )}
      </div>
    </div>
  )
}

export default AdminPage