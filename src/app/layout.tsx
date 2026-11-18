import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cheap Laptops Ghana | Home of Affordable Laptops & Computers",
  description:
    "NOW OPEN — shop genuine boxed laptops, MacBooks, gaming laptops, desktops, monitors, accessories and electric bikes & scooters at the best prices in Ghana. Free bag & mouse with every boxed laptop. Stores in Accra, Kumasi & Tamale. Call 0240 999979.",
  keywords: ["cheap laptops Ghana", "affordable laptops", "laptop deals Accra", "MacBook Ghana", "gaming laptops", "HP", "Dell", "Lenovo", "electric scooters Ghana"],
  icons: { icon: "/images/cl/logo.svg" },
  openGraph: {
    title: "Cheap Laptops Ghana",
    description: "Home of Affordable Laptops & Computers — Accra • Kumasi • Tamale",
    siteName: "Cheap Laptops Ghana",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground">{children}</body>
    </html>
  );
}
