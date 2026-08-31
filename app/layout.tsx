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
  title: 'Cássio Miguel | Direito Privado, Recursos e Atuação no STJ',
  description: 'Advocacia estratégica em Direito Privado, contencioso e recursos, com atuação perante Tribunais e Superior Tribunal de Justiça. Campo Grande/MS.',
  keywords: 'advocacia estratégica, direito privado, contencioso, recursos, STJ, advogado campo grande',
  authors: [{ name: 'Cássio Miguel Sociedade Individual de Advocacia' }],
  robots: 'index, follow',
  icons: {
    icon: '/favicon-google-style.png',
    apple: '/favicon-google-style.png',
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