'use client';

import { useEffect, useState } from 'react';
import { useAccount } from 'wagmi';
import { sdk } from '@farcaster/miniapp-sdk';
import { useFarcasterContext } from '@/lib/hooks/useFarcasterContext';

interface UserData {
  posts: any[];
  pfp: string;
  username: string;
  bio: string;
  fid: number;
  displayName: string;
  walletAddress?: string;
}

interface MoodAnalysis {
  id: string;
  mood: string;
  personality: string;
  traits: string[];
  interests: string[];
  reasoning: string;
  color1: string;
  color2: string;
  base_frequency: number;
  flow_field_base_frequency: number;
  flow_fields_base_frequency: number;
  flow_line_density: number;
  posts_analyzed: number;
  created_at: string;
}

export default function ProfilePage() {
  const { address, isConnected } = useAccount();
  const { isInFarcaster } = useFarcasterContext();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [moodAnalysis, setMoodAnalysis] = useState<MoodAnalysis | null>(null);
  const [testNotificationText, setTestNotificationText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if user is admin (matches REAL_WALLET from env)
  useEffect(() => {
    const checkAdmin = async () => {
      if (!address) {
        setIsAdmin(false);
        return;
      }

      try {
        const response = await fetch('/api/admin/check', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ address }),
        });

        if (response.ok) {
          const data = await response.json();
          setIsAdmin(data.isAdmin || false);
        }
      } catch (err) {
        console.error('Error checking admin status:', err);
        setIsAdmin(false);
      }
    };

    checkAdmin();
  }, [address]);

  // Fetch user profile and mood analysis
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        // First, try to get Farcaster context (works in miniapp)
        let fid: number | null = null;
        try {
          const context = await sdk.context;
          if (context?.user?.fid) {
            fid = context.user.fid;
            console.log('[Profile] Found Farcaster context, FID:', fid);
          }
        } catch (err) {
          console.log('[Profile] Not in Farcaster miniapp or context unavailable');
        }

        // If we have a FID, fetch Farcaster user info
        if (fid) {
          const response = await fetch(`/api/get-user-info?fid=${fid}`);
          if (response.ok) {
            const data = await response.json();
            setUserData({
              posts: data.posts || [],
              pfp: data.pfp || '',
              username: data.username || '',
              bio: data.bio || '',
              fid: fid,
              displayName: data.displayName || data.username || '',
              walletAddress: address || undefined,
            });

            // Fetch mood analysis
            try {
              const moodResponse = await fetch(`/api/mood-analysis/get?fid=${fid}`);
              if (moodResponse.ok) {
                const moodData = await moodResponse.json();
                if (moodData.analyses && moodData.analyses.length > 0) {
                  // Get the latest analysis
                  setMoodAnalysis(moodData.analyses[0]);
                }
              }
            } catch (err) {
              console.error('Error fetching mood analysis:', err);
            }

            setIsLoading(false);
            return;
          }
        }

        // If no FID but wallet is connected, show wallet-based profile
        if (isConnected && address) {
          console.log('[Profile] Wallet connected, address:', address);
          setUserData({
            posts: [],
            pfp: '',
            username: '',
            bio: '',
            fid: 0, // No FID for wallet-only connections
            displayName: `${address.slice(0, 6)}...${address.slice(-4)}`,
            walletAddress: address,
          });

          // Try to fetch mood analysis by wallet address
          try {
            const moodResponse = await fetch(`/api/mood-analysis/get?walletAddress=${address}`);
            if (moodResponse.ok) {
              const moodData = await moodResponse.json();
              if (moodData.analyses && moodData.analyses.length > 0) {
                setMoodAnalysis(moodData.analyses[0]);
              }
            }
          } catch (err) {
            console.error('Error fetching mood analysis:', err);
          }

          setIsLoading(false);
          return;
        }

        // No connection found
        console.log('[Profile] No wallet or Farcaster connection found');
        setUserData(null);
        setIsLoading(false);
      } catch (err) {
        console.error('Error fetching profile:', err);
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [address, isConnected, isInFarcaster]);

  // Handle test notification
  const handleTestNotification = async () => {
    if (!testNotificationText.trim()) {
      alert('Please enter notification text');
      return;
    }

    try {
      const response = await fetch('/api/notifications/farcaster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fid: userData?.fid,
          title: '🧪 Test Notification',
          body: testNotificationText.substring(0, 128),
          url: 'https://bushleague.xyz'
        })
      });

      if (response.ok) {
        alert('✅ Test notification sent!');
        setTestNotificationText('');
      } else {
        const error = await response.json();
        alert('❌ Failed: ' + error.error);
      }
    } catch (error: any) {
      alert('Error: ' + error.message);
    }
  };

  // Handle test mint cast (admin only)
  const handleTestMintCast = async () => {
    if (!isAdmin) {
      alert('Admin access required');
      return;
    }

    try {
      // For test mint cast, we don't need an image - just the miniapp URL
      const appUrl = typeof window !== 'undefined'
        ? (process.env.NEXT_PUBLIC_APP_URL || window.location.origin)
        : process.env.NEXT_PUBLIC_APP_URL || 'https://bushleague.xyz';

      // Prepare embeds: just miniapp URL for test cast (no image needed for test)
      const embeds: [string] = [appUrl] as [string];

      const result = await sdk.actions.composeCast({
        text: 'I just minted my Mood NFT by @ionoi!',
        embeds,
      });

      if (result?.cast) {
        alert('✅ Test cast posted successfully!');
      } else {
        // User cancelled
        console.log('User cancelled test cast');
      }
    } catch (error: any) {
      console.error('Test cast error:', error);
      alert('Failed to post test cast: ' + (error.message || String(error)));
    }
  };

  if (isLoading) {
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
            Loading profile...
          </div>
        </div>
      </main>
    );
  }

  if (!userData) {
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
            <p style={{ marginBottom: '16px' }}>Please connect your wallet or sign in to view your profile.</p>
            {isInFarcaster && (
              <p style={{ fontSize: '14px', color: 'rgba(255, 255, 255, 0.5)' }}>
                If you're in the Farcaster miniapp, your wallet should connect automatically.
              </p>
            )}
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
          <div className="flex flex-col items-center mb-6">
            {userData.pfp && (
              <img
                src={userData.pfp}
                alt={userData.username}
                style={{
                  width: '80px',
                  height: '80px',
                  borderRadius: '50%',
                  marginBottom: '16px',
                  border: '2px solid rgba(255, 255, 255, 0.2)'
                }}
              />
            )}
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#ffffff', marginBottom: '8px' }}>
              {userData.displayName || userData.username}
            </h2>
            <p style={{ color: 'rgba(255, 255, 255, 0.8)' }}>@{userData.username}</p>
          </div>
          <div className="space-y-3">
            {userData.fid > 0 && (
              <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '16px',
                padding: '16px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '4px' }}>FID</p>
                <p style={{ color: '#ffffff', fontFamily: 'monospace', fontSize: '16px' }}>{userData.fid}</p>
              </div>
            )}

            {/* AI Mood Analysis */}
            {moodAnalysis ? (
              <div style={{
                backgroundColor: 'rgba(147, 51, 234, 0.15)',
                borderRadius: '16px',
                padding: '20px',
                border: '1px solid rgba(147, 51, 234, 0.4)'
              }}>
                <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#9333ea', marginBottom: '16px' }}>
                  🧠 AI Mood Analysis
                </h3>
                <div style={{ marginBottom: '12px' }}>
                  <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '4px' }}>Mood</p>
                  <p style={{ color: '#ffffff', fontSize: '16px', fontWeight: '600' }}>{moodAnalysis.mood}</p>
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '4px' }}>Personality</p>
                  <p style={{ color: '#ffffff', fontSize: '16px', fontWeight: '600' }}>{moodAnalysis.personality}</p>
                </div>
                {moodAnalysis.traits && moodAnalysis.traits.length > 0 && (
                  <div style={{ marginBottom: '12px' }}>
                    <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px' }}>Traits</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {moodAnalysis.traits.map((trait, idx) => (
                        <span
                          key={idx}
                          style={{
                            fontSize: '12px',
                            padding: '4px 12px',
                            borderRadius: '12px',
                            backgroundColor: 'rgba(147, 51, 234, 0.3)',
                            color: '#ffffff',
                            border: '1px solid rgba(147, 51, 234, 0.5)'
                          }}
                        >
                          {trait}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {moodAnalysis.interests && moodAnalysis.interests.length > 0 && (
                  <div style={{ marginBottom: '12px' }}>
                    <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px' }}>Interests</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                      {moodAnalysis.interests.map((interest, idx) => (
                        <span
                          key={idx}
                          style={{
                            fontSize: '12px',
                            padding: '4px 12px',
                            borderRadius: '12px',
                            backgroundColor: 'rgba(99, 102, 241, 0.3)',
                            color: '#ffffff',
                            border: '1px solid rgba(99, 102, 241, 0.5)'
                          }}
                        >
                          {interest}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {moodAnalysis.reasoning && (
                  <div style={{ marginBottom: '12px' }}>
                    <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px' }}>Analysis</p>
                    <p style={{ color: 'rgba(255, 255, 255, 0.9)', fontSize: '14px', lineHeight: '1.6' }}>
                      {moodAnalysis.reasoning}
                    </p>
                  </div>
                )}
                <div style={{ marginBottom: '12px' }}>
                  <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px' }}>Color Palette</p>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '8px',
                          backgroundColor: moodAnalysis.color1,
                          border: '2px solid rgba(255, 255, 255, 0.2)'
                        }}
                      />
                      <span style={{ color: '#ffffff', fontSize: '14px', fontFamily: 'monospace' }}>
                        {moodAnalysis.color1}
                      </span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div
                        style={{
                          width: '40px',
                          height: '40px',
                          borderRadius: '8px',
                          backgroundColor: moodAnalysis.color2,
                          border: '2px solid rgba(255, 255, 255, 0.2)'
                        }}
                      />
                      <span style={{ color: '#ffffff', fontSize: '14px', fontFamily: 'monospace' }}>
                        {moodAnalysis.color2}
                      </span>
                    </div>
                  </div>
                </div>
                <div style={{
                  marginTop: '16px',
                  paddingTop: '16px',
                  borderTop: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                  <p style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)' }}>
                    Analyzed {moodAnalysis.posts_analyzed} posts • {new Date(moodAnalysis.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ) : (
              <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '16px',
                padding: '20px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                textAlign: 'center'
              }}>
                <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '14px' }}>
                  No AI mood analysis yet. Mint an NFT to generate your analysis!
                </p>
              </div>
            )}
            {userData.bio && (
              <div style={{
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '16px',
                padding: '16px',
                border: '1px solid rgba(255, 255, 255, 0.1)'
              }}>
                <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px' }}>Bio</p>
                <p style={{ color: '#ffffff', fontSize: '14px', lineHeight: '1.6' }}>{userData.bio}</p>
              </div>
            )}
          </div>

          {isAdmin && (
            <div style={{
              marginTop: '24px',
              paddingTop: '24px',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <h3 style={{ fontSize: '16px', fontWeight: 'bold', color: 'rgba(168, 85, 247, 1)', marginBottom: '12px' }}>🔧 Admin Tools</h3>

              {/* Test Notification */}
              <div style={{ marginBottom: '12px' }}>
                <input
                  type="text"
                  placeholder="Enter notification text..."
                  value={testNotificationText}
                  onChange={(e) => setTestNotificationText(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '8px',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: 'white',
                    marginBottom: '8px',
                    fontSize: '14px'
                  }}
                />
                <button
                  onClick={handleTestNotification}
                  style={{
                    padding: '12px 24px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    backgroundColor: 'rgba(59, 130, 246, 0.3)',
                    border: '1px solid rgba(59, 130, 246, 0.5)',
                    color: 'white',
                    cursor: 'pointer',
                    width: '100%'
                  }}
                >
                  📨 Send Test Notification
                </button>
              </div>

              <button
                onClick={handleTestMintCast}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  backgroundColor: 'rgba(168, 85, 247, 0.2)',
                  border: '1px solid rgba(168, 85, 247, 0.5)',
                  color: 'white',
                  cursor: 'pointer',
                  width: '100%',
                  marginBottom: '12px'
                }}
              >
                🧪 Test Mint Cast
              </button>
              <p style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)', textAlign: 'center', marginTop: '8px' }}>
                Tests the cast that would be posted when someone mints
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

