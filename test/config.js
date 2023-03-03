'use strict'

const sinon = require('sinon')

describe('config', () => {
  let config, fakes

  beforeEach(() => {
    fakes = {
      logger: sinon.spy(),
      prepareCertificate: sinon.stub(),
      prepareToken: sinon.stub(),
      prepareCA: sinon.stub(),
    }

    config = require('../lib/config')(fakes)
  })

  it('supplies sensible defaults', () => {
    expect(config()).to.deep.equal({
      token: null,
      cert: 'cert.pem',
      key: 'key.pem',
      ca: null,
      pfx: null,
      passphrase: null,
      production: false,
      address: 'api.sandbox.push.apple.com',
      port: 443,
      proxy: null,
      rejectUnauthorized: true,
      connectionRetryLimit: 10,
      heartBeat: 60000,
    })
  })

  describe('address configuration', () => {
    let originalEnv

    before(() => {
      originalEnv = process.env.NODE_ENV
    })

    after(() => {
      process.env.NODE_ENV = originalEnv
    })

    beforeEach(() => {
      process.env.NODE_ENV = ''
    })

    it('should use api.sandbox.push.apple.com as the default connection address', () => {
      expect(config()).to.have.property('address', 'api.sandbox.push.apple.com')
    })

    it('should use api.push.apple.com when NODE_ENV=production', () => {
      process.env.NODE_ENV = 'production'
      expect(config()).to.have.property('address', 'api.push.apple.com')
    })

    it('should give precedence to production flag over NODE_ENV=production', () => {
      process.env.NODE_ENV = 'production'
      expect(config({ production: false, sandbox: true })).to.have.property('address', 'api.sandbox.push.apple.com')
    })

    it('should use api.push.apple.com when production: true', () => {
      expect(config({ production: true, sandbox: false })).to.have.property('address', 'api.push.apple.com')
    })

    it('should use a custom address when passed', () => {
      expect(config({ address: 'testaddress' })).to.have.property('address', 'testaddress')
    })

    describe('address is passed', () => {
      it('sets production to true when using production address', () => {
        expect(config({ address: 'api.push.apple.com' })).to.have.property('production', true)
      })

      it('sets production to false when using sandbox address', () => {
        process.env.NODE_ENV = 'production'
        expect(config({ address: 'api.sandbox.push.apple.com' })).to.have.property('production', false)
      })
    })
  })

  describe('credentials', () => {

    context('`token` not supplied, use certificate', () => {
      describe('passphrase', () => {
        it('throws an error when supplied passphrase is not a string', () => {
          expect(() => config({ passphrase: 123 }) ).to.throw('Passphrase must be a string')
        })

        it('does not throw when passphrase is a string', () => {
          expect(() => config({ passphrase: 'seekrit' }) ).to.not.throw()
        })

        it('does not throw when passphrase is not supplied', () => {
          expect(() => config({ }) ).to.not.throw()
        })
      })

      context('pfx value is supplied without cert and key', () => {
        it('includes the value of `pfx`', () => {
          expect(config( { pfx: 'apn.pfx' } )).to.have.property('pfx', 'apn.pfx')
        })

        it('does not include a value for `cert`', () => {
          expect(config( { pfx: 'apn.pfx' }).cert).to.be.undefined
        })

        it('does not include a value for `key`', () => {
          expect(config( { pfx: 'apn.pfx' }).key).to.be.undefined
        })
      })

      context('pfx value is supplied along with a cert and key', () => {
        it('includes the value of `pfx`', () => {
          expect(config( { pfx: 'apn.pfx', cert: 'cert.pem', key: 'key.pem' } )).to.have.property('pfx', 'apn.pfx')
        })

        it('does not include a value for `cert`', () => {
          expect(config( { pfx: 'apn.pfx', cert: 'cert.pem', key: 'key.pem' })).to.have.property('cert', 'cert.pem')
        })

        it('does not include a value for `key`', () => {
          expect(config( { pfx: 'apn.pfx', cert: 'cert.pem', key: 'key.pem' })).to.have.property('key', 'key.pem')
        })
      })

      context('pfxData value is supplied without cert and key', () => {
        it('includes the value of `pfxData`', () => {
          expect(config( { pfxData: 'apnData' } )).to.have.property('pfxData', 'apnData')
        })

        it('does not include a value for `cert`', () => {
          expect(config( { pfxData: 'apnData' } ).cert).to.be.undefined
        })

        it('does not include a value for `key`', () => {
          expect(config( { pfxData: 'apnData' }).key).to.be.undefined
        })
      })

      context('pfxData value is supplied along with a cert and key', () => {
        it('includes the value of `pfxData`', () => {
          expect(config( { pfxData: 'apnData', cert: 'cert.pem', key: 'key.pem' } )).to.have.property('pfxData', 'apnData')
        })

        it('does not include a value for `cert`', () => {
          expect(config( { pfxData: 'apnData', cert: 'cert.pem', key: 'key.pem' })).to.have.property('cert', 'cert.pem')
        })

        it('does not include a value for `key`', () => {
          expect(config( { pfxData: 'apnData', cert: 'cert.pem', key: 'key.pem' })).to.have.property('key', 'key.pem')
        })
      })

      it('loads and validates the TLS credentials', () => {
        fakes.prepareCertificate.returns({'cert': 'certData', 'key': 'keyData', 'pfx': 'pfxData'})

        const configuration = config({})
        expect(configuration).to.have.property('cert', 'certData')
        expect(configuration).to.have.property('key', 'keyData')
        expect(configuration).to.have.property('pfx', 'pfxData')
      })

      it('prepares the CA certificates', () => {
        fakes.prepareCA.returns({ ca: 'certificate1' })

        const configuration = config({})
        expect(configuration).to.have.property('ca', 'certificate1')
      })
    })

    context('`token` supplied', () => {
      const key = 'testKey'
      const keyId = 'abckeyId'
      const teamId = 'teamId123'

      // Clear these to ensure tls.Socket doesn't attempt to do client-auth
      it('clears the `pfx` property', () => {
        expect(config( { token: { key, keyId, teamId } })).to.not.have.property('pfx')
      })

      it('clears the `key` property', () => {
        expect(config( { token: { key, keyId, teamId } })).to.not.have.property('key')
      })

      it('clears the `cert` property', () => {
        expect(config( { token: { key, keyId, teamId } })).to.not.have.property('cert')
      })

      describe('token', () => {

        it('throws an error if keyId is missing', () => {
          expect(() => config({ token: { key, teamId } })).to.throw(/token\.keyId is missing/)
        })

        it('throws an error if keyId is not a string', () => {
          expect(() => config({ token: { key, teamId, keyId: 123 }})).to.throw(/token\.keyId must be a string/)
        })

        it('throws an error if teamId is missing', () => {
          expect(() => config({ token: { key, keyId }})).to.throw(/token\.teamId is missing/)
        })

        it('throws an error if teamId is not a string', () => {
          expect(() => config({ token: { key, keyId, teamId: 123 }})).to.throw(/token\.teamId must be a string/)
        })
      })

      it('does not invoke prepareCertificate', () => {
        let configuration = config({ token: { key, keyId, teamId } })

        expect(fakes.prepareCertificate).to.have.not.been.called
      })

      it('prepares a token generator', () => {
        let testConfig = { key, keyId, teamId }

        fakes.prepareToken
          .withArgs(sinon.match(testConfig))
          .returns( () => 'fake-token' )

        let configuration = config({ token: testConfig })
        expect(fakes.prepareToken).to.have.been.called
        expect(configuration.token()).to.equal('fake-token')
      })

      it('prepares the CA certificates', () => {
        fakes.prepareCA.returns({ ca: 'certificate1' })

        let configuration = config({})
        expect(configuration).to.have.property('ca', 'certificate1')
      })
    })
  })

  context('a null config value is passed', () => {
    it('should log a message with `debug`', () => {
      config( { address: null } )

      expect(fakes.logger).to.be.calledWith('Option [address] is null. This may cause unexpected behaviour.')
    })
  })

  context('a config value is undefined', () => {
    it('should log a message with `debug`', () => {
      config( { anOption: undefined } )

      expect(fakes.logger).to.be.calledWith('Option [anOption] is undefined. This may cause unexpected behaviour.')
    })
  })
})
