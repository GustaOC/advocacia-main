// app/layout.tsx
import type { Metadata, Viewport } from 'next'
import { Inter, Marcellus } from 'next/font/google'
// TypeScript may complain about missing type declarations for CSS imports in some setups.
// @ts-ignore
import './globals.css'
// @ts-ignore
import { QueryProvider } from '@/components/query-provider'
import { Toaster } from "@/components/ui/toaster"

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

const marcellus = Marcellus({
  subsets: ['latin'],
  weight: ['400'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Cássio Miguel Advocacia | Assessoria Jurídica em Campo Grande/MS',
  description: 'Assessoria jurídica especializada em direito civil e empresarial. Atendimento personalizado em Campo Grande — soluções práticas e seguras para pessoas e empresas.',
  keywords: 'advocacia, advogado, campo grande, direito civil, direito empresarial',
  authors: [{ name: 'Cássio Miguel Advocacia' }],
  robots: 'index, follow',
  icons: {
    icon: '/favicon-large.png',
    apple: '/favicon-large.png',
  }
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0f1724',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${marcellus.variable} scroll-smooth`}>
      <body className="bg-background text-foreground">
        <QueryProvider>
          <main>{children}</main>
          <Toaster />
        </QueryProvider>
      </body>
    </html>
  )
}