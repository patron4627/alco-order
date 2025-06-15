/*
  # Realtime-System reparieren und ready_at Feld hinzufügen

  1. Änderungen
    - Füge ready_at Feld zur orders Tabelle hinzu
    - Stelle sicher, dass alle RLS Policies korrekt sind
    - Keine Duplikate von bestehenden Policies

  2. Sicherheit
    - Behalte bestehende RLS Konfiguration
    - Aktualisiere nur was nötig ist
*/

-- Füge ready_at Feld zur orders Tabelle hinzu falls es nicht existiert
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'orders' AND column_name = 'ready_at'
  ) THEN
    ALTER TABLE orders ADD COLUMN ready_at timestamptz;
  END IF;
END $$;

-- Stelle sicher, dass alle nötigen RLS Policies für orders existieren
DO $$
BEGIN
  -- Policy für UPDATE falls sie nicht existiert
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'orders' AND policyname = 'Anyone can update orders'
  ) THEN
    CREATE POLICY "Anyone can update orders"
      ON orders
      FOR UPDATE
      TO public
      USING (true);
  END IF;
END $$;

-- Beispiel-Daten nur einfügen wenn menu_items Tabelle leer ist
INSERT INTO menu_items (name, description, price, category, image_url, available, options) 
SELECT * FROM (VALUES
  ('Döner Kebab', 'Frisches Fleisch im Fladenbrot mit Salat und Soße', 5.50, 'Döner', 'https://images.pexels.com/photos/4676401/pexels-photo-4676401.jpeg', true, '[
    {"name": "Extra Fleisch", "price": 1.50},
    {"name": "Extra Käse", "price": 1.00},
    {"name": "Scharf", "price": 0.00},
    {"name": "Ohne Zwiebeln", "price": 0.00},
    {"name": "Extra Soße", "price": 0.50}
  ]'::jsonb),
  ('Döner Teller', 'Döner-Fleisch mit Reis, Salat und Soße', 8.50, 'Döner', 'https://images.pexels.com/photos/5920742/pexels-photo-5920742.jpeg', true, '[
    {"name": "Extra Fleisch", "price": 2.00},
    {"name": "Extra Reis", "price": 1.00},
    {"name": "Pommes statt Reis", "price": 0.50},
    {"name": "Scharf", "price": 0.00}
  ]'::jsonb),
  ('Lahmacun', 'Türkische Pizza mit Hackfleisch', 4.00, 'Döner', 'https://images.pexels.com/photos/7625056/pexels-photo-7625056.jpeg', true, '[
    {"name": "Mit Salat", "price": 1.00},
    {"name": "Mit Döner-Fleisch", "price": 2.00},
    {"name": "Scharf", "price": 0.00}
  ]'::jsonb),
  ('Pizza Margherita', 'Tomatensauce, Mozzarella, Basilikum', 7.50, 'Pizza', 'https://images.pexels.com/photos/315755/pexels-photo-315755.jpeg', true, '[
    {"name": "Extra Käse", "price": 1.50},
    {"name": "Knoblauch", "price": 0.50},
    {"name": "Oregano", "price": 0.00}
  ]'::jsonb),
  ('Pizza Salami', 'Tomatensauce, Mozzarella, Salami', 8.50, 'Pizza', 'https://images.pexels.com/photos/2147491/pexels-photo-2147491.jpeg', true, '[
    {"name": "Extra Salami", "price": 2.00},
    {"name": "Extra Käse", "price": 1.50},
    {"name": "Peperoni", "price": 1.00}
  ]'::jsonb),
  ('Coca Cola', 'Erfrischende Cola, 0,33l', 2.50, 'Getränke', 'https://images.pexels.com/photos/50593/coca-cola-cold-drink-soft-drink-coke-50593.jpeg', true, '[]'::jsonb),
  ('Ayran', 'Türkisches Joghurt-Getränk, 0,25l', 2.00, 'Getränke', 'https://images.pexels.com/photos/6542652/pexels-photo-6542652.jpeg', true, '[]'::jsonb),
  ('Pommes Frites', 'Knusprige Pommes mit Ketchup', 3.50, 'Beilagen', 'https://images.pexels.com/photos/1583884/pexels-photo-1583884.jpeg', true, '[
    {"name": "Mit Mayo", "price": 0.50},
    {"name": "Mit Curry-Ketchup", "price": 0.50},
    {"name": "Große Portion", "price": 1.50}
  ]'::jsonb)
) AS v(name, description, price, category, image_url, available, options)
WHERE NOT EXISTS (SELECT 1 FROM menu_items WHERE name = v.name);