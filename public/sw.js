// Service Worker für Push Notifications
const CACHE_NAME = 'restaurant-app-v1'

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

// Push Notification Handler
self.addEventListener('notificationclick', (event) => {
  console.log('📱 Notification clicked:', event.notification.data)
  
  event.notification.close()
  
  const data = event.notification.data
  let url = '/'
  
  if (data && data.type === 'new-order') {
    url = '/admin'
  } else if (data && data.type === 'order-confirmed' && data.orderId) {
    url = `/order-confirmation/${data.orderId}`
  }
  
  // App öffnen oder fokussieren
  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((clients) => {
      // Prüfe ob App bereits offen ist
      for (const client of clients) {
        if (client.url.includes(url) && 'focus' in client) {
          return client.focus()
        }
      }
      
      // Öffne neue App-Instanz
      if (self.clients.openWindow) {
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