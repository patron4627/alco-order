import React, { useState, useEffect } from 'react'
import { Bell, RefreshCw, Filter, LogOut, Settings, Plus, Smartphone } from 'lucide-react'
import { Order } from '../types'
import { supabase } from '../lib/supabase'
import OrderCard from '../components/OrderCard'
import AdminLogin from '../components/AdminLogin'
import MenuManagement from '../components/MenuManagement'
import { useAuth } from '../context/AuthContext'
import { webPushService } from '../lib/webPushService'

const AdminPage: React.FC = () => {
  const { isAdminAuthenticated, logout } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | Order['status']>('all')
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [activeTab, setActiveTab] = useState<'orders' | 'menu'>('orders')
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'connecting' | 'disconnected'>('connecting')
  const [pushEnabled, setPushEnabled] = useState(false)

  useEffect(() => {
    if (!isAdminAuthenticated) return

    initializeWebPush()
    fetchOrders()
    setupRealtimeConnection()
  }, [isAdminAuthenticated])

  const initializeWebPush = async () => {
    console.log('📱 Initializing Web Push for admin...')
    
    try {
      const success = await webPushService.initialize()
      setPushEnabled(success)
      
      if (success) {
        console.log('✅ Web Push enabled for admin')
      } else {
        console.log('❌ Web Push not available')
      }
    } catch (error) {
      console.error('❌ Failed to initialize Web Push:', error)
    }
  }

  const setupRealtimeConnection = () => {
    console.log('🔄 Admin: Setting up optimized realtime connection...')
    
    // Eindeutiger Channel-Name für Admin
    const channelName = `admin-orders-${Date.now()}`
    
    const channel = supabase
      .channel(channelName, {
        config: {
          broadcast: { self: false },
          presence: { key: 'admin-dashboard' },
          private: false
        }
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        async (payload) => {
          console.log('🔔 Admin: Realtime event received:', payload.eventType, payload)
          setConnectionStatus('connected')
          
          if (payload.eventType === 'INSERT') {
            const newOrder = payload.new as Order
            console.log('➕ New order received:', newOrder.id)
            
            // Sofort zur Liste hinzufügen
            setOrders(prev => {
              const exists = prev.find(order => order.id === newOrder.id)
              if (exists) {
                console.log('⚠️ Order already exists, updating instead')
                return prev.map(order => order.id === newOrder.id ? newOrder : order)
              }
              console.log('✅ Adding new order to list')
              return [newOrder, ...prev]
            })
            
            // Web Push Notification für neue Bestellung
            if (pushEnabled) {
              await webPushService.sendNewOrderNotification({
                customerName: newOrder.customer_name,
                totalAmount: newOrder.total_amount,
                orderId: newOrder.id
              })
            }
            
            // Zusätzlicher Sound wenn Audio aktiviert
            if (audioEnabled) {
              playUrgentNotificationSound()
            }
            
          } else if (payload.eventType === 'UPDATE') {
            const updatedOrder = payload.new as Order
            console.log('🔄 Order updated:', updatedOrder.id, updatedOrder.status)
            
            setOrders(prev => prev.map(order => 
              order.id === updatedOrder.id ? updatedOrder : order
            ))
            
          } else if (payload.eventType === 'DELETE') {
            const deletedOrder = payload.old as Order
            console.log('🗑️ Order deleted:', deletedOrder.id)
            
            setOrders(prev => prev.filter(order => order.id !== deletedOrder.id))
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Admin subscription status:', status)
        
        if (status === 'SUBSCRIBED') {
          console.log('✅ Admin successfully subscribed to realtime updates')
          setConnectionStatus('connected')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Admin channel error')
          setConnectionStatus('disconnected')
          // Automatisch nach 3 Sekunden neu verbinden
          setTimeout(() => {
            console.log('🔄 Attempting to reconnect...')
            setupRealtimeConnection()
          }, 3000)
        } else if (status === 'TIMED_OUT') {
          console.error('⏰ Admin channel timed out')
          setConnectionStatus('disconnected')
        } else {
          setConnectionStatus('connecting')
        }
      })

    // Cleanup function
    return () => {
      console.log('🔌 Admin: Unsubscribing from realtime')
      supabase.removeChannel(channel)
    }
  }

  const fetchOrders = async () => {
    try {
      console.log('📥 Fetching orders...')
      setConnectionStatus('connecting')
      
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.error('❌ Error fetching orders:', error)
        throw error
      }
      
      console.log('✅ Orders fetched:', data?.length || 0)
      setOrders(data || [])
      setConnectionStatus('connected')
    } catch (error) {
      console.error('Error fetching orders:', error)
      setConnectionStatus('disconnected')
    } finally {
      setLoading(false)
    }
  }

  const playUrgentNotificationSound = () => {
    try {
      // Sehr laute und dringende Benachrichtigungssequenz für Restaurant
      const playTone = (frequency: number, duration: number, delay: number = 0, volume: number = 0.8) => {
        setTimeout(() => {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
          const oscillator = audioContext.createOscillator()
          const gainNode = audioContext.createGain()
          
          oscillator.connect(gainNode)
          gainNode.connect(audioContext.destination)
          
          oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime)
          gainNode.gain.setValueAtTime(volume, audioContext.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration)
          
          oscillator.start(audioContext.currentTime)
          oscillator.stop(audioContext.currentTime + duration)
        }, delay)
      }
      
      // Sehr laute und dringende Sequenz: 6 Töne mit hoher Lautstärke
      playTone(1000, 0.3, 0, 0.9)      // Sehr laut
      playTone(1200, 0.3, 400, 0.9)    // Sehr laut
      playTone(1000, 0.3, 800, 0.9)    // Sehr laut
      playTone(1400, 0.3, 1200, 0.9)   // Sehr laut
      playTone(1000, 0.4, 1600, 0.9)   // Sehr laut und länger
      playTone(1200, 0.4, 2100, 0.9)   // Sehr laut und länger
      
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

  const getConnectionStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-600'
      case 'connecting': return 'text-yellow-600'
      case 'disconnected': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return '🟢 Live'
      case 'connecting': return '🟡 Verbinde...'
      case 'disconnected': return '🔴 Getrennt'
      default: return '⚪ Unbekannt'
    }
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
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 sm:mb-8 space-y-4 sm:space-y-0">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 truncate">Admin Dashboard</h1>
            <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-4 mt-2 space-y-2 sm:space-y-0">
              <p className="text-gray-600 text-sm sm:text-base">
                {activeTab === 'orders' ? 'Verwalten Sie eingehende Bestellungen' : 'Verwalten Sie Ihr Menü'}
              </p>
              <div className="flex items-center space-x-4">
                <div className={`flex items-center space-x-1 text-sm ${getConnectionStatusColor()}`}>
                  <span>{getConnectionStatusText()}</span>
                </div>
                {pushEnabled && (
                  <div className="flex items-center space-x-1 text-sm text-green-600">
                    <Smartphone className="w-4 h-4" />
                    <span className="hidden sm:inline">📱 Push aktiv</span>
                    <span className="sm:hidden">📱</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
            {activeTab === 'orders' && (
              <>
                <button
                  onClick={() => setAudioEnabled(!audioEnabled)}
                  className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 rounded-lg border transition-colors text-sm ${
                    audioEnabled 
                      ? 'bg-orange-500 text-white border-orange-500' 
                      : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <Bell className="w-4 h-4" />
                  <span className="hidden sm:inline">{audioEnabled ? '🔊 Ton an' : '🔇 Ton aus'}</span>
                </button>

                <button
                  onClick={fetchOrders}
                  className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors text-sm"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span className="hidden sm:inline">Aktualisieren</span>
                </button>
              </>
            )}

            <button
              onClick={handleLogout}
              className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors text-sm"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Abmelden</span>
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm p-1 mb-6 inline-flex w-full sm:w-auto overflow-x-auto">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-md font-medium transition-colors text-sm whitespace-nowrap ${
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
            className={`flex items-center space-x-2 px-3 sm:px-4 py-2 rounded-md font-medium transition-colors text-sm whitespace-nowrap ${
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
              <div className="flex items-center space-x-2 sm:space-x-4 overflow-x-auto pb-2">
                <div className="flex items-center space-x-2 flex-shrink-0">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Filter:</span>
                </div>
                
                <div className="flex space-x-2 min-w-max">
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
                <p className="text-gray-600 mb-4">
                  {statusFilter === 'all' 
                    ? 'Neue Bestellungen erscheinen automatisch hier mit Push-Benachrichtigung.'
                    : 'Bestellungen mit diesem Status werden hier angezeigt.'
                  }
                </p>
                {pushEnabled && (
                  <p className="text-green-600 text-sm">
                    📱 Web Push-Benachrichtigungen sind aktiv - Sie werden auch im Hintergrund benachrichtigt!
                  </p>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6">
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