const parsePemCertificateSpec = require('./parse-pem-certificate')
const APNCertificate = require('./APN-certificate')
const fs = require('fs')
const { describe, expect, test, beforeEach } = require('@jest/globals')

describe('parsePemCertificateSpec', () => {
  describe('with PEM certificate', () => {
    let cert, certProperties
    beforeEach(() => {
      cert = fs.readFileSync('test/credentials/support/cert.pem')
      certProperties = parsePemCertificateSpec(cert)
    })

    describe('return value', () => {
      test('is an array', () => {
        expect(certProperties).toBeInstanceOf(Array)
      })

      test('contains one element', () => {
        expect(certProperties).toHaveLength(1)
      })

      describe('certificate [0]', () => {
        test('is an APNCertificate', () => {
          expect(certProperties[0]).toBeInstanceOf(APNCertificate)
        })

        test('has the correct fingerprint', () => {
          expect(certProperties[0].key().fingerprint()).toEqual('2d594c9861227dd22ba5ae37cc9354e9117a804d')
        })
      })
    })
  })

  describe('with PEM containing multiple certificates', () => {
    let cert, certProperties
    beforeEach(() => {
      cert = fs.readFileSync('test/credentials/support/certIssuerKey.pem')
      certProperties = parsePemCertificateSpec(cert)
    })

    test('returns the correct number of certificates', () => {
      expect(certProperties).toHaveLength(2)
    })

    describe('certificate [0]', () => {
      test('has the correct fingerprint', () => {
        expect(certProperties[0].key().fingerprint()).toEqual('2d594c9861227dd22ba5ae37cc9354e9117a804d')
      })
    })

    describe('certificate [1]', () => {
      test('has the correct fingerprint', () => {
        expect(certProperties[1].key().fingerprint()).toEqual('ccff221d67cb3335649f9b4fbb311948af76f4b2')
      })
    })
  })

  describe('with a PKCS#12 file', () => {
    test('throws', () => {
      const pfx = fs.readFileSync('test/credentials/support/certIssuerKey.p12')
      expect(() => {
        parsePemCertificateSpec(pfx)
      }).toThrow('unable to parse certificate, not a valid PEM file')
    })
  })

  describe('with a key', () => {
    test('returns an empty array', () => {
      const key = fs.readFileSync('test/credentials/support/key.pem')
      expect(parsePemCertificateSpec(key)).toBeDefined()
    })
  })

  describe('returns null', () => {
    test('for null', () => {
      expect(parsePemCertificateSpec(null)).toBeNull()
    })

    test('for undefined', () => {
      expect(parsePemCertificateSpec(undefined)).toBeNull()
    })
  })
})
