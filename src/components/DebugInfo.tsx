import React, { useState } from 'react'
import { Bell, Smartphone, X } from 'lucide-react'
import { webPushService } from '../lib/webPushService'

const DebugInfo: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false)

  const testPush = async () => {
    try {
      console.log('🧪 Testing push notification...')
      await webPushService.sendPushNotification({
        title: '🧪 Test Benachrichtigung',
        body: 'Dies ist eine Test-Push-Benachrichtigung',
        icon: '/icon-192x192.png',
        tag: 'test-notification'
      })
      console.log('✅ Test push sent successfully')
    } catch (error) {
      console.error('❌ Test push failed:', error)
    }
  }

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 bg-blue-600 text-white p-3 rounded-full shadow-lg z-50"
        title="Debug Info"
      >
        <Smartphone className="w-6 h-6" />
      </button>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white border border-gray-300 rounded-lg shadow-lg p-4 w-72 z-50">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Push Debug
        </h3>
        <button
          onClick={() => setIsVisible(false)}
          className="text-gray-500 hover:text-gray-700"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-3 text-sm">
        <div>
          <strong>Push unterstützt:</strong> {webPushService.isSupported() ? '✅' : '❌'}
        </div>
        <div>
          <strong>Subscribed:</strong> {webPushService.isSubscribed() ? '✅' : '❌'}
        </div>
        <div>
          <strong>Service Worker:</strong> {webPushService.isServiceWorkerReady() ? '✅' : '❌'}
        </div>
        <div>
          <strong>Berechtigung:</strong> {Notification.permission}
        </div>
        
        <button
          onClick={testPush}
          className="w-full px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Test Push senden
        </button>
      </div>
    </div>
  )
}

export default DebugInfo 