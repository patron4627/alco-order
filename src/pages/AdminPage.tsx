import React, { useState, useEffect, useCallback, useMemo, ChangeEvent } from 'react'
import { LogOut, Settings } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { Order } from '../types'
import { supabase } from '../lib/supabase'
import OrderCard from '../components/OrderCard'
import AdminLogin from '../components/AdminLogin'
import MenuManagement from '../components/MenuManagement'

// Sound configuration
type SoundType = 'default' | 'ping' | 'none'

interface AdminPageProps {}

interface OrderStatus {
  all: number;
  pending: number;
  preparing: number;
  ready: number;
  completed: number;
}

const AdminPage: React.FC<AdminPageProps> = (): JSX.Element => {
  const { isAdminAuthenticated, logout }: { isAdminAuthenticated: boolean, logout: () => void } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [statusFilter, setStatusFilter] = useState<'all' | Order['status']>('all')
  const [audioEnabled, setAudioEnabled] = useState(true)
  const [soundType, setSoundType] = useState<SoundType>('default')
  const [retryAttempt, setRetryAttempt] = useState(0)
  const [activeTab, setActiveTab] = useState<'orders' | 'menu'>('orders')

  // Effect for fetching orders
  useEffect(() => {
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
  }, [])

  // Effect for setting up real-time subscription
  useEffect(() => {
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
          (payload: any) => {
            console.log(' Realtime event received:', payload.eventType, payload)
            if (payload.eventType === 'INSERT') {
              const newOrder = payload.new as Order
              setOrders((prev: Order[]) => [...prev, newOrder])
              if (audioEnabled && soundType !== 'none') {
                playNewOrderSound('ping')
              }
            } else if (payload.eventType === 'UPDATE') {
              const updatedOrder = payload.new as Order
              setOrders((prev: Order[]) => prev.map((order: Order) => order.id === updatedOrder.id ? updatedOrder : order))
              if (audioEnabled && soundType !== 'none' && updatedOrder.status !== 'pending') {
                playNewOrderSound(soundType)
              }
            }
          }
        )
        .subscribe((status: string) => {
          console.log(' Subscription status:', status)
          if (status === 'CHANNEL_ERROR') {
            const retryInterval = Math.min(30000, 2000 * (1 + retryAttempt))
            setTimeout(() => {
              channel.unsubscribe()
              setupRealtimeSubscription()
              setRetryAttempt(retryAttempt + 1)
            }, retryInterval)
          }
        })

      return () => {
        console.log(' Unsubscribing from channel')
        channel.unsubscribe()
      }
    }

    setupRealtimeSubscription()
  }, [audioEnabled, soundType, retryAttempt])

  // Callback functions
  const handleStatusUpdate = useCallback(async (orderId: string, newStatus: Order['status']): Promise<void> => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)

      if (error) throw error
      setOrders((prev: Order[]): Order[] => {
        const updatedOrders = prev.map((order: Order): Order => 
          order.id === orderId ? { ...order, status: newStatus } : order
        )
        return updatedOrders
      })
    } catch (error) {
      console.error('Error updating order status:', error)
    }
  }, [])

  const handleLogout = useCallback(() => {
    logout()
    window.location.href = '/admin/login'
  }, [logout])

  const playNewOrderSound = useCallback((type: SoundType) => {
    if (!audioEnabled || type === 'none') return

    try {
      const audioCtx = new AudioContext()
      const oscillator = audioCtx.createOscillator()
      const gainNode = audioCtx.createGain()
      gainNode.gain.value = 0.7

      oscillator.connect(gainNode)
      gainNode.connect(audioCtx.destination)

      const frequencies = type === 'default' ? [440, 554.37] : [880, 1108.73]
      const durations = type === 'default' ? [0.2, 0.2] : [0.1, 0.1]
      const delays = type === 'default' ? [0, 250] : [0, 100]
      let currentTime = 0

      frequencies.forEach((frequency: number, index: number) => {
        oscillator.frequency.value = frequency
        oscillator.start(currentTime)
        oscillator.stop(currentTime + durations[index])
        currentTime += delays[index] / 1000
      })

      oscillator.start()
      oscillator.stop(currentTime + durations[durations.length - 1])
    } catch (error) {
      console.error('Could not play notification sound:', error)
    }
  }, [audioEnabled])

  // Helper functions
  const getStatusCount = useCallback((status: Order['status']): number => {
    return orders.filter((order: Order) => order.status === status).length
  }, [orders])

  const filteredOrders = useMemo(() => {
    return orders.filter((order: Order): boolean => 
      statusFilter === 'all' || order.status === statusFilter
    )
  }, [orders, statusFilter]) as Order[]

  const orderStatus: OrderStatus = useMemo(() => {
    const status: OrderStatus = {
      all: orders.length,
      pending: getStatusCount('pending'),
      preparing: getStatusCount('preparing'),
      ready: getStatusCount('ready'),
      completed: getStatusCount('completed')
    }
    return status
  }, [orders])

  if (!isAdminAuthenticated) {
    return <AdminLogin />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-600">
              Manage orders and menu items
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleLogout}
              className="px-4 py-2 rounded-md text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              <LogOut className="h-5 w-5 inline-block mr-2" />
              Logout
            </button>
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                statusFilter === 'all' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              All ({orderStatus.all})
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                statusFilter === 'pending' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Pending ({orderStatus.pending})
            </button>
            <button
              onClick={() => setStatusFilter('preparing')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                statusFilter === 'preparing' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Preparing ({orderStatus.preparing})
            </button>
            <button
              onClick={() => setStatusFilter('ready')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                statusFilter === 'ready' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Ready ({orderStatus.ready})
            </button>
            <button
              onClick={() => setStatusFilter('completed')}
              className={`px-4 py-2 rounded-md text-sm font-medium ${
                statusFilter === 'completed' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Completed ({orderStatus.completed})
            </button>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={audioEnabled}
                onChange={(e) => setAudioEnabled(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
              <span>Enable Audio Notifications</span>
            </div>
            <select
              value={soundType}
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setSoundType(e.target.value as SoundType)}
              className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="default">Default</option>
              <option value="ping">Ping</option>
              <option value="none">None</option>
            </select>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm p-1 mb-6 inline-flex">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'orders'
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <LogOut className="h-5 w-5" />
            Orders
          </button>
          <button
            onClick={() => setActiveTab('menu')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'menu'
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <LogOut className="h-5 w-5" />
            <Settings className="h-5 w-5" />
            Menu
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'orders' ? (
          <>
            <div className="flex justify-between items-center mb-6">
              <div className="flex space-x-4">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    statusFilter === 'all' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setStatusFilter('pending')}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    statusFilter === 'pending' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Pending ({getStatusCount('pending')})
                </button>
                <button
                  onClick={() => setStatusFilter('preparing')}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    statusFilter === 'preparing' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Preparing ({getStatusCount('preparing')})
                </button>
                <button
                  onClick={() => setStatusFilter('ready')}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    statusFilter === 'ready' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Ready ({getStatusCount('ready')})
                </button>
                <button
                  onClick={() => setStatusFilter('completed')}
                  className={`px-4 py-2 rounded-md text-sm font-medium ${
                    statusFilter === 'completed' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Completed ({getStatusCount('completed')})
                </button>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={audioEnabled}
                    onChange={(e) => setAudioEnabled(e.target.checked)}
                    className="rounded border-gray-300 text-indigo-600 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                  <span>Enable Audio Notifications</span>
                </div>
                <select
                  value={soundType}
                  onChange={(e) => setSoundType(e.target.value as SoundType)}
                  className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="default">Default</option>
                  <option value="ping">Ping</option>
                  <option value="none">None</option>
                </select>
              </div>
            </div>

            <div className="grid gap-6">
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