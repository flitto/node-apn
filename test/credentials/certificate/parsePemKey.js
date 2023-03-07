const parsePemKey = require('../../../lib/credentials/certificate/parsePemKey')
const APNKey = require('../../../lib/credentials/certificate/APNKey')
const fs = require('fs')

describe('parsePemKey', () => {
  describe('returns APNKey', () => {
    describe('RSA key', () => {
      let key
      beforeEach(() => {
        const keyData = fs.readFileSync('test/credentials/support/key.pem')
        key = parsePemKey(keyData)
      })

      it('correct type', () => {
        expect(key).to.be.an.instanceof(APNKey)
      })

      it('with correct fingerprint', () => {
        expect(key.fingerprint()).to.equal('2d594c9861227dd22ba5ae37cc9354e9117a804d')
      })
    })

    it('openssl-encrypted RSA key, correct password', () => {
      const key = fs.readFileSync('test/credentials/support/keyEncrypted.pem')
      expect(parsePemKey(key, 'apntest')).to.be.an.instanceof(APNKey)
    })

    it('PKCS#8 encrypted key, correct password', () => {
      const key = fs.readFileSync('test/credentials/support/keyPKCS8Encrypted.pem')
      expect(parsePemKey(key, 'apntest')).to.be.an.instanceof(APNKey)
    })

    it('PEM containing certificates and key', () => {
      const certAndKey = fs.readFileSync('test/credentials/support/certKey.pem')
      expect(parsePemKey(certAndKey)).to.be.an.instanceof(APNKey)
    })
  })

  describe('throws with', () => {
    it('PKCS#8 key (unsupported format)', () => {
      const key = fs.readFileSync('test/credentials/support/keyPKCS8.pem')
      expect(() => {
        parsePemKey(key)
      }).to.throw('unable to parse key, unsupported format')
    })

    it('RSA encrypted key, incorrect passphrase', () => {
      const key = fs.readFileSync('test/credentials/support/keyEncrypted.pem')
      expect(() => {
        parsePemKey(key, 'not-the-passphrase')
      }).to.throw('unable to parse key, incorrect passphrase')
    })

    it('PKCS#8 encrypted key, incorrect passphrase', () => {
      const key = fs.readFileSync('test/credentials/support/keyPKCS8Encrypted.pem')
      expect(() => {
        parsePemKey(key, 'not-the-passphrase')
      }).to.throw('unable to parse key, incorrect passphrase')
    })

    it('PEM certificate', () => {
      const cert = fs.readFileSync('test/credentials/support/cert.pem')
      expect(() => {
        parsePemKey(cert)
      }).to.throw('unable to parse key, no private key found')
    })

    it('PKCS#12 file', () => {
      const pkcs12 = fs.readFileSync('test/credentials/support/certIssuerKey.p12')
      expect(() => {
        parsePemKey(pkcs12)
      }).to.throw('unable to parse key, not a valid PEM file')
    })
  })

  describe('multiple keys', () => {
    it('throws', () => {
      const keys = fs.readFileSync('test/credentials/support/multipleKeys.pem')
      expect(() => {
        parsePemKey(keys)
      }).to.throw('multiple keys found in PEM file')
    })
  })

  describe('returns null', () => {
    it('for null', () => {
      expect(parsePemKey()).to.be.null
    })

    it('for undefined', () => {
      expect(parsePemKey()).to.be.null
    })
  })
})
