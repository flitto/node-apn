const parsePemCertificate = require('../../../lib/credentials/certificate/parsePemCertificate')
const APNCertificate = require('../../../lib/credentials/certificate/APNCertificate')
const fs = require('fs')

describe('parsePemCertificate', () => {
  describe('with PEM certificate', () => {
    let cert, certProperties
    before(() => {
      cert = fs.readFileSync('test/credentials/support/cert.pem')
    })

    beforeEach(() => {
      certProperties = parsePemCertificate(cert)
    })

    describe('return value', () => {
      it('is an array', () => {
        expect(certProperties).to.be.an('array')
      })

      it('contains one element', () => {
        expect(certProperties).to.have.length(1)
      })

      describe('certificate [0]', () => {
        it('is an APNCertificate', () => {
          expect(certProperties[0]).to.be.an.instanceof(APNCertificate)
        })

        it('has the correct fingerprint', () => {
          expect(certProperties[0].key().fingerprint()).to.equal(
            '2d594c9861227dd22ba5ae37cc9354e9117a804d'
          )
        })
      })
    })
  })

  describe('with PEM containing multiple certificates', () => {
    let cert, certProperties
    before(() => {
      cert = fs.readFileSync('test/credentials/support/certIssuerKey.pem')
    })

    beforeEach(() => {
      certProperties = parsePemCertificate(cert)
    })

    it('returns the correct number of certificates', () => {
      expect(certProperties).to.have.length(2)
    })

    describe('certificate [0]', () => {
      it('has the correct fingerprint', () => {
        expect(certProperties[0].key().fingerprint()).to.equal(
          '2d594c9861227dd22ba5ae37cc9354e9117a804d'
        )
      })
    })

    describe('certificate [1]', () => {
      it('has the correct fingerprint', () => {
        expect(certProperties[1].key().fingerprint()).to.equal(
          'ccff221d67cb3335649f9b4fbb311948af76f4b2'
        )
      })
    })
  })

  describe('with a PKCS#12 file', () => {
    it('throws', () => {
      const pfx = fs.readFileSync('test/credentials/support/certIssuerKey.p12')
      expect(() => {
        parsePemCertificate(pfx)
      }).to.throw('unable to parse certificate, not a valid PEM file')
    })
  })

  describe('with a key', () => {
    it('returns an empty array', () => {
      const key = fs.readFileSync('test/credentials/support/key.pem')
      expect(parsePemCertificate(key)).to.be.empty
    })
  })

  describe('returns null', () => {
    it('for null', () => {
      expect(parsePemCertificate(null)).to.be.null
    })

    it('for undefined', () => {
      expect(parsePemCertificate(undefined)).to.be.null
    })
  })
})
