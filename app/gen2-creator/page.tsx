import type { Metadata } from 'next';
// import Gen2App from './Gen2App'; // Temporarily disabled

export const metadata: Metadata = {
  title: 'Gen2 NFT Creator',
  description: 'Create and customize your Gen2 NFT.',
  openGraph: {
    title: 'Gen2 NFT Creator',
    description: 'Create and customize your Gen2 NFT.',
    images: [`/digitalpumpkin.png`],
  },
  other: {
    'fc:frame': 'vNext',
    'fc:frame:image': `${process.env.NEXT_PUBLIC_HOST}/digitalpumpkin.png`,
  },
};

export default function Gen2CreatorPage() {
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h1>Gen2 Creator Temporarily Disabled</h1>
      <p>This page is under development.</p>
    </div>
  );
  // Temporarily disabled: return <Gen2App />;
}