import React, { useState, useEffect } from 'react'
import { Bell, RefreshCw, Filter, LogOut, Settings } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import { Order } from '../types'
import AdminLogin from '../components/AdminLogin'
import OrderCard from '../components/OrderCard'
import MenuManagement from '../components/MenuManagement'

// Definiere die Typen für die JSX-Elemente
interface JSXElementProps {
  children?: React.ReactNode
  className?: string
  onClick?: () => void
  style?: React.CSSProperties
  type?: string
  value?: string
  checked?: boolean
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void
}

interface AdminPageProps {}

const AdminPage: React.FC<AdminPageProps> = () => {
  const { isAdminAuthenticated, logout } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [statusFilter, setStatusFilter] = useState<'all' | Order['status']>('all')
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true)
  const [activeTab, setActiveTab] = useState<'orders' | 'menu'>('orders')

  // Page Visibility API für App-Neuladen
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        // App neu laden wenn aus Hintergrund zurückkehrt
        window.location.reload();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Cleanup beim Komponenten-Unmount
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Notification Permission anfragen und persistieren
  useEffect(() => {
    if (!isAdminAuthenticated) return

    // Prüfe ob Benachrichtigungen bereits erlaubt sind
    if (Notification.permission === 'granted') {
      return
    }

    // Wenn Benachrichtigungen noch nicht erlaubt sind
    if (Notification.permission === 'default') {
      Notification.requestPermission()
        .then(permission => {
          if (permission === 'granted') {
            console.log('✅ Benachrichtigungen wurden erlaubt')
            // Speichere die Erlaubnis persistierend
            localStorage.setItem('notificationsEnabled', 'true')
          }
        })
        .catch(error => {
          console.error('❌ Fehler bei Benachrichtigungs-Erlaubnis:', error)
        })
    }
  }, [isAdminAuthenticated])

  // Prüfe beim Start, ob Benachrichtigungen erlaubt sind
  useEffect(() => {
    if (!isAdminAuthenticated) return
    
    const notificationsEnabled = localStorage.getItem('notificationsEnabled') === 'true'
    if (notificationsEnabled && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [isAdminAuthenticated])

  // Realtime Subscription
  useEffect(() => {
    if (!isAdminAuthenticated) return

    fetchOrders()
    
    const channel = supabase
      .channel('admin-orders', {
        config: {
          broadcast: { self: false },
          presence: { key: 'admin' }
        }
      })
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            const newOrder = payload.new as Order
            setOrders(prev => {
              const exists = prev.find(order => order.id === newOrder.id)
              if (exists) return prev
              return [newOrder, ...prev]
            })
            
            if (audioEnabled) {
              playNewOrderSound()
            }
            
            if (Notification.permission === 'granted') {
              try {
                const notification = new Notification('🔔 Neue Bestellung!', {
                  body: `${newOrder.customer_name} - ${newOrder.total_amount.toFixed(2)}€`,
                  icon: '/icon-192x192.png',
                  tag: 'new-order-' + newOrder.id,
                  requireInteraction: true
                })
                notification.onclick = () => window.focus()
              } catch (error) {
                console.error('❌ Fehler bei Benachrichtigung:', error)
              }
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedOrder = payload.new as Order
            setOrders(prev => prev.map(order => 
              order.id === updatedOrder.id ? updatedOrder : order
            ))
          } else if (payload.eventType === 'DELETE') {
            const deletedOrder = payload.old as Order
            setOrders(prev => prev.filter(order => order.id !== deletedOrder.id))
          }
        }
      )
      .subscribe((status: any) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Admin successfully subscribed to realtime updates')
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Admin channel error')
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isAdminAuthenticated, audioEnabled])

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      
      if (data) {
        setOrders(data as Order[])
      }
    } catch (error) {
      console.error('❌ Fehler beim Laden der Bestellungen:', error)
    } finally {
      setLoading(false)
    }
  }

  const playNewOrderSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const oscillator = audioContext.createOscillator()
      
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime)
      oscillator.connect(audioContext.destination)
      
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.5)
    } catch (error) {
      console.error('❌ Fehler beim Abspielen des Tons:', error)
    }
  }

  const handleStatusUpdate = async (order: Order, status: Order['status']) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status })
        .eq('id', order.id)
      
      if (error) throw error
      
      setOrders((prev: Order[]) => {
        return prev.map((o: Order) => 
          o.id === order.id ? { ...o, status } : o
        )
      })
    } catch (error) {
      console.error('❌ Fehler beim Aktualisieren des Status:', error)
    }
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