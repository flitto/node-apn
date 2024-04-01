// Tests of MulticlientSpec, copied from test/client.spec.js with modifications of
// expected connection counts.
const http2 = require('http2')
const { describe, expect, test, afterEach, beforeEach, jest: j } = require('@jest/globals')
const debug = require('debug')('apn')
const TEST_PORT = 30940
const LOAD_TEST_BATCH_SIZE = 2000
const credentials = require('./credentials')({
  logger: debug,
})
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
const MulticlientSpec = require('./multiclient')({
  Client: ClientSpec,
})

describe('MulticlientSpec', () => {
  let clientServer
  let client
  const MOCK_BODY = '{"mock-key":"mock-value"}'
  const MOCK_DEVICE_TOKEN = 'abcf0123abcf0123abcf0123abcf0123abcf0123abcf0123abcf0123abcf0123abcf0123'

  beforeEach(() => {
    j.clearAllMocks()
  })

  const createClient = (port, timeout = 500) => {
    const mc = new MulticlientSpec({
      port: TEST_PORT,
      address: '127.0.0.1',
      clientCount: 2,
    })
    mc.clients.forEach((c) => {
      c._mockOverrideUrl = `http://127.0.0.1:${port}`
      c.config.port = port
      c.config.address = '127.0.0.1'
      c.config.requestTimeout = timeout
    })
    return mc
  }

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
      console.error(`unexpected error ${err}`)
    })
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
  const createAndStartMockLowLevelServer = (port, cb) => {
    clientServer = http2.createServer()
    clientServer.on('stream', cb)
    clientServer.listen(port)
    clientServer.on('error', (err) => {
      console.error(`unexpected error ${err}`)
    })
    // Don't block the tests if this server doesn't shut down properly
    clientServer.unref()
    return clientServer
  }

  beforeEach(() => {
    j.clearAllMocks()
  })

  afterEach((done) => {
    const closeServer = () => {
      if (clientServer) {
        clientServer.close()
        clientServer = null
      }
      done()
    }
    if (client) {
      client.shutdown(closeServer)
      client = null
    } else {
      closeServer()
    }
  })

  test('rejects invalid clientCount', () => {
    [-1, 'invalid'].forEach((clientCount) => {
      expect(
        () =>
          new MulticlientSpec({
            port: TEST_PORT,
            address: '127.0.0.1',
            clientCount,
          }),
      ).toThrow(`Expected positive client count but got ${clientCount}`)
    })
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
    expect(establishedConnections).toEqual(2) // should establish a connection to the server and reuse it
    expect(requestsServed).toEqual(6)
  }, 10000)

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
    expect(establishedConnections).toEqual(2) // should establish a connection to the server and reuse test
    expect(requestsServed).toEqual(LOAD_TEST_BATCH_SIZE)
  }, 10000)

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
    expect(establishedConnections).toEqual(2) // should establish a connection to the server and reuse it
    expect(infoMessages).toEqual([
      'Session connected',
      'Request ended with status 400 and responseData: {"reason": "BadDeviceToken"}',
      'Session connected',
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
      expect(result).not.toBeUndefined()
      expect(result.device).toEqual(MOCK_DEVICE_TOKEN)
      expect(result.error).toBeInstanceOf(Error)
      expect(result.error.message).toMatch('Error 500, stream ended unexpectedly')
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
    expect(establishedConnections).toEqual(5) // should close and establish new connections on http 500
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
      expect(result.error.message).toMatch('Unexpected error processing APNs response')
    }
    await runRequestWithInternalServerError()
    await runRequestWithInternalServerError()
    expect(establishedConnections).toEqual(2) // Currently reuses the connections.
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
      const session = stream.session
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
        error: 'Session closed with error code 1 apn write failed',
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
        const session = stream.session
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
    expect(establishedConnections).toEqual(4)
  }, 10000)
})
