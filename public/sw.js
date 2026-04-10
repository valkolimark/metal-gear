// Metal Gear Service Worker — Push Notifications

self.addEventListener('push', function (event) {
  if (!event.data) return

  let data
  try {
    data = event.data.json()
  } catch {
    data = { title: 'Metal Gear', body: event.data.text() }
  }

  const options = {
    body: data.body || '',
    icon: '/icons/icon-192.svg',
    badge: '/icons/icon-192.svg',
    tag: data.tag || 'metal-gear-notification',
    data: data.data || {},
    vibrate: [200, 100, 200],
  }

  event.waitUntil(self.registration.showNotification(data.title || 'Metal Gear', options))
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()

  const data = event.notification.data || {}
  let url = '/'

  if (data.url) {
    url = data.url
  } else if (data.type === 'new_message' || data.type === 'listing_inquiry') {
    url = '/messages'
  } else if (data.type === 'offer_received' || data.type === 'offer_accepted') {
    url = data.listing_id ? '/listings/' + data.listing_id : '/notifications'
  } else if (data.type === 'transaction_update' || data.type === 'transaction_initiated') {
    url = data.transaction_id ? '/transactions/' + data.transaction_id : '/transactions'
  } else if (data.type === 'viewing_response') {
    url = '/schedule'
  } else if (data.type === 'sos_request_match') {
    url = data.sos_id ? '/sos/' + data.sos_id : '/sos'
  } else {
    url = '/notifications'
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i]
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus()
          client.navigate(url)
          return
        }
      }
      return self.clients.openWindow(url)
    })
  )
})
