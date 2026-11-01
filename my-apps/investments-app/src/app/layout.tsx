import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Equity — Investment dashboard',
  description: 'A simple, private dashboard for tracking stock positions and market prices.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
