<h1>node-apn &middot; 
<img src="https://www.flitto.com/fcp/src/js/app/assets/images/portal/flitto_logo.svg" alt="Flitto" width=80>
</h1>

<a href="https://badge.fury.io/js/@flitto%2node-apn"><img src="https://badge.fury.io/js/@flitto%2node-apn.svg" alt="npm version" 
height="18"></a>

> A Node.js module for interfacing with the Apple Push Notification service.
> [(Apple APNs Overview)](https://developer.apple.com/documentation/usernotifications/setting_up_a_remote_notification_server/sending_notification_requests_to_apns)



<details>
  <summary>Table of Contents</summary>
  <ol>
    <li><a href="#installation">Installation</a></li>
    <li><a href="#usage">Usage</a></li>
  </ol>
</details>


## Installation

## 1. Installation

[npm][] is the preferred installation method:

```bash
$ npm install @flitto/node-apn --save
```

<hr />

## 2. Usage

This readme is a brief introduction, please refer to the full [documentation](doc/apn.markdown) in `doc/` for more details.

If you have previously used v1.x and wish to learn more about what's changed in v2.0, please see [What's New](doc/whats-new.markdown)


### 2-1. Load in the module (ts, js)

#### Typescript
```typescript
import apn from '@flitto/node-apn'
```

#### Javascript

```javascript
const apn = require('@flitto/node-apn')
```

<hr />

### 2-2. Connecting

Create a new connection to the Apple Push Notification provider API, passing a dictionary of options to the constructor. You must supply your tokenSpec credentials in the options.

#### Single client

##### Config
```typescript
const options = {
  token: {
    key: 'path/to/APNsAuthKey_XXXXXXXXXX.p8',
    keyId: 'key-id',
    teamId: 'developer-team-id',
  },
  // production: deploy, sandbox: xcode build test
  production: true,
  sandbox: false,
}
```

##### Typescript

```typescript
import { type Provider } from '@flitto/node-apn'

new Provider(options)
```

```typescript
// nest.js - module.ts
import { type Provider } from '@flitto/node-apn'

providers: [
  ...
  {
    provide: 'APNs',
    useValue: new Provider(options),
  },
  ...
```

##### Javascript
```javascript
// single client

const apnProvider = new apn.Provider(options)
```

<hr />

#### Multiple client

##### Config
```typescript
const options1 = {
  token: {
    key: 'path/to/APNsAuthKey_XXXXXXXXXX.p8',
    keyId: 'key-id',
    teamId: 'developer-team-id',
  },
  production: true,
  sandbox: false,
  clientCount: 0
}
const options2 = {
  token: {
    key: 'path/to/APNsAuthKey_XXXXXXXXXX.p8',
    keyId: 'key-id',
    teamId: 'developer-team-id',
  },
  production: true,
  sandbox: false,
  clientCount: 1
}
```

##### Typescript

```typescript
import { type MultiProvider } from '@flitto/node-apn'

new MultiProvider(options)
```

```typescript
// nest.js - module.ts
import { type MultiProvider } from '@flitto/node-apn'

providers: [
  ...
  {
    provide: 'APNs1',
    useValue: new MultiProvider(options1),
  },
  {
	provide: 'APNs2',
	useValue: new MultiProvider(options2),
  },
  ...
```

##### Javascript

```javascript
const apnProvider1 = new apn.MultiProvider(options1)
const apnProvider2 = new apn.MultiProvider(options2)
```

By default, the provider will connect to the sandbox unless the environment variable `NODE_ENV=production` is set.

For more information about configuration options consult the [provider documentation](doc/provider.markdown).

Help with preparing the key and certificate files for connection can be found in the [wiki][certificateWiki]
<hr />


#### Connecting through an HTTP proxy

If you need to connect through an HTTP proxy, you simply need to provide the `proxy: {host, port}` option when creating the provider. For example:

```javascript
const options = {
  token: {
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
```

The provider will first send an HTTP CONNECT request to the specified proxy in order to establish an HTTP tunnel. Once established, it will create a new secure connection to the Apple Push Notification provider API through the tunnel.
<hr />


### 2-3. Sending a notification

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
  "aps": { 
    "badge": 3, 
    "sound": "ping.aiff", 
    "alert": "\uD83D\uDCE7 \u2709 You have a new message" 
  }
}
```

You should only create one `Provider` per-process for each certificate/key pair you have. You do not need to create a new `Provider` for each notification. If you are only sending notifications to one app then there is no need for more than one `Provider`.

If you are constantly creating `Provider` instances in your app, make sure to call `Provider.shutdown()` when you are done with each provider to release its resources and memory.

<hr />

## Contributing
We welcome contribution from everyone in this project. Read [CONTRIBUTING.md](CONTRIBUTING.md) for detailed 
contribution 
guide.

## 4. License (MIT)
- [node-apn](https://github.com/node-apn/node-apn#license)
