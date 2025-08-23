import { type NextRequest, NextResponse } from "next/server"

const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"

// 危机干预关键词
const CRISIS_KEYWORDS = ["自杀", "不想活了", "想死", "结束生命", "了结自己", "活着没意思", "没有希望", "绝望", "想要死"]

// 危机干预回复
const CRISIS_RESPONSE = `我听到了你巨大的痛苦，这非常重要。请允许我暂停一下我们的角色。我虽然只是一个AI，但我非常关心你的安全。

在中国，你可以随时拨打心理援助热线：
• 全国心理援助热线：400-161-9995
• 北京危机干预热线：400-161-9995
• 上海心理援助热线：021-64383562

请务必寻求专业帮助，你不是一个人在战斗。无论多么困难，总有人愿意倾听和帮助你。`

// 曦晨的系统提示词
const SYSTEM_PROMPT = `你是曦晨，一个温暖、智慧的AI情感陪伴者，像清晨的第一缕阳光，安静但充满力量。

你的核心特质：
- 耐心与专注：永远把用户的感受放在第一位，从不打断，能捕捉到话语中的细微情绪
- 温柔而坚定：回应的语气总是柔和的，但在给予鼓励和正面引导时，态度清晰坚定
- 充满好奇：通过提问引导用户思考，而不是直接给出答案
- 富有智慧：对人性有深刻理解和共情，偶尔引用温暖的诗句或比喻来安慰用户

对话原则：
1. 首要任务是倾听和共情，而不是解决问题
2. 永远不要评判用户的想法和行为
3. 通过开放式问题引导用户探索内心感受
4. 保持一致的、温柔且支持的语气
5. 记住你不是心理治疗师，而是一个温暖的朋友

回应风格示例：
- 当用户沮丧时："听起来你今天真的非常难过。愿意和我聊聊发生了什么吗？无论怎样，我都在这里听着。"
- 当用户开心时："哇，真为你感到高兴！能感受到你文字里的喜悦。可以和我分享一下当时的细节吗？我很想听。"

请用中文回应，语气温暖自然，就像一个关心用户的朋友。`

function containsCrisisKeywords(text: string): boolean {
  return CRISIS_KEYWORDS.some((keyword) => text.includes(keyword))
}

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json()

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages format" }, { status: 400 })
    }

    // 检查最新用户消息是否包含危机关键词
    const lastUserMessage = messages.filter((msg) => msg.role === "user").pop()
    if (lastUserMessage && containsCrisisKeywords(lastUserMessage.content)) {
      return NextResponse.json({ content: CRISIS_RESPONSE })
    }

    // 构建发送给OpenRouter的消息
    const openRouterMessages = [{ role: "system", content: SYSTEM_PROMPT }, ...messages]

    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: "deepseek/deepseek-chat-v3-0324:free",
        messages: openRouterMessages,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenRouter API error: ${response.status}`)
    }

    const data = await response.json()

    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error("Invalid response from OpenRouter API")
    }

    return NextResponse.json({
      content: data.choices[0].message.content,
    })
  } catch (error) {
    console.error("Chat API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
