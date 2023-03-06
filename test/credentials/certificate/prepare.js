const sinon = require('sinon')

describe('perpareCertificate', () => {
  let fakes, prepareCertificate

  beforeEach(() => {
    fakes = {
      load: sinon.stub(),
      parse: sinon.stub(),
      validate: sinon.stub(),
      logger: sinon.stub(),
    }

    prepareCertificate = require('../../../lib/credentials/certificate/prepare')(fakes)
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
      fakes.load.withArgs(sinon.match(testOptions)).returns({
        pfx: 'myPfxData',
        cert: 'myCertData',
        key: 'myKeyData',
        ca: ['myCaData'],
        passphrase: 'apntest',
      })

      fakes.parse.returnsArg(0)
      credentials = prepareCertificate(testOptions)
    })

    describe('the validation stage', () => {
      it('is called once', () => {
        expect(fakes.validate).to.be.calledOnce
      })

      it('is passed the production flag', () => {
        expect(fakes.validate.getCall(0).args[0]).to.have.property('production', true)
      })

      describe('passed credentials', () => {
        it('contains the PFX data', () => {
          expect(fakes.validate.getCall(0).args[0]).to.have.property('pfx', 'myPfxData')
        })

        it('contains the key data', () => {
          expect(fakes.validate.getCall(0).args[0]).to.have.property('key', 'myKeyData')
        })

        it('contains the certificate data', () => {
          expect(fakes.validate.getCall(0).args[0]).to.have.property('cert', 'myCertData')
        })

        it('includes passphrase', () => {
          expect(fakes.validate.getCall(0).args[0]).to.have.property('passphrase', 'apntest')
        })
      })
    })

    describe('resolution value', () => {
      it('contains the PFX data', () => {
        return expect(credentials).to.have.property('pfx', 'myPfxData')
      })

      it('contains the key data', () => {
        return expect(credentials).to.have.property('key', 'myKeyData')
      })

      it('contains the certificate data', () => {
        return expect(credentials).to.have.property('cert', 'myCertData')
      })

      it('contains the CA data', () => {
        return expect(credentials).to.have.nested.deep.property('ca[0]', 'myCaData')
      })

      it('includes passphrase', () => {
        return expect(credentials).to.have.property('passphrase', 'apntest')
      })
    })
  })

  describe('credential file cannot be parsed', () => {
    beforeEach(() => {
      fakes.load.returns({ cert: 'myCertData', key: 'myKeyData' })
      fakes.parse.throws(new Error('unable to parse key'))
    })

    it('should resolve with the credentials', () => {
      const credentials = prepareCertificate({
        cert: 'myUnparseableCert.pem',
        key: 'myUnparseableKey.pem',
        production: true,
      })
      return expect(credentials).to.deep.equal({ cert: 'myCertData', key: 'myKeyData' })
    })

    it('should log an error', () => {
      prepareCertificate({ cert: 'myUnparseableCert.pem', key: 'myUnparseableKey.pem' })

      expect(fakes.logger).to.be.calledWith(
        sinon.match(function (err) {
          return err.message ? err.message.match(/unable to parse key/) : false
        }, '"unable to parse key"')
      )
    })

    it('should not attempt to validate', () => {
      prepareCertificate({ cert: 'myUnparseableCert.pem', key: 'myUnparseableKey.pem' })
      expect(fakes.validate).to.not.be.called
    })
  })

  describe('credential validation fails', () => {
    it('should throw', () => {
      fakes.load.returns(Promise.resolve({ cert: 'myCertData', key: 'myMismatchedKeyData' }))
      fakes.parse.returnsArg(0)
      fakes.validate.throws(new Error('certificate and key do not match'))

      return expect(() =>
        prepareCertificate({ cert: 'myCert.pem', key: 'myMistmatchedKey.pem' })
      ).to.throw(/certificate and key do not match/)
    })
  })

  describe('credential file cannot be loaded', () => {
    it('should throw', () => {
      fakes.load.throws(new Error('ENOENT, no such file or directory'))

      return expect(() =>
        prepareCertificate({ cert: 'noSuchFile.pem', key: 'myKey.pem' })
      ).to.throw('ENOENT, no such file or directory')
    })
  })
})
