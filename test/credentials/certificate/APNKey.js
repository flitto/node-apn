const APNKey = require('../../../lib/credentials/certificate/APNKey')
const forge = require('node-forge')
const fs = require('fs')

describe('APNKey', () => {
  it('initialises with a node-forge public key', () => {
    expect(new APNKey({ n: 12345, e: 65536 })).to.be.an.instanceof(APNKey)
  })

  describe('throws', () => {
    it('missing modulus', () => {
      expect(() => {
        new APNKey({ e: 65536 })
      }).to.throw('key is not a valid public key')
    })

    it('missing exponent', () => {
      expect(() => {
        new APNKey({ n: 12345 })
      }).to.throw('key is not a valid public key')
    })

    it('undefined', () => {
      expect(() => {
        new APNKey()
      }).to.throw('key is not a valid public key')
    })
  })

  describe('fingerprint', () => {
    it('returns the fingerprint of the public key', () => {
      const keyPem = fs.readFileSync('test/credentials/support/key.pem')
      const apnKey = new APNKey(forge.pki.decryptRsaPrivateKey(keyPem))
      expect(apnKey.fingerprint()).to.equal('2d594c9861227dd22ba5ae37cc9354e9117a804d')
    })
  })
})
