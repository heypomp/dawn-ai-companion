import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(request: NextRequest) {
  try {
    console.log('[Auth API] Getting user authentication status')
    const cookieStore = await cookies()
    
    // 打印所有 cookies 以便调试
    const allCookies = cookieStore.getAll()
    console.log('[Auth API] All cookies:', allCookies.map(c => c.name))
    
    // 查找 Supabase cookies
    const supabaseCookies = allCookies.filter(c => c.name.startsWith('sb-'))
    console.log('[Auth API] Supabase cookies found:', supabaseCookies.map(c => `${c.name}: ${c.value.substring(0, 20)}...`))
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey)
    
    // 先尝试直接获取 user
    const { data: { user }, error } = await supabase.auth.getUser()
    console.log('[Auth API] Direct user lookup result:', user ? `user found: ${user.id}` : 'no user', 'Error:', error?.message)

    if (error || !user) {
      console.log('[Auth API] No user found via direct method')
      
      // 尝试使用 Authorization header
      const authHeader = request.headers.get('authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7)
        console.log('[Auth API] Found authorization header')
        
        const { data: { user: tokenUser }, error: tokenError } = await supabase.auth.getUser(token)
        if (!tokenError && tokenUser) {
          console.log('[Auth API] User authenticated via header:', tokenUser.id, tokenUser.email)
          return NextResponse.json({
            id: tokenUser.id,
            email: tokenUser.email,
            metadata: tokenUser.user_metadata
          })
        }
      }
      
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      )
    }
    
    console.log('[Auth API] User authenticated:', user.id, user.email)

    return NextResponse.json({
      id: user.id,
      email: user.email,
      metadata: user.user_metadata
    })

  } catch (error) {
    console.error('Error getting user:', error)
    return NextResponse.json(
      { error: 'Failed to get user info' },
      { status: 500 }
    )
  }
}