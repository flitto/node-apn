const APNCertificate = require('../../../lib/credentials/certificate/APNCertificate')
const APNKey = require('../../../lib/credentials/certificate/APNKey')
const forge = require('node-forge')
const fs = require('fs')

describe('APNCertificate', () => {
  let certPem
  before(() => {
    certPem = fs.readFileSync('test/credentials/support/cert.pem')
  })

  let cert
  beforeEach(() => {
    cert = forge.pki.certificateFromPem(certPem.toString())
  })

  describe('accepts a Certificate object', () => {
    it('does not throw', () => {
      expect(() => {
        new APNCertificate(cert)
      }).to.not.throw(Error)
    })
  })

  describe('throws', () => {
    it('missing public key', () => {
      delete cert.publicKey

      expect(() => {
        new APNCertificate(cert)
      }).to.throw('certificate object is invalid')
    })

    it('missing validity', () => {
      delete cert.validity

      expect(() => {
        new APNCertificate(cert)
      }).to.throw('certificate object is invalid')
    })

    it('missing subject', () => {
      delete cert.subject

      expect(() => {
        new APNCertificate(cert)
      }).to.throw('certificate object is invalid')
    })
  })

  describe('key', () => {
    it('returns an APNKey', () => {
      expect(new APNCertificate(cert).key()).to.be.an.instanceof(APNKey)
    })

    it('returns the the certificates public key', () => {
      expect(new APNCertificate(cert).key().fingerprint()).to.equal(
        '2d594c9861227dd22ba5ae37cc9354e9117a804d'
      )
    })
  })

  describe('validity', () => {
    it('returns an object containing notBefore', () => {
      expect(new APNCertificate(cert).validity())
        .to.have.property('notBefore')
        .and.to.eql(new Date('2015-01-01T00:00:00Z'))
    })

    it('returns an object containing notAfter', () => {
      expect(new APNCertificate(cert).validity())
        .to.have.property('notAfter')
        .and.to.eql(new Date('2025-01-01T00:00:00Z'))
    })
  })

  describe('environment', () => {
    describe('development certificate', () => {
      it('sandbox flag', () => {
        expect(new APNCertificate(cert).environment().sandbox).to.be.true
      })

      it('production flag', () => {
        expect(new APNCertificate(cert).environment().production).to.be.false
      })
    })

    describe('production certificate', () => {
      let productionCertPem, productionCert
      before(() => {
        productionCertPem = fs.readFileSync('test/credentials/support/certProduction.pem')
      })

      beforeEach(() => {
        productionCert = forge.pki.certificateFromPem(productionCertPem.toString())
      })

      it('sandbox flag', () => {
        expect(new APNCertificate(productionCert).environment().sandbox).to.be.false
      })

      it('production flag', () => {
        expect(new APNCertificate(productionCert).environment().production).to.be.true
      })
    })
  })
})
