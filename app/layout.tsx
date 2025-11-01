import './globals.css';
import { Providers } from './providers';

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
  }
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
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

