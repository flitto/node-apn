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

        expect(fakes.Client).toHaveBeenCalledWith(options)
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
            expect(fakes.client.write).toHaveBeenCalled()
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
      let provider
      const resolutions = [
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

      beforeEach(() => {
        provider = new Provider({ address: 'testapi' })
        // mockResolvedValueOnce 로 호출 순서대로 서로 다른 결과를 큐잉한다.
        // (mockResolvedValue 를 루프로 호출하면 매번 전체가 덮어써져 모든 write 가 마지막 값으로 resolve 된다)
        resolutions.forEach((res) => fakes.client.write.mockResolvedValueOnce(res))
      })

      test('classifies each device into sent or failed preserving order', () => {
        return provider
          .send(
            notificationDouble(),
            resolutions.map((res) => res.device),
          )
          .then((response) => {
            expect(response.sent).toEqual([{ device: 'abcd1234' }, { device: 'bcfe4433' }])
            expect(response.failed).toEqual([
              { device: 'adfe5969', status: '400', response: { reason: 'MissingTopic' } },
              {
                device: 'abcd1335',
                status: '410',
                response: { reason: 'BadDeviceToken', timestamp: 123456789 },
              },
              { device: 'aabbc788', status: '413', response: { reason: 'PayloadTooLarge' } },
              { device: 'fbcde238', error: expect.any(Error) },
            ])
          })
      })
    })

    describe('when client.write rejects', () => {
      test('routes the rejected device into the failed array', () => {
        const provider = new Provider({ address: 'testapi' })
        fakes.client.write.mockRejectedValueOnce(new Error('connection blew up'))

        return provider.send(notificationDouble(), 'deadbeef').then((response) => {
          expect(response.sent).toEqual([])
          expect(response.failed).toHaveLength(1)
          expect(response.failed[0].device).toBe('deadbeef')
        })
      })
    })
  })

  describe('shutdown', () => {
    test('invokes shutdown on the client', () => {
      const provider = new Provider({})
      provider.shutdown()
      expect(fakes.client.shutdown).toHaveBeenCalled()
    })
  })
})
