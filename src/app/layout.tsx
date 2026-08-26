import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Trợ lý Khoa học tự nhiên THCS",
  description:
    "Trợ lý ảo RAG đa phương thức trả lời dựa trên 12 cuốn SGK Khoa học tự nhiên lớp 6-9, kèm trích dẫn đúng trang sách.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
