'use client';

import dynamic from 'next/dynamic';

const Gen3App = dynamic(() => import('./Gen3App'), { ssr: false });

export default function Gen3CreatorPage() {
  return <Gen3App />;
}
