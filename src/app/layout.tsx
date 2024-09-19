import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "草纸现在在上什么课？",
  description: "一个简单的小工具，用于视奸草纸现在在上什么课。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-Hans-CN">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0"
        />
        <link rel="icon" href="https://sdn.licaoz.com/avatar/3f84ccfc63c55dcf638cad909c5bbdcc?s=200&d=mm&r=g" />
        <link rel="apple-touch-icon" href="https://sdn.licaoz.com/avatar/3f84ccfc63c55dcf638cad909c5bbdcc?s=200&d=mm&r=g" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
