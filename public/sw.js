// Service Worker für Push Notifications
const CACHE_NAME = 'restaurant-app-v1';
let errorCount = 0;
const MAX_ERROR_RETRIES = 3;

// Service Worker Installation
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker installing...');
  self.skipWaiting();
});

// Fehlerbehandlung und Logging
self.addEventListener('error', (event) => {
  console.error('Service Worker Error:', event.error);
  
  // Fehler zählen
  errorCount++;
  
  // Fehler-Tracking
  fetch('/api/error', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      error: event.error.message,
      timestamp: new Date().toISOString(),
      errorCount,
      type: 'service-worker-error'
    })
  });
  
  // Bei zu vielen Fehlern Service Worker neu starten
  if (errorCount >= MAX_ERROR_RETRIES) {
    console.error('Too many errors, restarting service worker...');
    self.skipWaiting();
    self.clients.claim();
  }
});

// Performance Monitoring
self.addEventListener('fetch', (event) => {
  const startTime = Date.now();
  
  event.respondWith(
    fetchWithTimeout(event.request).then(response => {
      const duration = Date.now() - startTime;
      
      // Performance-Logging
      if (duration > 2000) { // Über 2 Sekunden
        console.warn(`Slow request: ${duration}ms for ${event.request.url}`);
        fetch('/api/performance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            url: event.request.url,
            duration,
            timestamp: new Date().toISOString(),
            type: 'slow-request'
          })
        });
      }
      return response;
    })
  );
});

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

// Push Handler für neue Benachrichtigungen
self.addEventListener('push', (event) => {
  console.log('⚡ Push event received')
  
  const data = event.data.json()
  
  // Wichtige Daten extrahieren
  const title = data.title || 'Neue Bestellung'
  const body = data.body || 'Eine neue Bestellung wurde aufgegeben'
  const icon = data.icon || '/icon-192x192.png'
  const badge = data.badge || '/icon-192x192.png'
  const requireInteraction = data.requireInteraction || true
  const vibrate = data.vibrate || [200, 100, 200, 100, 200]
  const renotify = data.renotify || true
  const silent = data.silent || false
  const tag = data.tag || 'new-order'
  const timestamp = data.timestamp || Date.now()
  const orderId = data.orderId
  const type = data.type || 'new-order'
  
  // Benachrichtigung anzeigen
  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      badge,
      requireInteraction,
      vibrate,
      actions: [
        {
          action: 'view',
          title: 'Bestellung anzeigen',
          icon: '/icon-192x192.png'
        }
      ],
      renotify,
      silent,
      tag: `order-${orderId || Date.now()}`,
      timestamp,
      data: { orderId, type }
    })
  );
});

// Push-Subscription Change Handler
self.addEventListener('pushsubscriptionchange', (event) => {
  console.log('Push subscription changed, updating...');
  event.waitUntil(
    fetch('/api/update-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        subscription: event.newSubscription
      })
    })
  );
});

// Helper für API-Timeouts
const API_TIMEOUT = 30000; // 30 Sekunden Timeout

function fetchWithTimeout(resource, options = {}) {
  const { signal } = new AbortController();
  const timeout = setTimeout(() => signal.abort(), API_TIMEOUT);
  
  return fetch(resource, {
    ...options,
    signal
  }).finally(() => clearTimeout(timeout));
}

// Keep-Alive Mechanismus für Hintergrundaktivität
let keepAliveTimer;

function startKeepAlive() {
  if (keepAliveTimer) {
    clearTimeout(keepAliveTimer);
  }
  
  keepAliveTimer = setTimeout(() => {
    // Periodische Aktivität, um den Service Worker wach zu halten
    self.registration.sync.register('keep-alive');
    startKeepAlive(); // Wiederholen
  }, 15 * 60 * 1000); // alle 15 Minuten
}

// Periodische Synchronisierung (wenn verfügbar)
if ('periodicSync' in registration) {
  try {
    registration.periodicSync.register('periodic-sync', {
      minInterval: 24 * 60 * 60 * 1000, // einmal pro Tag
      powerState: 'auto',
      networkState: 'any'
    });
  } catch (error) {
    console.error('Periodic Sync nicht unterstützt:', error);
  }
}

// Background Sync für spezifische Operationen
self.addEventListener('sync', (event) => {
  if (event.tag === 'periodic-sync') {
    // Periodische Synchronisierung
    event.waitUntil(
      syncData().catch(error => {
        console.error('Synchronisierung fehlgeschlagen:', error);
        // Versuche es später erneut
        return self.registration.sync.register('periodic-sync');
      })
    );
  }
  
  if (event.tag === 'keep-alive') {
    // Keep-Alive Synchronisierung
    event.waitUntil(
      fetchWithTimeout('/api/keep-alive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
    );
  }
});

// Starte Keep-Alive beim Service Worker Start
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker activated');
  event.waitUntil(self.clients.claim());
  startKeepAlive(); // Keep-Alive starten
});

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