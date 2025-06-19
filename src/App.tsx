import React, { useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { CartProvider } from './context/CartContext'
import { AuthProvider } from './context/AuthContext'
import Header from './components/Header'
import MenuPage from './pages/MenuPage'
import CartPage from './pages/CartPage'
import CheckoutPage from './pages/CheckoutPage'
import OrderConfirmationPage from './pages/OrderConfirmationPage'
import AdminPage from './pages/AdminPage'
import DebugInfo from './components/DebugInfo'

function App() {
  useEffect(() => {
    // Service Worker registrieren beim App-Start
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('✅ Service Worker registered successfully:', registration)
          
          // Warte bis Service Worker aktiv ist
          if (registration.installing) {
            registration.installing.addEventListener('statechange', () => {
              if (registration.installing?.state === 'activated') {
                console.log('✅ Service Worker activated')
              }
            })
          } else if (registration.waiting) {
            registration.waiting.addEventListener('statechange', () => {
              if (registration.waiting?.state === 'activated') {
                console.log('✅ Service Worker activated')
              }
            })
          } else if (registration.active) {
            console.log('✅ Service Worker already active')
          }
        })
        .catch(error => {
          console.error('❌ Service Worker registration failed:', error)
        })
    }
  }, [])

  return (
    <AuthProvider>
      <CartProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Header />
            <Routes>
              <Route path="/" element={<MenuPage />} />
              <Route path="/cart" element={<CartPage />} />
              <Route path="/checkout" element={<CheckoutPage />} />
              <Route path="/order-confirmation/:orderId" element={<OrderConfirmationPage />} />
              <Route path="/admin" element={<AdminPage />} />
            </Routes>
            <DebugInfo />
          </div>
        </Router>
      </CartProvider>
    </AuthProvider>
  )
}

export default App