import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Recipe Box', template: '%s · Recipe Box' },
  description: 'A warm, well-organized recipe box. Capture from anywhere; cook with what you have.',
  applicationName: 'Recipe Box',
  manifest: '/manifest.json',
  icons: {
    icon: [{ url: '/icons/favicon.svg', type: 'image/svg+xml' }],
    apple: '/icons/apple-touch-icon.png',
  },
  appleWebApp: { capable: true, title: 'Recipe Box', statusBarStyle: 'default' },
};

export const viewport: Viewport = {
  themeColor: '#fdfcf9',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700;900&family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,600&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        {/* Service worker registration — production only.
            In dev we'd cache stale auth-redirect responses for protected routes. */}
        {process.env.NODE_ENV === 'production' ? (
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  window.addEventListener('load', () => {
                    navigator.serviceWorker.register('/service-worker.js').catch(() => {});
                  });
                }
              `,
            }}
          />
        ) : (
          // Defensive: unregister any SW that may have been installed earlier in dev.
          <script
            dangerouslySetInnerHTML={{
              __html: `
                if ('serviceWorker' in navigator) {
                  navigator.serviceWorker.getRegistrations().then((regs) =>
                    regs.forEach((r) => r.unregister()),
                  ).catch(() => {});
                }
              `,
            }}
          />
        )}
      </body>
    </html>
  );
}
