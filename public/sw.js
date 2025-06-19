// Service Worker für Push Notifications
const CACHE_NAME = 'restaurant-app-v1'

// VAPID Public Key - muss mit dem Server übereinstimmen
const VAPID_PUBLIC_KEY = 'BEl62iUYgUivxIkv69yViEuiBIa40HI8DLLiAKsHaNNBIiE-qP8zrtJxAKNLXxFHBMCOShmkiMY_wSdxsp1VvQc'

// Service Worker Installation
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...')
  self.skipWaiting()
})

// Service Worker Aktivierung
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activated')
  event.waitUntil(self.clients.claim())
})

// Push Event Handler - Das ist der wichtigste Teil!
self.addEventListener('push', (event) => {
  console.log('📱 Push notification received:', event)
  console.log('📱 Push data:', event.data)
  
  let notificationData = {
    title: 'Restaurant Benachrichtigung',
    body: 'Sie haben eine neue Nachricht',
    icon: '/icon-192x192.png',
    badge: '/icon-192x192.png',
    tag: 'restaurant-notification',
    data: {},
    actions: []
  }

  // Parse Push Data
  if (event.data) {
    try {
      const pushData = event.data.json()
      console.log('📱 Parsed push data:', pushData)
      notificationData = { ...notificationData, ...pushData }
    } catch (error) {
      console.error('❌ Error parsing push data:', error)
      notificationData.body = event.data.text() || notificationData.body
    }
  }

  console.log('📱 Final notification data:', notificationData)

  // Zeige Notification
  const notificationPromise = self.registration.showNotification(
    notificationData.title,
    {
      body: notificationData.body,
      icon: notificationData.icon,
      badge: notificationData.badge,
      tag: notificationData.tag,
      data: notificationData.data,
      actions: notificationData.actions,
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200, 100, 200],
      silent: false,
      // Zusätzliche Optionen für bessere Kompatibilität
      dir: 'ltr',
      lang: 'de',
      renotify: true
    }
  )

  event.waitUntil(notificationPromise)
})

// Notification Click Handler
self.addEventListener('notificationclick', (event) => {
  console.log('📱 Notification clicked:', event.notification.data)
  
  event.notification.close()
  
  const data = event.notification.data
  let url = '/'
  
  // URL basierend auf Notification Type bestimmen
  if (data && data.type === 'new-order') {
    url = '/admin'
  } else if (data && data.type === 'order-confirmed' && data.orderId) {
    url = `/order-confirmation/${data.orderId}`
  } else if (data && data.url) {
    url = data.url
  }
  
  console.log('📱 Opening URL:', url)
  
  // App öffnen oder fokussieren
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      // Prüfe ob App bereits offen ist
      for (const client of clients) {
        if (client.url.includes(url) && 'focus' in client) {
          console.log('📱 Focusing existing client')
          return client.focus()
        }
      }
      
      // Öffne neue App-Instanz
      if (self.clients.openWindow) {
        console.log('📱 Opening new window')
        return self.clients.openWindow(url)
      }
    })
  )
})

// Background Sync für offline Funktionalität
self.addEventListener('sync', (event) => {
  console.log('🔄 Background sync:', event.tag)
})

// Fetch Handler für Caching
self.addEventListener('fetch', (event) => {
  // Nur für wichtige Ressourcen cachen
  if (event.request.url.includes('/api/') || event.request.url.includes('supabase')) {
    return // Keine API-Calls cachen
  }
  
  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request)
    })
  )
})