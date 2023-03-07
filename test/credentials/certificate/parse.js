const sinon = require('sinon')

const APNCertificate = require('../../../lib/credentials/certificate/APNCertificate')
const APNKey = require('../../../lib/credentials/certificate/APNKey')

describe('parseCredentials', () => {
  let fakes, parseCredentials

  const pfxKey = new APNKey({ n: 1, e: 1 })
  const pfxCert = new APNCertificate({ publicKey: {}, validity: {}, subject: {} })

  const pemKey = new APNKey({ n: 2, e: 1 })
  const pemCert = new APNCertificate({ publicKey: {}, validity: {}, subject: {} })

  beforeEach(() => {
    fakes = {
      parsePkcs12: sinon.stub(),
      parsePemKey: sinon.stub(),
      parsePemCert: sinon.stub(),
    }

    fakes.parsePemKey.withArgs('pemkey').returns(pemKey)

    fakes.parsePemKey.withArgs('pemcert').returns(pemCert)

    parseCredentials = require('../../../lib/credentials/certificate/parse')(fakes)
  })

  describe('with PFX file', () => {
    it('returns the parsed key', () => {
      fakes.parsePkcs12.withArgs('pfxData').returns({ key: pfxKey, certificates: [pfxCert] })

      const parsed = parseCredentials({ pfx: 'pfxData' })
      expect(parsed.key).to.be.an.instanceof(APNKey)
    })

    it('returns the parsed certificates', () => {
      fakes.parsePkcs12.withArgs('pfxData').returns({ key: pfxKey, certificates: [pfxCert] })

      const parsed = parseCredentials({ pfx: 'pfxData' })
      expect(parsed.certificates[0]).to.be.an.instanceof(APNCertificate)
    })

    describe('having passphrase', () => {
      beforeEach(() => {
        fakes.parsePkcs12
          .withArgs('encryptedPfxData', 'apntest')
          .returns({ key: pfxKey, certificates: [pfxCert] })
        fakes.parsePkcs12
          .throws(new Error('unable to read credentials, incorrect passphrase'))
      })

      it('returns the parsed key', () => {
        const parsed = parseCredentials({ pfx: 'encryptedPfxData', passphrase: 'apntest' })
        expect(parsed.key).to.be.an.instanceof(APNKey)
      })

      it('throws when passphrase is incorrect', () => {
        expect(() => {
          parseCredentials({ pfx: 'encryptedPfxData', passphrase: 'incorrectpassphrase' })
        }).to.throw(/incorrect passphrase/)
      })

      it('throws when passphrase is not supplied', () => {
        expect(() => {
          parseCredentials({ pfx: 'encryptedPfxData' })
        }).to.throw(/incorrect passphrase/)
      })
    })
  })

  describe('with PEM key', () => {
    it('returns the parsed key', () => {
      fakes.parsePemKey.withArgs('pemKeyData').returns(pemKey)

      const parsed = parseCredentials({ key: 'pemKeyData' })
      expect(parsed.key).to.be.an.instanceof(APNKey)
    })

    describe('having passphrase', () => {
      beforeEach(() => {
        fakes.parsePemKey.withArgs('encryptedPemKeyData', 'apntest').returns(pemKey)
        fakes.parsePemKey.throws(new Error('unable to load key, incorrect passphrase'))
      })

      it('returns the parsed key', () => {
        const parsed = parseCredentials({ key: 'encryptedPemKeyData', passphrase: 'apntest' })
        expect(parsed.key).to.be.an.instanceof(APNKey)
      })

      it('throws when passphrase is incorrect', () => {
        expect(() => {
          parseCredentials({ key: 'encryptedPemKeyData', passphrase: 'incorrectpassphrase' })
        }).to.throw(/incorrect passphrase/)
      })

      it('throws when passphrase is not supplied', () => {
        expect(() => {
          parseCredentials({ key: 'encryptedPemKeyData' })
        }).to.throw(/incorrect passphrase/)
      })
    })
  })

  describe('with PEM certificate', () => {
    it('returns the parsed certificate', () => {
      fakes.parsePemCert.withArgs('pemCertData').returns([pemCert])

      const parsed = parseCredentials({ cert: 'pemCertData' })
      expect(parsed.certificates[0]).to.be.an.instanceof(APNCertificate)
    })
  })

  describe('both PEM and PFX data is supplied', () => {
    it('it prefers PFX to PEM', () => {
      fakes.parsePkcs12.withArgs('pfxData').returns({ key: pfxKey, certificates: [pfxCert] })
      fakes.parsePemKey.withArgs('pemKeyData').returns(pemKey)
      fakes.parsePemCert.withArgs('pemCertData').returns([pemCert])

      const parsed = parseCredentials({ pfx: 'pfxData', key: 'pemKeyData', cert: 'pemCertData' })
      expect(parsed.key).to.equal(pfxKey)
      expect(parsed.certificates[0]).to.equal(pfxCert)
    })
  })
})
