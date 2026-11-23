import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import { Shell } from "@/components/shell";

export const metadata: Metadata = {
  title: "ERQA Workbench",
  description: "Prototype – Entitlement Review Quality Assurance case workbench (synthetic data).",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}>
      <body className="min-h-screen">
        <StoreProvider>
          <Shell>{children}</Shell>
        </StoreProvider>
      </body>
    </html>
  );
}
