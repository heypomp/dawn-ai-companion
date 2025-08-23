import { type NextRequest, NextResponse } from "next/server"

const REPLICATE_API_TOKEN = process.env.REPLICATE_API_TOKEN

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 })
    }

    if (!REPLICATE_API_TOKEN) {
      return NextResponse.json({ error: "REPLICATE_API_TOKEN not configured" }, { status: 500 })
    }

    // 完全按照用户提供的参数调用Replicate API
    const response = await fetch("https://api.replicate.com/v1/models/minimax/speech-02-turbo/predictions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json",
        Prefer: "wait",
      },
      body: JSON.stringify({
        input: {
          text: text,
          voice_id: "Sweet_Girl_2",
          language_boost: "Chinese",
          emotion: "auto",
          speed: 1,
          volume: 1,
          pitch: 0,
          bitrate: 128000,
          channel: "mono",
          sample_rate: 32000,
          english_normalization: true,
        },
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("Replicate API error:", response.status, errorText)
      return NextResponse.json({ error: "Failed to generate audio" }, { status: response.status })
    }

    const data = await response.json()

    // 检查API响应状态
    if (data.error) {
      console.error("Replicate API returned error:", data.error)
      return NextResponse.json({ error: data.error }, { status: 500 })
    }

    // 如果状态是processing，需要轮询获取结果
    if (data.status === "processing") {
      // 等待一段时间后重试获取结果
      let attempts = 0
      const maxAttempts = 30 // 最多等待30秒

      while (attempts < maxAttempts) {
        await new Promise((resolve) => setTimeout(resolve, 1000)) // 等待1秒

        const statusResponse = await fetch(data.urls.get, {
          headers: {
            Authorization: `Bearer ${REPLICATE_API_TOKEN}`,
          },
        })

        if (statusResponse.ok) {
          const statusData = await statusResponse.json()

          if (statusData.status === "succeeded" && statusData.output) {
            return NextResponse.json({ audioUrl: statusData.output })
          } else if (statusData.status === "failed") {
            return NextResponse.json({ error: "Audio generation failed" }, { status: 500 })
          }
        }

        attempts++
      }

      return NextResponse.json({ error: "Audio generation timeout" }, { status: 408 })
    }

    // 如果直接返回了结果
    if (data.status === "succeeded" && data.output) {
      return NextResponse.json({ audioUrl: data.output })
    }

    return NextResponse.json({ error: "Unexpected response format" }, { status: 500 })
  } catch (error) {
    console.error("TTS API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
