import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Czysta Pamięć – Mycie i opieka nad grobami na Górnym Śląsku",
  description: "Ekspresowe zamawianie mycia grobów, sprzątania nagrobków, dostawy świeżych kwiatów i zniczy (edycja specjalna Ruchu Chorzów 'PAMIĘTAMY') przed 1 Listopada na terenie Chorzowa, Katowic, Bytomia, Siemianowic, Świętochłowic i Rudy Śląskiej.",
  icons: {
    icon: "/favicon.ico",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pl">
      <body className="antialiased bg-surface text-on-surface min-h-screen">
        {children}
      </body>
    </html>
  );
}
