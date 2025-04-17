import type { Metadata } from "next";
import { Inter as Inter } from "next/font/google";
import "./globals.css";
import Header from "@/components/common/header";
import Footer from "@/components/common/footer";
import { ClerkProvider } from '@clerk/nextjs'
import { Toaster } from "@/components/ui/sonner"

const fontSans = Inter({
  variable: "--inter",
  subsets: ["latin"],
  weight: ["200", "300", "400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: "CareerBoost | AI Resume Optimizer & Interview Preparation",
  description: "CareerBoost - Advanced AI tools to optimize your resume, find job opportunities, and practice interviews.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body
          className={`${fontSans.variable} inter antialiased`}
        >
          <div className="flex min-h-screen flex-col">
            <Header />
            <main className="flex-1" >
              {children}
            </main>
            <Footer />
          </div>
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}
