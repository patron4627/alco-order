// Push Notification Service für mobile Geräte
export class PushNotificationService {
  private static instance: PushNotificationService
  private registration: ServiceWorkerRegistration | null = null
  private isSupported = false
  private subscription: PushSubscription | null = null

  private constructor() {
    this.checkSupport()
  }

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService()
    }
    return PushNotificationService.instance
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
      console.log('Push notifications not supported in this environment')
      return false
    }

    try {
      // Service Worker registrieren
      this.registration = await navigator.serviceWorker.register('/sw.js')
      console.log('✅ Service Worker registered:', this.registration)

      // Notification Permission anfordern
      const permission = await this.requestPermission()
      if (permission !== 'granted') return false

      // Push Subscription anfordern
      this.subscription = await this.getSubscription()
      if (this.subscription) {
        // Subscription an Backend senden
        await this.updateSubscription(this.subscription)
      }

      // Keep-Alive starten
      this.startKeepAlive()

      return true
    } catch (error) {
      console.error('❌ Failed to initialize push notifications:', error)
      return false
    }
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported) return 'denied'

    // Prüfe ob wir bereits eine Berechtigung haben
    let permission = Notification.permission

    // Wenn keine Berechtigung, fordere sie an
    if (permission === 'default') {
      // Erstelle eine temporäre Benachrichtigung zum Testen
      const testNotification = new Notification('Test', {
        body: 'Bitte erlauben Sie Benachrichtigungen für Bestellungen',
        requireInteraction: true,
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        vibrate: [200, 100, 200, 100, 200],
        actions: [
          {
            action: 'allow',
            title: 'Erlauben',
            icon: '/icon-192x192.png'
          }
        ]
      })
      
      // Warte auf Benutzerinteraktion
      await new Promise((resolve) => {
        testNotification.onclick = () => {
          // Wenn der Benutzer auf "Erlauben" klickt
          if (Notification.permission === 'default') {
            Notification.requestPermission().then(result => {
              resolve(result)
            })
          } else {
            resolve(Notification.permission)
          }
        }
        testNotification.onclose = () => {
          resolve(Notification.permission)
        }
      })
      
      permission = Notification.permission
    }

    console.log('📱 Notification permission:', permission)
    return permission
  }

  async getSubscription(): Promise<PushSubscription | null> {
    if (!this.registration) return null

    try {
      const subscription = await this.registration.pushManager.getSubscription()
      return subscription || await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: window.env.PUSH_PUBLIC_KEY
      })
    } catch (error) {
      console.error('❌ Failed to get subscription:', error)
      return null
    }
  }

  async updateSubscription(subscription: PushSubscription): Promise<void> {
    try {
      await fetch('/api/update-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ subscription })
      })
      console.log('✅ Subscription updated on server')
    } catch (error) {
      console.error('❌ Failed to update subscription:', error)
      // Bei Vercel Edge Functions versuchen wir es mit einem fallback URL
      try {
        await fetch('https://api.vercel.com/v2/now/deployments', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.VERCEL_TOKEN}`
          },
          body: JSON.stringify({ subscription })
        })
      } catch (fallbackError) {
        console.error('❌ Failed to update subscription via fallback:', fallbackError)
      }
    }
  }

  async showNotification(title: string, options: {
    body?: string
    icon?: string
    badge?: string
    tag?: string
    data?: any
    requireInteraction?: boolean
    vibrate?: number[]
    sound?: boolean
  } = {}): Promise<void> {
    try {
      // Prüfe ob Benachrichtigungen erlaubt sind
      if (Notification.permission !== 'granted') {
        console.log('❌ Notification permission not granted')
        return
      }

      // Erstelle Benachrichtigung mit Standardwerten
      const notification = new Notification(title, {
        body: options.body || 'Eine neue Bestellung wurde aufgegeben',
        icon: options.icon || '/icon-192x192.png',
        badge: options.badge || '/icon-192x192.png',
        tag: options.tag || 'new-order',
        requireInteraction: options.requireInteraction || true,
        vibrate: options.vibrate || [200, 100, 200, 100, 200],
        data: options.data,
        priority: 'high',
        timestamp: Date.now(),
        renotify: true,
        silent: false
      })

      // Sound abspielen
      if (options.sound !== false) {
        this.playNotificationSound()
      }

      // Vibration für mobile Geräte
      if ('vibrate' in navigator && defaultOptions.vibrate) {
        navigator.vibrate(defaultOptions.vibrate)
      }
    } catch (error) {
      console.error('❌ Failed to show notification:', error)
    }
  }

  startKeepAlive(): void {
    // Keep-Alive alle 15 Minuten
    setInterval(() => {
      fetch('/api/keep-alive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      }).catch(error => {
        console.error('Keep-alive failed:', error)
      })
    }, 15 * 60 * 1000) // 15 Minuten
  }

  private playNotificationSound() {
    try {
      // Mehrere Töne für bessere Aufmerksamkeit
      const playTone = (frequency: number, duration: number, delay: number = 0) => {
        setTimeout(() => {
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
          const oscillator = audioContext.createOscillator()
          const gainNode = audioContext.createGain()
          
          oscillator.connect(gainNode)
          gainNode.connect(audioContext.destination)
          
          oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime)
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration)
          
          oscillator.start(audioContext.currentTime)
          oscillator.stop(audioContext.currentTime + duration)
        }, delay)
      }
      
      // Dringende Benachrichtigungssequenz
      playTone(800, 0.2, 0)
      playTone(1000, 0.2, 300)
      playTone(1200, 0.3, 600)
      playTone(800, 0.2, 1000)
      
    } catch (error) {
      console.log('Could not play notification sound:', error)
    }
  }

  // Spezielle Methode für neue Bestellungen
  async showNewOrderNotification(orderData: {
    customerName: string
    totalAmount: number
    orderId: string
  }): Promise<void> {
    await this.showNotification('🔔 Neue Bestellung eingegangen!', {
      body: `${orderData.customerName} - ${orderData.totalAmount.toFixed(2)}€\nBestellung #${orderData.orderId.slice(-6)}`,
      tag: 'new-order-' + orderData.orderId,
      requireInteraction: true,
      data: { orderId: orderData.orderId, type: 'new-order' },
      sound: true
    })
  }

  // Spezielle Methode für Bestellbestätigungen
  async showOrderConfirmationNotification(orderId: string): Promise<void> {
    await this.showNotification('🎉 Bestellung bestätigt!', {
      body: 'Ihre Bestellung wurde bestätigt und wird zubereitet.',
      tag: 'order-confirmed-' + orderId,
      requireInteraction: false,
      data: { orderId, type: 'order-confirmed' },
      sound: true
    })
  }

  // Keep-Alive für mobile Geräte
  startKeepAlive() {
    // Verhindert dass die App in den Standby geht
    if ('wakeLock' in navigator) {
      (navigator as any).wakeLock.request('screen').catch((err: any) => {
        console.log('Wake lock failed:', err)
      })
    }

    // Heartbeat alle 30 Sekunden
    setInterval(() => {
      console.log('📱 Keep-alive heartbeat')
    }, 30000)
  }
}

export const pushNotificationService = PushNotificationService.getInstance()