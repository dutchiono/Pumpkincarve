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
  <meta property="og:title" content="🎃 Pumpkin Carving NFT">
  <meta property="og:description" content="Carve your personality into a spooky NFT on Base">
  <meta property="og:image" content="${imageUrl}">

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${miniappUrl}">
  <meta name="twitter:title" content="🎃 Pumpkin Carving NFT">
  <meta name="twitter:description" content="Carve your personality into a spooky NFT on Base">
  <meta name="twitter:image" content="${imageUrl}">

  <!-- Farcaster Mini App -->
  <meta name="fc:miniapp" content='{"version":"1","imageUrl":"${imageUrl}","button":{"title":"🎃 Carve Your NFT","action":{"type":"launch_miniapp","name":"Pumpkin Carving NFT","splashImageUrl":"https://bushleague.xyz/digitalpumpkin.png","splashBackgroundColor":"#0F1535"}}}'>

  <title>🎃 Pumpkin Carving NFT</title>
</head>
<body>
  <h1>🎃 Pumpkin Carving NFT</h1>
  <p>Carve your personality into a spooky NFT on Base</p>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
