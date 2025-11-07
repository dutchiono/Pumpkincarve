'use client';

import { useEffect, useState } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';

interface UserData {
  posts: any[];
  pfp: string;
  username: string;
  bio: string;
  fid: number;
  displayName: string;
}

export default function ProfilePage() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean | null>(null);
  const [testNotificationText, setTestNotificationText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const isAdmin = userData?.fid === 474867;

  // Fetch user profile and notification status
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const context = await sdk.context;
        if (context?.user?.fid) {
          const fid = context.user.fid;

          // Fetch user info from Neynar
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
            });
          }

          // TODO: Fetch notification status from database
          // For now, we'll check if notifications are enabled via webhook data
          // Example: const notificationStatus = await fetch(`/api/notifications/status?fid=${fid}`);
          // setNotificationsEnabled(notificationStatus.enabled);
          // For now, set to null (unknown) since we don't have database yet
          setNotificationsEnabled(null);
        }
      } catch (err) {
        console.error('Error fetching profile:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, []);

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

  // Handle test compose cast
  const handleTestComposeCast = async () => {
    try {
      await sdk.actions.openUrl('https://warpcast.com/~/compose');
    } catch (error: any) {
      console.error('Failed to open compose cast:', error);
      alert('Failed to open compose cast: ' + error.message);
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
            <p>Please connect your wallet or sign in to view your profile.</p>
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
            {/* Notifications Info */}
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '16px',
              padding: '16px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                <p style={{ color: '#ffffff', fontWeight: '600', marginRight: '8px' }}>🔔 In-App Notifications</p>
                {notificationsEnabled === true && (
                  <span style={{
                    fontSize: '10px',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(34, 197, 94, 0.2)',
                    color: '#22c55e',
                    fontWeight: '600'
                  }}>
                    Enabled
                  </span>
                )}
                {notificationsEnabled === false && (
                  <span style={{
                    fontSize: '10px',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(107, 114, 128, 0.2)',
                    color: '#9ca3af',
                    fontWeight: '600'
                  }}>
                    Disabled
                  </span>
                )}
                {notificationsEnabled === null && (
                  <span style={{
                    fontSize: '10px',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    backgroundColor: 'rgba(107, 114, 128, 0.2)',
                    color: '#9ca3af',
                    fontWeight: '600'
                  }}>
                    Unknown
                  </span>
                )}
              </div>
              <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '8px' }}>
                Get notified when you mint an NFT
              </p>
              <p style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)', fontStyle: 'italic' }}>
                💡 Use the hamburger menu (☰) in the miniapp to toggle notifications
              </p>
            </div>

            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '16px',
              padding: '16px',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}>
              <p style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.6)', marginBottom: '4px' }}>FID</p>
              <p style={{ color: '#ffffff', fontFamily: 'monospace', fontSize: '16px' }}>{userData.fid}</p>
            </div>
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
                onClick={handleTestComposeCast}
                style={{
                  padding: '12px 24px',
                  borderRadius: '8px',
                  fontWeight: '600',
                  backgroundColor: 'rgba(168, 85, 247, 0.2)',
                  border: '1px solid rgba(168, 85, 247, 0.5)',
                  color: 'white',
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                🧪 Test ComposeCast
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

