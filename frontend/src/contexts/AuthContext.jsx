import { createContext, useContext, useState, useEffect } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'

const AuthContext = createContext()

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Set up axios defaults
  // Base URL should not contain the /api prefix since individual endpoints include it
  const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:4000';
  axios.defaults.baseURL = apiUrl;

  // Add token to requests
  axios.interceptors.request.use((config) => {
    const token = localStorage.getItem('token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  })

  // Handle token expiration
  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        localStorage.removeItem('token')
        setUser(null)
        toast.error('Session expired. Please login again.')
      }
      return Promise.reject(error)
    }
  )

  const login = async (username, password) => {
    try {
      const response = await axios.post('/api/auth/login', { username, password })
      const { token, user } = response.data
      
      localStorage.setItem('token', token)
      setUser(user)
      
      toast.success('Login successful!')
      return user
    } catch (error) {
      const message = error.response?.data?.error || 'Login failed'
      toast.error(message)
      throw error
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
    toast.success('Logged out successfully')
  }

  const register = async (username, password, role) => {
    try {
      const response = await axios.post('/api/auth/register', { username, password, role })
      toast.success('User created successfully!')
      return response.data
    } catch (error) {
      const message = error.response?.data?.error || 'Registration failed'
      toast.error(message)
      throw error
    }
  }

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token')
      if (!token) {
        setLoading(false)
        return
      }

      const response = await axios.get('/api/auth/me')
      setUser(response.data.user)
    } catch (error) {
      localStorage.removeItem('token')
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    checkAuth()
  }, [])

  const value = {
    user,
    loading,
    login,
    logout,
    register,
    isOwner: user?.role === 'owner',
    isStaff: user?.role === 'staff'
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
} 