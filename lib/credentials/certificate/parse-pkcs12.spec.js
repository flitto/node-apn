const parsePkcs12Spec = require('./parse-pkcs12')
const { describe, expect, test, beforeEach, jest: j } = require('@jest/globals')
const APNKey = require('./APN-key')
const APNCertificate = require('./APN-certificate')
const fs = require('fs')

describe('parsePkcs12', () => {
  describe('with PKCS#12 data', () => {
    let p12, properties
    describe('return value', () => {
      let credentials
      beforeEach(() => {
        p12 = fs.readFileSync('test/credentials/support/certIssuerKey.p12')
        credentials = parsePkcs12Spec(p12)
      })

      test('is an object', () => {
        expect(credentials).toBeInstanceOf('object')
      })

      test('contains a private key', () => {
        expect(credentials).toHaveProperty('key')
      })

      describe('private key', () => {
        test('is an instance of APNKey', () => {
          expect(credentials.key).toBeInstanceOf(APNKey)
        })

        test('has the correct fingerprint', () => {
          expect(credentials.key.fingerprint()).toEqual('2d594c9861227dd22ba5ae37cc9354e9117a804d')
        })
      })

      test('contains a certificate chain', () => {
        expect(credentials).toHaveProperty('certificates')
      })

      describe('certificate chain', () => {
        test('is an array', () => {
          expect(credentials.certificates).toBeInstanceOf('array')
        })

        test('contains the correct number of certificates', () => {
          expect(credentials.certificates.length).toEqual(2)
        })

        test('contains APNCertificate objects', () => {
          const certificates = credentials.certificates
          certificates.forEach(function (certificate) {
            expect(certificate).toBeInstanceOf(APNCertificate)
          })
        })

        test('contains certificates with the correct fingerprints', () => {
          const fingerprints = ['2d594c9861227dd22ba5ae37cc9354e9117a804d', 'ccff221d67cb3335649f9b4fbb311948af76f4b2']
          const certificates = credentials.certificates
          certificates.forEach(function (certificate, index) {
            expect(certificate.key().fingerprint()).toEqual(fingerprints[index])
          })
        })
      })
    })

    // OpenSSL exports keys having no passphrase as a C string with a \0 byte appended
    describe('having empty passphrase (OpenSSL-CLI-generated file)', () => {
      describe('return value', () => {
        test('has the correct key', () => {
          p12 = fs.readFileSync('test/credentials/support/certIssuerKeyOpenSSL.p12')
          properties = parsePkcs12Spec(p12)
          expect(properties.key.fingerprint()).toEqual('2d594c9861227dd22ba5ae37cc9354e9117a804d')
        })
      })
    })

    describe('with correct passphrase', () => {
      describe('return value', () => {
        test('has the correct key', () => {
          p12 = fs.readFileSync('test/credentials/support/certIssuerKeyPassphrase.p12')
          properties = parsePkcs12Spec(p12, 'apntest')
          expect(properties.key.fingerprint()).toEqual('2d594c9861227dd22ba5ae37cc9354e9117a804d')
        })
      })
    })
    describe('with incorrect passphrase', () => {
      test('throws', () => {
        p12 = fs.readFileSync('test/credentials/support/certIssuerKeyPassphrase.p12')
        expect(() => {
          parsePkcs12Spec(p12, 'notthepassphrase')
        }).toThrow('unable to parse credentials, incorrect passphrase')
      })
    })

    // Unclear whether multiple keys in one PKCS#12 file can be distinguished
    // at present if there's more than one just throw a warning. Should also
    // do the same thing in apnKeyFromPem
    describe('multiple keys', () => {
      test('throws', () => {
        p12 = fs.readFileSync('test/credentials/support/multipleKeys.p12')
        expect(() => {
          parsePkcs12Spec(p12)
        }).toThrow('multiple keys found in PFX/P12 file')
      })
    })
  })

  describe('PEM file', () => {
    test('throws', () => {
      const pem = fs.readFileSync('test/credentials/support/certKey.pem')
      expect(() => {
        parsePkcs12Spec(pem)
      }).toThrow('unable to parse credentials, not a PFX/P12 file')
    })
  })

  test('returns undefined for undefined', () => {
    expect(parsePkcs12Spec()).toBeUndefined()
  })
})
