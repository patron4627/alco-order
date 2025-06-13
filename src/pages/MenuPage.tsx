import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { MenuItem } from '../types'
import MenuCard from '../components/MenuCard'
import CategoryTabs from '../components/CategoryTabs'
import { Loader } from 'lucide-react'

const MenuPage: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string>('alle')

  useEffect(() => {
    fetchMenuItems()
  }, [])

  const fetchMenuItems = async () => {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .eq('available', true)
        .order('category', { ascending: true })

      if (error) throw error
      setMenuItems(data || [])
    } catch (error) {
      console.error('Error fetching menu items:', error)
    } finally {
      setLoading(false)
    }
  }

  const categories = ['alle', ...Array.from(new Set(menuItems.map(item => item.category)))]
  
  const filteredItems = activeCategory === 'alle' 
    ? menuItems 
    : menuItems.filter(item => item.category === activeCategory)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <Loader className="w-6 h-6 animate-spin text-orange-500" />
          <span className="text-gray-600">Menü wird geladen...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Unsere Speisekarte
          </h1>
          <p className="text-gray-600">
            Wählen Sie Ihre Lieblingsspeisen zur Abholung aus
          </p>
        </div>

        <div className="mb-8">
          <CategoryTabs
            categories={categories}
            activeCategory={activeCategory}
            onCategoryChange={setActiveCategory}
          />
        </div>

        {filteredItems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {activeCategory === 'alle' 
                ? 'Keine Speisen verfügbar' 
                : `Keine Speisen in der Kategorie "${activeCategory}" verfügbar`
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map((item) => (
              <MenuCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default MenuPage