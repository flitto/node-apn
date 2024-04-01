<h1>node-apn &middot; 
<img src="https://www.flitto.com/fcp/src/js/app/assets/images/portal/flitto_logo.svg" alt="Flitto" width=80>
</h1>

<a href="https://badge.fury.io/js/node-apn-flitto"><img src="https://badge.fury.io/js/node-apn-flitto.svg" alt="npm version" height="18"></a>

> A Node.js module for interfacing with the Apple Push Notification service.
> [(Apple APNs Overview)](https://developer.apple.com/documentation/usernotifications/setting_up_a_remote_notification_server/sending_notification_requests_to_apns)



<details>
  <summary>Table of Contents</summary>
  <ol>
    <li><a href="#installation">Installation</a></li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
  </ol>
</details>


## Installation

## 1. Installation

[npm](https://www.npmjs.com/package/@flitto/node-apn) is the preferred installation method:

```bash
$ npm install node-apn-flitto --save
```

<hr />

## 2. Usage

### 2-1. Load in the module (ts, js)

#### Typescript
```typescript
import apn from 'node-apn-flitto'
```

#### Javascript

```javascript
const apn = require('node-apn-flitto')
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
import { type Provider } from 'node-apn-flitto'

new Provider(options)
```

```typescript
// Nestjs - module.ts
import { type Provider } from 'node-apn-flitto'

@Module({
  ...
  providers: [
    {
      provide: 'APNs',
      useValue: new Provider(options),
    },
  ],
  ...
})
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
    key: 'path/to/APNsAuthKey1_XXXXXXXXXX.p8',
    keyId: 'key-id',
    teamId: 'developer-team-id',
  },
  production: true,
  sandbox: false,
  clientCount: 0
}
const options2 = {
  token: {
    key: 'path/to/APNsAuthKey2_XXXXXXXXXX.p8',
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
import { type MultiProvider } from 'node-apn-flitto'

new MultiProvider(options)
```

```typescript
// Nestjs - module.ts
import { type MultiProvider } from 'node-apn-flitto'

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
<hr />


#### Connecting through an HTTP proxy

If you need to connect through an HTTP proxy, you simply need to provide the `proxy: { host, port }` option when 
creating the provider. For example:

```javascript
const options = {
  token: {
    key: 'path/to/APNsAuthKey_XXXXXXXXXX.p8',
    keyId: 'key-id',
    teamId: 'developer-team-id',
  },
  proxy: {
    host: '192.168.XX.XX',
    port: 8080,
  },
  production: false,
  sandbox: false,
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

#### Javascript & TypeScript

```javascript
const notification = new apn.Notification()
const body = 'flitto notifiaction'
const subtitle = 'bold text title'

notification.expiry = Math.floor(Date.now() / 1000) + 3600 // Expires 1 hour from now.
notification.badge = 3
notification.sound = 'ping.aiff'
notification.alert = { body, subtitle }
notification.payload = { message: body, title: subtitle }
notification.topic = '<your-app-bundle-id>'

// Send the notification to the API with `send`, which returns a promise.
apnProvider.send(notification, deviceToken).then((result) => {
	// see documentation for an explanation of result
})
```

#### Typescript - Nestjs

##### Single
```typescript
import { Provider } from 'node-apn-flitto'

@Injectable()
export class PushService {
  constructor(
    @Inject('APNs') private readonly apns: Provider,
  )
  ...
}
```

##### Multiple
```typescript
import { MultiProvider } from 'node-apn-flitto'

@Injectable()
export class PushService {
  constructor(
    @Inject('APNs') private readonly apns: MultiProvider,
  )
  ...
}
```

You should only create one `Provider` per-process for each certificate/key pair you have. You do not need to create a new `Provider` for each notification. If you are only sending notifications to one app then there is no need for more than one `Provider`.

If you are constantly creating `Provider` instances in your app, make sure to call `Provider.shutdown()` when you are done with each provider to release its resources and memory.


### 2.4 Response

```typescript
{
  sent: [
    {
      device: 'a9d0ed10e9cfd022a61cb08753f49c5a0b0dfb383697bf9f9d750a1003da19c7'
    }
  ],
  failed: [
    {
      device: 'a9d0ed10e9cfd022a61cb08753f49c5a0b0dfb383697bf9f9d750a1003da19c7',
      status: 400,
      response: [
        { reason: 'BadDeviceToken' }
      ]
    }
  ]
}

```

<hr />

## 3. Contributing
We welcome contribution from everyone in this project. Read [CONTRIBUTING.md](CONTRIBUTING.md) for detailed 
contribution 
guide.

## 4. License (MIT)
- [node-apn](https://github.com/node-apn/node-apn#license)
