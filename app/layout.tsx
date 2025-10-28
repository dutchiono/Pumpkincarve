import './globals.css';
import { Providers } from './providers';

const miniappEmbed = {
  version: "1",
  imageUrl: "https://bushleague.xyz/digitalpumpkin.png",
  button: {
    title: "Carve Your NFT",
    action: {
      type: "launch_miniapp",
      name: "Pumpkin Carving NFT",
      splashImageUrl: "https://bushleague.xyz/digitalpumpkin.png",
      splashBackgroundColor: "#0F1535"
    }
  }
};

export const metadata = {
  title: 'Pumpkin Carving NFT',
  description: 'Carve your personality into a spooky NFT on Base',
  icons: {
    icon: '/digitalpumpkin.png',
    apple: '/digitalpumpkin.png',
  },
  openGraph: {
    title: 'Pumpkin Carving NFT',
    description: 'Carve your personality into a spooky NFT on Base',
    images: ['https://bushleague.xyz/digitalpumpkin.png'],
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

