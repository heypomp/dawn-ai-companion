# Dawn AI Companion 🌅

一个现代化的 AI 聊天应用，集成完整的用户认证和订阅支付系统。

## ✨ 功能特性

### 核心功能
- 🤖 **AI 智能聊天** - 基于 OpenRouter 的多模型对话
- 🎙️ **语音合成** - 文本转语音功能
- 👤 **用户系统** - 完整的注册/登录/认证流程
- 💳 **订阅支付** - 集成 Creem 支付系统
- 📊 **用量统计** - 智能用量管理和限制

### 订阅方案
- **免费版** - 每日 10 积分，基础对话功能
- **专业版** - 每日 100 积分，GPT-4 模型，优先响应
- **企业版** - 每日 1000 积分，所有模型无限制

## 🚀 快速开始

### 环境要求
- Node.js 18+
- pnpm（推荐）或 npm
- Supabase 账户
- Creem 支付账户

### 安装步骤

1. **克隆项目**
   ```bash
   git clone <your-repo>
   cd dawn-ai-companion
   ```

2. **安装依赖**
   ```bash
   pnpm install
   ```

3. **配置环境变量**
   ```bash
   cp .env.example .env.local
   # 编辑 .env.local 填入你的配置
   ```

4. **设置数据库**
   - 在 Supabase 控制台运行 `supabase/migrations/001_create_payment_tables.sql`

5. **启动开发服务器**
   ```bash
   pnpm dev
   ```

6. **访问应用**
   ```
   http://localhost:3000
   ```

## ⚙️ 环境变量配置

### 必需配置
```bash
# Supabase 配置
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Creem 支付配置
CREEM_API_KEY=your_creem_api_key
CREEM_WEBHOOK_SECRET=your_webhook_secret
CREEM_API_BASE_URL=https://test-api.creem.io

# 应用配置
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 可选配置
```bash
# AI 服务
OPENROUTER_API_KEY=your_openrouter_key

# 开发配置
NODE_ENV=development
CREEM_MOCK_MODE=false  # true=模拟支付
```

## 🏗️ 技术架构

### 技术栈
- **前端框架**: Next.js 15 (App Router)
- **UI 组件**: Tailwind CSS + shadcn/ui
- **数据库**: Supabase (PostgreSQL)
- **认证系统**: Supabase Auth
- **支付集成**: Creem
- **AI 服务**: OpenRouter
- **类型安全**: TypeScript

### 项目结构
```
dawn-ai-companion/
├── app/                    # Next.js页面和API路由
├── components/             # React组件
├── hooks/                  # 自定义Hooks
├── lib/                    # 工具函数和配置
├── supabase/              # 数据库迁移
├── docs/                  # 项目文档
└── public/                # 静态资源
```

## 💳 支付集成

### 支持的支付流程
1. 用户选择订阅方案
2. 自动检查登录状态
3. 创建 Creem 支付会话
4. 跳转到支付页面
5. 处理支付回调
6. 更新用户订阅状态

### Webhook 事件处理
- `checkout.completed` - 支付完成
- `subscription.paid` - 订阅付费
- `subscription.trialing` - 试用开始

## 📚 文档

- [开发指南](./docs/DEVELOPMENT.md) - 详细的开发文档
- [部署指南](./docs/DEPLOYMENT.md) - 生产环境部署
- [文件结构](./docs/FILE_STRUCTURE.md) - 项目结构说明

## 🚀 部署

### Vercel 部署（推荐）
1. 推送代码到 GitHub
2. 导入项目到 Vercel
3. 配置生产环境变量
4. 自动部署完成

### 其他平台
支持部署到任何支持 Next.js 的平台：
- Netlify
- Railway
- DigitalOcean App Platform

## 🔒 安全特性

- ✅ JWT 身份认证
- ✅ 行级安全策略 (RLS)
- ✅ Webhook 签名验证
- ✅ 防重放攻击
- ✅ 环境变量加密

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 License

MIT License - 详见 [LICENSE](LICENSE) 文件