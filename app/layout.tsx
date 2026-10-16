import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaRegister from "./pwa-register";

export const metadata: Metadata = {
  title: "NOVA — One World. Your World.",
  description: "A new home for your stories, communities, and conversations.",
  applicationName: "NOVA",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "NOVA" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0b1020",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body><PwaRegister />{children}</body>
    </html>
  );
}
