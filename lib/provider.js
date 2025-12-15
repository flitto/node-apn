const EventEmitter = require('events')

module.exports = function (dependencies) {
  const Client = dependencies.Client

  function Provider(options) {
    if (!(this instanceof Provider)) {
      return new Provider(options)
    }

    this.client = new Client(options)

    EventEmitter.call(this)
  }

  Provider.prototype = Object.create(EventEmitter.prototype)

  Provider.prototype.send = async function send(notification, recipients) {
    const builtNotification = {
      headers: notification.headers(),
      body: notification.compile(),
    }

    if (!Array.isArray(recipients)) {
      recipients = [recipients]
    }

    const results = await Promise.allSettled(
      recipients.map((recipient) => this.client.write(builtNotification, recipient))
    )
    const sent = []
    const failed = []

    results.forEach((result, index) => {
      const device = recipients[index]

      if (result.status === 'fulfilled') {
        const response = result.value ?? {}

        // 기존 분류 로직 유지
        if (response && (response.status || response.error)) {
          failed.push({
            ...response,
            device,
          })
        } else {
          sent.push({
            ...response,
            device,
          })
        }
      } else {
        const err = result.reason ?? {}

        failed.push({
          ...err,
          device,
        })
      }
    })

    return { sent, failed }
  }

  Provider.prototype.shutdown = function shutdown() {
    this.client.shutdown()
  }

  return Provider
}
