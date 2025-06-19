// Web Push Service für echte Push Notifications
export class WebPushService {
  private static instance: WebPushService
  private registration: ServiceWorkerRegistration | null = null
  private subscription: PushSubscription | null = null
  private isSupported = false
  private vapidPublicKey = 'BEl62iUYgUivxIkv69yViEuiBIa40HI8DLLiAKsHaNNBIiE-qP8zrtJxAKNLXxFHBMCOShmkiMY_wSdxsp1VvQc'

  private constructor() {
    this.checkSupport()
  }

  static getInstance(): WebPushService {
    if (!WebPushService.instance) {
      WebPushService.instance = new WebPushService()
    }
    return WebPushService.instance
  }

  private checkSupport() {
    this.isSupported = 
      'serviceWorker' in navigator && 
      'PushManager' in window && 
      'Notification' in window &&
      typeof navigator.serviceWorker.register === 'function'
  }

  async initialize(): Promise<boolean> {
    if (!this.isSupported) {
      console.log('❌ Web Push not supported in this environment')
      return false
    }

    try {
      console.log('🔧 Initializing Web Push Service...')

      // Service Worker registrieren
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      })
      
      console.log('✅ Service Worker registered:', this.registration)

      // Warten bis Service Worker aktiv ist
      await this.waitForServiceWorker()

      // Notification Permission anfordern
      const permission = await this.requestPermission()
      if (permission !== 'granted') {
        console.log('❌ Notification permission denied')
        return false
      }

      // Push Subscription erstellen
      await this.createPushSubscription()

