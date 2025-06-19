import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface PushSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

interface NotificationPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  tag?: string
  data?: any
  actions?: Array<{
    action: string
    title: string
    icon?: string
  }>
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { subscription, payload, type } = await req.json()
    console.log('📤 Received push notification request:', { type, payload: payload?.title })

    if (!subscription || !payload) {
      console.error('❌ Missing subscription or payload')
      return new Response(
        JSON.stringify({ error: 'Missing subscription or payload' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // VAPID Keys - Diese sollten in den Supabase Secrets gespeichert werden
    const vapidKeys = {
      publicKey: Deno.env.get('VAPID_PUBLIC_KEY') || 'BEl62iUYgUivxIkv69yViEuiBIa40HI8DLLiAKsHaNNBIiE-qP8zrtJxAKNLXxFHBMCOShmkiMY_wSdxsp1VvQc',
      privateKey: Deno.env.get('VAPID_PRIVATE_KEY') || 'UUxI4O8-FbRouAevSmBQ6o18hgE4nSG3qwvJTfKc-ls'
    }
    
    console.log('🔑 Using VAPID keys:', { 
      publicKey: vapidKeys.publicKey.substring(0, 20) + '...',
      hasPrivateKey: !!vapidKeys.privateKey 
    })
    
    const webpush = await import('npm:web-push@3.6.7')
    webpush.setVapidDetails('mailto:admin@restaurant.com', vapidKeys.publicKey, vapidKeys.privateKey)

    // Notification Payload erstellen
    const notificationPayload: NotificationPayload = {
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icon-192x192.png',
      badge: '/icon-192x192.png',
      tag: payload.tag || 'restaurant-notification',
      data: payload.data || {},
      actions: payload.actions || []
    }

    console.log('📱 Notification payload:', notificationPayload)

    // Push Notification senden
    console.log(`📤 Sending to subscription: ${subscription.endpoint.substring(0, 50)}...`)
    
    // Sende die Benachrichtigung als JSON-String für den Service Worker
    const pushPayload = JSON.stringify(notificationPayload)
    console.log('📤 Push payload:', pushPayload)
    
    await webpush.sendNotification(
      subscription,
      pushPayload,
      {
        urgency: 'high',
        TTL: 60 * 60 * 24 // 24 Stunden
      }
    )

    console.log('✅ Push notification sent successfully')

    return new Response(
      JSON.stringify({ success: true, message: 'Push notification sent successfully' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('❌ Error sending push notification:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send push notification', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})