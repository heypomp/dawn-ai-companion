import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export function useAuthUserUsage(user: SupabaseUser | null) {
  const [credits, setCredits] = useState<number | null>(null);
  const [isLimitReached, setIsLimitReached] = useState(false);
  const [subscriptionPlan, setSubscriptionPlan] = useState<string>('free');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setCredits(null);
      setLoading(false);
      return;
    }

    fetchUsageCount();
  }, [user?.id]);

  const fetchUsageCount = async () => {
    if (!user) return;

    try {
      const response = await fetch('/api/usage');
      
      if (!response.ok) {
        console.error('Error fetching usage count: HTTP', response.status);
        setCredits(10); // 默认给新用户10积分
        setIsLimitReached(false);
      } else {
        const data = await response.json();
        setCredits(data.credits || 10);
        setIsLimitReached(data.is_limit_reached || false);
        setSubscriptionPlan(data.subscription_plan || 'free');
      }
    } catch (error) {
      console.error('Error fetching usage count:', error);
      setCredits(10); // 默认给新用户10积分
      setIsLimitReached(false);
    } finally {
      setLoading(false);
    }
  };

  const useCredits = async (amount: number = 1): Promise<boolean> => {
    if (!user) return false;

    try {
      const response = await fetch('/api/usage', { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount })
      });
      
      if (!response.ok) {
        const data = await response.json();
        console.error('Credits error:', data.error);
        if (data.error === 'Insufficient credits') {
          setIsLimitReached(true);
        }
        return false;
      }
      
      const data = await response.json();
      
      if (!data.success) {
        setIsLimitReached(true);
        return false;
      }

      setCredits(data.remaining_credits);
      setIsLimitReached(data.remaining_credits <= 0);
      return true;
    } catch (error) {
      console.error('Error using credits:', error);
      setIsLimitReached(true);
      return false;
    }
  };

  return { 
    credits, 
    isLimitReached, 
    useCredits, 
    subscriptionPlan,
    loading,
    // 保留旧名称以便兼容
    usageCount: credits,
    decrementUsageCount: useCredits
  };
}