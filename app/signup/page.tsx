"use client"

import { useState, Suspense } from "react"
import { createClient } from '@supabase/supabase-js'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft } from "lucide-react"
import { useSearchParams } from "next/navigation"

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

function SignUpContent() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'error' | 'success', text: string } | null>(null)
  const searchParams = useSearchParams()
  const redirect = searchParams.get('redirect') || '/'
  
  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  // Google 注册/登录
  const handleGoogleSignUp = async () => {
    setLoading(true)
    setMessage(null)

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) {
        setMessage({ type: 'error', text: 'Google 注册失败：' + error.message })
      }
    } catch (err) {
      setMessage({ type: 'error', text: 'Google 注册失败，请重试' })
    } finally {
      setLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
        }
      })

      if (error) {
        setMessage({ type: 'error', text: error.message })
      } else {
        setMessage({ 
          type: 'success', 
          text: '注册成功！请检查您的邮箱进行验证。如果是测试环境，您可以直接登录。' 
        })
        // 清空表单
        setEmail("")
        setPassword("")
        setFullName("")
      }
    } catch (err) {
      setMessage({ type: 'error', text: '注册失败，请重试' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center">创建新账户</CardTitle>
          <p className="text-center text-sm text-muted-foreground">
            加入 AI 助手的世界，开启智能对话之旅
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Google 注册 */}
            <Button
              onClick={handleGoogleSignUp}
              variant="outline"
              className="w-full py-3 text-base font-medium"
              disabled={loading}
            >
              <svg className="mr-3 h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#4285f4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34a853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#fbbc05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#ea4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              {loading ? '注册中...' : '使用 Google 注册'}
            </Button>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">或</span>
              </div>
            </div>
            
            {/* 邮箱密码注册 */}
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <Input
                  type="text"
                  placeholder="全名"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <Input
                  type="email"
                  placeholder="邮箱地址"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <Input
                  type="password"
                  placeholder="密码（至少6位）"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  disabled={loading}
                />
              </div>
              
              {message && (
                <div className={`text-sm p-3 rounded-md ${
                  message.type === 'error' 
                    ? 'text-red-600 bg-red-50' 
                    : 'text-green-600 bg-green-50'
                }`}>
                  {message.text}
                </div>
              )}
              
              <div className="space-y-3">
                <Button
                  type="submit"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? '注册中...' : '邮箱注册'}
                </Button>
                
                <div className="text-center">
                  <span className="text-sm text-muted-foreground">已经有账户？</span>
                  <Button
                    type="button"
                    variant="link"
                    className="p-0 h-auto font-normal"
                    onClick={() => window.location.href = `/login?redirect=${encodeURIComponent(redirect)}`}
                    disabled={loading}
                  >
                    立即登录
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function SignUpPage() {
  return (
    <Suspense 
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
          <Card className="w-full max-w-md">
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">加载中...</p>
            </CardContent>
          </Card>
        </div>
      }
    >
      <SignUpContent />
    </Suspense>
  )
}