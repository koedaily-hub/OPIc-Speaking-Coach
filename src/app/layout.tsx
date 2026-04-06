import type { Metadata } from 'next'
import './global.css'

export const metadata: Metadata = {
  title: 'OPIc Speaking Coach',
  description: 'AI-powered speaking practice tool',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="font-sans antialiased text-body text-slate-800">
        {children}
      </body>
    </html>
  )
}
