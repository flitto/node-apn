const { describe, expect, test, beforeEach, jest: j } = require('@jest/globals')

describe('perpareCertificate', () => {
  let fakes, prepareCertificate

  beforeEach(() => {
    fakes = {
      load: j.fn(),
      parse: j.fn(),
      validate: j.fn(),
      logger: j.fn(),
    }

    prepareCertificate = require('./prepare')(fakes)
  })

  describe('with valid credentials', () => {
    let credentials
    const testOptions = {
      pfx: 'myCredentials.pfx',
      cert: 'myCert.pem',
      key: 'myKey.pem',
      ca: 'myCa.pem',
      passphrase: 'apntest',
      production: true,
    }

    beforeEach(() => {
      fakes.load.mockReturnValue({
        pfx: 'myPfxData',
        cert: 'myCertData',
        key: 'myKeyData',
        ca: ['myCaData'],
        passphrase: 'apntest',
      })

      fakes.parse.mockImplementation((arg) => arg)
      credentials = prepareCertificate(testOptions)
    })

    describe('the validation stage', () => {
      test('is called once', () => {
        expect(fakes.validate).toHaveBeenCalledTimes(1)
      })

      test('is passed the production flag', () => {
        expect(fakes.validate.mock.calls[0][0]).toHaveProperty('production', true)
      })

      describe('passed credentials', () => {
        test('contains the PFX data', () => {
          expect(fakes.validate.mock.calls[0][0]).toHaveProperty('pfx', 'myPfxData')
        })

        test('contains the key data', () => {
          expect(fakes.validate.mock.calls[0][0]).toHaveProperty('key', 'myKeyData')
        })

        test('contains the certificate data', () => {
          expect(fakes.validate.mock.calls[0][0]).toHaveProperty('cert', 'myCertData')
        })

        test('includes passphrase', () => {
          expect(fakes.validate.mock.calls[0][0]).toHaveProperty('passphrase', 'apntest')
        })
      })
    })

    describe('resolution value', () => {
      test('contains the PFX data', async () => {
        await expect(credentials).toHaveProperty('pfx', 'myPfxData')
      })

      test('contains the key data', async () => {
        await expect(credentials).toHaveProperty('key', 'myKeyData')
      })

      test('contains the certificate data', async () => {
        await expect(credentials).toHaveProperty('cert', 'myCertData')
      })

      test('contains the CA data', async () => {
        await expect(credentials.ca[0]).toEqual('myCaData')
      })

      test('includes passphrase', async () => {
        await expect(credentials).toHaveProperty('passphrase', 'apntest')
      })
    })
  })

  describe('credential file cannot be parsed', () => {
    beforeEach(() => {
      fakes.load.mockReturnValue({ cert: 'myCertData', key: 'myKeyData' })
      fakes.parse.mockImplementation(() => {
        throw new Error('unable to parse key')
      })
    })

    test('should log an error', () => {
      prepareCertificate({ cert: 'myUnparseableCert.pem', key: 'myUnparseableKey.pem' })

      expect(fakes.logger).toHaveBeenCalledWith(expect.anything())
      expect(fakes.logger.mock.calls[0][0].message).toMatch(/unable to parse key/)
    })

    test('should not attempt to validate', () => {
      prepareCertificate({ cert: 'myUnparseableCert.pem', key: 'myUnparseableKey.pem' })
      expect(fakes.validate).not.toHaveBeenCalled()
    })
  })

  describe('credential validation fails', () => {
    test('should throw', () => {
      fakes.load.mockReturnValue(Promise.resolve({ cert: 'myCertData', key: 'myMismatchedKeyData' }))
      fakes.parse.mockImplementation((arg) => arg)
      fakes.validate.mockImplementation(() => {
        throw new Error('certificate and key do not match')
      })

      expect(() => prepareCertificate({ cert: 'myCert.pem', key: 'myMismatchedKey.pem' })).toThrow(
        /certificate and key do not match/,
      )
    })
  })

  describe('credential file cannot be loaded', () => {
    test('should throw', () => {
      fakes.load.mockImplementation(() => {
        throw new Error('ENOENT, no such file or directory')
      })

      expect(() => prepareCertificate({ cert: 'noSuchFile.pem', key: 'myKey.pem' })).toThrow(
        'ENOENT, no such file or directory',
      )
    })
  })
})
