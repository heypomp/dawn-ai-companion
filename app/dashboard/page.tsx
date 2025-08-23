"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export default function Dashboard() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient(supabaseUrl, supabaseAnonKey)

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        setUser(user)
      } else {
        window.location.href = '/login'
      }
    } catch (error) {
      console.error('Error checking user:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">仪表板</h1>
          <Button onClick={handleLogout} variant="outline">
            退出登录
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>用户信息</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">邮箱</p>
                <p className="font-medium">{user.email}</p>
                <p className="text-sm text-muted-foreground">用户 ID</p>
                <p className="font-mono text-xs">{user.id}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>订阅状态</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">当前方案</p>
              <p className="font-medium">免费版</p>
              <Button 
                className="mt-4 w-full" 
                onClick={() => window.location.href = '/pricing'}
              >
                升级方案
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>使用情况</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">消息数</span>
                  <span className="font-medium">0 / 100</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">AI 代理</span>
                  <span className="font-medium">0 / 3</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}