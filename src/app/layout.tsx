import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Gloock } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Providers } from "@/components/Providers";

const inter = Inter({
  variable: "--font-inter-sans",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const gloock = Gloock({
  variable: "--font-gloock-serif",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: ".Home",
  description: "A self-hosted personal dashboard",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${jetbrainsMono.variable} ${gloock.variable}`}>
      <body suppressHydrationWarning>
        <Providers>
          <ThemeProvider
            attribute="data-theme"
            defaultTheme="dark"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
