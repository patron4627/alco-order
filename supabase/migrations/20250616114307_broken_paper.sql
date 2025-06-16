/*
  # Realtime für alle Tabellen aktivieren

  1. Realtime aktivieren
    - Aktiviere Realtime für menu_items Tabelle
    - Aktiviere Realtime für orders Tabelle
    - Stelle sicher dass alle Permissions korrekt sind

  2. Sicherheit
    - Behalte bestehende RLS Policies
    - Aktiviere nur Realtime Features
*/

-- Realtime für menu_items aktivieren
ALTER PUBLICATION supabase_realtime ADD TABLE menu_items;

-- Realtime für orders aktivieren  
ALTER PUBLICATION supabase_realtime ADD TABLE orders;

-- Stelle sicher dass RLS aktiviert ist
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;