import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import SmoothScroll from '@/components/SmoothScroll';
import BlobCursor from '@/components/BlobCursor';
import CustomCursor from '@/components/CustomCursor';

const geistSans = Geist({
  variable: '--font-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'Arman Acharya | Portfolio',
  description: 'CS&D Student · Hackathon Winner · Black Belt · Builder — MLRIT Hyderabad',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Permanent+Marker&family=Poppins:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-black text-white antialiased overflow-x-hidden">
        <CustomCursor />
        <BlobCursor
          blobType="circle"
          fillColor="#7B2FBE"
          trailCount={3}
          sizes={[18, 36, 24]}
          innerSizes={[5, 10, 7]}
          innerColor="rgba(192,132,252,0.95)"
          opacities={[0.9, 0.7, 0.8]}
          shadowColor="rgba(123,47,190,0.7)"
          shadowBlur={12}
          shadowOffsetX={0}
          shadowOffsetY={0}
          filterStdDeviation={6}
          useFilter={true}
          fastDuration={0.06}
          slowDuration={0.25}
          zIndex={100000}
        />
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
