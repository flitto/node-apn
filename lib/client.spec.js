const net = require('net')
const http2 = require('http2')
const { describe, expect, test, afterEach, beforeEach, jest: j } = require('@jest/globals')
const debug = require('debug')('apn')
const credentials = require('./credentials')({
  logger: debug,
})
const EventEmitter = require('events')
const TEST_PORT = 30939
const LOAD_TEST_BATCH_SIZE = 2000

const config = require('./config')({
  logger: debug,
  prepareCertificate: () => ({}), // credentials.certificate,
  prepareToken: credentials.token,
  prepareCA: credentials.ca,
})
const ClientSpec = require('./client')({
  logger: debug,
  config,
  http2,
})

debug.log = console.log.bind(console)

describe('Client', () => {
  let clientServer
  let client
  const MOCK_BODY = '{"mock-key":"mock-value"}'
  const MOCK_DEVICE_TOKEN = 'abcf0123abcf0123abcf0123abcf0123abcf0123abcf0123abcf0123abcf0123'

  // Create an insecure http2 client for unit testing.
  // (APNS would use https://, not http://)
  // (It's probably possible to allow accepting invalid certificates instead,
  // but that's not the most important point of these tests)
  const createClient = (port, timeout = 500) => {
    const c = new ClientSpec({
      port: TEST_PORT,
      address: '127.0.0.1',
    })
    c._mockOverrideUrl = `http://127.0.0.1:${port}`
    c.config.port = port
    c.config.address = '127.0.0.1'
    c.config.requestTimeout = timeout
    return c
  }
  // Create an insecure server for unit testing.
  const createAndStartMockServer = (port, cb) => {
    clientServer = http2.createServer((req, res) => {
      const buffers = []
      req.on('data', (data) => buffers.push(data))
      req.on('end', () => {
        const requestBody = Buffer.concat(buffers).toString('utf-8')
        cb(req, res, requestBody)
      })
    })
    clientServer.listen(port)
    clientServer.on('error', (err) => {
      expect.fail(`unexpected error ${err}`)
    })
    // Don't block the tests if this server doesn't shut down properly
    clientServer.unref()
    return clientServer
  }
  const createAndStartMockLowLevelServer = (port, cb) => {
    clientServer = http2.createServer()
    clientServer.on('stream', cb)
    clientServer.listen(port)
    clientServer.on('error', (err) => {
      expect.fail(`unexpected error ${err}`)
    })
    // Don't block the tests if this server doesn't shut down properly
    clientServer.unref()
    return clientServer
  }

  afterEach((done) => {
    const closeServer = () => {
      if (clientServer) {
        clientServer.close()
        clientServer = null
      }
      done()
    }
    closeServer()
  })

  test('Treats HTTP 200 responses as successful', async () => {
    let didRequest = false
    let establishedConnections = 0
    let requestsServed = 0
    clientServer = createAndStartMockServer(TEST_PORT, (req, res, requestBody) => {
      expect(req.headers[':authority']).toEqual('127.0.0.1')
      expect(req.headers[':method']).toEqual('POST')
      expect(req.headers[':path']).toEqual(`/3/device/${MOCK_DEVICE_TOKEN}`)
      expect(req.headers[':scheme']).toEqual('https')
      expect(req.headers['apns-someheader']).toEqual('somevalue')

      expect(requestBody).toEqual(MOCK_BODY)
      res.writeHead(200)
      res.end('')
      requestsServed += 1
      didRequest = true
    })
    clientServer.on('connection', () => (establishedConnections += 1))
    await new Promise((resolve) => clientServer.on('listening', resolve))

    client = createClient(TEST_PORT)

    const runSuccessfulRequest = async () => {
      const mockHeaders = { 'apns-someheader': 'somevalue' }
      const mockNotification = {
        headers: mockHeaders,
        body: MOCK_BODY,
      }
      const mockDevice = MOCK_DEVICE_TOKEN
      const result = await client.write(mockNotification, mockDevice)
      expect(result).toEqual({ device: MOCK_DEVICE_TOKEN })
      expect(didRequest).toBeTruthy()
    }
    expect(establishedConnections).toEqual(0) // should not establish a connection until it's needed
    // Validate that when multiple valid requests arrive concurrently,
    // only one HTTP/2 connection gets established
    await Promise.all([
      runSuccessfulRequest(),
      runSuccessfulRequest(),
      runSuccessfulRequest(),
      runSuccessfulRequest(),
      runSuccessfulRequest(),
    ])
    didRequest = false
    await runSuccessfulRequest()
    expect(establishedConnections).toEqual(1) // should establish a connection to the server and reuse it
    expect(requestsServed).toEqual(6)
  })

  // Assert that this doesn't crash when a large batch of requests are requested simultaneously
  test('Treats HTTP 200 responses as successful (load test for a batch of requests)', async () => {
    let establishedConnections = 0
    let requestsServed = 0
    clientServer = createAndStartMockServer(TEST_PORT, (req, res, requestBody) => {
      expect(req.headers[':authority']).toEqual('127.0.0.1')
      expect(req.headers[':method']).toEqual('POST')
      expect(req.headers[':path']).toEqual(`/3/device/${MOCK_DEVICE_TOKEN}`)
      expect(req.headers[':scheme']).toEqual('https')
      expect(req.headers['apns-someheader']).toEqual('somevalue')
      expect(requestBody).toEqual(MOCK_BODY)
      // Set a timeout of 100 to simulate latency to a remote server.
      setTimeout(() => {
        res.writeHead(200)
        res.end('')
        requestsServed += 1
      }, 100)
    })
    clientServer.on('connection', () => (establishedConnections += 1))
    await new Promise((resolve) => clientServer.on('listening', resolve))

    client = createClient(TEST_PORT, 1500)

    const runSuccessfulRequest = async () => {
      const mockHeaders = { 'apns-someheader': 'somevalue' }
      const mockNotification = {
        headers: mockHeaders,
        body: MOCK_BODY,
      }
      const mockDevice = MOCK_DEVICE_TOKEN
      const result = await client.write(mockNotification, mockDevice)
      expect(result).toEqual({ device: MOCK_DEVICE_TOKEN })
    }
    expect(establishedConnections).toEqual(0) // should not establish a connection until it's needed
    // Validate that when multiple valid requests arrive concurrently,
    // only one HTTP/2 connection gets established
    const promises = []
    for (let i = 0; i < LOAD_TEST_BATCH_SIZE; i++) {
      promises.push(runSuccessfulRequest())
    }

    await Promise.all(promises)
    expect(establishedConnections).toEqual(1) // should establish a connection to the server and reuse it
    expect(requestsServed).toEqual(LOAD_TEST_BATCH_SIZE)
  }, 10000)

  // https://developer.apple.com/documentation/usernotifications/setting_up_a_remote_notification_server/handling_notification_responses_from_apns
  test('JSON decodes HTTP 400 responses', async () => {
    let didRequest = false
    let establishedConnections = 0
    clientServer = createAndStartMockServer(TEST_PORT, (req, res, requestBody) => {
      expect(requestBody).toEqual(MOCK_BODY)
      // res.setHeader('X-Foo', 'bar')
      // res.writeHead(200, { 'Content-Type': 'text/plain charset=utf-8' })
      res.writeHead(400)
      res.end('{"reason": "BadDeviceToken"}')
      didRequest = true
    })
    clientServer.on('connection', () => (establishedConnections += 1))
    await new Promise((resolve) => clientServer.on('listening', resolve))

    client = createClient(TEST_PORT)
    const infoMessages = []
    const errorMessages = []
    const mockInfoLogger = (message) => {
      infoMessages.push(message)
    }
    const mockErrorLogger = (message) => {
      errorMessages.push(message)
    }
    mockInfoLogger.enabled = true
    mockErrorLogger.enabled = true
    client.setLogger(mockInfoLogger, mockErrorLogger)

    const runRequestWithBadDeviceToken = async () => {
      const mockHeaders = { 'apns-someheader': 'somevalue' }
      const mockNotification = {
        headers: mockHeaders,
        body: MOCK_BODY,
      }
      const mockDevice = MOCK_DEVICE_TOKEN
      const result = await client.write(mockNotification, mockDevice)
      expect(result).toEqual({
        device: MOCK_DEVICE_TOKEN,
        response: {
          reason: 'BadDeviceToken',
        },
        status: 400,
      })
      expect(didRequest).toBeTruthy()
      didRequest = false
    }
    await runRequestWithBadDeviceToken()
    await runRequestWithBadDeviceToken()
    expect(establishedConnections).toEqual(1) // should establish a connection to the server and reuse it
    expect(infoMessages).toEqual([
      'Session connected',
      'Request ended with status 400 and responseData: {"reason": "BadDeviceToken"}',
      'Request ended with status 400 and responseData: {"reason": "BadDeviceToken"}',
    ])
    expect(errorMessages).toEqual([])
  })

  // node-apn started closing connections in response to a bug report where HTTP 500 responses
  // persisted until a new connection was reopened
  test('Closes connections when HTTP 500 responses are received', async () => {
    let establishedConnections = 0
    let responseDelay = 50
    clientServer = createAndStartMockServer(TEST_PORT, (req, res, requestBody) => {
      // Wait 50ms before sending the responses in parallel
      setTimeout(() => {
        expect(requestBody).toEqual(MOCK_BODY)
        res.writeHead(500)
        res.end('{"reason": "InternalServerError"}')
      }, responseDelay)
    })
    clientServer.on('connection', () => (establishedConnections += 1))
    await new Promise((resolve) => clientServer.on('listening', resolve))

    client = createClient(TEST_PORT)

    const runRequestWithInternalServerError = async () => {
      const mockHeaders = { 'apns-someheader': 'somevalue' }
      const mockNotification = {
        headers: mockHeaders,
        body: MOCK_BODY,
      }
      const mockDevice = MOCK_DEVICE_TOKEN
      const result = await client.write(mockNotification, mockDevice)
      expect(result).toHaveBeenCalled()
      expect(result.device).toEqual(MOCK_DEVICE_TOKEN)
      expect(result.error).toBeInstanceOf(Error)
      expect(result.error.message).toHaveProperty('stream ended unexpectedly')
    }
    await runRequestWithInternalServerError()
    await runRequestWithInternalServerError()
    await runRequestWithInternalServerError()
    expect(establishedConnections).toEqual(3) // should close and establish new connections on http 500
    // Validate that nothing wrong happens when multiple HTTP 500s are received simultaneously.
    // (no segfaults, all promises get resolved, etc.)
    responseDelay = 50
    await Promise.all([
      runRequestWithInternalServerError(),
      runRequestWithInternalServerError(),
      runRequestWithInternalServerError(),
      runRequestWithInternalServerError(),
    ])
    expect(establishedConnections).toEqual(4) // should close and establish new connections on http 500
  })

  test('Handles unexpected invalid JSON responses', async () => {
    let establishedConnections = 0
    const responseDelay = 0
    clientServer = createAndStartMockServer(TEST_PORT, (req, res, requestBody) => {
      // Wait 50ms before sending the responses in parallel
      setTimeout(() => {
        expect(requestBody).toEqual(MOCK_BODY)
        res.writeHead(500)
        res.end('PC LOAD LETTER')
      }, responseDelay)
    })
    clientServer.on('connection', () => (establishedConnections += 1))
    await new Promise((resolve) => clientServer.on('listening', resolve))

    client = createClient(TEST_PORT)

    const runRequestWithInternalServerError = async () => {
      const mockHeaders = { 'apns-someheader': 'somevalue' }
      const mockNotification = {
        headers: mockHeaders,
        body: MOCK_BODY,
      }
      const mockDevice = MOCK_DEVICE_TOKEN
      const result = await client.write(mockNotification, mockDevice)
      // Should not happen, but if it does, the promise should resolve with an error
      expect(result.device).toEqual(MOCK_DEVICE_TOKEN)
      expect(result.error.message).toEqual(
        'Unexpected error processing APNs response: Unexpected token P in JSON at position 0',
      )
    }
    await runRequestWithInternalServerError()
    await runRequestWithInternalServerError()
    expect(establishedConnections).toEqual(1) // Currently reuses the connection.
  })

  test('Handles APNs timeouts', async () => {
    let didGetRequest = false
    let didGetResponse = false
    clientServer = createAndStartMockServer(TEST_PORT, (req, res, requestBody) => {
      didGetRequest = true
      setTimeout(() => {
        res.writeHead(200)
        res.end('')
        didGetResponse = true
      }, 1900)
    })
    client = createClient(TEST_PORT)

    const onListeningPromise = new Promise((resolve) => clientServer.on('listening', resolve))
    await onListeningPromise

    const mockHeaders = { 'apns-someheader': 'somevalue' }
    const mockNotification = {
      headers: mockHeaders,
      body: MOCK_BODY,
    }
    const mockDevice = MOCK_DEVICE_TOKEN
    const performRequestExpectingTimeout = async () => {
      const result = await client.write(mockNotification, mockDevice)
      expect(result).toEqual({
        device: MOCK_DEVICE_TOKEN,
        error: new Error('apn write timeout'),
      })
      expect(didGetRequest).toBeTruthy()
      expect(didGetResponse).toBeFalsy()
    }
    await performRequestExpectingTimeout()
    didGetResponse = false
    didGetRequest = false
    // Should be able to have multiple in flight requests all get notified that the server is shutting down
    await Promise.all([
      performRequestExpectingTimeout(),
      performRequestExpectingTimeout(),
      performRequestExpectingTimeout(),
      performRequestExpectingTimeout(),
    ])
  })

  test('Handles goaway frames', async () => {
    let didGetRequest = false
    let establishedConnections = 0
    clientServer = createAndStartMockLowLevelServer(TEST_PORT, (stream) => {
      const { session } = stream
      const errorCode = 1
      didGetRequest = true
      session.goaway(errorCode)
    })
    clientServer.on('connection', () => (establishedConnections += 1))
    client = createClient(TEST_PORT)

    const onListeningPromise = new Promise((resolve) => clientServer.on('listening', resolve))
    await onListeningPromise

    const mockHeaders = { 'apns-someheader': 'somevalue' }
    const mockNotification = {
      headers: mockHeaders,
      body: MOCK_BODY,
    }
    const mockDevice = MOCK_DEVICE_TOKEN
    const performRequestExpectingGoAway = async () => {
      const result = await client.write(mockNotification, mockDevice)
      expect(result).toEqual({
        device: MOCK_DEVICE_TOKEN,
        error: new Error('stream ended unexpectedly with status null and empty body'),
      })
      expect(didGetRequest).toBeTruthy()
      didGetRequest = false
    }
    await performRequestExpectingGoAway()
    await performRequestExpectingGoAway()
    expect(establishedConnections).toEqual(2)
  })

  test('Handles unexpected protocol errors (no response sent)', async () => {
    let didGetRequest = false
    let establishedConnections = 0
    let responseTimeout = 0
    clientServer = createAndStartMockLowLevelServer(TEST_PORT, (stream) => {
      setTimeout(() => {
        const { session } = stream
        didGetRequest = true
        if (session) {
          session.destroy()
        }
      }, responseTimeout)
    })
    clientServer.on('connection', () => (establishedConnections += 1))
    client = createClient(TEST_PORT)

    const onListeningPromise = new Promise((resolve) => clientServer.on('listening', resolve))
    await onListeningPromise

    const mockHeaders = { 'apns-someheader': 'somevalue' }
    const mockNotification = {
      headers: mockHeaders,
      body: MOCK_BODY,
    }
    const mockDevice = MOCK_DEVICE_TOKEN
    const performRequestExpectingDisconnect = async () => {
      const result = await client.write(mockNotification, mockDevice)
      expect(result).toEqual({
        device: MOCK_DEVICE_TOKEN,
        error: new Error('stream ended unexpectedly with status null and empty body'),
      })
      expect(didGetRequest).toBeTruthy()
    }
    await performRequestExpectingDisconnect()
    didGetRequest = false
    await performRequestExpectingDisconnect()
    didGetRequest = false
    expect(establishedConnections).toEqual(2)
    responseTimeout = 10
    await Promise.all([
      performRequestExpectingDisconnect(),
      performRequestExpectingDisconnect(),
      performRequestExpectingDisconnect(),
      performRequestExpectingDisconnect(),
    ])
    expect(establishedConnections).toEqual(3)
  })

  test('Establishes a connection through a proxy server', async () => {
    let didRequest = false
    let establishedConnections = 0
    let requestsServed = 0
    clientServer = createAndStartMockServer(TEST_PORT, (req, res, requestBody) => {
      expect(req.headers[':authority']).toEqual('127.0.0.1')
      expect(req.headers[':method']).toEqual('POST')
      expect(req.headers[':path']).toEqual(`/3/device/${MOCK_DEVICE_TOKEN}`)
      expect(req.headers[':scheme']).toEqual('https')
      expect(req.headers['apns-someheader']).toEqual('somevalue')
      expect(requestBody).toEqual(MOCK_BODY)
      // res.setHeader('X-Foo', 'bar')
      // res.writeHead(200, { 'Content-Type': 'text/plain charset=utf-8' })
      res.writeHead(200)
      res.end('')
      requestsServed += 1
      didRequest = true
    })
    clientServer.on('connection', () => (establishedConnections += 1))
    await new Promise((resolve) => clientServer.once('listening', resolve))

    // Proxy forwards all connections to TEST_PORT
    const proxy = net.createServer((clientSocket) => {
      clientSocket.once('data', () => {
        const serverSocket = net.createConnection(TEST_PORT, () => {
          clientSocket.write('HTTP/1.1 200 OK\r\n\r\n')
          clientSocket.pipe(serverSocket)
          setTimeout(() => {
            serverSocket.pipe(clientSocket)
          }, 1)
        })
      })
    })
    await new Promise((resolve) => proxy.listen(3128, resolve))

    // ClientSpec configured with a port that the server is not listening on
    client = createClient(TEST_PORT + 1)
    // So without adding a proxy config request will fail with a network error
    client.config.proxy = { host: '127.0.0.1', port: 3128 }
    const runSuccessfulRequest = async () => {
      const mockHeaders = { 'apns-someheader': 'somevalue' }
      const mockNotification = {
        headers: mockHeaders,
        body: MOCK_BODY,
      }
      const mockDevice = MOCK_DEVICE_TOKEN
      const result = await client.write(mockNotification, mockDevice)
      expect(result).toEqual({ device: MOCK_DEVICE_TOKEN })
      expect(didRequest).toBeTruthy()
    }
    expect(establishedConnections).toEqual(0) // should not establish a connection until it's needed
    // Validate that when multiple valid requests arrive concurrently,
    // only one HTTP/2 connection gets established
    await Promise.all([
      runSuccessfulRequest(),
      runSuccessfulRequest(),
      runSuccessfulRequest(),
      runSuccessfulRequest(),
      runSuccessfulRequest(),
    ])
    didRequest = false
    await runSuccessfulRequest()
    expect(establishedConnections).toEqual(1) // should establish a connection to the server and reuse it
    expect(requestsServed).toEqual(6)

    proxy.close()
  })

  let fakes, Client

  beforeEach(() => {
    fakes = {
      config: j.fn(),
      EndpointManager: j.fn(),
      endpointManager: new EventEmitter(),
    }

    fakes.EndpointManager.mockImplementation(() => fakes.endpointManager)
    fakes.endpointManager.shutdown = j.fn()

    Client = require('../lib/client')(fakes)
  })

  describe('constructor', () => {
    test('prepares the configuration with passed options', () => {
      const options = { production: true }
      const client = new Client(options)

      expect(fakes.config).toBeCalledWith(options)
    })

    describe('EndpointManager instance', function () {
      test('is created', () => {
        const client = new Client()

        expect(fakes.EndpointManager).toBeCalled()
      })

      test('is passed the prepared configuration', () => {
        const returnSentinel = { configKey: 'configValue' }
        fakes.config.mockReturnValue(returnSentinel)

        const client = new Client({})
        expect(fakes.EndpointManager).toBeCalledWith(returnSentinel)
      })
    })
  })

  // describe('write', () => {
  //   beforeEach(() => {
  //     fakes.config.mockResolvedValueOnce(0)
  //     fakes.endpointManager.getStream = j.fn()
  //     fakes.EndpointManager.mockImplementation(() => fakes.endpointManager)
  //   })
  //   describe('a stream is available', () => {
  //     let client
  //     describe('transmission succeeds', () => {
  //       beforeEach(() => {
  //         client = new Client({ address: 'testapi' })
  //         fakes.stream = new FakeStream('abcd1234', '200')
  //         fakes.endpointManager.getStream.onCall(0).returns(fakes.stream)
  //       })
  //       test('attempts to acquire one stream', () => {
  //         return client.write(builtNotification(), 'abcd1234').then(() => {
  //           expect(fakes.endpointManager.getStream).to.be.calledOnce
  //         })
  //       })
  //       describe('headers', () => {
  //         test('sends the required HTTP/2 headers', () => {
  //           return client.write(builtNotification(), 'abcd1234').then(() => {
  //             expect(fakes.stream.headers).to.be.calledWithMatch({
  //               ':scheme': 'https',
  //               ':method': 'POST',
  //               ':authority': 'testapi',
  //               ':path': '/3/device/abcd1234',
  //             })
  //           })
  //         })
  //         test('does not include apns headers when not required', () => {
  //           return client.write(builtNotification(), 'abcd1234').then(() => {
  //             ;['apns-id', 'apns-priority', 'apns-expiration', 'apns-topic'].forEach((header) => {
  //               expect(fakes.stream.headers).to.not.be.calledWithMatch(sinon.match.has(header))
  //             })
  //           })
  //         })
  //         test('sends the notification-specific apns headers when specified', () => {
  //           let notification = builtNotification()
  //           notification.headers = {
  //             'apns-id': '123e4567-e89b-12d3-a456-42665544000',
  //             'apns-priority': 5,
  //             'apns-expiration': 123,
  //             'apns-topic': 'io.apn.node',
  //           }
  //           return client.write(notification, 'abcd1234').then(() => {
  //             expect(fakes.stream.headers).to.be.calledWithMatch({
  //               'apns-id': '123e4567-e89b-12d3-a456-42665544000',
  //               'apns-priority': 5,
  //               'apns-expiration': 123,
  //               'apns-topic': 'io.apn.node',
  //             })
  //           })
  //         })
  //         describe('when token authentication is enabled', () => {
  //           beforeEach(() => {
  //             fakes.token = {
  //               generation: 0,
  //               current: 'fake-token',
  //               regenerate: j.fn(),
  //               isExpired: j.fn(),
  //             }
  //             client = new Client({ address: 'testapi', token: fakes.token })
  //             fakes.stream = new FakeStream('abcd1234', '200')
  //             fakes.endpointManager.getStream.onCall(0).returns(fakes.stream)
  //           })
  //           test('sends the bearer token', () => {
  //             let notification = builtNotification()
  //             return client.write(notification, 'abcd1234').then(() => {
  //               expect(fakes.stream.headers).to.be.calledWithMatch({
  //                 authorization: 'bearer fake-token',
  //               })
  //             })
  //           })
  //         })
  //         describe('when token authentication is disabled', () => {
  //           beforeEach(() => {
  //             client = new Client({ address: 'testapi' })
  //             fakes.stream = new FakeStream('abcd1234', '200')
  //             fakes.endpointManager.getStream.onCall(0).returns(fakes.stream)
  //           })
  //           test('does not set an authorization header', () => {
  //             let notification = builtNotification()
  //             return client.write(notification, 'abcd1234').then(() => {
  //               expect(fakes.stream.headers.firstCall.args[0]).to.not.have.property('authorization')
  //             })
  //           })
  //         })
  //       })
  //       test('writes the notification data to the pipe', () => {
  //         const notification = builtNotification()
  //         return client.write(notification, 'abcd1234').then(() => {
  //           expect(fakes.stream._transform).to.be.calledWithMatch((actual) =>
  //             actual.equals(Buffer.from(notification.body)),
  //           )
  //         })
  //       })
  //       test('ends the stream', () => {
  //         sinon.spy(fakes.stream, 'end')
  //         return client.write(builtNotification(), 'abcd1234').then(() => {
  //           expect(fakes.stream.end).to.be.calledOnce
  //         })
  //       })
  //       test('resolves with the device token', () => {
  //         return expect(client.write(builtNotification(), 'abcd1234')).to.become({ device: 'abcd1234' })
  //       })
  //     })
  //     describe('error occurs', () => {
  //       let promise
  //       describe('general case', () => {
  //         beforeEach(() => {
  //           const client = new Client({ address: 'testapi' })
  //           fakes.stream = new FakeStream('abcd1234', '400', { reason: 'BadDeviceToken' })
  //           fakes.endpointManager.getStream.onCall(0).returns(fakes.stream)
  //           promise = client.write(builtNotification(), 'abcd1234')
  //         })
  //         test('resolves with the device token, status code and response', () => {
  //           return expect(promise).to.eventually.deep.equal({
  //             status: '400',
  //             device: 'abcd1234',
  //             response: { reason: 'BadDeviceToken' },
  //           })
  //         })
  //       })
  //       describe('ExpiredProviderToken', () => {
  //         beforeEach(() => {
  //           let tokenGenerator = j.fn().returns('fake-token')
  //           const client = new Client({ address: 'testapi', token: tokenGenerator })
  //         })
  //       })
  //     })
  //     describe('stream ends without completing request', () => {
  //       let promise
  //       beforeEach(() => {
  //         const client = new Client({ address: 'testapi' })
  //         fakes.stream = new stream.Transform({
  //           transform: function (chunk, encoding, callback) {},
  //         })
  //         fakes.stream.headers = j.fn()
  //         fakes.endpointManager.getStream.onCall(0).returns(fakes.stream)
  //         promise = client.write(builtNotification(), 'abcd1234')
  //         fakes.stream.push(null)
  //       })
  //       test('resolves with an object containing the device token', () => {
  //         return expect(promise).to.eventually.have.property('device', 'abcd1234')
  //       })
  //       test('resolves with an object containing an error', () => {
  //         return promise.then((response) => {
  //           expect(response).to.have.property('error')
  //           expect(response.error).to.be.an.instanceOf(Error)
  //           expect(response.error).to.match(/stream ended unexpectedly/)
  //         })
  //       })
  //     })
  //     describe('stream is unprocessed', () => {
  //       let promise
  //       beforeEach(() => {
  //         const client = new Client({ address: 'testapi' })
  //         fakes.stream = new stream.Transform({
  //           transform: function (chunk, encoding, callback) {},
  //         })
  //         fakes.stream.headers = j.fn()
  //         fakes.secondStream = FakeStream('abcd1234', '200')
  //         fakes.endpointManager.getStream.onCall(0).returns(fakes.stream)
  //         fakes.endpointManager.getStream.onCall(1).returns(fakes.secondStream)
  //         promise = client.write(builtNotification(), 'abcd1234')
  //         setImmediate(() => {
  //           fakes.stream.emit('unprocessed')
  //         })
  //       })
  //       test('attempts to resend on a new stream', function (done) {
  //         setImmediate(() => {
  //           expect(fakes.endpointManager.getStream).to.be.calledTwice
  //           done()
  //         })
  //       })
  //       test('fulfills the promise', () => {
  //         return expect(promise).to.eventually.deep.equal({ device: 'abcd1234' })
  //       })
  //     })
  //     describe('stream error occurs', () => {
  //       let promise
  //       beforeEach(() => {
  //         const client = new Client({ address: 'testapi' })
  //         fakes.stream = new stream.Transform({
  //           transform: function (chunk, encoding, callback) {},
  //         })
  //         fakes.stream.headers = j.fn()
  //         fakes.endpointManager.getStream.onCall(0).returns(fakes.stream)
  //         promise = client.write(builtNotification(), 'abcd1234')
  //       })
  //       describe('passing an Error', () => {
  //         beforeEach(() => {
  //           fakes.stream.emit('error', new Error('stream error'))
  //         })
  //         test('resolves with an object containing the device token', () => {
  //           return expect(promise).to.eventually.have.property('device', 'abcd1234')
  //         })
  //         test('resolves with an object containing a wrapped error', () => {
  //           return promise.then((response) => {
  //             expect(response.error).to.be.an.instanceOf(Error)
  //             expect(response.error).to.match(/apn write failed/)
  //             expect(response.error.cause())
  //               .to.be.an.instanceOf(Error)
  //               .and.match(/stream error/)
  //           })
  //         })
  //       })
  //       describe('passing a string', () => {
  //         test('resolves with the device token and an error', () => {
  //           fakes.stream.emit('error', 'stream error')
  //           return promise.then((response) => {
  //             expect(response).to.have.property('device', 'abcd1234')
  //             expect(response.error).to.to.be.an.instanceOf(Error)
  //             expect(response.error).to.match(/apn write failed/)
  //             expect(response.error).to.match(/stream error/)
  //           })
  //         })
  //       })
  //     })
  //   })
  //   describe('no new stream is returned but the endpoint later wakes up', () => {
  //     let notification, promise
  //     beforeEach(() => {
  //       const client = new Client({ address: 'testapi' })
  //       fakes.stream = new FakeStream('abcd1234', '200')
  //       fakes.endpointManager.getStream.onCall(0).returns(null)
  //       fakes.endpointManager.getStream.onCall(1).returns(fakes.stream)
  //       notification = builtNotification()
  //       promise = client.write(notification, 'abcd1234')
  //       expect(fakes.stream.headers).to.not.be.called
  //       fakes.endpointManager.emit('wakeup')
  //       return promise
  //     })
  //     test('sends the required headers to the newly available stream', () => {
  //       expect(fakes.stream.headers).to.be.calledWithMatch({
  //         ':scheme': 'https',
  //         ':method': 'POST',
  //         ':authority': 'testapi',
  //         ':path': '/3/device/abcd1234',
  //       })
  //     })
  //     test('writes the notification data to the pipe', () => {
  //       expect(fakes.stream._transform).to.be.calledWithMatch((actual) => actual.equals(Buffer.from(notification.body)))
  //     })
  //   })
  //   describe('when 5 successive notifications are sent', () => {
  //     beforeEach(() => {
  //       fakes.streams = [
  //         new FakeStream('abcd1234', '200'),
  //         new FakeStream('adfe5969', '400', { reason: 'MissingTopic' }),
  //         new FakeStream('abcd1335', '410', { reason: 'BadDeviceToken', timestamp: 123456789 }),
  //         new FakeStream('bcfe4433', '200'),
  //         new FakeStream('aabbc788', '413', { reason: 'PayloadTooLarge' }),
  //       ]
  //     })
  //     describe('streams are always returned', () => {
  //       let promises
  //       beforeEach(() => {
  //         const client = new Client({ address: 'testapi' })
  //         fakes.endpointManager.getStream.onCall(0).returns(fakes.streams[0])
  //         fakes.endpointManager.getStream.onCall(1).returns(fakes.streams[1])
  //         fakes.endpointManager.getStream.onCall(2).returns(fakes.streams[2])
  //         fakes.endpointManager.getStream.onCall(3).returns(fakes.streams[3])
  //         fakes.endpointManager.getStream.onCall(4).returns(fakes.streams[4])
  //         promises = Promise.all([
  //           client.write(builtNotification(), 'abcd1234'),
  //           client.write(builtNotification(), 'adfe5969'),
  //           client.write(builtNotification(), 'abcd1335'),
  //           client.write(builtNotification(), 'bcfe4433'),
  //           client.write(builtNotification(), 'aabbc788'),
  //         ])
  //         return promises
  //       })
  //       test('sends the required headers for each stream', () => {
  //         expect(fakes.streams[0].headers).to.be.calledWithMatch({ ':path': '/3/device/abcd1234' })
  //         expect(fakes.streams[1].headers).to.be.calledWithMatch({ ':path': '/3/device/adfe5969' })
  //         expect(fakes.streams[2].headers).to.be.calledWithMatch({ ':path': '/3/device/abcd1335' })
  //         expect(fakes.streams[3].headers).to.be.calledWithMatch({ ':path': '/3/device/bcfe4433' })
  //         expect(fakes.streams[4].headers).to.be.calledWithMatch({ ':path': '/3/device/aabbc788' })
  //       })
  //       test('writes the notification data for each stream', () => {
  //         fakes.streams.forEach((stream) => {
  //           expect(stream._transform).to.be.calledWithMatch((actual) =>
  //             actual.equals(Buffer.from(builtNotification().body)),
  //           )
  //         })
  //       })
  //       test('resolves with the notification outcomes', () => {
  //         return expect(promises).to.eventually.deep.equal([
  //           { device: 'abcd1234' },
  //           { device: 'adfe5969', status: '400', response: { reason: 'MissingTopic' } },
  //           { device: 'abcd1335', status: '410', response: { reason: 'BadDeviceToken', timestamp: 123456789 } },
  //           { device: 'bcfe4433' },
  //           { device: 'aabbc788', status: '413', response: { reason: 'PayloadTooLarge' } },
  //         ])
  //       })
  //     })
  //     describe('some streams return, others wake up later', () => {
  //       let promises
  //       beforeEach(function () {
  //         const client = new Client({ address: 'testapi' })
  //         fakes.endpointManager.getStream.onCall(0).returns(fakes.streams[0])
  //         fakes.endpointManager.getStream.onCall(1).returns(fakes.streams[1])
  //         promises = Promise.all([
  //           client.write(builtNotification(), 'abcd1234'),
  //           client.write(builtNotification(), 'adfe5969'),
  //           client.write(builtNotification(), 'abcd1335'),
  //           client.write(builtNotification(), 'bcfe4433'),
  //           client.write(builtNotification(), 'aabbc788'),
  //         ])
  //         setTimeout(() => {
  //           fakes.endpointManager.getStream.reset()
  //           fakes.endpointManager.getStream.onCall(0).returns(fakes.streams[2])
  //           fakes.endpointManager.getStream.onCall(1).returns(null)
  //           fakes.endpointManager.emit('wakeup')
  //         }, 1)
  //         setTimeout(() => {
  //           fakes.endpointManager.getStream.reset()
  //           fakes.endpointManager.getStream.onCall(0).returns(fakes.streams[3])
  //           fakes.endpointManager.getStream.onCall(1).returns(fakes.streams[4])
  //           fakes.endpointManager.emit('wakeup')
  //         }, 2)
  //         return promises
  //       })
  //       test('sends the correct device ID for each stream', () => {
  //         expect(fakes.streams[0].headers).to.be.calledWithMatch({ ':path': '/3/device/abcd1234' })
  //         expect(fakes.streams[1].headers).to.be.calledWithMatch({ ':path': '/3/device/adfe5969' })
  //         expect(fakes.streams[2].headers).to.be.calledWithMatch({ ':path': '/3/device/abcd1335' })
  //         expect(fakes.streams[3].headers).to.be.calledWithMatch({ ':path': '/3/device/bcfe4433' })
  //         expect(fakes.streams[4].headers).to.be.calledWithMatch({ ':path': '/3/device/aabbc788' })
  //       })
  //       test('writes the notification data for each stream', () => {
  //         fakes.streams.forEach((stream) => {
  //           expect(stream._transform).to.be.calledWithMatch((actual) =>
  //             actual.equals(Buffer.from(builtNotification().body)),
  //           )
  //         })
  //       })
  //       test('resolves with the notification reponses', () => {
  //         return expect(promises).to.eventually.deep.equal([
  //           { device: 'abcd1234' },
  //           { device: 'adfe5969', status: '400', response: { reason: 'MissingTopic' } },
  //           { device: 'abcd1335', status: '410', response: { reason: 'BadDeviceToken', timestamp: 123456789 } },
  //           { device: 'bcfe4433' },
  //           { device: 'aabbc788', status: '413', response: { reason: 'PayloadTooLarge' } },
  //         ])
  //       })
  //     })
  //     describe('connection fails', () => {
  //       let promises, client
  //       beforeEach(function () {
  //         client = new Client({ address: 'testapi' })
  //         fakes.endpointManager.getStream.onCall(0).returns(fakes.streams[0])
  //         promises = Promise.all([
  //           client.write(builtNotification(), 'abcd1234'),
  //           client.write(builtNotification(), 'adfe5969'),
  //           client.write(builtNotification(), 'abcd1335'),
  //         ])
  //         setTimeout(() => {
  //           fakes.endpointManager.getStream.reset()
  //           fakes.endpointManager.emit('error', new Error('endpoint failed'))
  //         }, 1)
  //         return promises
  //       })
  //       test('resolves with 1 success', () => {
  //         return promises.then((response) => {
  //           expect(response[0]).toEqual({ device: 'abcd1234' })
  //         })
  //       })
  //       test('resolves with 2 errors', () => {
  //         return promises.then((response) => {
  //           expect(response[1]).toEqual({ device: 'adfe5969', error: new Error('endpoint failed') })
  //           expect(response[2]).toEqual({ device: 'abcd1335', error: new Error('endpoint failed') })
  //         })
  //       })
  //       test('clears the queue', () => {
  //         return promises.then(() => {
  //           expect(client.queue.length).to.equal(0)
  //         })
  //       })
  //     })
  //   })
  //   describe('token generator behaviour', () => {
  //     beforeEach(() => {
  //       fakes.token = {
  //         generation: 0,
  //         current: 'fake-token',
  //         regenerate: j.fn(),
  //         isExpired: j.fn(),
  //       }
  //       fakes.streams = [
  //         new FakeStream('abcd1234', '200'),
  //         new FakeStream('adfe5969', '400', { reason: 'MissingTopic' }),
  //         new FakeStream('abcd1335', '410', { reason: 'BadDeviceToken', timestamp: 123456789 }),
  //       ]
  //     })
  //     test('reuses the token', () => {
  //       const client = new Client({ address: 'testapi', token: fakes.token })
  //       fakes.token.regenerate = () => {
  //         fakes.token.generation = 1
  //         fakes.token.current = 'second-token'
  //       }
  //       fakes.endpointManager.getStream.onCall(0).returns(fakes.streams[0])
  //       fakes.endpointManager.getStream.onCall(1).returns(fakes.streams[1])
  //       fakes.endpointManager.getStream.onCall(2).returns(fakes.streams[2])
  //       return Promise.all([
  //         client.write(builtNotification(), 'abcd1234'),
  //         client.write(builtNotification(), 'adfe5969'),
  //         client.write(builtNotification(), 'abcd1335'),
  //       ]).then(() => {
  //         expect(fakes.streams[0].headers).to.be.calledWithMatch({ authorization: 'bearer fake-token' })
  //         expect(fakes.streams[1].headers).to.be.calledWithMatch({ authorization: 'bearer fake-token' })
  //         expect(fakes.streams[2].headers).to.be.calledWithMatch({ authorization: 'bearer fake-token' })
  //       })
  //     })
  //     describe('token expires', () => {
  //       beforeEach(() => {
  //         fakes.token.regenerate = function (generation) {
  //           if (generation === fakes.token.generation) {
  //             fakes.token.generation += 1
  //             fakes.token.current = 'token-' + fakes.token.generation
  //           }
  //         }
  //       })
  //       test('resends the notification with a new token', () => {
  //         fakes.streams = [
  //           new FakeStream('adfe5969', '403', { reason: 'ExpiredProviderToken' }),
  //           new FakeStream('adfe5969', '200'),
  //         ]
  //         fakes.endpointManager.getStream.onCall(0).returns(fakes.streams[0])
  //         const client = new Client({ address: 'testapi', token: fakes.token })
  //         const promise = client.write(builtNotification(), 'adfe5969')
  //         setTimeout(() => {
  //           fakes.endpointManager.getStream.reset()
  //           fakes.endpointManager.getStream.onCall(0).returns(fakes.streams[1])
  //           fakes.endpointManager.emit('wakeup')
  //         }, 1)
  //         return promise.then(() => {
  //           expect(fakes.streams[0].headers).to.be.calledWithMatch({ authorization: 'bearer fake-token' })
  //           expect(fakes.streams[1].headers).to.be.calledWithMatch({ authorization: 'bearer token-1' })
  //         })
  //       })
  //       test('only regenerates the token once per-expiry', () => {
  //         fakes.streams = [
  //           new FakeStream('abcd1234', '200'),
  //           new FakeStream('adfe5969', '403', { reason: 'ExpiredProviderToken' }),
  //           new FakeStream('abcd1335', '403', { reason: 'ExpiredProviderToken' }),
  //           new FakeStream('adfe5969', '400', { reason: 'MissingTopic' }),
  //           new FakeStream('abcd1335', '410', { reason: 'BadDeviceToken', timestamp: 123456789 }),
  //         ]
  //         fakes.endpointManager.getStream.onCall(0).returns(fakes.streams[0])
  //         fakes.endpointManager.getStream.onCall(1).returns(fakes.streams[1])
  //         fakes.endpointManager.getStream.onCall(2).returns(fakes.streams[2])
  //         const client = new Client({ address: 'testapi', token: fakes.token })
  //         const promises = Promise.all([
  //           client.write(builtNotification(), 'abcd1234'),
  //           client.write(builtNotification(), 'adfe5969'),
  //           client.write(builtNotification(), 'abcd1335'),
  //         ])
  //         setTimeout(() => {
  //           fakes.endpointManager.getStream.reset()
  //           fakes.endpointManager.getStream.onCall(0).returns(fakes.streams[3])
  //           fakes.endpointManager.getStream.onCall(1).returns(fakes.streams[4])
  //           fakes.endpointManager.emit('wakeup')
  //         }, 1)
  //         return promises.then(() => {
  //           expect(fakes.streams[0].headers).to.be.calledWithMatch({ authorization: 'bearer fake-token' })
  //           expect(fakes.streams[1].headers).to.be.calledWithMatch({ authorization: 'bearer fake-token' })
  //           expect(fakes.streams[2].headers).to.be.calledWithMatch({ authorization: 'bearer fake-token' })
  //           expect(fakes.streams[3].headers).to.be.calledWithMatch({ authorization: 'bearer token-1' })
  //           expect(fakes.streams[4].headers).to.be.calledWithMatch({ authorization: 'bearer token-1' })
  //         })
  //       })
  //       test('abandons sending after 3 ExpiredProviderToken failures', () => {
  //         fakes.streams = [
  //           new FakeStream('adfe5969', '403', { reason: 'ExpiredProviderToken' }),
  //           new FakeStream('adfe5969', '403', { reason: 'ExpiredProviderToken' }),
  //           new FakeStream('adfe5969', '403', { reason: 'ExpiredProviderToken' }),
  //         ]
  //         fakes.endpointManager.getStream.onCall(0).returns(fakes.streams[0])
  //         fakes.endpointManager.getStream.onCall(1).returns(fakes.streams[1])
  //         fakes.endpointManager.getStream.onCall(2).returns(fakes.streams[2])
  //         const client = new Client({ address: 'testapi', token: fakes.token })
  //         return expect(client.write(builtNotification(), 'adfe5969')).to.eventually.have.property('status', '403')
  //       })
  //       test('regenerate token', () => {
  //         fakes.stream = new FakeStream('abcd1234', '200')
  //         fakes.endpointManager.getStream.onCall(0).returns(fakes.stream)
  //         fakes.token.isExpired = function (current, validSeconds) {
  //           return true
  //         }
  //         let client = new Client({
  //           address: 'testapi',
  //           token: fakes.token,
  //         })
  //         return client.write(builtNotification(), 'abcd1234').then(() => {
  //           expect(fakes.token.generation).to.equal(1)
  //         })
  //       })
  //       test('internal server error', () => {
  //         fakes.stream = new FakeStream('abcd1234', '500', { reason: 'InternalServerError' })
  //         fakes.stream.connection = j.fn()
  //         fakes.stream.connection.close = j.fn()
  //         fakes.endpointManager.getStream.onCall(0).returns(fakes.stream)
  //         let client = new Client({
  //           address: 'testapi',
  //           token: fakes.token,
  //         })
  //         return expect(client.write(builtNotification(), 'abcd1234')).to.eventually.have.deep.property(
  //           'error.jse_shortmsg',
  //           'Error 500, stream ended unexpectedly',
  //         )
  //       })
  //     })
  //   })
  // })
  //
  // describe('shutdown', () => {
  //   beforeEach(() => {
  //     fakes.config.mockResolvedValueOnce(0)
  //     fakes.endpointManager.getStream = j.fn()
  //     fakes.EndpointManager.mockImplementation(() => fakes.endpointManager)
  //   })
  //   describe('with no pending notifications', () => {
  //     test('invokes shutdown on endpoint manager', () => {
  //       const client = new Client()
  //       client.shutdown()
  //       expect(fakes.endpointManager.shutdown).toBeCalled()
  //     })
  //   })
  //   describe('with pending notifications', () => {
  //     test('invokes shutdown on endpoint manager after queue drains', () => {
  //       const client = new Client({ address: 'none' })
  //       fakes.streams = [
  //         new FakeStream('abcd1234', '200'),
  //         new FakeStream('adfe5969', '400', { reason: 'MissingTopic' }),
  //         new FakeStream('abcd1335', '410', { reason: 'BadDeviceToken', timestamp: 123456789 }),
  //         new FakeStream('bcfe4433', '200'),
  //         new FakeStream('aabbc788', '413', { reason: 'PayloadTooLarge' }),
  //       ]
  //       fakes.endpointManager.getStream.onCall(0).returns(fakes.streams[0])
  //       fakes.endpointManager.getStream.onCall(1).returns(fakes.streams[1])
  //       let promises = Promise.all([
  //         client.write(builtNotification(), 'abcd1234'),
  //         client.write(builtNotification(), 'adfe5969'),
  //         client.write(builtNotification(), 'abcd1335'),
  //         client.write(builtNotification(), 'bcfe4433'),
  //         client.write(builtNotification(), 'aabbc788'),
  //       ])
  //       client.shutdown()
  //       expect(fakes.endpointManager.shutdown).to.not.be.called
  //       setTimeout(() => {
  //         fakes.endpointManager.getStream.reset()
  //         fakes.endpointManager.getStream.onCall(0).returns(fakes.streams[2])
  //         fakes.endpointManager.getStream.onCall(1).returns(null)
  //         fakes.endpointManager.emit('wakeup')
  //       }, 1)
  //       setTimeout(() => {
  //         fakes.endpointManager.getStream.reset()
  //         fakes.endpointManager.getStream.onCall(0).returns(fakes.streams[3])
  //         fakes.endpointManager.getStream.onCall(1).returns(fakes.streams[4])
  //         fakes.endpointManager.emit('wakeup')
  //       }, 2)
  //       return promises.then(() => {
  //         expect(fakes.endpointManager.shutdown).to.have.been.called
  //       })
  //     })
  //   })
  // })
})