-- Automatisches Cleanup-System für Orders
-- Führe diese SQL-Befehle im Supabase SQL Editor aus

-- 1. Erstelle die Audit-Logs Tabelle
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action text NOT NULL,
  details text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS auf audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy für audit_logs (nur Service Role kann schreiben)
DROP POLICY IF EXISTS "Service role can manage audit logs" ON audit_logs;
CREATE POLICY "Service role can manage audit logs"
  ON audit_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 2. Erstelle die Cleanup-Funktion
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

-- 3. Erstelle die Cleanup-Schedule Tabelle für Trigger-basierte Lösung
CREATE TABLE IF NOT EXISTS cleanup_schedule (
  id INTEGER PRIMARY KEY DEFAULT 1,
  last_cleanup timestamptz DEFAULT now(),
  next_cleanup timestamptz DEFAULT now() + INTERVAL '3 days'
);

-- Füge initialen Eintrag hinzu
INSERT INTO cleanup_schedule (id, last_cleanup, next_cleanup) 
VALUES (1, NOW(), NOW() + INTERVAL '3 days')
ON CONFLICT (id) DO NOTHING;

-- 4. Erstelle die Trigger-Funktion
CREATE OR REPLACE FUNCTION check_and_cleanup_orders()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  should_cleanup BOOLEAN;
  deleted_count INTEGER;
BEGIN
  -- Prüfe ob es Zeit für ein Cleanup ist
  SELECT NOW() >= next_cleanup INTO should_cleanup
  FROM cleanup_schedule 
  WHERE id = 1;
  
  IF should_cleanup THEN
    -- Führe Cleanup durch
    DELETE FROM orders 
    WHERE created_at < NOW() - INTERVAL '3 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Aktualisiere Cleanup-Schedule
    UPDATE cleanup_schedule 
    SET last_cleanup = NOW(),
        next_cleanup = NOW() + INTERVAL '3 days'
    WHERE id = 1;
    
    -- Log die Aktion
    INSERT INTO audit_logs (action, details) 
    VALUES ('trigger_cleanup_orders', 'Deleted ' || deleted_count || ' orders older than 3 days');
    
    RAISE NOTICE 'Trigger-based cleanup completed: % orders deleted at %', deleted_count, NOW();
  END IF;
  
  RETURN NEW;
END;
$$;

-- 5. Erstelle Trigger der bei jedem INSERT auf orders ausgeführt wird
DROP TRIGGER IF EXISTS trigger_cleanup_orders ON orders;
CREATE TRIGGER trigger_cleanup_orders
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION check_and_cleanup_orders();

-- 6. Teste die Funktion (optional - kommentiere aus wenn nicht gewünscht)
-- SELECT auto_delete_old_orders();

-- 7. Zeige Status
SELECT 'Cleanup system installed successfully!' as status;

-- 8. Zeige aktuelle Cleanup-Schedule
SELECT * FROM cleanup_schedule;

-- 9. Zeige letzte Audit-Logs
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 5; 