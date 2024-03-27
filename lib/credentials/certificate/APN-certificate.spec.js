const APNCertificateSpec = require('./APN-certificate')
const APNKey = require('./APN-key')
const forge = require('node-forge')
const fs = require('fs')
const { describe, expect, test, beforeEach } = require('@jest/globals')

describe('APNCertificateSpec', () => {
  let certPem
  beforeEach(() => {
    certPem = fs.readFileSync('test/credentials/support/cert.pem')
  })

  let cert
  beforeEach(() => {
    cert = forge.pki.certificateFromPem(certPem.toString())
  })

  describe('accepts a Certificate object', () => {
    test('does not throw', () => {
      expect(() => {
        new APNCertificateSpec(cert)
      }).not.toThrow(Error)
    })
  })

  describe('throws', () => {
    test('missing public key', () => {
      delete cert.publicKey

      expect(() => {
        new APNCertificateSpec(cert)
      }).toThrow('certificate object is invalid')
    })

    test('missing validity', () => {
      delete cert.validity

      expect(() => {
        new APNCertificateSpec(cert)
      }).toThrow('certificate object is invalid')
    })

    test('missing subject', () => {
      delete cert.subject

      expect(() => {
        new APNCertificateSpec(cert)
      }).toThrow('certificate object is invalid')
    })
  })

  describe('key', () => {
    test('returns an APNKey', () => {
      expect(new APNCertificateSpec(cert).key()).toBeInstanceOf(APNKey)
    })

    test('returns the the certificates public key', () => {
      expect(new APNCertificateSpec(cert).key().fingerprint()).toEqual('2d594c9861227dd22ba5ae37cc9354e9117a804d')
    })
  })

  describe('validity', () => {
    test('returns an object containing notBefore', () => {
      expect(new APNCertificateSpec(cert).validity()).toHaveProperty('notBefore', new Date('2015-01-01T00:00:00Z'))
    })

    test('returns an object containing notAfter', () => {
      expect(new APNCertificateSpec(cert).validity()).toHaveProperty('notAfter', new Date('2025-01-01T00:00:00Z'))
    })
  })

  describe('environment', () => {
    describe('development certificate', () => {
      test('sandbox flag', () => {
        expect(new APNCertificateSpec(cert).environment().sandbox).toBeTruthy()
      })

      test('production flag', () => {
        expect(new APNCertificateSpec(cert).environment().production).toBeFalsy()
      })
    })

    describe('production certificate', () => {
      let productionCertPem, productionCert
      beforeEach(() => {
        productionCertPem = fs.readFileSync('test/credentials/support/certProduction.pem')
      })

      beforeEach(() => {
        productionCert = forge.pki.certificateFromPem(productionCertPem.toString())
      })

      test('sandbox flag', () => {
        expect(new APNCertificateSpec(productionCert).environment().sandbox).toBeFalsy()
      })

      test('production flag', () => {
        expect(new APNCertificateSpec(productionCert).environment().production).toBeTruthy()
      })
    })
  })
})
