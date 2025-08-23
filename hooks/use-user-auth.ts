import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import type { User as SupabaseUser } from '@supabase/supabase-js'

export function useUserAuth() {
  const [user, setUser] = useState<SupabaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    // 获取初始用户状态
    const getInitialUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()
        console.log('[User Auth Hook] Initial user check:', user ? `user: ${user.id}` : 'no user', error?.message)
        
        if (user && !error) {
          setUser(user)
          setIsAuthenticated(true)
        } else {
          setUser(null)
          setIsAuthenticated(false)
        }
      } catch (error) {
        console.error('[User Auth Hook] Error getting initial user:', error)
        setUser(null)
        setIsAuthenticated(false)
      } finally {
        setLoading(false)
      }
    }

    // 监听认证状态变化
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[User Auth Hook] Auth state changed:', event, session?.user?.id)
        
        if (session?.user) {
          setUser(session.user)
          setIsAuthenticated(true)
        } else {
          setUser(null)
          setIsAuthenticated(false)
        }
        setLoading(false)
      }
    )

    getInitialUser()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setIsAuthenticated(false)
  }

  // 检查用户是否真的已登录的函数
  const verifyAuth = async (): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/user')
      const isValid = response.ok
      console.log('[User Auth Hook] Auth verification:', isValid ? 'valid' : 'invalid')
      return isValid
    } catch {
      console.log('[User Auth Hook] Auth verification failed')
      return false
    }
  }

  return {
    user,
    loading,
    isAuthenticated,
    signOut,
    verifyAuth
  }
}