import { createContext, useContext, useState } from 'react'
import { api } from '../lib/api'

/**
 * Auth state for the app.
 *
 * The session itself lives in an httpOnly cookie set by the backend; the user
 * object is mirrored into localStorage purely so a hard refresh (or an external
 * redirect back into the app) can render the signed-in shell without an extra
 * round trip.
 */

const AuthContext = createContext(null)

const STORAGE_KEY = 'clauseguard.user'

function readStoredUser() {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser)

  const persist = (next) => {
    setUser(next)
    try {
      if (next) {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      } else {
        window.localStorage.removeItem(STORAGE_KEY)
      }
    } catch {
      // Storage can be unavailable (private mode) — in-memory state still works.
    }
  }

  const login = async (email, password) => {
    const data = await api.login(email, password)
    persist(data?.user ?? { email })
    return data
  }

  /** Registration is OTP-gated, so the backend already signs the user in. */
  const register = async (payload) => {
    const data = await api.register(payload)
    persist(data?.user ?? { email: payload.email })
    return data
  }

  const loginWithGoogle = async (accessToken) => {
    const data = await api.loginWithGoogle(accessToken)
    persist(data?.user ?? null)
    return data
  }

  const logout = async () => {
    try {
      await api.logout()
    } catch {
      // Even if the backend call fails we still clear the local session.
    }
    persist(null)
  }

  const value = {
    user,
    isAuthenticated: !!user,
    login,
    register,
    loginWithGoogle,
    logout,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside an <AuthProvider>')
  }
  return context
}
