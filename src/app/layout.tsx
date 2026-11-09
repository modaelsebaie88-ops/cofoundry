import type { Metadata, Viewport } from "next"
import { Inter, Geist_Mono } from "next/font/google"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import "./globals.css"

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] })
const mono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] })

export const metadata: Metadata = {
  title: { default: "Cofoundry — where founders build together", template: "%s · Cofoundry" },
  description:
    "Find co-founders, collaborators and mentors who complement you. Join industry communities, exchange expertise and turn connections into real collaboration.",
}

export const viewport: Viewport = { themeColor: "#5b3fd6" }

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable} h-full antialiased`}>
      <body className="min-h-full bg-background text-foreground">
        <TooltipProvider delay={300}>{children}</TooltipProvider>
        <Toaster position="bottom-right" richColors closeButton />
      </body>
    </html>
  )
}
