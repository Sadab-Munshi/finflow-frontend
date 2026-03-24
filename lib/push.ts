export async function subscribeToPush(): Promise<boolean> {
  console.log('[Push] subscribeToPush() called')

  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('[Push] Push notifications not supported in this browser')
    return false
  }

  console.log('[Push] Browser supports push notifications')

  try {
    // Step 1: Check/request permission
    const currentPermission = Notification.permission
    console.log('[Push] Current notification permission:', currentPermission)

    const permission = await Notification.requestPermission()
    console.log('[Push] Permission after request:', permission)

    if (permission !== 'granted') {
      console.warn('[Push] Permission denied — user must allow notifications in browser settings')
      return false
    }

    // Step 2: Wait for service worker to be ready
    console.log('[Push] Waiting for service worker to be ready...')
    const registration = await navigator.serviceWorker.ready
    console.log('[Push] Service worker ready:', registration.scope)

    // Step 3: Check VAPID key
    const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
    if (!vapidKey) {
      console.error('[Push] VAPID public key not configured — set NEXT_PUBLIC_VAPID_PUBLIC_KEY env var')
      return false
    }
    console.log('[Push] VAPID public key present (length:', vapidKey.length, ')')

    // Step 4: Get or create push subscription
    let subscription = await registration.pushManager.getSubscription()
    if (subscription) {
      console.log('[Push] Existing push subscription found:', subscription.endpoint)
    } else {
      console.log('[Push] No existing subscription, creating new one...')
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey) as BufferSource,
      })
      console.log('[Push] New subscription created:', subscription.endpoint)
    }

    // Step 5: Send subscription to server
    console.log('[Push] Sending subscription to server...')
    const response = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: arrayBufferToBase64(subscription.getKey('p256dh')),
          auth: arrayBufferToBase64(subscription.getKey('auth')),
        },
        userAgent: navigator.userAgent,
      }),
    })

    if (response.ok) {
      console.log('[Push] Subscription saved to server successfully')
    } else {
      const errorText = await response.text()
      console.error('[Push] Server rejected subscription — status:', response.status, 'body:', errorText)
    }

    return response.ok
  } catch (error) {
    console.error('[Push] Push subscription failed:', error)
    return false
  }
}

export async function unsubscribeFromPush(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) return false

  try {
    const registration = await navigator.serviceWorker.ready
    const subscription = await registration.pushManager.getSubscription()
    if (subscription) {
      await subscription.unsubscribe()
    }
    return true
  } catch (error) {
    console.error('Push unsubscribe failed:', error)
    return false
  }
}

export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

export function getPushPermission(): NotificationPermission | 'unsupported' {
  if (!('Notification' in window)) return 'unsupported'
  return Notification.permission
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function arrayBufferToBase64(buffer: ArrayBuffer | null): string {
  if (!buffer) return ''
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return window.btoa(binary)
}
