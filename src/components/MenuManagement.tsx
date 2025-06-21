import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Save, X, Upload } from 'lucide-react'
import { MenuItem, MenuOption } from '../types'
import { supabase } from '../lib/supabase'
import imagesList from '../images.json'

const MenuManagement: React.FC = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [categories, setCategories] = useState<string[]>([])
  const [availableImages, setAvailableImages] = useState<string[]>([])

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    image_url: '',
    available: true,
    options: [] as MenuOption[]
  })

  useEffect(() => {
    fetchMenuItems()
  }, [])

  useEffect(() => {
    // Lade die Bilder aus der images.json Datei
    setAvailableImages(imagesList)
  }, [])

  const fetchMenuItems = async () => {
    try {
      const { data, error } = await supabase
        .from('menu_items')
        .select('*')
        .order('category', { ascending: true })

      if (error) throw error
      
      setMenuItems(data || [])
      
      // Kategorien extrahieren
      const uniqueCategories = Array.from(new Set(data?.map(item => item.category) || []))
      setCategories(uniqueCategories)
    } catch (error) {
      console.error('Error fetching menu items:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  const handleAddOption = () => {
    setFormData(prev => ({
      ...prev,
      options: [...prev.options, { name: '', price: 0 }]
    }))
  }

  const handleOptionChange = (index: number, field: 'name' | 'price', value: string) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map((option, i) => 
        i === index ? { ...option, [field]: field === 'price' ? parseFloat(value) || 0 : value } : option
      )
    }))
  }

  const handleRemoveOption = (index: number) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.filter((_, i) => i !== index)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const itemData = {
        name: formData.name,
        description: formData.description,
        price: parseFloat(formData.price),
        category: formData.category,
        image_url: formData.image_url || null,
        available: formData.available,
        options: formData.options.filter(option => option.name.trim() !== '')
      }

      if (editingItem) {
        // Update existing item
        console.log('Update-Request:', {
          name: itemData.name,
          description: itemData.description,
          price: itemData.price,
          category: itemData.category,
          image_url: itemData.image_url || null,
          available: !!itemData.available,
          options: itemData.options && itemData.options.length > 0 ? [...itemData.options] : null
        });
        const { error } = await supabase
          .from('menu_items')
          .update({
            name: itemData.name,
            description: itemData.description,
            price: itemData.price,
            category: itemData.category,
            image_url: itemData.image_url || null,
            available: !!itemData.available,
            options: itemData.options && itemData.options.length > 0 ? [...itemData.options] : null
          })
          .eq('id', editingItem.id);
        console.log('Update-Response:', error);
        
        if (error) {
          alert('Fehler beim Speichern der Optionen: ' + error.message);
          throw error;
        }
        
        setMenuItems((prev: MenuItem[]) => prev.map((item: MenuItem) => item.id === editingItem.id ? { ...item, ...itemData } : item))
      } else {
        // Add new item
        const { data, error } = await supabase
          .from('menu_items')
          .insert([itemData])
          .select()
          .single()

        if (error) throw error
        
        setMenuItems((prev: MenuItem[]) => [...prev, data])
        
        // Update categories if new category
        if (!categories.includes(itemData.category)) {
          setCategories((prev: string[]) => [...prev, itemData.category])
        }
      }

      resetForm()
    } catch (error) {
      console.error('Error saving menu item:', error)
      alert('Fehler beim Speichern des Artikels')
    }
  }

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item)
    setFormData({
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      category: item.category,
      image_url: item.image_url || '',
      available: item.available,
      options: item.options || []
    })
    setShowAddForm(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Sind Sie sicher, dass Sie diesen Artikel löschen möchten?')) return

    try {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', id)

      if (error) throw error
      
      setMenuItems((prev: MenuItem[]) => prev.filter((item: MenuItem) => item.id !== id))
    } catch (error) {
      console.error('Error deleting menu item:', error)
      alert('Fehler beim Löschen des Artikels')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      category: '',
      image_url: '',
      available: true,
      options: []
    })
    setEditingItem(null)
    setShowAddForm(false)
  }

  const toggleAvailability = async (id: string, available: boolean) => {
    try {
      const { error } = await supabase
        .from('menu_items')
        .update({ available: !available })
        .eq('id', id)

      if (error) throw error
      
      setMenuItems((prev: MenuItem[]) => prev.map((item: MenuItem) => item.id === id ? { ...item, available: !available } : item))
    } catch (error) {
      console.error('Error updating availability:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
        <span className="ml-2 text-gray-600">Menü wird geladen...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Add Button */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Menü-Artikel verwalten</h2>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center space-x-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Artikel hinzufügen</span>
        </button>
      </div>

      {/* Add/Edit Form */}
      {showAddForm && (
        <div className="bg-white rounded-lg shadow-md p-6 border-2 border-orange-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              {editingItem ? 'Artikel bearbeiten' : 'Neuen Artikel hinzufügen'}
            </h3>
            <button
              onClick={resetForm}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="z.B. Döner Kebab"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Preis (€) *
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleInputChange}
                  step="0.01"
                  min="0"
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="5.50"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Beschreibung *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="Beschreibung des Gerichts..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kategorie *
                </label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  required
                  list="categories"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="z.B. Döner, Pizza, Getränke"
                />
                <datalist id="categories">
                  {categories.map(category => (
                    <option key={category} value={category} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Bild auswählen
                </label>
                <select
                  name="image_url"
                  value={formData.image_url}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">Kein Bild</option>
                  {availableImages.map((img) => (
                    <option key={img} value={img}>{img.replace('/images/', '')}</option>
                  ))}
                </select>
                {formData.image_url && (
                  <img src={formData.image_url} alt="Vorschau" className="mt-2 h-24 rounded shadow" />
                )}
              </div>
            </div>

            {/* Options Section */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Optionen (z.B. Döner-Zutaten)
                </label>
                <button
                  type="button"
                  onClick={handleAddOption}
                  className="text-sm text-orange-600 hover:text-orange-700 font-medium"
                >
                  + Option hinzufügen
                </button>
              </div>
              
              {formData.options.map((option, index) => (
                <div key={index} className="flex items-center space-x-2 mb-2">
                  <input
                    type="text"
                    value={option.name}
                    onChange={(e) => handleOptionChange(index, 'name', e.target.value)}
                    placeholder="z.B. Extra Fleisch"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  <input
                    type="number"
                    value={option.price}
                    onChange={(e) => handleOptionChange(index, 'price', e.target.value)}
                    step="0.01"
                    min="0"
                    placeholder="1.50"
                    className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  <span className="text-sm text-gray-500">€</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveOption(index)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                name="available"
                id="available"
                checked={formData.available}
                onChange={handleInputChange}
                className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
              />
              <label htmlFor="available" className="ml-2 block text-sm text-gray-900">
                Verfügbar
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                className="flex items-center space-x-2 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
              >
                <Save className="w-4 h-4" />
                <span>{editingItem ? 'Aktualisieren' : 'Hinzufügen'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Menu Items List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {menuItems.map((item) => (
          <div key={item.id} className="bg-white rounded-lg shadow-md overflow-hidden">
            {item.image_url && (
              <div className="h-48 bg-gray-200 overflow-hidden">
                <img 
                  src={item.image_url} 
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
                <span className="text-lg font-bold text-orange-500">
                  {item.price.toFixed(2)}€
                </span>
              </div>
              
              <p className="text-gray-600 text-sm mb-2">{item.description}</p>
              
              <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                <span className="bg-gray-100 px-2 py-1 rounded">{item.category}</span>
                <span className={`px-2 py-1 rounded ${
                  item.available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {item.available ? 'Verfügbar' : 'Nicht verfügbar'}
                </span>
              </div>

              {item.options && item.options.length > 0 && (
                <div className="mb-3">
                  <p className="text-sm font-medium text-gray-700 mb-1">Optionen:</p>
                  <div className="text-xs text-gray-600 space-y-1">
                    {item.options.map((option, index) => (
                      <div key={index} className="flex justify-between">
                        <span>{option.name}</span>
                        <span>+{option.price.toFixed(2)}€</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex space-x-2">
                <button
                  onClick={() => handleEdit(item)}
                  className="flex-1 flex items-center justify-center space-x-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-3 rounded-lg text-sm font-medium transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  <span>Bearbeiten</span>
                </button>
                
                <button
                  onClick={() => toggleAvailability(item.id, item.available)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    item.available
                      ? 'bg-yellow-500 hover:bg-yellow-600 text-white'
                      : 'bg-green-500 hover:bg-green-600 text-white'
                  }`}
                >
                  {item.available ? 'Deaktivieren' : 'Aktivieren'}
                </button>
                
                <button
                  onClick={() => handleDelete(item.id)}
                  className="bg-red-500 hover:bg-red-600 text-white py-2 px-3 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {menuItems.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Plus className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Noch keine Menü-Artikel vorhanden
          </h3>
          <p className="text-gray-600 mb-4">
            Fügen Sie Ihren ersten Artikel hinzu, um loszulegen.
          </p>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Ersten Artikel hinzufügen
          </button>
        </div>
      )}
    </div>
  )
}

export default MenuManagement