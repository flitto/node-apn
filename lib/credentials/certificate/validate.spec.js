const { describe, expect, test, beforeEach, jest: j } = require('@jest/globals')
const validateCredentials = require('../../../lib/credentials/certificate/validate')

const fakeCredentials = () => {
  return {
    key: {
      _fingerprint: 'fingerprint1',
      fingerprint: j.fn(() => {
        return 'fingerprint1'
      }),
    },
    certificates: [
      {
        _key: {
          _fingerprint: 'fingerprint1',
          fingerprint: j.fn(() => {
            return 'fingerprint1'
          }),
        },
        _validity: {
          notBefore: new Date(Date.now() - 100000),
          notAfter: new Date(Date.now() + 100000),
        },
        key: () => {
          return { fingerprint: j.fn().mockReturnValue('fingerprint1') }
        },
        validity: j.fn().mockReturnValue({
          notBefore: new Date(Date.now() - 100000),
          notAfter: new Date(Date.now() + 100000),
        }),
        environment: j.fn().mockReturnValue({ production: true, sandbox: false }),
      },
    ],
    production: true,
  }
}

describe('validateCredentials', () => {
  let credentials
  beforeEach(() => {
    credentials = fakeCredentials()
  })

  describe('with valid credentials', () => {
    test('returns', () => {
      expect(() => {
        validateCredentials(credentials)
      }).not.toThrow()
    })
  })

  describe('with mismatched key and certificate', () => {
    test('throws', () => {
      credentials.certificates[0]._key.fingerprint.mockReturnValue('fingerprint2')

      try {
        validateCredentials(credentials)
      } catch (e) {
        expect.assertions(1)
        expect(e.message).toMatch('certificate and key do not match')
      }
    })
  })

  describe('with expired certificate', () => {
    test('throws', () => {
      credentials.certificates[0].validity.mockReturnValue({
        notBefore: new Date(Date.now() - 100000),
        notAfter: new Date(Date.now() - 10000),
      })

      try {
        validateCredentials(credentials)
      } catch (e) {
        expect.assertions(1)
        expect(e.message).toMatch('certificate has expired')
      }
    })
  })

  describe('with incorrect environment', () => {
    test('throws with sandbox cert in production', () => {
      credentials.certificates[0].environment.mockReturnValue({
        production: false,
        sandbox: true,
      })

      try {
        validateCredentials(credentials)
      } catch (e) {
        expect.assertions(1)
        expect(e.message).toMatch('certificate does not support configured environment, production: true')
      }
    })

    test('throws with production cert in sandbox', () => {
      credentials.certificates[0].environment.mockReturnValue({
        production: true,
        sandbox: false,
      })
      credentials.production = false
      try {
        validateCredentials(credentials)
      } catch (e) {
        expect.assertions(1)
        expect(e.message).toMatch('certificate does not support configured environment, production: false')
      }
    })
  })

  describe('with missing production flag', () => {
    test('does not throw', () => {
      credentials.certificates[0].environment.mockReturnValue({
        production: true,
        sandbox: false,
      })
      credentials.production = undefined

      expect(() => {
        validateCredentials(credentials)
      }).not.toThrow()
    })
  })

  describe('with certificate supporting both environments', () => {
    test('does not throw', () => {
      credentials.certificates[0].environment.mockReturnValue({
        production: true,
        sandbox: true,
      })
      credentials.production = false

      expect(() => {
        validateCredentials(credentials)
      }).not.toThrow()
    })
  })
})
