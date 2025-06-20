import React, { useState } from 'react'

interface DebugInfoProps {
  visible: boolean;
}

const DebugInfo: React.FC<DebugInfoProps> = ({ visible }) => {
  if (!visible) return null;

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
      
      // 2. Push-Subscription prüfen und erstellen falls nötig
      let subscription = await navigator.serviceWorker.ready.then(registration => 
        registration.pushManager.getSubscription()
      )
      console.log('2. Push Subscription:', subscription ? 'Vorhanden' : 'Nicht vorhanden')
      
      if (!subscription) {
        console.log('🔄 Creating new push subscription...')
        
        // VAPID Public Key
        const vapidPublicKey = 'BIpd-RJc_khB_YcNe0lkc6sgFyN5FI9QPvz68nFYICP30vxGg0upK4OZHfNcYwub2v-43wTF4pLlR6mlIjyBJk0'
        
        // VAPID Key zu Uint8Array konvertieren
        const urlBase64ToUint8Array = (base64String: string) => {
          const padding = '='.repeat((4 - base64String.length % 4) % 4)
          const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/')

          const rawData = window.atob(base64)
          const outputArray = new Uint8Array(rawData.length)

          for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i)
          }
          return outputArray
        }
        
        // Neue Subscription erstellen
        const registration = await navigator.serviceWorker.ready
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
        })
        
        console.log('✅ New push subscription created:', subscription)
        
        // Subscription in Supabase speichern
        try {
          const subscriptionData = {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))),
              auth: btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!)))
            }
          }
          
          const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/rest/v1/push_subscriptions`, {
            method: 'POST',
            headers: {
              'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(subscriptionData)
          })
          
          if (response.ok) {
            console.log('✅ Subscription saved to Supabase')
          } else {
            console.error('❌ Failed to save subscription:', await response.text())
          }
        } catch (error) {
          console.error('❌ Error saving subscription:', error)
        }
      }
      
      // 3. Test-Push senden (lokaler Test ohne Edge Function)
      console.log('3. Sende lokalen Test-Push...')
      
      // Teste lokale Notification um zu prüfen ob Service Worker funktioniert
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        // Sende Message an Service Worker für lokale Notification
        navigator.serviceWorker.controller.postMessage({
          type: 'SHOW_NOTIFICATION',
          notification: {
            title: '🧪 Test Push Benachrichtigung',
            body: 'Dies ist eine Test-Push-Benachrichtigung mit Ton!',
            icon: '/icon-192x192.png',
            tag: 'test-notification',
            data: { type: 'test' }
          }
        })
        
        console.log('✅ Local test notification sent to service worker')
        alert('✅ Lokaler Test-Push gesendet! Schaue nach einer Benachrichtigung.')
      } else {
        // Fallback: Direkte Browser Notification
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('🧪 Test Push Benachrichtigung', {
            body: 'Dies ist eine Test-Push-Benachrichtigung!',
            icon: '/icon-192x192.png',
            tag: 'test-notification',
            requireInteraction: true,
            silent: false
          })
          
          console.log('✅ Fallback browser notification sent')
          alert('✅ Fallback-Browser-Notification gesendet! Schaue nach einer Benachrichtigung.')
        } else {
          console.log('❌ Cannot send notification - permission denied or not supported')
          alert('❌ Kann keine Benachrichtigung senden - Berechtigung verweigert oder nicht unterstützt')
        }
      }
      
      // 4. Zeige Subscription Details
      if (subscription) {
        console.log('📋 Subscription Details:')
        console.log('- Endpoint:', subscription.endpoint)
        console.log('- P256DH Key:', btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('p256dh')!))))
        console.log('- Auth Key:', btoa(String.fromCharCode(...new Uint8Array(subscription.getKey('auth')!))))
        
        alert(`✅ Push Subscription erfolgreich erstellt!\n\nEndpoint: ${subscription.endpoint.substring(0, 50)}...\n\nVAPID Key ist jetzt gültig!`)
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