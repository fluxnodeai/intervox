import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "INTERVOX - Talk to Anyone",
  description: "Voice-controlled OSINT platform. Enter a name, we scrape the internet, you talk to their digital twin.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
