import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  // 创建响应
  const response = NextResponse.next()

  // 安全头配置
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  response.headers.set('X-XSS-Protection', '1; mode=block')
  
  // CSP 策略
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.creem.io https://js.creem.io",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: https:",
    "connect-src 'self' https://api.creem.io https://*.supabase.co",
    "frame-src 'self' https://checkout.creem.io",
    "form-action 'self'"
  ].join('; ')
  
  response.headers.set('Content-Security-Policy', csp)

  // API 路由的特殊处理
  if (request.nextUrl.pathname.startsWith('/api/')) {
    // 移除不必要的头信息
    response.headers.delete('X-Powered-By')
    
    // 限制 webhook 端点的访问
    if (request.nextUrl.pathname === '/api/creem-webhook') {
      // 只允许 POST 请求
      if (request.method !== 'POST') {
        return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
      }
      
      // 检查 User-Agent（可选的额外验证）
      const userAgent = request.headers.get('user-agent')
      if (process.env.NODE_ENV === 'production' && 
          (!userAgent || !userAgent.includes('Creem'))) {
        // 生产环境可以启用这个检查
        // return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}