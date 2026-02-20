self.addEventListener('push', (event) => {
  let data = {
    title: 'Ramadan Quest',
    body: 'You have a new nudge 🌙',
    url: '/dashboard',
    tag: 'default',
    requireInteraction: false,
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = {
        ...data,
        ...parsed,
      };
    } catch (error) {
      console.error('Error parsing push data:', error);
    }
  }

  const options = {
    body: data.body,
    icon: '/ico.png',
    badge: '/ico.png',
    tag: data.tag || 'default',
    requireInteraction: data.requireInteraction || false,
    actions: [
      {
        action: 'open',
        title: '💫 Open',
      },
      {
        action: 'close',
        title: '✕',
      },
    ],
    data: {
      url: data.url || '/dashboard',
    },
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener('notificationclick', (event) => {
  const targetUrl = event.notification?.data?.url || '/dashboard';
  
  if (event.action === 'close') {
    event.notification.close();
    return;
  }

  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === '/' || client.url.includes(targetUrl)) {
          if ('focus' in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
      return Promise.resolve();
    })
  );
});
