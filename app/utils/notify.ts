export type NotificationType = 'info' | 'success' | 'warning' | 'error';

const EVENT_NAME = 'gen1-notify';

export function notify(message: string, type: NotificationType = 'info') {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent(EVENT_NAME, {
        detail: {
          id: crypto.randomUUID(),
          message,
          type,
          timestamp: Date.now(),
        },
      }),
    );
  }

  const logPrefix = `[Notify:${type}]`;
  switch (type) {
    case 'error':
      console.error(logPrefix, message);
      break;
    case 'warning':
      console.warn(logPrefix, message);
      break;
    default:
      console.log(logPrefix, message);
      break;
  }
}

export function subscribeToNotifications(
  handler: (detail: { id: string; message: string; type: NotificationType; timestamp: number }) => void,
) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const listener = (event: Event) => {
    const customEvent = event as CustomEvent;
    handler(customEvent.detail);
  };

  window.addEventListener(EVENT_NAME, listener as EventListener);
  return () => window.removeEventListener(EVENT_NAME, listener as EventListener);
}

