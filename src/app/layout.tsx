import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'SafeSight — AI-Powered Multilingual Workplace Safety Platform (EEC)',
  description:
    'เซฟไซต์: ระบบเฝ้าระวังและแจ้งเตือนความปลอดภัยแรงงานอัจฉริยะพหุภาษาผ่านเว็บแอปพลิเคชัน สำหรับเขตพัฒนาพิเศษภาคตะวันออก (EEC)',
  icons: {
    icon: '/shield.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        {/* Google Fonts for multilingual support */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600;700&family=Outfit:wght@400;500;600;700;800;900&family=Prompt:wght@300;400;500;600;700&family=Noto+Sans+Myanmar:wght@400;600;700&family=Noto+Sans+Khmer:wght@400;600;700&family=Noto+Sans+Lao:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#070B14] text-slate-100 min-h-screen selection:bg-amber-500 selection:text-slate-950 font-sans antialiased overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
