// sw.js - Service Worker для push-уведомлений с VAPID
const CACHE_NAME = '6vmeste-v1';
const VAPID_PUBLIC_KEY = 'BNWb691e0dUue6Buo91VVM5Y578DgqgQ_wkKGBf_qhNDGrzG3iT2VmMJy8TPT-RxqODyjiWA3YZzukAtmoQbdvM';

// Установка service worker
// В sw.js, в секции install, замените на:
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      // Кэшируем только существующие файлы
      return cache.addAll([
        '/',
        '/index.html',
        '/register.html',
        '/dashboard.html',
        '/style.css',
        '/supabase-config.js'
        // Убираем иконки, если их ещё нет
      ]).catch(error => {
        console.log('Кэширование пропущено:', error);
      });
    })
  );
});

// Активация
self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches.keys().then((keys) => {
        return Promise.all(
          keys.filter(key => key !== CACHE_NAME)
            .map(key => caches.delete(key))
        );
      })
    ])
  );
});

// Обработка push-уведомлений
self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    console.log('Получено push-уведомление:', data);
    
    const options = {
      body: data.body || 'Новое уведомление',
      icon: data.icon || '/icon-192.png',
      badge: '/badge-72.png',
      vibrate: [200, 100, 200, 100, 200],
      data: {
        url: data.url || '/',
        timestamp: Date.now(),
        ...data.data
      },
      actions: [
        {
          action: 'open',
          title: '🔓 Открыть чат'
        },
        {
          action: 'close',
          title: '🔒 Закрыть'
        }
      ],
      tag: data.tag || 'default',
      renotify: true,
      requireInteraction: true,
      silent: false,
      timestamp: Date.now()
    };

    // Кастомизация под тип уведомления
    if (data.type === 'message') {
      options.title = `💬 ${data.sender || 'Новое сообщение'}`;
      options.icon = '/icon-message.png';
      options.actions = [
        {
          action: 'reply',
          title: '✍️ Ответить'
        },
        {
          action: 'open',
          title: '👁️ Прочитать'
        },
        {
          action: 'close',
          title: '❌'
        }
      ];
    } else if (data.type === 'application') {
      options.title = '👥 Новая заявка';
      options.icon = '/icon-user.png';
      options.actions = [
        {
          action: 'approve',
          title: '✅ Одобрить'
        },
        {
          action: 'open',
          title: '👁️ Посмотреть'
        },
        {
          action: 'close',
          title: '❌'
        }
      ];
    }

    event.waitUntil(
      self.registration.showNotification(
        data.title || '6Вместе', 
        options
      )
    );
    
  } catch (error) {
    console.error('Ошибка обработки уведомления:', error);
  }
});

// Обработка кликов по уведомлениям
self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};

  notification.close();

  // Обработка разных действий
  if (action === 'close') return;

  if (action === 'reply') {
    // Открываем чат с конкретным пользователем
    if (data.senderId) {
      event.waitUntil(
        clients.openWindow(`/dashboard.html?tab=pm&user=${data.senderId}`)
      );
      return;
    }
  }

  if (action === 'approve') {
    // Открываем страницу с заявками
    event.waitUntil(
      clients.openWindow('/dashboard.html?tab=users')
    );
    return;
  }

  // По умолчанию открываем главную
  const urlToOpen = data.url || '/dashboard.html';

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes('dashboard.html') && 'focus' in client) {
          return client.focus();
        }
      }
      return clients.openWindow(urlToOpen);
    })
  );
});

// Обработка закрытия уведомления
self.addEventListener('notificationclose', (event) => {
  console.log('Уведомление закрыто:', event.notification);
});

// Фоновая синхронизация
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-messages') {
    event.waitUntil(syncMessages());
  }
});

async function syncMessages() {
  try {
    const cache = await caches.open('offline-messages');
    const requests = await cache.keys();
    // Здесь логика отправки офлайн-сообщений
  } catch (error) {
    console.error('Ошибка синхронизации:', error);
  }
}

// Обработка fetch запросов (кеширование)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then((response) => {
      return response || fetch(event.request).then((fetchResponse) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, fetchResponse.clone());
          return fetchResponse;
        });
      });
    }).catch(() => {
      return caches.match('/offline.html');
    })
  );

});
