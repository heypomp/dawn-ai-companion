export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#F5F5F5] py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-sm p-8">
          <h1 className="text-2xl font-bold text-gray-800 mb-6">隐私政策</h1>

          <div className="space-y-6 text-gray-700 leading-relaxed">
            <section>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">数据收集与使用</h2>
              <p>曦晨致力于保护您的隐私。我们采用以下原则处理您的数据：</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>我们不会永久存储您的对话历史</li>
                <li>所有对话内容在会话结束后即被销毁</li>
                <li>我们绝不会将您的数据用于任何商业目的</li>
                <li>您的对话内容仅用于当前会话的AI回复生成</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">数据安全</h2>
              <p>我们采用行业标准的安全措施来保护您的数据：</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>所有数据传输均采用HTTPS加密</li>
                <li>服务器端不保留对话记录</li>
                <li>定期进行安全审计和更新</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">危机干预</h2>
              <p>为了您的安全，当检测到可能的自伤或危机信号时，系统会：</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>立即提供心理援助热线信息</li>
                <li>鼓励您寻求专业帮助</li>
                <li>这些干预措施是为了您的安全考虑</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">免责声明</h2>
              <p>
                曦晨是一个AI情感陪伴工具，不能替代专业的心理咨询或医疗服务。如果您正在经历严重的心理困扰，请及时寻求专业帮助。
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold text-gray-800 mb-3">联系我们</h2>
              <p>如果您对本隐私政策有任何疑问，请通过以下方式联系我们：</p>
              <p className="mt-2">邮箱: privacy@dawn-ai.com</p>
            </section>

            <section className="pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500">最后更新时间：2025年8月1日</p>
            </section>
          </div>

          <div className="mt-8 text-center">
            <a
              href="/"
              className="inline-flex items-center px-4 py-2 bg-[#FFC999] text-white rounded-lg hover:bg-[#FFB366] transition-colors"
            >
              返回聊天
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
