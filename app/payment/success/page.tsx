"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle, ArrowRight, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface PaymentDetails {
  planName: string;
  amount: number;
  billingCycle: string;
  customerEmail: string;
  sessionId: string;
}

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId =
    searchParams.get("session_id") || searchParams.get("checkout_id");
  const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 即使没有 sessionId 也尝试获取支付信息
    fetchPaymentDetails(sessionId || '');
  }, [sessionId, searchParams]);

  const fetchPaymentDetails = async (sessionId: string) => {
    try {
      // 从 URL 参数获取基本信息
      const planName = searchParams.get('plan') || '未知方案'
      const amount = searchParams.get('amount') || '0'
      const mock = searchParams.get('mock')
      const billingCycle = searchParams.get('billingCycle') || 'monthly'
      
      console.log('支付成功页面参数:', { planName, amount, sessionId, mock, billingCycle })
      
      setPaymentDetails({
        planName,
        amount: parseFloat(amount),
        billingCycle,
        customerEmail: '',
        sessionId: sessionId || '',
      })
      
    } catch (error) {
      console.error("处理支付详情失败:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="p-8 text-center">
          <div className="mb-6">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-green-700 mb-2">
              支付成功！
            </h1>
            <p className="text-muted-foreground">
              感谢您的订阅，欢迎加入我们！
            </p>
          </div>

          {paymentDetails && (
            <div className="bg-muted rounded-lg p-4 mb-6 text-left">
              <h3 className="font-semibold mb-2">订阅详情</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>方案:</span>
                  <span className="font-medium">{paymentDetails.planName}</span>
                </div>
                <div className="flex justify-between">
                  <span>金额:</span>
                  <span className="font-medium">¥{paymentDetails.amount}</span>
                </div>
                <div className="flex justify-between">
                  <span>计费周期:</span>
                  <span className="font-medium">
                    {paymentDetails.billingCycle === "yearly" ? "年付" : "月付"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>订单号:</span>
                  <span className="font-medium text-xs">
                    {paymentDetails.sessionId}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Button
              className="w-full group"
              onClick={() => (window.location.href = "/dashboard")}
            >
              进入控制台
              <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            <Button
              variant="outline"
              className="w-full group"
              onClick={() => (window.location.href = "/")}
            >
              <Home className="mr-2 h-4 w-4" />
              返回首页
            </Button>
          </div>

          <p className="text-xs text-muted-foreground mt-6">
            您将收到一封确认邮件，包含订阅详情和发票信息。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentSuccess() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      }
    >
      <PaymentSuccessContent />
    </Suspense>
  );
}
