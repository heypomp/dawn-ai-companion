-- 删除整个 public schema，包括所有表、视图、触发器、函数等
DROP SCHEMA public CASCADE;

-- 重新创建 public schema
CREATE SCHEMA public;

-- 设置权限（恢复 Supabase 默认配置）
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

--------------------------------

-- 创建订单表
CREATE TABLE IF NOT EXISTS orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider VARCHAR(50) NOT NULL DEFAULT 'creem',
  order_id VARCHAR(255) UNIQUE,
  session_id VARCHAR(255),
  subscription_id VARCHAR(255),
  customer_id VARCHAR(255),
  customer_email VARCHAR(255),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  product_id VARCHAR(255),
  plan_name VARCHAR(100),
  billing_cycle VARCHAR(20),
  amount DECIMAL(10, 2),
  currency VARCHAR(10) DEFAULT 'cny',
  status VARCHAR(50),
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_orders_order_id ON orders(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_session_id ON orders(session_id);
CREATE INDEX IF NOT EXISTS idx_orders_subscription_id ON orders(subscription_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);

-- 创建用户订阅表
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  plan VARCHAR(100),
  status VARCHAR(50) DEFAULT 'inactive',
  billing_cycle VARCHAR(20),
  subscription_id VARCHAR(255),
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at TIMESTAMP WITH TIME ZONE,
  canceled_at TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_subscription_id ON user_subscriptions(subscription_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);

-- 创建 webhook 事件日志表（用于调试和审计）
CREATE TABLE IF NOT EXISTS webhook_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  provider VARCHAR(50) NOT NULL DEFAULT 'creem',
  event_id VARCHAR(255),
  event_type VARCHAR(100),
  payload JSONB,
  processed BOOLEAN DEFAULT FALSE,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON webhook_events(event_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type ON webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at DESC);

-- 添加更新时间触发器
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为订单表添加触发器
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 为用户订阅表添加触发器
CREATE TRIGGER update_user_subscriptions_updated_at BEFORE UPDATE ON user_subscriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 添加 RLS 策略
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- 订单表策略：用户只能查看自己的订单
CREATE POLICY "Users can view own orders" ON orders
    FOR SELECT USING (auth.uid() = user_id);

-- 用户订阅表策略：用户只能查看自己的订阅
CREATE POLICY "Users can view own subscription" ON user_subscriptions
    FOR SELECT USING (auth.uid() = user_id);

-- 注意：service role key 会自动绕过 RLS，不需要额外的策略
-- webhook_events 表不创建任何用户策略，只允许 service role 访问

-- 授予表权限给 Supabase 角色（重要！）
GRANT ALL ON TABLE orders TO authenticated;
GRANT ALL ON TABLE orders TO anon;
GRANT ALL ON TABLE orders TO service_role;

GRANT ALL ON TABLE user_subscriptions TO authenticated;
GRANT ALL ON TABLE user_subscriptions TO anon;
GRANT ALL ON TABLE user_subscriptions TO service_role;

GRANT ALL ON TABLE webhook_events TO authenticated;
GRANT ALL ON TABLE webhook_events TO anon;
GRANT ALL ON TABLE webhook_events TO service_role;

-- 授予序列权限（用于自动生成 ID）
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO service_role;