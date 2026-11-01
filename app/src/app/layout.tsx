import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sky — Weather, beautifully simple.',
  description: 'A little clarity for your day. Beautiful, local weather forecasts wherever you are.',
  icons: { icon: '/sky-mark.svg' },
};
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
