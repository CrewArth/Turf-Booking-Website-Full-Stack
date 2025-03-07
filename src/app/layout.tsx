import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "TurfBook - Cricket Turf Booking",
  description: "Book your cricket turf online with ease. Choose from multiple locations and time slots.",
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
          <Toaster position="top-right" />
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
