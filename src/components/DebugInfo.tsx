import React, { useState } from 'react'

const DebugInfo: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false)

  const testPush = async () => {
    try {
      console.log('🧪 Starting comprehensive push test...')
      
      // 1. Service Worker Status prüfen
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration()
        console.log('1. Service Worker Status:', registration?.active ? 'Aktiv' : 'Nicht aktiv')
        
        if (!registration?.active) {
          alert('❌ Service Worker ist nicht aktiv!')
          return
        }
      }
      
      // 2. Push-Subscription prüfen
      const subscription = await navigator.serviceWorker.ready.then(registration => 
        registration.pushManager.getSubscription()
      )
      console.log('2. Push Subscription:', subscription ? 'Vorhanden' : 'Nicht vorhanden')
      
      if (!subscription) {
        alert('❌ Keine Push-Subscription vorhanden!')
        return
      }
      
      // 3. Test-Push senden
      console.log('3. Sende Test-Push...')
      
      // Direkt über die Edge Function testen
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push-notification`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))),
              auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!)))
            }
          },
          payload: {
            title: '🧪 Test Push Benachrichtigung',
            body: 'Dies ist eine Test-Push-Benachrichtigung mit Ton!',
            icon: '/icon-192x192.png',
            tag: 'test-notification',
            data: { type: 'test' }
          },
          type: 'web-push'
        })
      })
      
      if (response.ok) {
        const result = await response.json()
        console.log('✅ Test-Push erfolgreich gesendet:', result)
        alert('✅ Test-Push erfolgreich gesendet! Schaue nach einer Benachrichtigung.')
      } else {
        const error = await response.text()
        console.error('❌ Test-Push fehlgeschlagen:', error)
        alert('❌ Test-Push fehlgeschlagen: ' + error)
      }
      
    } catch (error) {
      console.error('❌ Test failed:', error)
      alert('❌ Test fehlgeschlagen: ' + error)
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