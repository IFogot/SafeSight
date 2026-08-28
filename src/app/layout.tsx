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
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Script-specific fonts only — Latin text uses the native system stack */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&family=Noto+Sans+Myanmar:wght@400;600;700&family=Noto+Sans+Khmer:wght@400;600;700&family=Noto+Sans+Lao:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-[#FCFAF7] text-[#423D38] min-h-screen selection:bg-[#FE6E00] selection:text-white antialiased overflow-x-hidden">
        {children}
      </body>
    </html>
  );
}
