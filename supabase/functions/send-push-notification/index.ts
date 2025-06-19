import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

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

    // Supabase Client für DB-Zugriff
    let allSubscriptions = []
    if (type === 'broadcast') {
      if (!Deno.env.get('SUPABASE_URL') || !Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
        console.error('❌ Supabase env missing')
        return new Response(JSON.stringify({ error: 'Supabase env missing' }), { status: 500, headers: corsHeaders })
      }
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      )
      // Alle aktiven Subscriptions holen
      const { data, error } = await supabase.from('push_subscriptions').select('*')
      if (error) {
        console.error('❌ Failed to fetch subscriptions:', error)
        return new Response(JSON.stringify({ error: 'Failed to fetch subscriptions', details: error.message }), { status: 500, headers: corsHeaders })
      }
      allSubscriptions = data
      console.log(`📋 Found ${allSubscriptions.length} subscriptions for broadcast`)
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

    if (type === 'broadcast') {
      // An alle Subscriptions schicken
      let successCount = 0
      let failCount = 0
      for (const sub of allSubscriptions) {
        try {
          console.log(`📤 Sending to subscription: ${sub.endpoint.substring(0, 50)}...`)
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.keys.p256dh,
                auth: sub.keys.auth
              }
            },
            JSON.stringify(notificationPayload),
            { urgency: 'high', TTL: 60 * 60 * 24 }
          )
          successCount++
          console.log(`✅ Successfully sent to subscription ${successCount}`)
        } catch (err) {
          failCount++
          console.error(`❌ Failed to send to subscription ${failCount}:`, err)
        }
      }
      console.log(`📊 Broadcast complete: ${successCount} success, ${failCount} failed`)
      return new Response(JSON.stringify({ success: true, sent: successCount, failed: failCount }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Push Notification senden
    console.log(`📤 Sending to single subscription: ${subscription.endpoint.substring(0, 50)}...`)
    
    // Wichtig: Sende die Benachrichtigung als JSON-String für den Service Worker
    const pushPayload = JSON.stringify(notificationPayload)
    console.log('📤 Push payload:', pushPayload)
    
    await webpush.sendNotification(
      subscription,
      pushPayload,
      {
        urgency: 'high',
        TTL: 60 * 60 * 24, // 24 Stunden
        // Zusätzliche Header für bessere Kompatibilität
        headers: {
          'Content-Type': 'application/json',
          'Content-Encoding': 'aes128gcm'
        }
      }
    )

    console.log('✅ Push notification sent successfully')

    // Optional: Push Notification in Datenbank speichern
    if (Deno.env.get('SUPABASE_URL') && Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
      )

      await supabase
        .from('push_notifications')
        .insert({
          title: payload.title,
          body: payload.body,
          tag: payload.tag || 'restaurant-notification'
        })
    }

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