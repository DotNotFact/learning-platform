/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    unoptimized: true, // Для локальной разработки
  },
  serverExternalPackages: ["@prisma/client", "bcryptjs", "better-sqlite3"],
}

module.exports = nextConfig
