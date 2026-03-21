import type { Metadata } from 'next';
import { Inter, Playfair_Display } from 'next/font/google';
import '@briefli/ui/globals.css';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const playfairDisplay = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Briefli — Legal Practice Management',
  description: 'Modern case management for landlord-tenant law firms',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${playfairDisplay.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
