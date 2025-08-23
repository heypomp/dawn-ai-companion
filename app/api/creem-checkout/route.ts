/**
 * Creem 支付会话创建 API
 * 处理用户订阅请求，创建 Creem 支付会话
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// 环境变量配置
const CREEM_API_KEY = process.env.CREEM_API_KEY!
const CREEM_API_BASE_URL = process.env.CREEM_API_BASE_URL || 'https://api.creem.io'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Supabase 管理员客户端（用于用户验证）
const supabase = createClient(supabaseUrl, serviceKey)

// 验证用户认证状态
async function verifyUserAuth(request: NextRequest, userId: string) {
  try {
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return null
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error } = await supabase.auth.getUser(token)
    
    if (error || !user || user.id !== userId) {
      return null
    }
    
    return user
  } catch (error) {
    console.error('用户认证验证失败:', error)
    return null
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId, planName, amount, userId, email } = body

    // 输入验证
    if (!productId || !userId) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 })
    }

    // 简化验证：检查用户是否存在于数据库中
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(userId)
    if (userError || !userData.user) {
      return NextResponse.json({ error: '用户不存在或无效' }, { status: 401 })
    }

    // 输入验证和清理
    if (typeof amount !== 'number' || amount <= 0) {
      return NextResponse.json({ error: '无效的金额' }, { status: 400 })
    }

    if (typeof planName !== 'string' || planName.length > 100) {
      return NextResponse.json({ error: '无效的套餐名称' }, { status: 400 })
    }

    // Mock 模式 - 只在明确设置 CREEM_MOCK_MODE 时启用
    if (process.env.CREEM_MOCK_MODE === 'true') {
      const mockUrl = `${APP_URL}/payment/success?` +
        `plan=${encodeURIComponent(planName)}&amount=${amount}&mock=true`
      
      return NextResponse.json({
        success: true,
        checkoutUrl: mockUrl
      })
    }

    // 真实 Creem API 调用
    console.log('调用Creem API，productId:', productId)
    
    const checkoutData = {
      product_id: productId,
      success_url: `${APP_URL}/payment/success`,
      metadata: { 
        userId, 
        planName, 
        amount: amount.toString(),
        billingCycle: 'monthly', // 可以从前端传入
        email: email || userData.user.email
      }
    }
    
    // 生产环境不记录敏感数据
    if (process.env.NODE_ENV === 'development') {
      console.log('Checkout 请求数据:', JSON.stringify(checkoutData, null, 2))
    }
    
    const response = await fetch(`${CREEM_API_BASE_URL}/v1/checkouts`, {
      method: 'POST',
      headers: {
        'x-api-key': CREEM_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(checkoutData)
    })

    const data = await response.json()
    
    // 生产环境不记录响应详情
    if (process.env.NODE_ENV === 'development') {
      console.log('Creem API 响应:', JSON.stringify(data, null, 2))
    }
    
    if (!response.ok) {
      console.error('Creem API错误:', response.status, response.statusText)
      return NextResponse.json({ 
        error: '创建支付失败'
      }, { status: 500 })
    }

    const checkoutUrl = data.checkout_url || data.url
    if (!checkoutUrl) {
      console.error('Creem API 未返回 checkout_url')
      return NextResponse.json({ 
        error: '支付URL获取失败'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      checkoutUrl,
      sessionId: data.id || data.checkout_id
    })

  } catch (error) {
    console.error('支付错误:', error)
    return NextResponse.json({ error: '支付服务异常' }, { status: 500 })
  }
}