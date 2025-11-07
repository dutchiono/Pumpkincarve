'use client';

import dynamic from 'next/dynamic';

const Gen1App = dynamic(() => import('../gen1-creator/Gen1App'), { ssr: false });

export default function CreatorPage() {
  return <Gen1App />;
}

