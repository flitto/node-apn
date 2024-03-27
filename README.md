# Node APN <!-- omit in toc -->

---

> A Node.js module for interfacing with the Apple Push Notification service.
> [(Apple APNs Overview)](https://developer.apple.com/documentation/usernotifications/setting_up_a_remote_notification_server/sending_notification_requests_to_apns)

---

## Features

- Based on HTTP/2 based provider API
- Maintains a connection to the server to maximise notification batching and throughput.
- Automatically resends unsent notifications if an error occurs

## Installation

[npm][] is the preferred installation method:

```bash
$ npm install @flitto/node-apn --save
```

## Quick Start

This readme is a brief introduction, please refer to the full [documentation](doc/apn.markdown) in `doc/` for more details.

If you have previously used v1.x and wish to learn more about what's changed in v2.0, please see [What's New](doc/whats-new.markdown)

### Load in the module

```javascript
const apn = require('@flitto/node-apn')
```

### Connecting

Create a new connection to the Apple Push Notification provider API, passing a dictionary of options to the constructor. You must supply your tokenSpec credentials in the options.

```javascript
const options = {
  tokenSpec: {
    key: 'path/to/APNsAuthKey_XXXXXXXXXX.p8',
    keyId: 'key-id',
    teamId: 'developer-team-id',
  },
  production: false,
}

const apnProvider = new apn.Provider(options)
```

By default, the provider will connect to the sandbox unless the environment variable `NODE_ENV=production` is set.

For more information about configuration options consult the [provider documentation](doc/provider.markdown).

Help with preparing the key and certificate files for connection can be found in the [wiki][certificateWiki]

#### Connecting through an HTTP proxy

If you need to connect through an HTTP proxy, you simply need to provide the `proxy: {host, port}` option when creating the provider. For example:

```javascript
const options = {
  tokenSpec: {
    key: 'path/to/APNsAuthKey_XXXXXXXXXX.p8',
    keyId: 'key-id',
    teamId: 'developer-team-id',
  },
  proxy: {
    host: '192.168.10.92',
    port: 8080,
  },
  production: false,
}

const apnProvider = new apn.Provider(options)
```

The provider will first send an HTTP CONNECT request to the specified proxy in order to establish an HTTP tunnel. Once established, it will create a new secure connection to the Apple Push Notification provider API through the tunnel.

### Sending a notification

To send a notification you will first need a device tokenSpec from your app as a string

```javascript
const deviceToken = 'a9d0ed10e9cfd022a61cb08753f49c5a0b0dfb383697bf9f9d750a1003da19c7'
```

Create a notification object, configuring it with the relevant parameters (See the [notification documentation](doc/notification.markdown) for more details.)

```javascript
const note = new apn.Notification()

note.expiry = Math.floor(Date.now() / 1000) + 3600 // Expires 1 hour from now.
note.badge = 3
note.sound = 'ping.aiff'
note.alert = '\uD83D\uDCE7 \u2709 You have a new message'
note.payload = { messageFrom: 'John Appleseed' }
note.topic = '<your-app-bundle-id>'
```

Send the notification to the API with `send`, which returns a promise.

```javascript
apnProvider.send(note, deviceToken).then((result) => {
  // see documentation for an explanation of result
})
```

This will result in the the following notification payload being sent to the device

```json
{
  "messageFrom": "John Appleseed",
  "aps": { "badge": 3, "sound": "ping.aiff", "alert": "\uD83D\uDCE7 \u2709 You have a new message" }
}
```

You should only create one `Provider` per-process for each certificate/key pair you have. You do not need to create a new `Provider` for each notification. If you are only sending notifications to one app then there is no need for more than one `Provider`.

If you are constantly creating `Provider` instances in your app, make sure to call `Provider.shutdown()` when you are done with each provider to release its resources and memory.
