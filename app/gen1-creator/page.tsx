'use client';

import dynamic from 'next/dynamic';

const Gen1App = dynamic(() => import('./Gen1App'), { ssr: false });

export default function Gen1CreatorPage() {
  return <Gen1App />;
}