      console.log('✅ Web Push Service initialized successfully')
      return true

    } catch (error) {
      console.error('❌ Failed to initialize Web Push Service:', error)
      return false
    }
  }

  private async waitForServiceWorker(): Promise<void> {
    if (!this.registration) return

    return new Promise((resolve) => {
      if (this.registration!.active) {
        resolve()
        return
      }

      const worker = this.registration!.installing || this.registration!.waiting
      if (worker) {
        worker.addEventListener('statechange', () => {
          if (worker.state === 'activated') {
            resolve()
          }
        })
      } else {
        resolve()
      }
    })
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported) return 'denied'

    let permission = Notification.permission

    if (permission === 'default') {
      permission = await Notification.requestPermission()
    }

    console.log('📱 Notification permission:', permission)
    return permission
  }

  private async createPushSubscription(): Promise<void> {
    if (!this.registration) {
      throw new Error('Service Worker not registered')
    }

    try {
      // Prüfe ob bereits eine Subscription existiert
      this.subscription = await this.registration.pushManager.getSubscription()

      if (!this.subscription) {
        console.log('🔔 Creating new push subscription...')
        
        // Neue Subscription erstellen
        this.subscription = await this.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
        })

        console.log('✅ Push subscription created:', this.subscription)
      } else {
        console.log('✅ Using existing push subscription')
      }

      // Subscription an Server senden (optional)
      await this.sendSubscriptionToServer()

    } catch (error) {
      console.error('❌ Failed to create push subscription:', error)
      throw error
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
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

  private async sendSubscriptionToServer(): Promise<void> {
    if (!this.subscription) return;
    try {
      // Subscription-Daten für Supabase vorbereiten - nur die Felder die existieren
      const subscriptionData = {
        endpoint: this.subscription.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(this.subscription.getKey('p256dh')!))),
          auth: btoa(String.fromCharCode(...new Uint8Array(this.subscription.getKey('auth')!)))
        }
      };
      
      console.log('📤 Sending subscription to Supabase:', subscriptionData);
      
      // First, check if subscription already exists
      const checkResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(this.subscription.endpoint)}`,
        {
          method: 'GET',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      let isUpdate = false;
      if (checkResponse.ok) {
        const existingSubscriptions = await checkResponse.json();
        isUpdate = existingSubscriptions.length > 0;
        console.log(`📋 Found ${existingSubscriptions.length} existing subscription(s)`);
      }
      
      // Use appropriate method based on whether subscription exists
      const method = isUpdate ? 'PATCH' : 'POST';
      const url = isUpdate 
        ? `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(this.subscription.endpoint)}`
        : `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/push_subscriptions`;
      
      const response = await fetch(url, {
        method: method,
        headers: {
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(subscriptionData)
      });
      
      console.log('📥 Response status:', response.status);
      console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Supabase error response:', errorText);
        throw new Error(`Failed to save subscription in Supabase: ${response.status} ${response.statusText} - ${errorText}`);
      }
      
      // Try to parse response as JSON if it has content
      const responseText = await response.text();
      console.log('📥 Response body:', responseText);
      
      if (responseText.trim()) {
        try {
          const responseJson = JSON.parse(responseText);
          console.log(`✅ Subscription successfully ${isUpdate ? 'updated' : 'saved'} in Supabase:`, responseJson);
        } catch (parseError) {
          console.warn('⚠️ Response is not valid JSON, but request was successful');
        }
      } else {
        console.log(`✅ Subscription successfully ${isUpdate ? 'updated' : 'saved'} in Supabase (empty response)`);
      }
      
    } catch (error) {
      console.error('❌ Failed to send subscription to server:', error);
      throw error; // Re-throw to handle it in the calling function
    }
  }

  async sendPushNotification(payload: {
    title: string
    body: string
    icon?: string
    tag?: string
    data?: any
    actions?: Array<{
      action: string
      title: string
      icon?: string
    }>
  }): Promise<boolean> {
    if (!this.subscription) {
      console.error('❌ No push subscription available')
      return false
    }

    try {
      const subscriptionData = {
        endpoint: this.subscription.endpoint,
        keys: {
          p256dh: btoa(String.fromCharCode(...new Uint8Array(this.subscription.getKey('p256dh')!))),
          auth: btoa(String.fromCharCode(...new Uint8Array(this.subscription.getKey('auth')!)))
        }
      }

      // Sende Push Notification über Supabase Edge Function
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-push-notification`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscription: subscriptionData,
          payload: payload,
          type: 'web-push'
        })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()
      console.log('✅ Push notification sent successfully:', result)
      return true

    } catch (error) {
      console.error('❌ Failed to send push notification:', error)
      return false
    }
  }

  // Spezielle Methode für neue Bestellungen
  async sendNewOrderNotification(orderData: {
    customerName: string
    totalAmount: number
    orderId: string
  }): Promise<boolean> {
    console.log('🔔 Attempting to send new order notification:', orderData)
    
    // Prüfe ob Subscription vorhanden ist
    if (!this.subscription) {
      console.warn('⚠️ No push subscription available, trying local notification')
      
      // Fallback: Lokale Benachrichtigung
      if (Notification.permission === 'granted') {
        try {
          new Notification('🔔 Neue Bestellung eingegangen!', {
            body: `${orderData.customerName} - ${orderData.totalAmount.toFixed(2)}€\nBestellung #${orderData.orderId.slice(-6)}`,
            icon: '/icon-192x192.png',
            tag: 'new-order-' + orderData.orderId,
            requireInteraction: true,
            silent: false
          })
          console.log('✅ Local notification sent successfully')
          return true
        } catch (error) {
          console.error('❌ Failed to send local notification:', error)
        }
      }
      
      return false
    }
    
    // Versuche Push-Benachrichtigung zu senden
    try {
      const result = await this.sendPushNotification({
        title: '🔔 Neue Bestellung eingegangen!',
        body: `${orderData.customerName} - ${orderData.totalAmount.toFixed(2)}€\nBestellung #${orderData.orderId.slice(-6)}`,
        icon: '/icon-192x192.png',
        tag: 'new-order-' + orderData.orderId,
        data: { 
          orderId: orderData.orderId, 
          type: 'new-order',
          url: '/admin'
        },
        actions: [
          {
            action: 'view',
            title: 'Bestellung anzeigen',
            icon: '/icon-192x192.png'
          },
          {
            action: 'dismiss',
            title: 'Schließen'
          }
        ]
      })
      
      if (result) {
        console.log('✅ Push notification sent successfully')
        return true
      } else {
        console.warn('⚠️ Push notification failed, trying local notification')
        
        // Fallback: Lokale Benachrichtigung
        if (Notification.permission === 'granted') {
          new Notification('🔔 Neue Bestellung eingegangen!', {
            body: `${orderData.customerName} - ${orderData.totalAmount.toFixed(2)}€\nBestellung #${orderData.orderId.slice(-6)}`,
            icon: '/icon-192x192.png',
            tag: 'new-order-' + orderData.orderId,
            requireInteraction: true,
            silent: false
          })
          console.log('✅ Local notification sent as fallback')
          return true
        }
      }
      
      return false
    } catch (error) {
      console.error('❌ Failed to send new order notification:', error)
      
      // Finaler Fallback: Lokale Benachrichtigung
      if (Notification.permission === 'granted') {
        try {
          new Notification('🔔 Neue Bestellung eingegangen!', {
            body: `${orderData.customerName} - ${orderData.totalAmount.toFixed(2)}€\nBestellung #${orderData.orderId.slice(-6)}`,
            icon: '/icon-192x192.png',
            tag: 'new-order-' + orderData.orderId,
            requireInteraction: true,
            silent: false
          })
          console.log('✅ Local notification sent as final fallback')
          return true
        } catch (localError) {
          console.error('❌ Failed to send local notification:', localError)
        }
      }
      
      return false
    }
  }

  // Spezielle Methode für Bestellbestätigungen
  async sendOrderConfirmationNotification(orderId: string): Promise<boolean> {
    return await this.sendPushNotification({
      title: '🎉 Bestellung bestätigt!',
      body: 'Ihre Bestellung wurde bestätigt und wird zubereitet.',
      icon: '/icon-192x192.png',
      tag: 'order-confirmed-' + orderId,
      data: { 
        orderId, 
        type: 'order-confirmed',
        url: `/order-confirmation/${orderId}`
      },
      actions: [
        {
          action: 'view',
          title: 'Details anzeigen',
          icon: '/icon-192x192.png'
        }
      ]
    })
  }

  // Subscription Status prüfen
  isSubscribed(): boolean {
    return this.subscription !== null
  }

  // Subscription Details abrufen
  getSubscription(): PushSubscription | null {
    return this.subscription
  }

  // Service Worker Status prüfen
  isServiceWorkerReady(): boolean {
    return this.registration !== null && this.registration.active !== null
  }

  // Push API Support prüfen
  getPushSupported(): boolean {
    return this.isSupported
  }
}

export const webPushService = WebPushService.getInstance()