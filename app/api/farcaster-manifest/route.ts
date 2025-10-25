import { NextResponse } from 'next/server';

export async function GET() {
  const manifest = {
    version: "1",
    name: "Pumpkin Carving NFTs",
    iconUrl: "https://your-domain.com/icon.png",
    homeUrl: "https://your-domain.com",
    appUrl: "https://your-domain.com",
    accountAssociation: {
      header: "",
      payload: "",
      signature: ""
    }
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
