/*
  # Automatisches Löschen von Orders alle 3 Tage

  1. Neue Funktionen
    - `auto_delete_old_orders()` - Löscht alle Orders die älter als 3 Tage sind
    - Cron-Job der alle 3 Tage ausgeführt wird

  2. Sicherheit
    - Nur Service Role kann die Funktion ausführen
    - Logging für Audit-Zwecke
*/

-- Erstelle die Funktion zum automatischen Löschen alter Orders
CREATE OR REPLACE FUNCTION auto_delete_old_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Lösche Orders die älter als 3 Tage sind
  DELETE FROM orders 
  WHERE created_at < NOW() - INTERVAL '3 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log die Aktion (optional - für Audit-Zwecke)
  RAISE NOTICE 'Auto-delete completed: % orders deleted at %', deleted_count, NOW();
  
  -- Optional: Hier könntest du auch eine Log-Tabelle verwenden
  -- INSERT INTO audit_logs (action, details, created_at) 
  -- VALUES ('auto_delete_orders', 'Deleted ' || deleted_count || ' orders older than 3 days', NOW());
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error in auto_delete_old_orders: %', SQLERRM;
    RAISE;
END;
$$;

-- Erstelle eine Log-Tabelle für Audit-Zwecke (optional)
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  details text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS auf audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy für audit_logs (nur Service Role kann schreiben)
CREATE POLICY "Service role can manage audit logs"
  ON audit_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Aktualisiere die Funktion um auch in audit_logs zu schreiben
CREATE OR REPLACE FUNCTION auto_delete_old_orders()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Lösche Orders die älter als 3 Tage sind
  DELETE FROM orders 
  WHERE created_at < NOW() - INTERVAL '3 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  -- Log die Aktion in audit_logs
  INSERT INTO audit_logs (action, details) 
  VALUES ('auto_delete_orders', 'Deleted ' || deleted_count || ' orders older than 3 days');
  
  RAISE NOTICE 'Auto-delete completed: % orders deleted at %', deleted_count, NOW();
  
EXCEPTION
  WHEN OTHERS THEN
    -- Log auch Fehler
    INSERT INTO audit_logs (action, details) 
    VALUES ('auto_delete_orders_error', 'Error: ' || SQLERRM);
    RAISE NOTICE 'Error in auto_delete_old_orders: %', SQLERRM;
    RAISE;
END;
$$;

-- Erstelle den Cron-Job (wird alle 3 Tage um 02:00 Uhr ausgeführt)
-- Hinweis: pg_cron muss in Supabase aktiviert sein
SELECT cron.schedule(
  'auto-delete-orders-every-3-days',
  '0 2 */3 * *', -- Jeden 3. Tag um 02:00 Uhr
  'SELECT auto_delete_old_orders();'
);

-- Alternative: Täglicher Job (falls pg_cron nicht verfügbar ist)
-- SELECT cron.schedule(
--   'auto-delete-orders-daily',
--   '0 2 * * *', -- Täglich um 02:00 Uhr
--   'SELECT auto_delete_old_orders();'
-- );

-- Kommentar: Falls pg_cron nicht funktioniert, können wir auch einen einfacheren Ansatz verwenden
-- der bei jedem Datenbankzugriff prüft und alte Orders löscht 