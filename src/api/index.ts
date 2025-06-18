import express from 'express';
import cors from 'cors';
import { pushNotificationService } from '../lib/pushNotifications';

const app = express();
app.use(cors());
app.use(express.json());

// Push Subscription Update
app.post('/api/update-subscription', async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription) {
      return res.status(400).json({ error: 'No subscription provided' });
    }
    
    await pushNotificationService.updateSubscription(subscription);
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error updating subscription:', error);
    res.status(500).json({ error: error.message });
  }
});

// Keep-Alive Endpoint
app.post('/api/keep-alive', async (req, res) => {
  try {
    // Hier können Sie zusätzliche Hintergrundoperationen durchführen
    // z.B. Datenbank-Verbindung prüfen, Cache aktualisieren, etc.
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Keep-alive error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Error Tracking
app.post('/api/error', async (req, res) => {
  try {
    const { error, timestamp, type } = req.body;
    console.error(`Error ${type} at ${timestamp}:`, error);
    // Hier können Sie die Fehler in einer Datenbank speichern
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to track error' });
  }
});

// Performance Monitoring
app.post('/api/performance', async (req, res) => {
  try {
    const { url, duration, timestamp } = req.body;
    console.warn(`Performance warning: ${url} took ${duration}ms at ${timestamp}`);
    // Hier können Sie die Performance-Daten speichern
    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to track performance' });
  }
});

export default app;
