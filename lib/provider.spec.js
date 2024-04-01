const { describe, expect, beforeEach, test, jest: j } = require('@jest/globals')
const EventEmitter = require('events')

// Define notificationDouble
function notificationDouble() {
  return {
    headers: j.fn().mockReturnThis(),
    payload: { aps: { badge: 1 } },
    compile: function () {
      return JSON.stringify(this.payload)
    },
  }
}

describe('Provider', () => {
  let fakes, Provider

  beforeEach(() => {
    fakes = {
      Client: j.fn(),
      client: new EventEmitter(),
      send: j.fn(),
      shutdown: j.fn(),
    }

    fakes.Client.mockImplementation(() => fakes.client)
    fakes.client.write = j.fn()
    fakes.client.shutdown = j.fn()

    Provider = require('./provider')(fakes)
  })

  describe('constructor', () => {
    describe('called without `new`', () => {
      test('returns a new instance', () => {
        expect(Provider).toBeInstanceOf(Object)
      })
    })

    describe('Client instance', () => {
      test('is created', () => {
        Provider()
        expect(fakes.Client).not.toBeUndefined()
      })

      test('is passed the options', () => {
        const options = { configKey: 'configValue' }
        Provider(options)

        expect(fakes.Client).toBeCalledWith(options)
      })
    })
  })

  describe('send', () => {
    describe('single notification behaviour', () => {
      let provider

      describe('transmission succeeds', () => {
        beforeEach(() => {
          provider = new Provider({ address: 'testapi' })
          fakes.client.write.mockResolvedValue({ device: 'abcd1234' })
        })

        test('invokes the writer with correct `this`', () => {
          return provider.send(notificationDouble(), 'abcd1234').then(() => {
            expect(fakes.client.write).toBeCalled()
          })
        })

        test('does not pass the array index to writer', () => {
          return provider.send(notificationDouble(), 'abcd1234').then(() => {
            expect(fakes.client.write.mock.calls[0][2]).toBeUndefined()
          })
        })

        test('resolves with the device token in the sent array', () => {
          return expect(provider.send(notificationDouble(), 'abcd1234')).resolves.toEqual({
            sent: [{ device: 'abcd1234' }],
            failed: [],
          })
        })
      })

      describe('error occurs', () => {
        let promise

        beforeEach(() => {
          const provider = new Provider({ address: 'testapi' })

          fakes.client.write.mockResolvedValue({
            device: 'abcd1234',
            status: '400',
            response: { reason: 'BadDeviceToken' },
          })

          promise = provider.send(notificationDouble(), 'abcd1234')
        })

        test('resolves with the device token, status code and response in the failed array', () => {
          return expect(promise).resolves.toEqual({
            sent: [],
            failed: [{ device: 'abcd1234', status: '400', response: { reason: 'BadDeviceToken' } }],
          })
        })
      })
    })

    describe('when multiple tokens are passed', () => {
      beforeEach(() => {
        fakes.resolutions = [
          { device: 'abcd1234' },
          { device: 'adfe5969', status: '400', response: { reason: 'MissingTopic' } },
          {
            device: 'abcd1335',
            status: '410',
            response: { reason: 'BadDeviceToken', timestamp: 123456789 },
          },
          { device: 'bcfe4433' },
          { device: 'aabbc788', status: '413', response: { reason: 'PayloadTooLarge' } },
          { device: 'fbcde238', error: new Error('connection failed') },
        ]
      })

      describe('streams are always returned', () => {
        let promise

        beforeEach(() => {
          const provider = new Provider({ address: 'testapi' })

          for (let i = 0; i < fakes.resolutions.length; i++) {
            fakes.client.write.mockResolvedValue(fakes.resolutions[i])
          }

          promise = provider.send(
            notificationDouble(),
            fakes.resolutions.map((res) => res.device),
          )

          return promise
        })

        test('resolves with the device token, status code and response or error of the unsent notifications', () => {
          return promise.then((response) => {
            expect(response.failed[3].error).toBeInstanceOf(Error)
          })
        })
      })
    })
  })

  describe('shutdown', () => {
    test('invokes shutdown on the client', () => {
      const provider = new Provider({})
      provider.shutdown()
      expect(fakes.client.shutdown).toBeCalled()
    })
  })
})
