import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ThreadNotion",
  description: "Customer–associate chat → script generation → feedback",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
