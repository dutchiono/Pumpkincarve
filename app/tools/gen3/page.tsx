'use client';

import Gen3App from '@/app/gen3-creator/Gen3App';

export default function InternalGen3CreatorPage() {
  return (
    <div style={{ padding: '24px' }}>
      <h1 style={{ marginBottom: '12px' }}>Internal Gen3 Creator</h1>
      <p style={{ opacity: 0.7, marginBottom: '16px' }}>Restricted tool. Access controlled via INTERNAL_ACCESS_KEY.</p>
      <Gen3App />
    </div>
  );
}


