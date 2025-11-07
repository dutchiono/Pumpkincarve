'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface LeaderboardEntry {
  address: string;
  count: number;
  username: string | null;
  fid: number | null;
  pfp: string | null;
}

interface GifterEntry extends LeaderboardEntry {
  recipients: string[];
  uniqueRecipients: number;
  gifts: Array<{ recipient: string; tokenId: number; recipientUsername?: string | null }>;
}

function LeaderboardContent() {
  const searchParams = useSearchParams();
  const initialTab = (searchParams.get('tab') as 'minters' | 'holders' | 'gifters') || 'minters';

  const [leaderboardSubTab, setLeaderboardSubTab] = useState<'minters' | 'holders' | 'gifters'>(initialTab);
  const [topMinters, setTopMinters] = useState<LeaderboardEntry[]>([]);
  const [topHolders, setTopHolders] = useState<LeaderboardEntry[]>([]);
  const [topGifters, setTopGifters] = useState<GifterEntry[]>([]);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [userNFTs, setUserNFTs] = useState<Record<string, { tokenId: number; imageUrl: string }[]>>({});
  const [loadingNFTs, setLoadingNFTs] = useState<Record<string, boolean>>({});
  const [leaderboardNotice, setLeaderboardNotice] = useState<string | null>(null);

  // Fetch NFTs when user is expanded
  useEffect(() => {
    const fetchUserNFTs = async (address: string) => {
      if (userNFTs[address] || loadingNFTs[address]) return;

      setLoadingNFTs((prev) => ({ ...prev, [address]: true }));

      try {
        const response = await fetch(`/api/user-nfts?address=${address}`);
        if (response.ok) {
          const nfts = await response.json();
          setUserNFTs((prev) => ({ ...prev, [address]: nfts }));
        }
      } catch (error) {
        console.error('Error fetching user NFTs:', error);
      } finally {
        setLoadingNFTs((prev) => ({ ...prev, [address]: false }));
      }
    };

    expandedUsers.forEach(address => {
      if (!userNFTs[address] && !loadingNFTs[address]) {
        fetchUserNFTs(address);
      }
    });
  }, [expandedUsers, userNFTs, loadingNFTs]);

  // Fetch leaderboard data
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLeaderboardNotice(null);

        // Fetch minters
        const mintersResponse = await fetch('/api/top-minters');
        if (mintersResponse.ok) {
          const mintersData = await mintersResponse.json();
          setTopMinters(mintersData);
        } else {
          const txt = await mintersResponse.text();
          console.error('Failed to fetch minters:', mintersResponse.status, txt);
          if (mintersResponse.status === 400 && txt.includes('Contract not deployed')) {
            setLeaderboardNotice('Leaderboard unavailable: contract address is not configured on the server.');
          }
        }

        // Fetch holders
        const holdersResponse = await fetch('/api/top-holders');
        if (holdersResponse.ok) {
          const holdersData = await holdersResponse.json();
          setTopHolders(holdersData);
        } else {
          const txt = await holdersResponse.text();
          console.error('Failed to fetch holders:', holdersResponse.status, txt);
          if (holdersResponse.status === 400 && txt.includes('Contract not deployed')) {
            setLeaderboardNotice('Leaderboard unavailable: contract address is not configured on the server.');
          }
        }

        // Fetch gifters
        const giftersResponse = await fetch('/api/top-gifters');
        if (giftersResponse.ok) {
          const giftersData = await giftersResponse.json();
          setTopGifters(giftersData);
        } else {
          const txt = await giftersResponse.text();
          console.error('Failed to fetch gifters:', giftersResponse.status, txt);
          if (giftersResponse.status === 400 && txt.includes('Contract not deployed')) {
            setLeaderboardNotice('Leaderboard unavailable: contract address is not configured on the server.');
          }
        }
      } catch (err) {
        console.error('Failed to fetch leaderboard data:', err);
      }
    };
    fetchData();
  }, []);

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
          <div className="text-5xl mb-4 text-center">🏆</div>
          {leaderboardNotice && (
            <div style={{
              marginBottom: '16px',
              padding: '12px 16px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: 'rgba(255, 255, 255, 0.85)'
            }}>
              {leaderboardNotice}
            </div>
          )}
          <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffffff', marginBottom: '16px', textAlign: 'center' }}>Leaderboard</h2>

          {/* Sub-tabs - Modern segmented control */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '24px',
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            borderRadius: '12px',
            padding: '4px',
            gap: '4px'
          }}>
            <button
              onClick={() => setLeaderboardSubTab('minters')}
              style={{
                padding: '8px 24px',
                borderRadius: '8px',
                fontWeight: '600',
                transition: 'all 0.2s',
                cursor: 'pointer',
                border: 'none',
                backgroundColor: leaderboardSubTab === 'minters' ? 'white' : 'transparent',
                color: leaderboardSubTab === 'minters' ? 'black' : 'rgba(255, 255, 255, 0.6)',
              }}
            >
              Top Minters
            </button>
            <button
              onClick={() => setLeaderboardSubTab('holders')}
              style={{
                padding: '8px 24px',
                borderRadius: '8px',
                fontWeight: '600',
                transition: 'all 0.2s',
                cursor: 'pointer',
                border: 'none',
                backgroundColor: leaderboardSubTab === 'holders' ? 'white' : 'transparent',
                color: leaderboardSubTab === 'holders' ? 'black' : 'rgba(255, 255, 255, 0.6)',
              }}
            >
              Top Holders
            </button>
            <button
              onClick={() => setLeaderboardSubTab('gifters')}
              style={{
                padding: '8px 24px',
                borderRadius: '8px',
                fontWeight: '600',
                transition: 'all 0.2s',
                cursor: 'pointer',
                border: 'none',
                backgroundColor: leaderboardSubTab === 'gifters' ? 'white' : 'transparent',
                color: leaderboardSubTab === 'gifters' ? 'black' : 'rgba(255, 255, 255, 0.6)',
              }}
            >
              🎁 Top Gifters
            </button>
          </div>

          {leaderboardSubTab === 'minters' && (
            <>
              {topMinters.length === 0 ? (
                <div style={{ textAlign: 'center', paddingTop: '32px', paddingBottom: '32px', color: 'rgba(255, 255, 255, 0.7)' }}>
                  <p>No mints yet! Be the first to mint!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {topMinters.map((minter, index) => (
                    <div key={minter.address} style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '16px',
                      padding: '16px',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexDirection: 'row' }} onClick={() => {
                        setExpandedUsers(prev => {
                          const next = new Set(prev);
                          if (next.has(minter.address)) {
                            next.delete(minter.address);
                          } else {
                            next.add(minter.address);
                          }
                          return next;
                        });
                      }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f97316', width: '32px' }}>{index + 1}</div>
                        {minter.pfp && <img src={minter.pfp} alt={minter.username || ''} style={{ borderRadius: '50%', width: '40px', height: '40px' }} />}
                        <div
                          style={{ color: 'white', fontWeight: 'bold', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (minter.fid) {
                              window.open(`https://warpcast.com/${minter.username || minter.fid}`, '_blank');
                            }
                          }}
                        >
                          @{minter.username || 'Unknown'}
                        </div>
                        <div style={{ backgroundColor: 'rgba(249, 115, 22, 0.2)', padding: '4px 12px', borderRadius: '9999px', border: '1px solid rgba(249, 115, 22, 0.3)', whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: 'bold', color: 'white', fontSize: '14px' }}>{minter.count}</span>
                          <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '12px', marginLeft: '4px' }}>mint{minter.count > 1 ? 's' : ''}</span>
                        </div>
                        <div style={{ color: 'rgba(255, 255, 255, 0.5)' }}>{expandedUsers.has(minter.address) ? '▼' : '▶'}</div>
                      </div>
                      {expandedUsers.has(minter.address) && (
                        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                          {loadingNFTs[minter.address] ? (
                            <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>Loading gallery...</p>
                          ) : userNFTs[minter.address] && userNFTs[minter.address].length > 0 ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px' }}>
                              {userNFTs[minter.address].map((nft) => (
                                <img
                                  key={nft.tokenId}
                                  src={nft.imageUrl}
                                  alt={`NFT #${nft.tokenId}`}
                                  style={{
                                    width: '100%',
                                    aspectRatio: '1',
                                    objectFit: 'cover',
                                    borderRadius: '8px',
                                    cursor: 'pointer'
                                  }}
                                  onClick={() => window.open(nft.imageUrl, '_blank')}
                                />
                              ))}
                            </div>
                          ) : (
                            <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>No NFTs found</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {leaderboardSubTab === 'gifters' && (
            <>
              {topGifters.length === 0 ? (
                <div style={{ textAlign: 'center', paddingTop: '32px', paddingBottom: '32px', color: 'rgba(255, 255, 255, 0.7)' }}>
                  <p>No gifts sent yet! Be generous!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {topGifters.map((gifter, index) => (
                    <div key={gifter.address} style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '16px',
                      padding: '16px',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexDirection: 'row' }} onClick={() => {
                        setExpandedUsers(prev => {
                          const next = new Set(prev);
                          if (next.has(gifter.address)) {
                            next.delete(gifter.address);
                          } else {
                            next.add(gifter.address);
                          }
                          return next;
                        });
                      }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#22c55e', width: '32px' }}>{index + 1}</div>
                        {gifter.pfp && <img src={gifter.pfp} alt={gifter.username || ''} style={{ borderRadius: '50%', width: '40px', height: '40px' }} />}
                        <div
                          style={{ color: 'white', fontWeight: 'bold', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (gifter.fid) {
                              window.open(`https://warpcast.com/${gifter.username || gifter.fid}`, '_blank');
                            }
                          }}
                        >
                          @{gifter.username || 'Unknown'}
                        </div>
                        <div style={{ backgroundColor: 'rgba(34, 197, 94, 0.2)', padding: '4px 12px', borderRadius: '9999px', border: '1px solid rgba(34, 197, 94, 0.3)', whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: 'bold', color: 'white', fontSize: '14px' }}>{gifter.count}</span>
                          <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '12px', marginLeft: '4px' }}>gift{gifter.count > 1 ? 's' : ''}</span>
                        </div>
                        <div style={{ color: 'rgba(255, 255, 255, 0.5)' }}>{expandedUsers.has(gifter.address) ? '▼' : '▶'}</div>
                      </div>
                      {expandedUsers.has(gifter.address) && (
                        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                          {gifter.gifts && gifter.gifts.length > 0 ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '16px' }}>
                              {gifter.gifts.map((gift, idx) => (
                                <div
                                  key={idx}
                                  style={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.05)',
                                    borderRadius: '12px',
                                    padding: '12px',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    cursor: 'pointer'
                                  }}
                                  onClick={() => window.open(`https://basescan.org/nft/${process.env.NEXT_PUBLIC_MAINNET_GEN1_NFT_CONTRACT_ADDRESS}/${gift.tokenId}`, '_blank')}
                                >
                                  <div style={{ width: '100%', aspectRatio: '1', marginBottom: '8px', position: 'relative' }}>
                                    <img
                                      src={`/api/gen1-image?tokenId=${gift.tokenId}`}
                                      alt={`NFT #${gift.tokenId}`}
                                      style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        borderRadius: '8px'
                                      }}
                                      onError={(e) => {
                                        (e.target as HTMLImageElement).style.display = 'none';
                                      }}
                                    />
                                  </div>
                                  <div style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '4px' }}>
                                    To:
                                  </div>
                                  <div
                                    style={{
                                      fontSize: '12px',
                                      color: '#22c55e',
                                      fontWeight: 'bold',
                                      cursor: 'pointer',
                                      overflow: 'hidden',
                                      textOverflow: 'ellipsis',
                                      whiteSpace: 'nowrap'
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (gift.recipient) {
                                        window.open(`https://basescan.org/address/${gift.recipient}`, '_blank');
                                      }
                                    }}
                                  >
                                    @{gift.recipientUsername || gift.recipient.slice(0, 6) + '...' + gift.recipient.slice(-4)}
                                  </div>
                                  <div style={{ fontSize: '10px', color: 'rgba(255, 255, 255, 0.5)', marginTop: '4px' }}>
                                    Token #{gift.tokenId}
                                  </div>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>No gifts found</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {leaderboardSubTab === 'holders' && (
            <>
              {topHolders.length === 0 ? (
                <div style={{ textAlign: 'center', paddingTop: '32px', paddingBottom: '32px', color: 'rgba(255, 255, 255, 0.7)' }}>
                  <p>No holders yet!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {topHolders.map((holder, index) => (
                    <div key={holder.address} style={{
                      backgroundColor: 'rgba(255, 255, 255, 0.05)',
                      borderRadius: '16px',
                      padding: '16px',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexDirection: 'row' }} onClick={() => {
                        setExpandedUsers(prev => {
                          const next = new Set(prev);
                          if (next.has(holder.address)) {
                            next.delete(holder.address);
                          } else {
                            next.add(holder.address);
                          }
                          return next;
                        });
                      }}>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#a855f7', width: '32px' }}>{index + 1}</div>
                        {holder.pfp && <img src={holder.pfp} alt={holder.username || ''} style={{ borderRadius: '50%', width: '40px', height: '40px' }} />}
                        <div
                          style={{ color: 'white', fontWeight: 'bold', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', cursor: 'pointer' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (holder.fid) {
                              window.open(`https://warpcast.com/${holder.username || holder.fid}`, '_blank');
                            }
                          }}
                        >
                          @{holder.username || 'Unknown'}
                        </div>
                        <div style={{ backgroundColor: 'rgba(168, 85, 247, 0.2)', padding: '4px 12px', borderRadius: '9999px', border: '1px solid rgba(168, 85, 247, 0.3)', whiteSpace: 'nowrap' }}>
                          <span style={{ fontWeight: 'bold', color: 'white', fontSize: '14px' }}>{holder.count}</span>
                          <span style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '12px', marginLeft: '4px' }}>NFT{holder.count > 1 ? 's' : ''}</span>
                        </div>
                        <div style={{ color: 'rgba(255, 255, 255, 0.5)' }}>{expandedUsers.has(holder.address) ? '▼' : '▶'}</div>
                      </div>
                      {expandedUsers.has(holder.address) && (
                        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                          {loadingNFTs[holder.address] ? (
                            <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>Loading gallery...</p>
                          ) : userNFTs[holder.address] && userNFTs[holder.address].length > 0 ? (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '12px' }}>
                              {userNFTs[holder.address].map((nft) => (
                                <img
                                  key={nft.tokenId}
                                  src={nft.imageUrl}
                                  alt={`NFT #${nft.tokenId}`}
                                  style={{
                                    width: '100%',
                                    aspectRatio: '1',
                                    objectFit: 'cover',
                                    borderRadius: '8px',
                                    cursor: 'pointer'
                                  }}
                                  onClick={() => window.open(nft.imageUrl, '_blank')}
                                />
                              ))}
                            </div>
                          ) : (
                            <p style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '14px' }}>No NFTs found</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default function LeaderboardPage() {
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
            Loading leaderboard...
          </div>
        </div>
      </main>
    }>
      <LeaderboardContent />
    </Suspense>
  );
}

