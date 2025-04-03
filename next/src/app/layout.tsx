import '@/styles/globals.css'
import { Inter } from 'next/font/google'
import { ThemeProvider } from '@/components/ThemeProvider'
import {
  ClerkProvider,
} from '@clerk/nextjs'
import { cn } from '@/lib/utils'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <div className="max-w-4xl mx-auto">
            {children}
          </div>
        </ThemeProvider>
      </body>
    </html>
    </ClerkProvider>
  )
}