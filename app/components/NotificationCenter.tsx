'use client';

import { useEffect, useState } from 'react';
import { NotificationType, subscribeToNotifications } from '@/app/utils/notify';

type Notification = {
  id: string;
  message: string;
  type: NotificationType;
  timestamp: number;
};

const TYPE_STYLES: Record<NotificationType, string> = {
  info: 'bg-slate-800 border-slate-600 text-slate-200',
  success: 'bg-emerald-900/80 border-emerald-500 text-emerald-100',
  warning: 'bg-amber-900/80 border-amber-500 text-amber-100',
  error: 'bg-rose-900/80 border-rose-500 text-rose-100',
};

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const unsubscribe = subscribeToNotifications((detail) => {
      setNotifications((prev) => [...prev, detail]);
      const timeout = setTimeout(() => {
        setNotifications((prev) => prev.filter((item) => item.id !== detail.id));
      }, 4000);
      return () => clearTimeout(timeout);
    });

    return unsubscribe;
  }, []);

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-x-0 bottom-6 z-50 flex flex-col items-center gap-2 px-2">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`w-full max-w-sm rounded-lg border px-4 py-3 shadow-lg transition-all ${TYPE_STYLES[notification.type]}`}
        >
          <p className="text-sm font-medium leading-relaxed">{notification.message}</p>
        </div>
      ))}
    </div>
  );
}

