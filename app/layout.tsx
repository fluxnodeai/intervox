import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Intervox - Open Intelligence Protocol",
  description: "Intervox is a decentralized, public-facing knowledge graph. No paywalls, no gatekeepers.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@200;300;400;500;600&display=swap" rel="stylesheet" />
        <script src="https://code.iconify.design/iconify-icon/1.0.7/iconify-icon.min.js"></script>
      </head>
      <body className="text-slate-400 antialiased min-h-screen flex flex-col selection:bg-teal-500/30 selection:text-teal-200 font-light" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
