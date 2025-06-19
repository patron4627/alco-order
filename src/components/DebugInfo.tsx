import React, { useState } from 'react'

const DebugInfo: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false)

  const testPush = async () => {
    try {
      console.log('🧪 Testing push notification...')
      
      // Versuche Service Worker zu aktivieren
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/sw.js')
          console.log('✅ Service Worker registered:', registration)
          
          // Warte bis Service Worker aktiv ist
          if (registration.installing) {
            await new Promise(resolve => {
              registration.installing!.addEventListener('statechange', () => {
                if (registration.installing!.state === 'activated') {
                  resolve(true)
                }
              })
            })
          }
          
          console.log('✅ Service Worker activated')
        } catch (error) {
          console.error('❌ Failed to register service worker:', error)
        }
      }
      
      // Teste Push-API
      if ('serviceWorker' in navigator && 'PushManager' in window) {
        console.log('✅ Push API supported')
        alert('Push API wird unterstützt! Service Worker sollte jetzt aktiv sein.')
      } else {
        console.log('❌ Push API not supported')
        alert('Push API wird nicht unterstützt!')
      }
    } catch (error) {
      console.error('❌ Test failed:', error)
      alert('Test fehlgeschlagen: ' + error)
    }
  }

  const checkStatus = async () => {
    const status = {
      serviceWorker: 'serviceWorker' in navigator,
      pushManager: 'PushManager' in window,
      notification: 'Notification' in window,
      permission: Notification.permission
    }
    
    // Prüfe Service Worker Status synchron
    let swStatus = 'Nicht verfügbar'
    if ('serviceWorker' in navigator) {
      try {
        const registration = await navigator.serviceWorker.getRegistration()
        if (registration && registration.active) {
          swStatus = 'Aktiv'
        } else if (registration) {
          swStatus = 'Registriert aber nicht aktiv'
        } else {
          swStatus = 'Nicht registriert'
        }
      } catch (error) {
        swStatus = 'Fehler beim Prüfen'
        console.error('SW Status check error:', error)
      }
    }
    
    const statusText = `
Push Status:
- Service Worker: ${status.serviceWorker ? '✅' : '❌'}
- Push Manager: ${status.pushManager ? '✅' : '❌'}
- Notification: ${status.notification ? '✅' : '❌'}
- Berechtigung: ${status.permission}
- SW Status: ${swStatus}
    `
    
    alert(statusText)
    console.log('Push Status:', status, 'SW Status:', swStatus)
  }

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        style={{
          position: 'fixed',
          bottom: '16px',
          right: '16px',
          backgroundColor: '#2563eb',
          color: 'white',
          padding: '12px',
          borderRadius: '50%',
          border: 'none',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
          zIndex: 50,
          cursor: 'pointer'
        }}
        title="Debug Info"
      >
        📱
      </button>
    )
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '16px',
      right: '16px',
      backgroundColor: 'white',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
      padding: '16px',
      width: '280px',
      zIndex: 50
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '16px'
      }}>
        <h3 style={{
          fontSize: '18px',
          fontWeight: '600',
          margin: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          🔔 Push Debug
        </h3>
        <button
          onClick={() => setIsVisible(false)}
          style={{
            background: 'none',
            border: 'none',
            color: '#6b7280',
            cursor: 'pointer',
            fontSize: '20px'
          }}
        >
          ✕
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <button
          onClick={checkStatus}
          style={{
            padding: '8px 12px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Status prüfen
        </button>
        
        <button
          onClick={testPush}
          style={{
            padding: '8px 12px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          Test Push
        </button>
      </div>
    </div>
  )
}

export default DebugInfo 