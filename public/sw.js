const TEAM_CLASH_SW_VERSION = 'team-clash-pwa-v1';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload;
  try {
    payload = event.data.json();
  } catch {
    payload = {title: 'Team Clash', body: event.data.text()};
  }

  const title = payload.title || 'Team Clash';
  const url = typeof payload.url === 'string' && payload.url.startsWith('/') ? payload.url : '/';

  event.waitUntil(
    self.registration.showNotification(title, {
      body: payload.body || '',
      icon: '/pwa/team-clash-app-icon.svg',
      badge: '/pwa/team-clash-app-icon.svg',
      tag: payload.tag || TEAM_CLASH_SW_VERSION,
      data: {url},
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({type: 'window', includeUncontrolled: true}).then((clients) => {
      for (const client of clients) {
        if ('focus' in client) {
          client.navigate?.(targetUrl);
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    }),
  );
});
