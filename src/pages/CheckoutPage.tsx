import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Clock, User, Phone, MessageSquare } from 'lucide-react'
import { useCart } from '../context/CartContext'
import { supabase } from '../lib/supabase'

const CheckoutPage: React.FC = () => {
  const navigate = useNavigate()
  const { items, getTotalPrice, clearCart } = useCart()
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    customerName: '',
    customerPhone: '',
    pickupTime: 'sofort',
    customPickupTime: '',
    notes: ''
  })

  const totalPrice = getTotalPrice()

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (items.length === 0) return

    setLoading(true)

    try {
      const pickupTime = formData.pickupTime === 'sofort' 
        ? new Date(Date.now() + 20 * 60 * 1000).toISOString() // 20 Minuten ab jetzt
        : new Date(formData.customPickupTime).toISOString()

      const orderData = {
        customer_name: formData.customerName,
        customer_phone: formData.customerPhone,
        pickup_time: pickupTime,
        total_amount: totalPrice,
        items: items.map(item => ({
          id: item.id,
          name: item.name,
          price: item.price,
          quantity: item.quantity
        })),
        notes: formData.notes || null,
        status: 'pending' as const
      }

      const { data, error } = await supabase
        .from('orders')
        .insert([orderData])
        .select()
        .single()

      if (error) throw error

      clearCart()
      navigate(`/order-confirmation/${data.id}`)
    } catch (error) {
      console.error('Error creating order:', error)
      alert('Fehler beim Erstellen der Bestellung. Bitte versuchen Sie es erneut.')
    } finally {
      setLoading(false)
    }
  }

  const getMinDateTime = () => {
    const now = new Date()
    now.setMinutes(now.getMinutes() + 30) // Mindestens 30 Minuten Vorlauf
    return now.toISOString().slice(0, 16)
  }

  if (items.length === 0) {
    navigate('/cart')
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center mb-6">
          <button
            onClick={() => navigate('/cart')}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Zurück zum Warenkorb</span>
          </button>
        </div>

        <h1 className="text-2xl font-bold text-gray-900 mb-8">Bestellung abschließen</h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Bestellformular */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Ihre Daten</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="customerName" className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4" />
                  <span>Name *</span>
                </label>
                <input
                  type="text"
                  id="customerName"
                  name="customerName"
                  required
                  value={formData.customerName}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Ihr vollständiger Name"
                />
              </div>

              <div>
                <label htmlFor="customerPhone" className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                  <Phone className="w-4 h-4" />
                  <span>Telefonnummer *</span>
                </label>
                <input
                  type="tel"
                  id="customerPhone"
                  name="customerPhone"
                  required
                  value={formData.customerPhone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="0123 456789"
                />
              </div>

              <div>
                <label htmlFor="pickupTime" className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                  <Clock className="w-4 h-4" />
                  <span>Abholzeit *</span>
                </label>
                <select
                  id="pickupTime"
                  name="pickupTime"
                  value={formData.pickupTime}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="sofort">So schnell wie möglich (~20 Min)</option>
                  <option value="custom">Bestimmte Zeit wählen</option>
                </select>
              </div>

              {formData.pickupTime === 'custom' && (
                <div>
                  <label htmlFor="customPickupTime" className="text-sm font-medium text-gray-700 mb-2 block">
                    Gewünschte Abholzeit
                  </label>
                  <input
                    type="datetime-local"
                    id="customPickupTime"
                    name="customPickupTime"
                    min={getMinDateTime()}
                    value={formData.customPickupTime}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              )}

              <div>
                <label htmlFor="notes" className="flex items-center space-x-2 text-sm font-medium text-gray-700 mb-2">
                  <MessageSquare className="w-4 h-4" />
                  <span>Besondere Wünsche (optional)</span>
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={3}
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  placeholder="Allergien, Extrawünsche, etc."
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 disabled:bg-gray-400 text-white py-3 px-6 rounded-lg font-medium text-lg transition-colors"
              >
                {loading ? 'Bestellung wird erstellt...' : 'Bestellung aufgeben'}
              </button>
            </form>
          </div>

          {/* Bestellübersicht */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Ihre Bestellung</h2>
            
            <div className="space-y-4 mb-6">
              {items.map((item) => (
                <div key={item.id} className="flex justify-between items-center">
                  <div>
                    <span className="font-medium">{item.quantity}x {item.name}</span>
                    <span className="text-sm text-gray-600 block">
                      {item.price.toFixed(2)}€ pro Stück
                    </span>
                  </div>
                  <span className="font-medium">
                    {(item.price * item.quantity).toFixed(2)}€
                  </span>
                </div>
              ))}
            </div>

            <div className="border-t pt-4">
              <div className="flex justify-between items-center text-xl font-bold text-gray-900">
                <span>Gesamtsumme:</span>
                <span>{totalPrice.toFixed(2)}€</span>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                Barzahlung bei Abholung
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CheckoutPage