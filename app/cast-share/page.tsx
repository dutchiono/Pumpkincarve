'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { sdk } from '@farcaster/miniapp-sdk';
import Link from 'next/link';

/**
 * Page to handle shared casts from Farcaster share extensions
 * When users share a cast to Gen1 miniapp, they land here with cast context
 */
function CastShareContent() {
  const searchParams = useSearchParams();
  const [castData, setCastData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getSharedCast = async () => {
      try {
        // Get cast context from Farcaster SDK
        const context = await sdk.context;

        // Check if we have shared cast data in URL params
        const castHash = searchParams.get('castHash');
        const castText = searchParams.get('text');
        const authorFid = searchParams.get('authorFid');
        const authorUsername = searchParams.get('authorUsername');

        if (castHash || castText) {
          setCastData({
            hash: castHash,
            text: castText,
            authorFid: authorFid ? parseInt(authorFid) : null,
            authorUsername: authorUsername || null
          });
        } else {
          // Try to get cast data from SDK context if available
          // Note: This may vary based on Farcaster SDK implementation
          console.log('Cast share context:', context);
        }
      } catch (error) {
        console.error('Error getting shared cast:', error);
      } finally {
        setLoading(false);
      }
    };

    getSharedCast();
  }, [searchParams]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 pt-24">
        <div className="max-w-4xl mx-auto">
          <div style={{
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            padding: '32px',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            textAlign: 'center',
            color: 'rgba(255, 255, 255, 0.7)'
          }}>
            Loading shared cast...
          </div>
        </div>
      </main>
    );
  }

  if (!castData) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 pt-24">
        <div className="max-w-4xl mx-auto">
          <div style={{
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            padding: '32px',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            textAlign: 'center'
          }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffffff', marginBottom: '16px' }}>
              Shared Cast
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.7)', marginBottom: '24px' }}>
              No cast data available. Try sharing a cast from Farcaster.
            </p>
            <Link href="/">
              <button style={{
                padding: '12px 24px',
                borderRadius: '8px',
                backgroundColor: 'rgba(147, 51, 234, 0.3)',
                border: '1px solid rgba(147, 51, 234, 0.5)',
                color: 'white',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600'
              }}>
                Go to Home
              </button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 pt-24">
      <div className="max-w-4xl mx-auto">
        <div style={{
          backgroundColor: 'rgba(0, 0, 0, 0.85)',
          backdropFilter: 'blur(20px)',
          borderRadius: '24px',
          padding: '32px',
          border: '2px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
        }}>
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffffff', marginBottom: '24px' }}>
            📤 Shared Cast
          </h2>

          {castData.authorUsername && (
            <div style={{
              marginBottom: '16px',
              paddingBottom: '16px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '4px' }}>
                From
              </p>
              <p style={{ fontSize: '16px', fontWeight: '600', color: '#ffffff' }}>
                @{castData.authorUsername}
                {castData.authorFid && (
                  <span style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.4)', marginLeft: '8px' }}>
                    (FID: {castData.authorFid})
                  </span>
                )}
              </p>
            </div>
          )}

          {castData.text && (
            <div style={{
              backgroundColor: 'rgba(147, 51, 234, 0.1)',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
              border: '1px solid rgba(147, 51, 234, 0.3)'
            }}>
              <p style={{
                color: 'rgba(255, 255, 255, 0.9)',
                fontSize: '16px',
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                {castData.text}
              </p>
            </div>
          )}

          {castData.hash && (
            <div style={{
              marginBottom: '24px',
              padding: '12px',
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '8px'
            }}>
              <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '4px' }}>
                Cast Hash
              </p>
              <p style={{ fontSize: '14px', fontFamily: 'monospace', color: 'rgba(255, 255, 255, 0.8)' }}>
                {castData.hash}
              </p>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
            <Link href="/creator">
              <button style={{
                flex: 1,
                padding: '12px 24px',
                borderRadius: '8px',
                backgroundColor: 'rgba(147, 51, 234, 0.3)',
                border: '1px solid rgba(147, 51, 234, 0.5)',
                color: 'white',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                transition: 'all 0.3s'
              }}>
                Create NFT from Cast
              </button>
            </Link>
            <Link href="/">
              <button style={{
                flex: 1,
                padding: '12px 24px',
                borderRadius: '8px',
                backgroundColor: 'rgba(51, 65, 85, 0.3)',
                border: '1px solid rgba(51, 65, 85, 0.5)',
                color: 'white',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '600',
                transition: 'all 0.3s'
              }}>
                Go to Home
              </button>
            </Link>
          </div>

          <p style={{
            marginTop: '24px',
            fontSize: '12px',
            color: 'rgba(255, 255, 255, 0.4)',
            textAlign: 'center',
            fontStyle: 'italic'
          }}>
            Share extensions allow you to reference casts when creating NFTs
          </p>
        </div>
      </div>
    </main>
  );
}

export default function CastSharePage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4 pt-24">
        <div className="max-w-4xl mx-auto">
          <div style={{
            backgroundColor: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(20px)',
            borderRadius: '24px',
            padding: '32px',
            border: '2px solid rgba(255, 255, 255, 0.2)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
            textAlign: 'center',
            color: 'rgba(255, 255, 255, 0.7)'
          }}>
            Loading...
          </div>
        </div>
      </main>
    }>
      <CastShareContent />
    </Suspense>
  );
}

