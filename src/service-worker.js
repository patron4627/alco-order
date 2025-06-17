self.addEventListener('push', function(event) {
  const data = event.data.json();
  
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192x192.png',
      tag: data.tag,
      requireInteraction: true,
      vibrate: [200, 100, 200],
      actions: [
        { action: 'open', title: 'Öffnen', icon: '/icon-192x192.png' }
      ]
    })
  );
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  
  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/admin')
    );
  }
});
