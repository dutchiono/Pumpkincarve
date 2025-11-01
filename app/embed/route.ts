import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const imageUrl = searchParams.get('image');

  if (!imageUrl) {
    return NextResponse.json({ error: 'image parameter required' }, { status: 400 });
  }

  const miniappUrl = 'https://bushleague.xyz';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">

  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${miniappUrl}">
  <meta property="og:title" content="Gen1 NFT Studio">
  <meta property="og:description" content="Animated generative art NFTs on Base">
  <meta property="og:image" content="${imageUrl}">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${miniappUrl}">
  <meta name="twitter:title" content="Gen1 NFT Studio">
  <meta name="twitter:description" content="Animated generative art NFTs on Base">
  <meta name="twitter:image" content="${imageUrl}">

  <!-- Farcaster Mini App -->
  <meta name="fc:miniapp" content='{"version":"1","imageUrl":"${imageUrl}","button":{"title":"Create NFT","action":{"type":"launch_miniapp","name":"Gen1 NFT Studio","splashImageUrl":"https://bushleague.xyz/splash-200.png","splashBackgroundColor":"#0f172a"}}}'>

  <title>Gen1 NFT Studio</title>
</head>
<body>
  <h1>Gen1 NFT Studio</h1>
  <p>Animated generative art NFTs on Base</p>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
