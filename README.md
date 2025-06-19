# Restaurant PWA App - Debugging Guide

## Mobile Debugging

### Android (Chrome)
1. **USB-Debugging aktivieren**:
   - Gehe zu Einstellungen → Über das Telefon
   - Tippe 7x auf "Build-Nummer"
   - Gehe zu Entwickleroptionen → USB-Debugging aktivieren

2. **Chrome Remote Debugging**:
   - Verbinde Handy per USB mit Computer
   - Öffne Chrome auf Computer
   - Gehe zu `chrome://inspect`
   - Klicke auf dein Handy und dann auf die PWA-App

### iOS (Safari)
1. **Web Inspector aktivieren**:
   - Gehe zu Einstellungen → Safari → Erweitert
   - Aktiviere "Web Inspector"

2. **Safari Remote Debugging**:
   - Verbinde iPhone per USB mit Mac
   - Öffne Safari auf Mac
   - Gehe zu Entwickeln → [iPhone Name] → [PWA App]

## Alternative Debugging-Methoden

### 1. **Console-Logs in der App anzeigen**
Die App zeigt jetzt Debug-Informationen direkt in der UI an.

### 2. **Push-Notification Test**
- Öffne die PWA auf dem Handy
- Gehe zur Admin-Seite
- Erstelle eine Test-Bestellung
- Schaue, ob eine Benachrichtigung erscheint

### 3. **Service Worker Status prüfen**
- Gehe zu `chrome://serviceworker-internals/` (Android)
- Schaue, ob der Service Worker aktiv ist

## Häufige Probleme

### Push-Benachrichtigungen funktionieren nicht:
1. **Berechtigungen prüfen**: Browser-Einstellungen → Benachrichtigungen
2. **Service Worker**: Muss aktiv sein
3. **VAPID Keys**: Müssen korrekt konfiguriert sein
4. **HTTPS**: PWA muss über HTTPS laufen

### Ton funktioniert, aber keine Push-Benachrichtigung:
- Das ist normal! Der Ton kommt von der App, die Push-Benachrichtigung vom Service Worker
- Push-Benachrichtigungen funktionieren nur, wenn die App im Hintergrund ist 