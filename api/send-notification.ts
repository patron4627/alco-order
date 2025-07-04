import { WebPushProvider } from '@vercel/web-push';

const webPush = new WebPushProvider({
  vapidDetails: {
    subject: 'mailto:your-email@example.com',
    publicKey: request.env.PUSH_PUBLIC_KEY,
    privateKey: request.env.PUSH_PRIVATE_KEY,
  },
});

export default async function handler(request: Request) {
  try {
    const { subscription, title, body, data } = await request.json()
    
    const payload = {
      title,
      body,
      data,
      icon: '/icon-192x192.png',
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200],
      actions: [
        {
          action: 'view',
          title: 'Bestellung anzeigen',
          icon: '/icon-192x192.png'
        }
      ],
      badge: '/icon-192x192.png',
      renotify: true,
      silent: false,
      tag: 'new-order',
      timestamp: Date.now(),
      data: {
        ...data,
        url: '/orders', // URL, zu der die Benachrichtigung führt
        priority: 'high',
        ttl: 2419200 // 28 Tage
      }
    }

    await webPush.sendNotification(subscription, JSON.stringify(payload))
    
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (error) {
    console.error('Error sending notification:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
