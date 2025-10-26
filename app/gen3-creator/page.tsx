import type { Metadata } from 'next';
import Gen3App from './Gen3App';

export const metadata: Metadata = {
  title: 'Gen3 NFT Creator',
  description: 'Create and customize your Gen3 NFT - Flow Field, FlowFields, and Contour Mapping.',
  openGraph: {
    title: 'Gen3 NFT Creator',
    description: 'Create and customize your Gen3 NFT.',
    images: [`/digitalpumpkin.png`],
  },
};

export default function Gen3CreatorPage() {
  return <Gen3App />;
}

