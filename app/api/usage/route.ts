import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase-admin'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export async function GET(request: NextRequest) {
  try {
    // 获取当前用户
    const cookieStore = await cookies()
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      // 未登录用户，返回访客积分（3积分）
      return NextResponse.json({
        credits: 3,
        is_guest: true,
        is_limit_reached: false
      })
    }

    console.log('[Usage API] Getting credits for user:', user.id)
    
    // 获取用户积分（会自动刷新每日积分）
    const { data: creditsData, error: creditsError } = await supabaseAdmin
      .rpc('get_user_credits', { user_id: user.id })

    console.log('[Usage API] Credits RPC result:', creditsData, 'Error:', creditsError)

    if (creditsError) {
      console.error('[Usage API] Error getting credits via RPC:', creditsError)
      
      // 备用：直接查询 profiles 表
      console.log('[Usage API] Falling back to direct query')
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('credits, subscription_plan, last_credit_update')
        .eq('id', user.id)
        .single()

      console.log('[Usage API] Profile query result:', profile, 'Error:', profileError)

      if (profile) {
        return NextResponse.json({
          credits: profile.credits || 10,
          subscription_plan: profile.subscription_plan || 'free',
          is_guest: false,
          is_limit_reached: (profile.credits || 0) <= 0
        })
      }

      // 如果还是没有，创建新 profile
      console.log('[Usage API] Creating new profile for user:', user.id)
      const { data: newProfile, error: insertError } = await supabaseAdmin
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          credits: 10,
          daily_credits: 10,
          subscription_plan: 'free',
          last_credit_update: new Date().toISOString().split('T')[0]
        })
        .select('credits, subscription_plan')
        .single()
      
      console.log('[Usage API] New profile created:', newProfile, 'Error:', insertError)

      return NextResponse.json({
        credits: newProfile?.credits || 10,
        subscription_plan: newProfile?.subscription_plan || 'free',
        is_guest: false,
        is_limit_reached: false
      })
    }

    console.log('[Usage API] Returning credits:', creditsData)
    return NextResponse.json({
      credits: creditsData || 10,
      subscription_plan: 'free', // 添加默认订阅计划
      is_guest: false,
      is_limit_reached: (creditsData || 0) <= 0
    })

  } catch (error) {
    console.error('Error in usage API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { amount = 1 } = body
    
    // 获取当前用户
    const cookieStore = await cookies()
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
      },
    })

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      // 访客不能使用积分
      return NextResponse.json(
        { error: 'Please login to use credits', is_guest: true },
        { status: 401 }
      )
    }

    // 使用积分
    const { data: remaining, error } = await supabaseAdmin
      .rpc('use_credits', { 
        user_id: user.id,
        amount: amount 
      })

    if (error || remaining === -1) {
      console.error('Error using credits:', error)
      return NextResponse.json(
        { error: 'Insufficient credits', success: false },
        { status: 400 }
      )
    }

    return NextResponse.json({
      remaining_credits: remaining,
      success: true
    })

  } catch (error) {
    console.error('Error in usage POST:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}