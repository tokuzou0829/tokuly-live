import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/app/globals.css";

const inter = Inter({ subsets: ["latin"] });

const faviconSizes = [16, 24, 32, 36, 48, 72, 96, 128, 144, 152, 160, 192, 196, 256, 384, 512];
const appleTouchIconSizes = [57, 60, 72, 76, 114, 120, 144, 152, 180];

function pngIcon(filename: string, size: number) {
  return {
    url: `/favicons/${filename}.png`,
    sizes: `${size}x${size}`,
    type: "image/png",
  };
}

export const metadata: Metadata = {
  title: "TokulyLive",
  description: "完璧で究極の配信プラットフォーム",
  icons: {
    icon: [
      {
        url: "/favicons/favicon.ico",
        sizes: "16x16 24x24 32x32 48x48",
        type: "image/vnd.microsoft.icon",
      },
      ...faviconSizes.map((size) => pngIcon(`icon-${size}x${size}`, size)),
    ],
    apple: [
      pngIcon("apple-touch-icon", 180),
      ...appleTouchIconSizes.map((size) => pngIcon(`apple-touch-icon-${size}x${size}`, size)),
    ],
    other: [
      pngIcon("apple-touch-icon-precomposed", 180),
      ...appleTouchIconSizes.map((size) =>
        pngIcon(`apple-touch-icon-${size}x${size}-precomposed`, size)
      ),
    ].map((icon) => ({ ...icon, rel: "apple-touch-icon-precomposed" })),
  },
  manifest: "/favicons/manifest.json",
  other: {
    "msapplication-config": "/favicons/browserconfig.xml",
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
