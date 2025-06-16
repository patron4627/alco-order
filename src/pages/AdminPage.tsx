import React, { useState, useEffect } from 'react'
import { Bell, RefreshCw, Filter, LogOut, Settings, Plus } from 'lucide-react'
import { Order, RealtimePayload } from '../types'
import { supabase } from '../lib/supabase'
import OrderCard from '../components/OrderCard'
import AdminLogin from '../components/AdminLogin'
import MenuManagement from '../components/MenuManagement'
import { useAuth } from '../context/AuthContext'

const AdminPage: React.FC = () => {
  const { isAdminAuthenticated, logout } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | Order['status']>('all')
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [activeTab, setActiveTab] = useState<'orders' | 'menu'>('orders')
  const [connectionStatus, setConnectionStatus] = useState<string>('connecting')
  const [retryAttempt, setRetryAttempt] = useState(0)
  const [soundType, setSoundType] = useState<'default' | 'alert' | 'notification' | 'none'>('notification')

  // Sound configuration
  const soundConfig = {
    default: {
      frequencies: [800, 1000, 800],
      durations: [0.2, 0.2, 0.3],
      delays: [0, 300, 600]
    },
    alert: {
      frequencies: [1200, 1400, 1200],
      durations: [0.1, 0.1, 0.2],
      delays: [0, 200, 400]
    },
    notification: {
      frequencies: [600, 800, 600],
      durations: [0.3, 0.3, 0.4],
      delays: [0, 500, 1000]
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
    console.log('🔄 Setting up realtime subscription...')
    
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
          setConnectionStatus('connected')
          
          // Handle different types of events
          switch (payload.eventType) {
            case 'INSERT':
              const newOrder = payload.new
              console.log('➕ New order received:', newOrder.id)
              setOrders(prev => [...prev, newOrder])
              if (audioEnabled && soundType !== 'none') {
                playNewOrderSound(soundType)
              }
              break;
            case 'UPDATE':
              const updatedOrder = payload.new
              console.log('🔄 Order updated:', updatedOrder.id)
              setOrders(prev => 
                prev.map(order => order.id === updatedOrder.id ? updatedOrder : order)
              )
              break;
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Subscription status:', status)
        setConnectionStatus(status)
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Successfully subscribed to realtime updates')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Channel error, retrying in 2 seconds...')
          const retryInterval = Math.min(30000, 2000 * (retryAttempt + 1)) // Exponential backoff
          setTimeout(() => {
            setRetryAttempt(prev => prev + 1)
            setupRealtimeSubscription() // Restart subscription
          }, retryInterval)
        }
      })

    // Cleanup function
    return () => {
      console.log('🔌 Unsubscribing from channel')
      supabase.removeChannel(channel)
    }
  }

  const playNewOrderSound = (type: 'default' | 'alert' | 'notification') => {
    try {
      const config = soundConfig[type]
      
      // Erstelle mehrere Töne für bessere Aufmerksamkeit
      const playTone = (frequency: number, duration: number, delay: number = 0) => {
        setTimeout(() => {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
          const oscillator = audioContext.createOscillator()
          const gainNode = audioContext.createGain()
          
          oscillator.connect(gainNode)
          gainNode.connect(audioContext.destination)
          
          oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime)
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration)
          
          oscillator.start(audioContext.currentTime)
          oscillator.stop(audioContext.currentTime + duration)
        }, delay)
      }
      
      // Spiele die Töne in der angegebenen Konfiguration
      config.frequencies.forEach((freq, index) => {
        playTone(freq, config.durations[index], config.delays[index])
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
                  onChange={(e) => setSoundType(e.target.value as 'default' | 'alert' | 'notification' | 'none')}
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
            {orders.filter(o => o.status === 'pending').length > 0 && (
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
                {connectionStatus !== 'SUBSCRIBED' && (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-yellow-800 text-sm">
                      ⚠️ Echtzeit-Verbindung nicht aktiv. Neue Bestellungen werden möglicherweise nicht automatisch angezeigt.
                    </p>
                  </div>
                )}
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