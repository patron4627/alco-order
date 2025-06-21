/*
  # Alternative: Trigger-basierte Lösung für automatisches Löschen

  Falls pg_cron nicht verfügbar ist, verwenden wir einen Trigger der bei jedem INSERT
  prüft ob alte Orders gelöscht werden müssen.
*/

-- Erstelle eine Hilfstabelle um zu tracken wann das letzte Cleanup stattfand
CREATE TABLE IF NOT EXISTS cleanup_schedule (
  id INTEGER PRIMARY KEY DEFAULT 1,
  last_cleanup timestamptz DEFAULT now(),
  next_cleanup timestamptz DEFAULT now() + INTERVAL '3 days'
);

-- Füge initialen Eintrag hinzu
INSERT INTO cleanup_schedule (id, last_cleanup, next_cleanup) 
VALUES (1, NOW(), NOW() + INTERVAL '3 days')
ON CONFLICT (id) DO NOTHING;

-- Erstelle eine Funktion die prüft ob Cleanup nötig ist
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

-- Erstelle Trigger der bei jedem INSERT auf orders ausgeführt wird
DROP TRIGGER IF EXISTS trigger_cleanup_orders ON orders;
CREATE TRIGGER trigger_cleanup_orders
  AFTER INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION check_and_cleanup_orders();

-- Erstelle auch einen Trigger für andere Operationen (optional)
-- DROP TRIGGER IF EXISTS trigger_cleanup_orders_update ON orders;
-- CREATE TRIGGER trigger_cleanup_orders_update
--   AFTER UPDATE ON orders
--   FOR EACH ROW
--   EXECUTE FUNCTION check_and_cleanup_orders();

-- Kommentar: Diese Lösung ist weniger präzise als pg_cron, aber funktioniert
-- auch ohne zusätzliche Extensions. Der Cleanup wird ausgeführt sobald
-- eine neue Order eingefügt wird und es Zeit für ein Cleanup ist. 