# Automatisches Cleanup der Orders-Tabelle

## Übersicht

Dieses System löscht automatisch alle Orders, die älter als 3 Tage sind. Es gibt zwei Implementierungen:

1. **pg_cron-basiert** (empfohlen) - Präzise Zeitplanung
2. **Trigger-basiert** (Fallback) - Cleanup bei neuen Orders

## Implementierung

### 1. pg_cron-basierte Lösung (Hauptlösung)

Die Migration `20250616120000_auto_delete_orders.sql` erstellt:

- `auto_delete_old_orders()` - PostgreSQL-Funktion
- `audit_logs` - Tabelle für Logging
- Cron-Job der alle 3 Tage um 02:00 Uhr läuft

### 2. Trigger-basierte Lösung (Fallback)

Die Migration `20250616120001_trigger_based_cleanup.sql` erstellt:

- `check_and_cleanup_orders()` - Trigger-Funktion
- `cleanup_schedule` - Tracking-Tabelle
- Trigger der bei jedem INSERT auf orders prüft

## Installation

1. **Migrationen ausführen:**
   ```bash
   supabase db push
   ```

2. **pg_cron aktivieren (falls verfügbar):**
   - Gehe zu Supabase Dashboard → Database → Extensions
   - Aktiviere `pg_cron` Extension

3. **Edge Function deployen:**
   ```bash
   supabase functions deploy manual-cleanup-orders
   ```

## Verwendung

### Manuelles Testen

```bash
# Edge Function testen
curl -X POST https://your-project.supabase.co/functions/v1/manual-cleanup-orders \
  -H "Authorization: Bearer YOUR_ANON_KEY"
```

### Überwachung

Prüfe die Audit-Logs:
```sql
SELECT * FROM audit_logs 
WHERE action LIKE '%delete%' 
ORDER BY created_at DESC 
LIMIT 10;
```

### Cron-Job Status prüfen

```sql
-- Zeige alle geplanten Jobs
SELECT * FROM cron.job;

-- Zeige Job-Logs
SELECT * FROM cron.job_run_details 
WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'auto-delete-orders-every-3-days');
```

## Konfiguration

### Zeitintervall ändern

Um das Intervall zu ändern (z.B. auf 7 Tage):

1. **pg_cron-Lösung:**
   ```sql
   -- Job löschen und neu erstellen
   SELECT cron.unschedule('auto-delete-orders-every-3-days');
   SELECT cron.schedule(
     'auto-delete-orders-every-7-days',
     '0 2 */7 * *', -- Alle 7 Tage
     'SELECT auto_delete_old_orders();'
   );
   ```

2. **Trigger-Lösung:**
   ```sql
   -- Funktion aktualisieren
   CREATE OR REPLACE FUNCTION auto_delete_old_orders()
   RETURNS void
   LANGUAGE plpgsql
   SECURITY DEFINER
   AS $$
   BEGIN
     DELETE FROM orders 
     WHERE created_at < NOW() - INTERVAL '7 days'; -- 7 Tage
     -- ... Rest der Funktion
   END;
   $$;
   ```

### Cleanup-Zeit ändern

```sql
-- Ändere von 02:00 Uhr auf 04:00 Uhr
SELECT cron.unschedule('auto-delete-orders-every-3-days');
SELECT cron.schedule(
  'auto-delete-orders-every-3-days',
  '0 4 */3 * *', -- 04:00 Uhr
  'SELECT auto_delete_old_orders();'
);
```

## Troubleshooting

### pg_cron funktioniert nicht

Falls pg_cron nicht verfügbar ist, wird automatisch die Trigger-basierte Lösung verwendet.

### Manueller Cleanup

```sql
-- Direkt in der Datenbank
SELECT auto_delete_old_orders();

-- Über Edge Function
curl -X POST https://your-project.supabase.co/functions/v1/manual-cleanup-orders
```

### Logs prüfen

```sql
-- Alle Cleanup-Logs
SELECT * FROM audit_logs WHERE action LIKE '%delete%';

-- Fehler-Logs
SELECT * FROM audit_logs WHERE action LIKE '%error%';
```

## Sicherheit

- Nur Service Role kann die Cleanup-Funktion ausführen
- Alle Aktionen werden in `audit_logs` protokolliert
- Fehler werden abgefangen und geloggt
- RLS-Policies bleiben unverändert

## Performance

- Die Funktion löscht nur Orders älter als 3 Tage
- Verwendet Index auf `created_at` für effiziente Abfragen
- Minimaler Overhead durch Trigger-basierte Lösung 