import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Toaster } from 'react-hot-toast';

const inter = Inter({
  subsets: ["latin"],
  display: 'swap',
});

const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
};

export const metadata: Metadata = {
  title: "TurfBook - Cricket Turf Booking",
  description: "Book your cricket turf online with ease. Choose from multiple locations and time slots.",
  metadataBase: new URL(baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`),
  icons: {
    icon: [
      {
        url: '/favicon.ico',
        sizes: 'any',
      }
    ],
  },
  other: {
    'Content-Security-Policy': `
      default-src 'self';
      script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.dev https://*.razorpay.com https://checkout.razorpay.com https://*.google.com;
      style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
      img-src 'self' data: https://*.clerk.dev https://* blob: https://res.cloudinary.com https://*.googleusercontent.com;
      font-src 'self' https://fonts.gstatic.com;
      frame-src 'self' https://checkout.razorpay.com https://api.razorpay.com https://*.razorpay.com https://*.clerk.accounts.dev https://*.clerk.dev https://*.google.com https://www.google.com;
      connect-src 'self' https://*.clerk.dev https://api.razorpay.com https://*.razorpay.com https://res.cloudinary.com;
    `.replace(/\s+/g, ' ').trim()
  }
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        elements: {
          formButtonPrimary: "bg-green-600 hover:bg-green-700 text-sm normal-case",
          footerActionLink: "text-green-600 hover:text-green-500",
          card: "bg-white",
          headerTitle: "text-gray-900",
          headerSubtitle: "text-gray-600",
          socialButtonsBlockButton: "bg-white border-gray-200",
          socialButtonsBlockButtonText: "text-gray-600",
          dividerLine: "bg-gray-200",
          dividerText: "text-gray-600",
          formFieldLabel: "text-gray-700",
          formFieldInput: "bg-white border-gray-300",
          formFieldInputShowPasswordButton: "text-gray-600",
          formFieldError: "text-red-600",
          identityPreviewText: "text-gray-600",
          identityPreviewEditButton: "text-green-600 hover:text-green-500",
        },
        variables: {
          colorPrimary: "#16a34a",
          colorTextOnPrimaryBackground: "#ffffff",
          colorBackground: "#ffffff",
          colorInputBackground: "#ffffff",
          colorInputText: "#111827",
          borderRadius: "0.5rem",
        },
      }}
    >
      <html lang="en">
        <body className={`${inter.className} antialiased bg-white flex flex-col min-h-screen`}>
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#333',
                color: '#fff',
              },
              success: {
                style: {
                  background: '#22c55e',
                },
              },
              error: {
                style: {
                  background: '#ef4444',
                },
                duration: 4000,
              },
            }}
          />
          <Navbar />
          <main className="pt-16 flex-grow">
            {children}
          </main>
          <Footer />
        </body>
      </html>
    </ClerkProvider>
  );
}
