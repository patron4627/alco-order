import React, { useState, useEffect } from 'react'
import { Bell, RefreshCw, Filter, LogOut, Settings, Plus } from 'lucide-react'
import { Order, RealtimePayload } from '../types'
import { supabase } from '../lib/supabase'
import OrderCard from '../components/OrderCard'
import AdminLogin from '../components/AdminLogin'
import MenuManagement from '../components/MenuManagement'
import { useAuth } from '../context/AuthContext'

const AdminPage: React.FC = () => {
  const { isAdminAuthenticated, logout }: { isAdminAuthenticated: boolean, logout: () => void } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [statusFilter, setStatusFilter] = useState<'all' | Order['status']>('all')
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true)
  const [activeTab, setActiveTab] = useState<'orders' | 'menu'>('orders')
  const [connectionStatus, setConnectionStatus] = useState<string>('connecting')
  const [retryAttempt, setRetryAttempt] = useState<number>(0)
  const [soundType, setSoundType] = useState<'default' | 'alert' | 'notification' | 'ping' | 'none'>('notification')

  // Sound configuration
  const soundConfig = {
    default: {
      frequencies: [440, 494, 523], // A4, B4, C5
      durations: [0.1, 0.1, 0.1],
      delays: [0, 100, 200]
    },
    alert: {
      frequencies: [261, 392, 523], // C4, G4, C5
      durations: [0.2, 0.2, 0.2],
      delays: [0, 150, 300]
    },
    notification: {
      frequencies: [330, 392, 440], // E4, G4, A4
      durations: [0.15, 0.15, 0.15],
      delays: [0, 100, 200]
    },
    ping: {
      frequencies: [659], // E5
      durations: [0.1],
      delays: [0]
    }
  }

  useEffect(() => {
    if (!isAdminAuthenticated) return

    fetchOrders()
    const cleanup = setupRealtimeSubscription()
    
    return cleanup
  }, [isAdminAuthenticated, retryAttempt])

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrders(data || [])
      setLoading(false)
    } catch (error) {
      console.error('Error fetching orders:', error)
      setLoading(false)
    }
  }

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('admin-orders-channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        (payload: RealtimePayload) => {
          console.log('🔔 Realtime event received:', payload.eventType, payload)
          setConnectionStatus('SUBSCRIBED')
          
          // Handle different types of events
          if (payload.eventType === 'INSERT') {
            const newOrder = payload.new as Order
            console.log('➕ New order:', newOrder)
            setOrders(prev => [...prev, newOrder])
            if (audioEnabled && soundType !== 'none') {
              playNewOrderSound('ping') // Use ping sound for new orders
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedOrder = payload.new as Order
            console.log('🔄 Updated order:', updatedOrder)
            setOrders(prev => 
              prev.map(order => order.id === updatedOrder.id ? updatedOrder : order)
            )
            if (audioEnabled && soundType !== 'none' && updatedOrder.status !== 'pending') {
              playNewOrderSound(soundType) // Play sound for status updates
            }
          }
        }
      )
      .subscribe((status: string) => {
        console.log('📡 Subscription status:', status)
        setConnectionStatus(status)
        
        // Handle different connection states
        if (status === 'CHANNEL_ERROR') {
          console.warn('⚠️ Channel error, retrying...')
          const retryInterval = Math.min(30000, 2000 * (retryAttempt + 1))
          setTimeout(() => {
            setRetryAttempt(prev => prev + 1)
            setupRealtimeSubscription()
          }, retryInterval)
        }
      })

    // Cleanup function
    return () => {
      console.log('🔌 Unsubscribing from channel')
      supabase.removeChannel(channel)
    }
  }

  const playNewOrderSound = (type: 'default' | 'alert' | 'notification' | 'ping' | 'none') => {
    if (!audioEnabled || type === 'none') return

    const audioCtx = new AudioContext()
    const oscillator = audioCtx.createOscillator()
    
    // Get sound configuration
    const config = soundConfig[type]
    let currentTime = 0

    // Create and connect gain node for volume control
    const gainNode = audioCtx.createGain()
    gainNode.gain.value = 0.7 // 70% volume for louder sound
    oscillator.connect(gainNode)
    gainNode.connect(audioCtx.destination)

    // Play each tone in sequence
    config.frequencies.forEach((frequency, index) => {
      oscillator.frequency.value = frequency
      oscillator.start(currentTime)
      oscillator.stop(currentTime + config.durations[index])
      currentTime += config.delays[index] / 1000
    })

    // Start the oscillator
    oscillator.start()
    // Stop after the last tone
    oscillator.stop(currentTime + config.durations[config.durations.length - 1])
      })
      
    } catch (error) {
      console.log('Could not play notification sound:', error)
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

  const filteredOrders = statusFilter === 'all' 
    ? orders 
    : orders.filter(order => order.status === statusFilter)

  const getStatusCount = (status: Order['status']): number => {
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
            {/* Connection Status Indicator */}
            <div className="flex items-center space-x-2 mt-2">
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

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Bell className="h-5 w-5" />
                <button
                  onClick={() => playNewOrderSound(soundType)}
                  className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-100"
                  title="Test-Ton abspielen"
                >
                  Test-Ton
                </button>
                <select
                  value={soundType}
                  onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setSoundType(e.target.value as 'default' | 'alert' | 'notification' | 'none')}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="default">Standard</option>
                  <option value="notification">Benachrichtigung</option>
                  <option value="alert">Alarm</option>
                  <option value="none">Kein Ton</option>
                </select>
              </div>
              <button
                onClick={handleLogout}
                className="ml-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <LogOut className="mr-2 h-5 w-5" />
                Abmelden
              </button>
            </div>
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
            {orders.filter((order: Order) => order.status === 'pending').length > 0 && (
              <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
                {orders.filter((order: Order) => order.status === 'pending').length}
              </span>
            )}
            🍽️ Bereit ({getStatusCount('ready')})
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
            <span>Menü</span>
            <Plus className="w-4 h-4" />
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
                  ✅ Abgeschlossen ({getStatusCount('completed')})
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filteredOrders.map((order) => (
                <OrderCard 
                  key={order.id} 
                  order={order} 
                  onStatusChange={handleStatusUpdate}
                />
              ))}
            </div>
          </>
        ) : (
          <MenuManagement />
        )}
      </div>
    </div>
  )
}

export default AdminPage