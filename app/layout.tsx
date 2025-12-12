import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono, Noto_Sans_TC } from "next/font/google"
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })
const _notoSansTC = Noto_Sans_TC({ subsets: ["latin"], weight: ["400", "500", "600", "700"] })

export const metadata: Metadata = {
  title: "P&L Estimation Tool",
  description: "財務損益表與經營計劃管理系統",
    generator: 'v0.app'
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="zh-TW">
      <body className={`font-sans antialiased`}>
        {children}
      </body>
    </html>
  )
}
