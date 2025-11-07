import './globals.css';
import { Providers } from './providers';
import NotificationCenter from '@/app/components/NotificationCenter';
import FarcasterSDKInit from '@/components/FarcasterSDKInit';
import Navigation from '@/components/Navigation';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://bushleague.xyz';

const miniappEmbed = {
  version: "1",
  imageUrl: "https://bushleague.xyz/splash-200.png",
  button: {
    title: "Gen1 NFT Studio",
    action: {
      type: "launch_miniapp",
      name: "Gen1 NFT Studio",
      splashImageUrl: "https://bushleague.xyz/splash-200.png",
      splashBackgroundColor: "#0f172a"
    }
  },
  castShareUrl: `${APP_URL}/cast-share`
};

export const metadata = {
  title: 'Gen1 NFT Studio',
  description: 'Evolving generative art NFTs on Base',
  icons: {
    icon: '/splash-200.png',
    apple: '/splash-200.png',
  },
  openGraph: {
    title: 'Gen1 NFT Studio',
    description: 'Evolving generative art NFTs on Base',
    images: ['https://bushleague.xyz/splash-200.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="fc:miniapp" content={JSON.stringify(miniappEmbed)} />
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function() {
  if (typeof SVGElement === 'undefined') return;
  const originalSetAttribute = SVGElement.prototype.setAttribute;
  SVGElement.prototype.setAttribute = function(name, value) {
    if ((name === 'width' || name === 'height') && value === 'small') {
      return originalSetAttribute.call(this, name, '16');
    }
    return originalSetAttribute.call(this, name, value);
  };
})();
            `,
          }}
        />
      </head>
      <body className="pt-16">
        <FarcasterSDKInit />
        <Navigation />
        <Providers>
          {children}
          <NotificationCenter />
        </Providers>
      </body>
    </html>
  );
}

