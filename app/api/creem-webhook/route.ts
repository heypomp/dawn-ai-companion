/**
 * Creem Webhook 处理 API
 * 接收并处理 Creem 支付回调事件
 * 支持事件类型：checkout.completed, subscription.paid, subscription.trialing
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// 环境变量配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const webhookSecret = process.env.CREEM_WEBHOOK_SECRET!

// Supabase 管理员客户端 - 使用 service role key 绕过 RLS
const supabase = createClient(supabaseUrl, serviceKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  db: {
    schema: 'public'
  },
  global: {
    headers: {
      'x-use-service-role': 'true'  // 明确使用 service role
    }
  }
})

// 将分转换为元
function centsToAmount(cents: number): number {
  return Math.round(cents / 100 * 100) / 100
}

// 验证 webhook 签名
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  try {
    // Creem 使用 HMAC-SHA256 签名
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload, 'utf8')
      .digest('hex')
    
    // 防止时序攻击
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    )
  } catch (error) {
    console.error('[Webhook] 签名验证失败:', error)
    return false
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text()
    console.log('[Webhook] 收到支付回调')
    
    if (!body) {
      return NextResponse.json({ received: true }, { status: 200 })
    }

    // 验证 webhook 签名
    const signature = request.headers.get('x-creem-signature') || 
                     request.headers.get('creem-signature')
    
    if (!signature) {
      console.error('[Webhook] 缺少签名头')
      return NextResponse.json({ error: '未授权的请求' }, { status: 401 })
    }

    if (!verifyWebhookSignature(body, signature, webhookSecret)) {
      console.error('[Webhook] 签名验证失败')
      return NextResponse.json({ error: '签名验证失败' }, { status: 401 })
    }

    const event = JSON.parse(body)
    const eventId = event.id || event.event_id
    const eventType = event.eventType || event.type

    // 防重放攻击：检查事件是否已处理
    if (eventId) {
      const { data: existingEvent } = await supabase
        .from('webhook_events')
        .select('id')
        .eq('event_id', eventId)
        .single()

      if (existingEvent) {
        console.log(`[Webhook] 事件 ${eventId} 已处理，跳过`)
        return NextResponse.json({ received: true, status: 'duplicate' }, { status: 200 })
      }
    }
    console.log('[Webhook] 事件类型:', eventType)

    // 记录 webhook 事件（在处理前）
    await supabase.from('webhook_events').insert({
      provider: 'creem',
      event_id: eventId,
      event_type: eventType,
      payload: event,
      processed: false,
      created_at: new Date().toISOString()
    })

    let processed = false

    // 处理支付完成
    if (eventType === 'checkout.completed') {
      await handleCheckoutCompleted(event.object || event.data)
      processed = true
    } else if (eventType === 'subscription.paid') {
      await handleSubscriptionPaid(event.object || event.data)
      processed = true
    } else if (eventType === 'subscription.trialing') {
      await handleSubscriptionTrialing(event.object || event.data)
      processed = true
    } else {
      console.log(`[Webhook] 未处理的事件类型: ${eventType}`)
    }
    
    // 更新事件处理状态
    if (eventId && processed) {
      await supabase
        .from('webhook_events')
        .update({ processed: true })
        .eq('event_id', eventId)
    }

    return NextResponse.json({ 
      received: true, 
      processed,
      eventType 
    }, { status: 200 })
    
  } catch (error) {
    console.error('[Webhook] 错误:', error)
    return NextResponse.json({ error: 'Webhook处理失败' }, { status: 500 })
  }
}

// 处理支付完成事件
async function handleCheckoutCompleted(data: any) {
  console.log('[Webhook] 处理 checkout.completed 事件')
  
  const metadata = data.metadata || {}
  const order = data.order || {}
  const customer = data.customer || {}
  
  // 从 order 中获取金额（分为单位）
  const amountCents = order.amount || data.amount || 0
  const amount = centsToAmount(amountCents)
  
  console.log(`[Webhook] 订单金额: ${amountCents} 分 = ${amount} 元`)
  
  try {
    // 确保用户 ID 存在
    let userId = metadata.userId
    const customerEmail = metadata.email || customer.email
    
    // 如果没有 userId 但有邮箱，尝试通过邮箱查找用户
    if (!userId && customerEmail) {
      console.log(`[Webhook] 通过邮箱 ${customerEmail} 查找用户`)
      const { data: userData, error: userError } = await supabase.auth.admin.listUsers()
      
      if (!userError && userData.users) {
        const foundUser = userData.users.find(u => u.email === customerEmail)
        if (foundUser) {
          userId = foundUser.id
          console.log(`[Webhook] 找到用户 ${userId} 对应邮箱 ${customerEmail}`)
        }
      }
    }
    
    if (!userId) {
      console.warn('[Webhook] 无法确定用户ID，将保存订单但不更新订阅')
    }
    
    // 检查订单是否已存在
    const orderId = order.id || data.id
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id')
      .eq('order_id', orderId)
      .single()
    
    if (existingOrder) {
      console.log(`[Webhook] 订单 ${orderId} 已存在，跳过保存`)
    } else {
      // 保存订单
      const { error: orderError } = await supabase.from('orders').insert({
        provider: 'creem',
        order_id: orderId,
        user_id: userId || null,
        customer_email: customerEmail,
        plan_name: metadata.planName || '未知',
        amount: amount,
        currency: order.currency || 'USD',
        status: 'completed',
        metadata: data,
        created_at: new Date().toISOString()
      })
      
      if (orderError) {
        console.error('[Webhook] 保存订单失败:', orderError)
        throw orderError
      }
      
      console.log(`[Webhook] 订单 ${orderId} 保存成功`)
    }

    // 更新用户订阅（只有在确定用户ID时）
    if (userId) {
      const subscriptionData = {
        user_id: userId,
        plan: metadata.planName,
        status: 'active',
        updated_at: new Date().toISOString()
      }
      
      // 如果有订阅信息，添加周期信息
      if (data.subscription) {
        subscriptionData.current_period_start = data.subscription.current_period_start_date
        subscriptionData.current_period_end = data.subscription.current_period_end_date
      }
      
      const { error: subError } = await supabase
        .from('user_subscriptions')
        .upsert(subscriptionData, { onConflict: 'user_id' })
        
      if (subError) {
        console.error('[Webhook] 更新订阅失败:', subError)
        throw subError
      }
      
      console.log(`[Webhook] 用户 ${userId} 订阅已激活`)
    }
  } catch (error) {
    console.error('[Webhook] 处理 checkout.completed 失败:', error)
    throw error
  }
}

// 处理订阅付费事件
async function handleSubscriptionPaid(data: any) {
  console.log('[Webhook] 处理 subscription.paid 事件')
  
  const metadata = data.metadata || {}
  const transaction = data.last_transaction || {}
  const customer = data.customer || {}
  
  // 从交易中获取金额
  const amountCents = transaction.amount || 0
  const amount = centsToAmount(amountCents)
  
  console.log(`[Webhook] 订阅付费金额: ${amountCents} 分 = ${amount} 元`)
  
  try {
    // 确保用户 ID 存在
    let userId = metadata.userId
    const customerEmail = metadata.email || customer.email
    
    // 如果没有 userId 但有邮箱，尝试通过邮箱查找用户
    if (!userId && customerEmail) {
      console.log(`[Webhook] 通过邮箱 ${customerEmail} 查找用户`)
      const { data: userData, error: userError } = await supabase.auth.admin.listUsers()
      
      if (!userError && userData.users) {
        const foundUser = userData.users.find(u => u.email === customerEmail)
        if (foundUser) {
          userId = foundUser.id
          console.log(`[Webhook] 找到用户 ${userId} 对应邮箱 ${customerEmail}`)
        }
      }
    }
    
    if (!userId) {
      console.warn('[Webhook] 无法确定用户ID，将保存订单但不更新订阅')
    }
    
    // 检查订单是否已存在
    const orderId = transaction.order || transaction.id || data.id
    const { data: existingOrder } = await supabase
      .from('orders')
      .select('id')
      .eq('order_id', orderId)
      .single()
    
    if (existingOrder) {
      console.log(`[Webhook] 订单 ${orderId} 已存在，跳过保存`)
    } else {
      // 保存订单记录
      const { error: orderError } = await supabase.from('orders').insert({
        provider: 'creem',
        order_id: orderId,
        user_id: userId || null,
        customer_email: customerEmail,
        plan_name: metadata.planName || '未知',
        amount: amount,
        currency: transaction.currency || 'USD',
        status: 'completed',
        metadata: data,
        created_at: new Date().toISOString()
      })
      
      if (orderError) {
        console.error('[Webhook] 保存订阅订单失败:', orderError)
        throw orderError
      }
      
      console.log(`[Webhook] 订单 ${orderId} 保存成功`)
    }

    // 更新订阅状态（只有在确定用户ID时）
    if (userId) {
      const { error: subError } = await supabase
        .from('user_subscriptions')
        .upsert({
          user_id: userId,
          plan: metadata.planName,
          status: 'active',
          current_period_start: data.current_period_start_date,
          current_period_end: data.current_period_end_date,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' })
        
      if (subError) {
        console.error('[Webhook] 更新订阅状态失败:', subError)
        throw subError
      }
      
      console.log(`[Webhook] 用户 ${userId} 订阅续费成功`)
    }
  } catch (error) {
    console.error('[Webhook] 处理 subscription.paid 失败:', error)
    throw error
  }
}

// 处理试用期开始事件
async function handleSubscriptionTrialing(data: any) {
  console.log('[Webhook] 处理 subscription.trialing 事件')
  
  const metadata = data.metadata || {}
  
  try {
    // 确保用户 ID 存在
    let userId = metadata.userId
    const customerEmail = metadata.email || data.customer?.email
    
    // 如果没有 userId 但有邮箱，尝试通过邮箱查找用户
    if (!userId && customerEmail) {
      console.log(`[Webhook] 通过邮箱 ${customerEmail} 查找用户`)
      const { data: userData, error: userError } = await supabase.auth.admin.listUsers()
      
      if (!userError && userData.users) {
        const foundUser = userData.users.find(u => u.email === customerEmail)
        if (foundUser) {
          userId = foundUser.id
          console.log(`[Webhook] 找到用户 ${userId} 对应邮箱 ${customerEmail}`)
        }
      }
    }

    // 更新用户订阅状态为试用中
    if (userId) {
      const { error: subError } = await supabase
        .from('user_subscriptions')
        .upsert({
          user_id: userId,
          plan: metadata.planName || '试用版',
          status: 'trialing',
          current_period_start: data.current_period_start_date,
          current_period_end: data.current_period_end_date,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' })
        
      if (subError) {
        console.error('[Webhook] 更新试用订阅失败:', subError)
        throw subError
      }
      
      console.log(`[Webhook] 用户 ${userId} 开始试用`)
    } else {
      console.warn('[Webhook] 无法确定用户ID，无法更新试用状态')
    }
  } catch (error) {
    console.error('[Webhook] 处理 subscription.trialing 失败:', error)
    throw error
  }
}