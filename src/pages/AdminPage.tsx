import React, { useState, useEffect } from 'react'
import { Bell, RefreshCw, Filter, LogOut, Settings, Plus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import OrderCard from '../components/OrderCard'
import AdminLogin from '../components/AdminLogin'
import MenuManagement from '../components/MenuManagement'

interface Order {
  id: string
  status: 'pending' | 'preparing' | 'ready' | 'completed'
  [key: string]: any
}

type SoundType = 'default' | 'alert' | 'notification' | 'ping' | 'none'
interface SoundConfig {
  frequencies: number[]
  durations: number[]
  delays: number[]
}

const AdminPage: React.FC = () => {
  const { isAdminAuthenticated, logout } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'preparing' | 'ready' | 'completed'>('all')
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true)
  const [activeTab, setActiveTab] = useState<'orders' | 'menu'>('orders')
  const [connectionStatus, setConnectionStatus] = useState<'SUBSCRIBED' | 'CHANNEL_ERROR' | 'connecting'>('connecting')
  const [soundType, setSoundType] = useState<SoundType>('default')
  const [retryAttempt, setRetryAttempt] = useState<number>(0)
  const [channel, setChannel] = useState<any>(null)

  const soundConfig: Record<SoundType, SoundConfig> = {
    default: {
      frequencies: [440, 494, 523],
      durations: [0.1, 0.1, 0.1],
      delays: [0, 100, 200]
    },
    alert: {
      frequencies: [261, 392, 523],
      durations: [0.2, 0.2, 0.2],
      delays: [0, 150, 300]
    },
    notification: {
      frequencies: [330, 392, 440],
      durations: [0.15, 0.15, 0.15],
      delays: [0, 100, 200]
    },
    ping: {
      frequencies: [659],
      durations: [0.1],
      delays: [0]
    },
    none: {
      frequencies: [],
      durations: [],
      delays: []
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
        (payload: any) => {
          console.log(' Realtime event received:', payload.eventType, payload)
          setConnectionStatus('SUBSCRIBED')
          if (payload.eventType === 'INSERT') {
            const newOrder = payload.new as Order
            setOrders(prev => [...prev, newOrder])
            if (audioEnabled && soundType !== 'none') {
              playNewOrderSound('ping')
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedOrder = payload.new as Order
            setOrders(prev => prev.map(order => order.id === updatedOrder.id ? updatedOrder : order))
            if (audioEnabled && soundType !== 'none' && updatedOrder.status !== 'pending') {
              playNewOrderSound(soundType)
            }
          }
        }
      )
      .subscribe((status: string) => {
        console.log(' Subscription status:', status)
        setConnectionStatus(status)
        if (status === 'CHANNEL_ERROR') {
          const retryInterval = Math.min(30000, 2000 * (retryAttempt + 1))
          setTimeout(() => {
            setRetryAttempt(prev => prev + 1)
            setupRealtimeSubscription()
          }, retryInterval)
        }
      })

    return () => {
      console.log(' Unsubscribing from channel')
      supabase.removeChannel(channel)
    }
  }

  const playNewOrderSound = (type: SoundType) => {
    if (!audioEnabled || type === 'none') return
    try {
      const audioCtx = new AudioContext()
      const oscillator = audioCtx.createOscillator()
      const config = soundConfig[type]
      let currentTime = 0
      const gainNode = audioCtx.createGain()
      gainNode.gain.value = 0.7
      oscillator.connect(gainNode)
      gainNode.connect(audioCtx.destination)
      config.frequencies.forEach((frequency: number, index: number) => {
        oscillator.frequency.value = frequency
        oscillator.start(currentTime)
        oscillator.stop(currentTime + config.durations[index])
        currentTime += config.delays[index] / 1000
      })
      oscillator.start()
      oscillator.stop(currentTime + config.durations[config.durations.length - 1])
    } catch (error) {
      console.error('Could not play notification sound:', error)
    }
  }

  const handleStatusUpdate = (orderId: string, newStatus: Order['status']) => {
    const updatedOrders = orders.map(order => 
      order.id === orderId ? { ...order, status: newStatus } : order
    )
    setOrders(updatedOrders)
  }

  const handleLogout = () => {
    logout()
    window.location.href = '/admin/login'
  }

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error
        setOrders(data)
      } catch (error) {
        console.error('Error fetching orders:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()
    setupRealtimeSubscription()

    return () => {
      setConnectionStatus('disconnected')
    }
  }, [retryAttempt])

  if (!isAdminAuthenticated) {
    return <AdminLogin />
  }

  const filteredOrders = statusFilter === 'all' ? orders : orders.filter(order => order.status === statusFilter)
  const getStatusCount = (status: Order['status']): number => orders.filter(order => order.status === status).length

  if (loading && activeTab === 'orders') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
          <span className="text-gray-600">Loading orders...</span>
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
              Manage orders and menu items
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <LogOut className="h-5 w-5 mr-2" />
              Logout
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm p-1 mb-6 inline-flex">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'orders'
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Bell className="h-5 w-5" />
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
                  <option value="alert">Alert</option>
                  <option value="notification">Notification</option>
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

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('orders')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error
        setOrders(data)
      } catch (error) {
        console.error('Error fetching orders:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchOrders()
    setupRealtimeSubscription()

    return () => {
      setConnectionStatus('disconnected')
    }
  }, [retryAttempt])

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrders(data)
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
        (payload: any) => {
          console.log(' Realtime event received:', payload.eventType, payload)
          setConnectionStatus('SUBSCRIBED')
          if (payload.eventType === 'INSERT') {
            const newOrder = payload.new as Order
            setOrders(prev => [...prev, newOrder])
            if (audioEnabled && soundType !== 'none') {
              playNewOrderSound('ping')
            }
          } else if (payload.eventType === 'UPDATE') {
            const updatedOrder = payload.new as Order
            setOrders(prev => prev.map(order => order.id === updatedOrder.id ? updatedOrder : order))
            if (audioEnabled && soundType !== 'none' && updatedOrder.status !== 'pending') {
              playNewOrderSound(soundType)
            }
          }
        }
      )
      .subscribe((status: string) => {
        console.log(' Subscription status:', status)
        setConnectionStatus(status)
        if (status === 'CHANNEL_ERROR') {
          const retryInterval = Math.min(30000, 2000 * (retryAttempt + 1))
          setTimeout(() => {
            setRetryAttempt(prev => prev + 1)
            setupRealtimeSubscription()
          }, retryInterval)
        }
      })

    return () => {
      console.log(' Unsubscribing from channel')
      supabase.removeChannel(channel)
    }
  }

  const playNewOrderSound = (type: SoundType) => {
    if (!audioEnabled || type === 'none') return
    try {
      const audioCtx = new AudioContext()
      const oscillator = audioCtx.createOscillator()
      const config = soundConfig[type]
      let currentTime = 0
      const gainNode = audioCtx.createGain()
      gainNode.gain.value = 0.7
      oscillator.connect(gainNode)
      gainNode.connect(audioCtx.destination)
      config.frequencies.forEach((frequency: number, index: number) => {
        oscillator.frequency.value = frequency
        oscillator.start(currentTime)
        oscillator.stop(currentTime + config.durations[index])
        currentTime += config.delays[index] / 1000
      })
      oscillator.start()
      oscillator.stop(currentTime + config.durations[config.durations.length - 1])
    } catch (error) {
      console.error('Could not play notification sound:', error)
    }
  }

  const handleStatusUpdate = (orderId: string, newStatus: Order['status']) => {
    const updatedOrders = orders.map(order => 
      order.id === orderId ? { ...order, status: newStatus } : order
    )
    setOrders(updatedOrders)
  }

  const handleLogout = () => {
    logout()
    window.location.href = '/admin/login'
  }

  if (!isAdminAuthenticated) {
    return <AdminLogin />
  }

  const filteredOrders = statusFilter === 'all' ? orders : orders.filter(order => order.status === statusFilter)
  const getStatusCount = (status: Order['status']): number => orders.filter(order => order.status === status).length

  if (loading && activeTab === 'orders') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <RefreshCw className="h-6 w-6 animate-spin text-gray-400" />
          <span className="text-gray-600">Loading orders...</span>
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
              Manage orders and menu items
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={handleLogout}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
              <LogOut className="h-5 w-5 mr-2" />
              Logout
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow-sm p-1 mb-6 inline-flex">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-md font-medium transition-colors ${
              activeTab === 'orders'
                ? 'bg-blue-500 text-white hover:bg-blue-600'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Bell className="h-5 w-5" />
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
                  onChange={(e) => setSoundType(e.target.value as 'default' | 'alert' | 'notification' | 'ping' | 'none')}
                  className="rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="default">Default</option>
                  <option value="alert">Alert</option>
                  <option value="notification">Notification</option>
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