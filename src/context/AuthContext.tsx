import React, { createContext, useContext, useState, ReactNode } from 'react'

interface AuthContextType {
  isAdminAuthenticated: boolean
  login: (password: string) => boolean
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

// In einer echten Anwendung sollte das Passwort sicher gespeichert werden
const ADMIN_PASSWORD = 'admin123'

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(() => {
    return localStorage.getItem('adminAuth') === 'true'
  })

  const login = (password: string): boolean => {
    if (password === ADMIN_PASSWORD) {
      setIsAdminAuthenticated(true)
      localStorage.setItem('adminAuth', 'true')
      return true
    }
    return false
  }

  const logout = () => {
    setIsAdminAuthenticated(false)
    localStorage.removeItem('adminAuth')
  }

  return (
    <AuthContext.Provider value={{
      isAdminAuthenticated,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  )
}