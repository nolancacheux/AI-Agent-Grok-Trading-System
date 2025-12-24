import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'GROK TRADING BOT',
  description: 'Automated trading dashboard powered by Grok',
  icons: {
    icon: '/favicon.ico',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-terminal-black text-gray-200 antialiased">
        {/* Matrix Background Effect */}
        <div className="matrix-bg" aria-hidden="true" />

        {/* Grid Overlay */}
        <div
          className="fixed inset-0 pointer-events-none z-0 opacity-30"
          style={{
            backgroundImage: `
              linear-gradient(#00ff0005 1px, transparent 1px),
              linear-gradient(90deg, #00ff0005 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
          aria-hidden="true"
        />

        {/* Main Content */}
        <main className="relative z-10">
          {children}
        </main>
      </body>
    </html>
  );
}
