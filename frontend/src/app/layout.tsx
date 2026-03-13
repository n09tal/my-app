import type { Metadata } from "next";
import localFont from "next/font/local";
import { Inter } from 'next/font/google';
import ThemeRegistry from "@/components/ThemeRegistry";
import { QueryProvider } from "@/components/QueryProvider";

export const metadata: Metadata = {
  title: "Care4Me",
  description: "A directory of all home-care agencies in Indiana",
  icons: { icon: "/favicon.png" },
};

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
});

const greycliffCF = localFont({
  src: [
    {
      path: "../styles/Font/Connary Fagen - Greycliff CF Regular.otf",
      weight: "400",
      style: "normal",
    },
    {
      path: "../styles/Font/Connary Fagen - Greycliff CF Regular Oblique.otf",
      weight: "400",
      style: "italic",
    },
    {
      path: "../styles/Font/Connary Fagen - Greycliff CF Medium.otf",
      weight: "500",
      style: "normal",
    },
    {
      path: "../styles/Font/Connary Fagen - Greycliff CF Medium Oblique.otf",
      weight: "500",
      style: "italic",
    },
    {
      path: "../styles/Font/Connary Fagen - Greycliff CF Demi Bold.otf",
      weight: "600",
      style: "normal",
    },
    {
      path: "../styles/Font/Connary Fagen - Greycliff CF Demi Bold Oblique.otf",
      weight: "600",
      style: "italic",
    },
    {
      path: "../styles/Font/Connary Fagen - Greycliff CF Bold.otf",
      weight: "700",
      style: "normal",
    },
    {
      path: "../styles/Font/Connary Fagen - Greycliff CF Bold Oblique.otf",
      weight: "700",
      style: "italic",
    },
  ],
  variable: "--font-greycliff",
  display: "swap",
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${greycliffCF.variable} ${inter.variable}`}>
      <body>
        <QueryProvider>
          <ThemeRegistry>{children}</ThemeRegistry>
        </QueryProvider>
      </body>
    </html>
  );
}
