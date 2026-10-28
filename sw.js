// SkillShow phone push notifications
self.addEventListener('push', event => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = {
      body: event.data ? event.data.text() : ''
    };
  }

  event.waitUntil(
    self.registration.showNotification(
      data.title || 'SkillShow',
      {
        body: data.body || 'You have a new notification.',
        icon: './skillshow-192.png',
        badge: './skillshow-192.png',
        data: {
          url: data.url || './'
        }
      }
    )
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();

  event.waitUntil((async () => {
    let targetUrl;

    try {
      targetUrl = new URL(
        event.notification.data?.url || './',
        self.location.origin
      );

      if (targetUrl.origin !== self.location.origin) {
        targetUrl = new URL('./', self.location.origin);
      }
    } catch {
      targetUrl = new URL('./', self.location.origin);
    }

    const windows = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    });

    for (const client of windows) {
      if (new URL(client.url).origin === self.location.origin) {
        await client.navigate(targetUrl.href);
        return client.focus();
      }
    }

    return self.clients.openWindow(targetUrl.href);
  })());
});
