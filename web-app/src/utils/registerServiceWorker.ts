/**
 * Service Worker Registration Utility
 * Registers the service worker and handles updates
 */

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
    // Check if service workers are supported
    if (!('serviceWorker' in navigator)) {
        console.warn('[SW] Service workers are not supported in this browser');
        return null;
    }

    try {
        // Register the service worker
        const registration = await navigator.serviceWorker.register('/service-worker.js', {
            scope: '/',
        });

        console.log('[SW] Service worker registered successfully:', registration.scope);

        // Check for updates on page load
        registration.update();

        // Listen for updates
        registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (!newWorker) return;

            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                    // New service worker available
                    console.log('[SW] New version available! Please refresh.');

                    // Optionally show a notification to the user
                    if (window.confirm('A new version of Horizon Tasks is available. Reload to update?')) {
                        window.location.reload();
                    }
                }
            });
        });

        return registration;
    } catch (error) {
        console.error('[SW] Service worker registration failed:', error);
        return null;
    }
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) {
        console.warn('[Notifications] Not supported in this browser');
        return 'denied';
    }

    if (Notification.permission === 'granted') {
        return 'granted';
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission;
    }

    return Notification.permission;
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPushNotifications(
    registration: ServiceWorkerRegistration
): Promise<PushSubscription | null> {
    try {
        // Check if push is supported
        if (!('PushManager' in window)) {
            console.warn('[Push] Push notifications not supported');
            return null;
        }

        // Request notification permission first
        const permission = await requestNotificationPermission();
        if (permission !== 'granted') {
            console.warn('[Push] Notification permission denied');
            return null;
        }

        // Get existing subscription or create new one
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
            // VAPID public key - should come from backend in production
            const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY as string | undefined;

            if (!vapidPublicKey) {
                console.warn('[Push] VAPID public key not configured');
                return null;
            }

            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
            });

            console.log('[Push] Push subscription created:', subscription);
        }

        return subscription;
    } catch (error) {
        console.error('[Push] Failed to subscribe to push notifications:', error);
        return null;
    }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPushNotifications(
    registration: ServiceWorkerRegistration
): Promise<boolean> {
    try {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
            await subscription.unsubscribe();
            console.log('[Push] Unsubscribed from push notifications');
            return true;
        }
        return false;
    } catch (error) {
        console.error('[Push] Failed to unsubscribe:', error);
        return false;
    }
}

/**
 * Helper function to convert VAPID key
 */
function urlBase64ToUint8Array(base64String: string): BufferSource {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray as BufferSource;
}
