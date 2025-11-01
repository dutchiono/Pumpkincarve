import { NextResponse } from 'next/server';

export async function GET() {
  const manifest = {
    accountAssociation: {
      header: "eyJmaWQiOjQ3NDg2NywidHlwZSI6ImF1dGgiLCJrZXkiOiIweDhERkJkRUVDOGM1ZDQ5NzBCQjVGNDgxQzZlYzdmNzNmYTFDNjViZTUifQ",
      payload: "eyJkb21haW4iOiJidXNobGVhZ3VlLnh5eiJ9",
      signature: "McO07o0YtMBQZvJRWdpN4RtmbF1pRauMwIy5H+f/fT4nMbSJOHxVgi3QxK8lmgJApxm8q4VtfXF63Ta3m3kFDBs="
    },
    miniapp: {
      version: "1",
      name: "Gen1 NFT Studio",
      subtitle: "Generative art NFTs on Base",
      description: "Animated GIF NFTs powered by generative art algorithms",
      tagline: "Evolving generative art NFTs",
      iconUrl: "https://bushleague.xyz/splash-200.png",
      homeUrl: "https://bushleague.xyz",
      imageUrl: "https://bushleague.xyz/splash-200.png",
      heroImageUrl: "https://bushleague.xyz/splash-200.png",
      buttonTitle: "Create",
      splashImageUrl: "https://bushleague.xyz/splash-200.png",
      splashBackgroundColor: "#0f172a",
      primaryCategory: "NFT",
      tags: ["AI", "NFT", "Generative", "Base", "Farcaster"],
      screenshotUrls: [
        "https://bushleague.xyz/splash-200.png"
      ],
      castShareUrl: "https://bushleague.xyz",
      ogTitle: "Gen1 NFT Studio - Generative Art NFTs",
      ogDescription: "Animated generative art NFTs on Base",
      ogImageUrl: "https://bushleague.xyz/splash-200.png",
      webhookUrl: "https://api.neynar.com/f/app/4359b582-99fa-463d-a506-35d85d625a7b/event"
    }
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
