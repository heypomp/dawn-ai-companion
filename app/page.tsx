"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, Sun, Copy, Volume2, VolumeX, Loader2, LogIn, LogOut, User } from "lucide-react"
import { cn } from "@/lib/utils"
import { useGuestUsage } from '@/hooks/use-guest-usage'
import { useAuthUserUsage } from '@/hooks/use-auth-user-usage'
import { useUserAuth } from '@/hooks/use-user-auth'
import LoginModal from '@/components/LoginModal'

interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
  audioUrl?: string
  isGeneratingAudio?: boolean
}

export default function DawnChat() {
  const { user, loading: authLoading, isAuthenticated, signOut: userSignOut } = useUserAuth()
  const [loading, setLoading] = useState(true)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content: "你好，我是曦晨。很高兴认识你。无论你想分享什么，我都在这里。",
      timestamp: new Date(),
    },
  ])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [playingAudio, setPlayingAudio] = useState<string | null>(null)
  const [audioElements, setAudioElements] = useState<{ [key: string]: HTMLAudioElement }>({})

  // Usage tracking hooks
  const guestUsage = useGuestUsage()
  const authUsage = useAuthUserUsage(user)

  // 同步 loading 状态
  useEffect(() => {
    setLoading(authLoading)
  }, [authLoading])

  // 显示登录弹窗
  const signInWithGoogle = () => {
    setShowLoginModal(true)
  }

  // 登出
  const signOut = async () => {
    await userSignOut()
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    // Check usage limits before sending message
    if (user) {
      // Authenticated user - use Supabase RPC
      const canContinue = await authUsage.decrementUsageCount()
      if (!canContinue) {
        return // Usage limit reached, don't send message
      }
    } else {
      // Guest user - use localStorage
      const canContinue = guestUsage.decrementGuestCount()
      if (!canContinue) {
        return // Usage limit reached, don't send message
      }
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((msg) => ({
            role: msg.role,
            content: msg.content,
          })),
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to get response")
      }

      const data = await response.json()

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.content,
        timestamp: new Date(),
        isGeneratingAudio: true,
      }

      setMessages((prev) => [...prev, assistantMessage])

      // 自动生成语音
      generateAudio(assistantMessage.id, data.content)
    } catch (error) {
      console.error("Error:", error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "抱歉，我现在无法回应。请稍后再试。",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const generateAudio = async (messageId: string, text: string) => {
    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      })

      if (!response.ok) {
        throw new Error("Failed to generate audio")
      }

      const data = await response.json()

      setMessages((prev) =>
        prev.map((msg) => (msg.id === messageId ? { ...msg, audioUrl: data.audioUrl, isGeneratingAudio: false } : msg)),
      )
    } catch (error) {
      console.error("Error generating audio:", error)
      setMessages((prev) => prev.map((msg) => (msg.id === messageId ? { ...msg, isGeneratingAudio: false } : msg)))
    }
  }

  const playAudio = (messageId: string, audioUrl: string) => {
    // 停止当前播放的音频
    if (playingAudio && audioElements[playingAudio]) {
      audioElements[playingAudio].pause()
      audioElements[playingAudio].currentTime = 0
    }

    // 如果点击的是当前播放的音频，则停止播放
    if (playingAudio === messageId) {
      setPlayingAudio(null)
      return
    }

    // 创建或获取音频元素
    let audio = audioElements[messageId]
    if (!audio) {
      audio = new Audio(audioUrl)
      audio.onended = () => setPlayingAudio(null)
      audio.onerror = () => {
        console.error("Audio playback error")
        setPlayingAudio(null)
      }
      setAudioElements((prev) => ({ ...prev, [messageId]: audio }))
    }

    // 播放音频
    setPlayingAudio(messageId)
    audio.play().catch((error) => {
      console.error("Audio play error:", error)
      setPlayingAudio(null)
    })
  }

  const stopAudio = (messageId: string) => {
    if (audioElements[messageId]) {
      audioElements[messageId].pause()
      audioElements[messageId].currentTime = 0
    }
    setPlayingAudio(null)
  }

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content)
  }

  return (
    <div className="flex flex-col h-screen bg-[#F5F5F5]">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100 p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-medium text-gray-800">曦晨</h1>
            <a href="/pricing" className="text-sm text-gray-600 hover:text-[#FFC999] transition-colors">
              套餐价格
            </a>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Usage Count Display */}
            {loading ? (
              <div className="w-16 h-6 rounded bg-gray-200 animate-pulse"></div>
            ) : user ? (
              !authUsage.loading && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">剩余次数:</span>
                  <span className="font-medium text-[#FFC999]">{authUsage.usageCount || 0}</span>
                </div>
              )
            ) : (
              !guestUsage.loading && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-600">体验次数:</span>
                  <span className="font-medium text-[#FFC999]">{guestUsage.guestCount}</span>
                </div>
              )
            )}

            {loading ? (
              <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse"></div>
            ) : user ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-600" />
                  <span className="text-sm text-gray-600">
                    {user.user_metadata?.full_name || user.email}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={signOut}
                  className="flex items-center gap-2"
                >
                  <LogOut className="w-4 h-4" />
                  登出
                </Button>
              </div>
            ) : (
              <Button
                onClick={signInWithGoogle}
                className="flex items-center gap-2 bg-[#FFC999] hover:bg-[#FFB366] text-white"
              >
                <LogIn className="w-4 h-4" />
                Google 登录
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-4 pb-20">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((message) => (
            <div key={message.id} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[80%] rounded-2xl px-4 py-3 relative group",
                  message.role === "user" ? "bg-white text-gray-800 shadow-sm" : "bg-[#FFF4E6] text-gray-800 shadow-sm",
                )}
              >
                {message.role === "assistant" && (
                  <div className="flex items-start gap-2">
                    <Sun className="w-4 h-4 text-[#FFC999] mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="whitespace-pre-wrap leading-relaxed mb-3">{message.content}</p>

                      {/* 底部操作按钮 */}
                      <div className="flex items-center gap-3 pt-2 border-t border-[#FFC999]/20">
                        {/* 语音按钮 */}
                        {message.isGeneratingAudio ? (
                          <Button variant="ghost" size="sm" className="h-8 px-3 text-xs" disabled>
                            <Loader2 className="w-3 h-3 animate-spin mr-1" />
                            生成中...
                          </Button>
                        ) : message.audioUrl ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-3 text-xs hover:bg-[#FFC999]/10"
                            onClick={() =>
                              playingAudio === message.id
                                ? stopAudio(message.id)
                                : playAudio(message.id, message.audioUrl!)
                            }
                          >
                            {playingAudio === message.id ? (
                              <>
                                <VolumeX className="w-3 h-3 mr-1" />
                                暂停
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-3 h-3 mr-1" />
                                播放
                              </>
                            )}
                          </Button>
                        ) : null}

                        {/* 复制按钮 */}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-3 text-xs hover:bg-[#FFC999]/10"
                          onClick={() => copyMessage(message.content)}
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          复制
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {message.role === "user" && <p className="whitespace-pre-wrap leading-relaxed">{message.content}</p>}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-[#FFF4E6] rounded-2xl px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <Sun className="w-4 h-4 text-[#FFC999]" />
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-[#FFC999] rounded-full animate-pulse"></div>
                    <div
                      className="w-2 h-2 bg-[#FFC999] rounded-full animate-pulse"
                      style={{ animationDelay: "0.2s" }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-[#FFC999] rounded-full animate-pulse"
                      style={{ animationDelay: "0.4s" }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 p-4">
        <div className="max-w-4xl mx-auto">
          {/* Usage Limit Notice */}
          {(user && authUsage.isLimitReached) || (!user && guestUsage.isGuestLimitReached) ? (
            <div className="mb-4 p-3 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-800">
                    {user ? "今日会话次数已用完" : "体验次数已用完"}
                  </p>
                  <p className="text-xs text-orange-600">
                    {user ? "明天会自动重置为10次" : "登录后每天可享10次免费对话"}
                  </p>
                </div>
                {!user && (
                  <Button
                    onClick={signInWithGoogle}
                    size="sm"
                    className="bg-[#FFC999] hover:bg-[#FFB366] text-white"
                  >
                    立即登录
                  </Button>
                )}
              </div>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="flex gap-3 items-end">
            <div className="flex-1">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit(e)
                  }
                }}
                placeholder="和曦晨聊聊吧..."
                className="min-h-[44px] max-h-32 resize-none border-gray-200 focus:border-[#FFC999] focus:ring-[#FFC999] rounded-xl"
                disabled={isLoading || (user && authUsage.isLimitReached) || (!user && guestUsage.isGuestLimitReached)}
              />
            </div>
            <Button
              type="submit"
              disabled={!input.trim() || isLoading || (user && authUsage.isLimitReached) || (!user && guestUsage.isGuestLimitReached)}
              className="h-11 w-11 rounded-full bg-[#FFC999] hover:bg-[#FFB366] text-white p-0 flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>

          {/* Privacy Notice */}
          <div className="mt-3 text-center">
            <p className="text-xs text-gray-500">
              为了保护你的隐私，曦晨暂时还记不住我们之前的聊天。每次对话都是一个全新的开始。
            </p>
            <a href="/privacy" className="text-xs text-[#FFC999] hover:underline ml-2">
              隐私政策
            </a>
          </div>
        </div>
      </div>
      
      {/* 登录弹窗 */}
      <LoginModal 
        open={showLoginModal}
        onOpenChange={setShowLoginModal}
        redirectTo="/"
        title="登录账户"
        description="登录后享受更多 AI 对话的乐趣"
      />
    </div>
  )
}
