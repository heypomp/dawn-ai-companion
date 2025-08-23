/**
 * 定价方案组件
 * 显示免费版、专业版、企业版三种订阅方案
 * 支持用户登录验证和支付跳转
 */

"use client"

import { useState } from "react"
import { Check } from 'lucide-react'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useUserAuth } from "@/hooks/use-user-auth"
import LoginModal from "@/components/LoginModal"

interface PricingPlan {
  name: string
  description: string
  price: number
  productId: string
  features: string[]
  buttonText: string
  popular?: boolean
  buttonVariant?: "default" | "outline"
}

const pricingPlans: PricingPlan[] = [
  {
    name: "免费版",
    description: "个人体验版",
    price: 0,
    productId: "free_starter_monthly",
    features: [
      "每日 10 积分",
      "基础对话功能",
      "标准响应速度"
    ],
    buttonText: "立即使用",
    buttonVariant: "outline"
  },
  {
    name: "专业版",
    description: "个人专业版",
    price: 29,
    productId: "prod_7Wrs8LVI2YGR8YDmFjaNIY",
    features: [
      "每日 100 积分",
      "GPT-4 模型",
      "优先响应速度",
      "邮件支持"
    ],
    buttonText: "开始订阅",
    popular: true
  },
  {
    name: "企业版",
    description: "团队企业版",
    price: 99,
    productId: "prod_6WSrhBXtP4dlRJa6OzrgcV",
    features: [
      "每日 1000 积分",
      "所有模型无限制",
      "API 集成支持",
      "专属客户经理"
    ],
    buttonText: "立即订阅"
  }
]

export default function PricingSection() {
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const { user, isAuthenticated } = useUserAuth()

  const handleSubscribe = async (plan: PricingPlan) => {
    if (plan.price === 0) {
      // 免费方案，跳转到主页
      window.location.href = "/"
      return
    }

    setLoadingPlan(plan.name)

    try {
      // 检查用户是否已登录
      if (!user || !isAuthenticated) {
        setShowLoginModal(true)
        setLoadingPlan(null)
        return
      }
      
      const response = await fetch("/api/creem-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          productId: plan.productId,
          planName: plan.name,
          amount: plan.price,
          userId: user.id,
          email: user.email,
        }),
      })

      const data = await response.json()

      if (data.success && data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      } else {
        throw new Error(data.error || "创建支付失败")
      }
    } catch (error) {
      console.error("支付错误:", error)
      alert("支付过程中出现错误，请稍后重试")
    } finally {
      setLoadingPlan(null)
    }
  }

  return (
    <div className="py-8 px-4 max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">选择订阅方案</h2>
        <p className="text-gray-600">简单清晰的定价</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {pricingPlans.map((plan) => (
          <div
            key={plan.name}
            className={`bg-white rounded-lg border p-6 ${
              plan.popular ? "border-[#FFC999] shadow-md" : "border-gray-200"
            }`}
          >
            {plan.popular && (
              <Badge className="mb-3 bg-[#FFC999] text-white">
                推荐
              </Badge>
            )}
            
            <h3 className="text-xl font-bold mb-1">{plan.name}</h3>
            <p className="text-gray-600 text-sm mb-4">{plan.description}</p>

            <div className="mb-6">
              <span className="text-3xl font-bold">¥{plan.price}</span>
              <span className="text-gray-600 ml-1">/月</span>
            </div>

            <ul className="space-y-2 mb-6">
              {plan.features.map((feature, index) => (
                <li key={index} className="flex items-center text-sm">
                  <Check className="h-4 w-4 text-green-500 mr-2" />
                  {feature}
                </li>
              ))}
            </ul>

            <Button 
              className={`w-full ${plan.popular ? "bg-[#FFC999] hover:bg-[#FFB366]" : ""}`}
              variant={plan.buttonVariant || "default"}
              onClick={() => handleSubscribe(plan)}
              disabled={loadingPlan === plan.name}
            >
              {loadingPlan === plan.name ? "处理中..." : plan.buttonText}
            </Button>
          </div>
        ))}
      </div>

      <LoginModal 
        open={showLoginModal}
        onOpenChange={setShowLoginModal}
        redirectTo="/pricing"
        title="登录账户"
        description="请登录您的账户然后继续订阅"
      />
    </div>
  )
}
