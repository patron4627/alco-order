import React, { useState, useEffect } from 'react'
import { X, Smartphone, Bell, AlertCircle, CheckCircle } from 'lucide-react'
import { webPushService } from '../lib/webPushService'

interface DebugLog {
  timestamp: string
  level: 'info' | 'error' | 'success'
  message: string
}

const DebugPanel: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false)
  const [logs, setLogs] = useState<DebugLog[]>([])
  const [pushStatus, setPushStatus] = useState({
    isSupported: false,
    isSubscribed: false,
    serviceWorkerReady: false,
    permission: 'default' as NotificationPermission
  })

  useEffect(() => {
    // Debug-Logs sammeln
    const originalLog = console.log
    const originalError = console.error

    console.log = (...args) => {
      originalLog(...args)
      addLog('info', args.join(' '))
    }

    console.error = (...args) => {
      originalError(...args)
      addLog('error', args.join(' '))
    }

    // Push-Status prüfen
    checkPushStatus()

    return () => {
      console.log = originalLog
      console.error = originalError
    }
  }, [])

  const addLog = (level: 'info' | 'error' | 'success', message: string) => {
    setLogs(prev => [
      {
        timestamp: new Date().toLocaleTimeString(),
        level,
        message: message.substring(0, 100) // Begrenzen für bessere Lesbarkeit
      },
      ...prev.slice(0, 19) // Nur die letzten 20 Logs
    ])
  }

  const checkPushStatus = async () => {
    const status = {
      isSupported: webPushService.isSupported(),
      isSubscribed: webPushService.isSubscribed(),
      serviceWorkerReady: webPushService.isServiceWorkerReady(),
      permission: Notification.permission
    }
    setPushStatus(status)
    addLog('info', `Push Status: ${JSON.stringify(status)}`)
  }

  const testPushNotification = async () => {
    try {
      addLog('info', 'Testing push notification...')
      await webPushService.sendPushNotification({
        title: '🧪 Test Benachrichtigung',
        body: 'Dies ist eine Test-Push-Benachrichtigung',
        icon: '/icon-192x192.png',
        tag: 'test-notification'
      })
      addLog('success', 'Test push notification sent successfully')
    } catch (error) {
      addLog('error', `Test push failed: ${error}`)
    }
  }

  const getStatusIcon = () => {
    if (pushStatus.isSupported && pushStatus.isSubscribed) {
      return <CheckCircle className="w-4 h-4 text-green-500" />
    } else if (pushStatus.isSupported) {
      return <AlertCircle className="w-4 h-4 text-yellow-500" />
    } else {
      return <X className="w-4 h-4 text-red-500" />
    }
  }

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-gray-800 text-white p-3 rounded-full shadow-lg z-50"
        title="Debug Panel öffnen"
      >
        <Smartphone className="w-6 h-6" />
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 w-80 max-h-96 overflow-hidden z-50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Smartphone className="w-5 h-5" />
          Debug Panel
        </h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Push Status */}
      <div className="mb-4 p-3 bg-gray-50 rounded-lg">
        <h4 className="font-medium mb-2 flex items-center gap-2">
          <Bell className="w-4 h-4" />
          Push Status
        </h4>
        <div className="space-y-1 text-sm">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <span>Push unterstützt: {pushStatus.isSupported ? '✅' : '❌'}</span>
          </div>
          <div>Subscribed: {pushStatus.isSubscribed ? '✅' : '❌'}</div>
          <div>Service Worker: {pushStatus.serviceWorkerReady ? '✅' : '❌'}</div>
          <div>Berechtigung: {pushStatus.permission}</div>
        </div>
        <button
          onClick={testPushNotification}
          className="mt-2 px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600"
        >
          Test Push
        </button>
      </div>

      {/* Logs */}
      <div className="mb-2">
        <h4 className="font-medium mb-2">Logs</h4>
        <div className="max-h-32 overflow-y-auto text-xs space-y-1">
          {logs.map((log, index) => (
            <div
              key={index}
              className={`p-1 rounded ${
                log.level === 'error' ? 'bg-red-100 text-red-800' :
                log.level === 'success' ? 'bg-green-100 text-green-800' :
                'bg-gray-100 text-gray-800'
              }`}
            >
              <span className="text-gray-500">{log.timestamp}</span>
              <span className="ml-2">{log.message}</span>
            </div>
          ))}
        </div>
      </div>

      <button
        onClick={() => setLogs([])}
        className="text-xs text-gray-500 hover:text-gray-700"
      >
        Logs löschen
      </button>
    </div>
  )
}

export default DebugPanel 