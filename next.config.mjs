/** @type {import('next').NextConfig} */
const nextConfig = {
  // 简单配置，不搞那么复杂
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
}

export default nextConfig
