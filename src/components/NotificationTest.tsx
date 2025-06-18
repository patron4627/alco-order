import { useEffect } from 'react';
import { pushNotificationService } from '../lib/pushNotifications';

export default function NotificationTest() {
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        const success = await pushNotificationService.initialize();
        if (success) {
          console.log('Push notifications initialized successfully');
          // Test notification
          const testNotification = {
            title: 'Test-Benachrichtigung',
            body: 'Diese Benachrichtigung ist ein Test',
            data: { type: 'test' }
          };
          
          // Send notification to yourself
          fetch('/api/send-notification', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              subscription: await pushNotificationService.getSubscription(),
              ...testNotification
            })
          });
        }
      } catch (error) {
        console.error('Error initializing notifications:', error);
      }
    };

    initializeNotifications();
  }, []);

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-2">Push-Benachrichtigungstest</h2>
      <p className="text-gray-600">
        Diese Komponente testet die Push-Benachrichtigungen. Sie sollten eine Test-Benachrichtigung erhalten.
      </p>
    </div>
  );
}
