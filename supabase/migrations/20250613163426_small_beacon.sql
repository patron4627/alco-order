/*
  # Erweiterte Menü-Tabelle mit Optionen

  1. Neue Tabellen
    - `menu_items` - Erweitert um options Feld
      - `id` (uuid, primary key)
      - `name` (text)
      - `description` (text)
      - `price` (numeric)
      - `category` (text)
      - `image_url` (text, optional)
      - `available` (boolean, default true)
      - `options` (jsonb, für Döner-Optionen etc.)
      - `created_at` (timestamp)

  2. Sicherheit
    - Enable RLS auf `menu_items` Tabelle
    - Öffentlicher Lesezugriff für Kunden
    - Vollzugriff für Admin (über Admin-Interface)

  3. Änderungen
    - Erweiterte menu_items Tabelle mit options Feld
    - Aktualisierte orders Tabelle für erweiterte item-Struktur
*/

-- Lösche existierende Tabellen falls vorhanden
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS menu_items;

-- Erstelle menu_items Tabelle mit options
CREATE TABLE IF NOT EXISTS menu_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text NOT NULL,
  price numeric(10,2) NOT NULL CHECK (price > 0),
  category text NOT NULL,
  image_url text,
  available boolean DEFAULT true,
  options jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Erstelle orders Tabelle
CREATE TABLE IF NOT EXISTS orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  customer_phone text NOT NULL,
  pickup_time timestamptz NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'ready', 'completed')),
  total_amount numeric(10,2) NOT NULL CHECK (total_amount > 0),
  items jsonb NOT NULL,
  notes text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- RLS Policies für menu_items
CREATE POLICY "Anyone can read menu items"
  ON menu_items
  FOR SELECT
  TO public
  USING (true);

-- RLS Policies für orders
CREATE POLICY "Anyone can read orders"
  ON orders
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Anyone can create orders"
  ON orders
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can update orders"
  ON orders
  FOR UPDATE
  TO public
  USING (true);

-- Beispiel-Daten einfügen
INSERT INTO menu_items (name, description, price, category, image_url, available, options) VALUES
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
]'::jsonb);