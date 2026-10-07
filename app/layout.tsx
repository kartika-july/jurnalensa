import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Jurnalensa — Cek Kuartil & SINTA Jurnal",
  description: "Periksa jurnal melalui DOI, ISSN, atau nama dengan sumber, tahun, dan kategori.",
  authors: [{name: "A.P.A Projek"}],
  creator: "A.P.A Projek",
  icons: {
    icon: "/favicon.png",
    shortcut: "/favicon.png",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body className="antialiased">{children}</body>
    </html>
  );
}
