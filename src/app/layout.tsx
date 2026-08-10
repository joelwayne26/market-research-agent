import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Market Research Agent | AI-Powered Market Intelligence',
  description: 'Automated market research platform with AI-powered competitive analysis, trend detection, and intelligence gathering',
  keywords: ['market research', 'competitive analysis', 'AI', 'intelligence', 'trends'],
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen flex flex-col">
          {/* Header */}
          <header className="border-b bg-card">
            <div className="container mx-auto px-4 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-xl font-bold">Market Research Agent</h1>
                  <p className="text-sm text-muted-foreground">AI-Powered Intelligence Platform</p>
                </div>
              </div>
              <nav className="flex items-center space-x-6">
                <a href="/" className="text-sm font-medium hover:text-primary transition-colors">Dashboard</a>
                <a href="/projects" className="text-sm font-medium hover:text-primary transition-colors">Projects</a>
                <a href="/intelligence" className="text-sm font-medium hover:text-primary transition-colors">Intelligence</a>
              </nav>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 container mx-auto px-4 py-8">
            {children}
          </main>

          {/* Footer */}
          <footer className="border-t mt-auto">
            <div className="container mx-auto px-4 py-6 text-center text-sm text-muted-foreground">
              <p>Market Research Agent &copy; {new Date().getFullYear()} | Built with Next.js, PostgreSQL & AI</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  )
}
