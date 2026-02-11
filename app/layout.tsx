import type { Metadata } from 'next';
import { AppProvider } from '@/lib/context';
import './globals.css';

export const metadata: Metadata = {
  title: 'Blend Risk Dashboard',
  description: 'Real-time vault risk monitoring',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-gray-950 text-gray-100 min-h-screen">
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}