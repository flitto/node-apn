const parsePemKeySpec = require('./parse-pem-key')
const APNKey = require('./APN-key')
const fs = require('fs')
const { describe, expect, test, beforeEach, jest: j } = require('@jest/globals')

describe('parsePemKey', () => {
	describe('returns APNKey', () => {
		describe('RSA key', () => {
			let key
			beforeEach(() => {
				const keyData = fs.readFileSync('test/credentials/support/key.pem')
				key = parsePemKeySpec(keyData)
			})

			test('correct type', () => {
				expect(key).toBeInstanceOf(APNKey)
			})

			test('with correct fingerprint', () => {
				expect(key.fingerprint()).toEqual('2d594c9861227dd22ba5ae37cc9354e9117a804d')
			})
		})

		test('openssl-encrypted RSA key, correct password', () => {
			const key = fs.readFileSync('test/credentials/support/keyEncrypted.pem')
			expect(parsePemKeySpec(key, 'apntest')).to.be.an.instanceof(APNKey)
		})

		test('PKCS#8 encrypted key, correct password', () => {
			const key = fs.readFileSync('test/credentials/support/keyPKCS8Encrypted.pem')
			expect(parsePemKeySpec(key, 'apntest')).to.be.an.instanceof(APNKey)
		})

		test('PEM containing certificates and key', () => {
			const certAndKey = fs.readFileSync('test/credentials/support/certKey.pem')
			expect(parsePemKeySpec(certAndKey)).to.be.an.instanceof(APNKey)
		})
	})

	describe('throws with', () => {
		test('PKCS#8 key (unsupported format)', () => {
			const key = fs.readFileSync('test/credentials/support/keyPKCS8.pem')
			expect(() => {
				parsePemKeySpec(key)
			}).toThrow('unable to parse key, unsupported format')
		})

		test('RSA encrypted key, incorrect passphrase', () => {
			const key = fs.readFileSync('test/credentials/support/keyEncrypted.pem')
			expect(() => {
				parsePemKeySpec(key, 'not-the-passphrase')
			}).toThrow('unable to parse key, incorrect passphrase')
		})

		test('PKCS#8 encrypted key, incorrect passphrase', () => {
			const key = fs.readFileSync('test/credentials/support/keyPKCS8Encrypted.pem')
			expect(() => {
				parsePemKeySpec(key, 'not-the-passphrase')
			}).toThrow('unable to parse key, incorrect passphrase')
		})

		test('PEM certificate', () => {
			const cert = fs.readFileSync('test/credentials/support/cert.pem')
			expect(() => {
				parsePemKeySpec(cert)
			}).toThrow('unable to parse key, no private key found')
		})

		test('PKCS#12 file', () => {
			const pkcs12 = fs.readFileSync('test/credentials/support/certIssuerKey.p12')
			expect(() => {
				parsePemKeySpec(pkcs12)
			}).toThrow('unable to parse key, not a valid PEM file')
		})
	})

	describe('multiple keys', () => {
		test('throws', () => {
			const keys = fs.readFileSync('test/credentials/support/multipleKeys.pem')
			expect(() => {
				parsePemKeySpec(keys)
			}).toThrow('multiple keys found in PEM file')
		})
	})

	describe('returns null', () => {
		test('for null', () => {
			expect(parsePemKeySpec()).toBeNull()
		})

		test('for undefined', () => {
			expect(parsePemKeySpec()).toBeNull()
		})
	})
})
