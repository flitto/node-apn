const { describe, expect, test, beforeEach, jest: j } = require('@jest/globals')
const APNCertificate = require('./APN-certificate')
const APNKey = require('./APN-key')

describe('parseCredentials', () => {
	let fakes, parseCredentials

	const pfxKey = new APNKey({ n: 1, e: 1 })
	const pfxCert = new APNCertificate({ publicKey: {}, validity: {}, subject: {} })

	const pemKey = new APNKey({ n: 2, e: 1 })
	const pemCert = new APNCertificate({ publicKey: {}, validity: {}, subject: {} })

	beforeEach(() => {
		fakes = {
			parsePkcs12: j.fn(),
			parsePemKey: j.fn(),
			parsePemCert: j.fn(),
		}

		fakes.parsePemKey.mockReturnValue(pemKey)

		fakes.parsePemCert.mockReturnValue([pemCert])

		parseCredentials = require('./parse')(fakes)
	})

	describe('with PFX file', () => {
		test('returns the parsed key', () => {
			fakes.parsePkcs12.mockReturnValue({ key: pfxKey, certificates: [pfxCert] })

			const parsed = parseCredentials({ pfx: 'pfxData' })
			expect(parsed.key).toBeInstanceOf(APNKey)
		})

		test('returns the parsed certificates', () => {
			fakes.parsePkcs12.mockReturnValue({ key: pfxKey, certificates: [pfxCert] })

			const parsed = parseCredentials({ pfx: 'pfxData' })
			expect(parsed.certificates[0]).toBeInstanceOf(APNCertificate)
		})

		describe('having passphrase', () => {
			beforeEach(() => {
				fakes.parsePkcs12.mockReturnValue({ key: pfxKey, certificates: [pfxCert] })
				fakes.parsePkcs12.mockImplementation(() => {
					throw new Error('unable to read credentials, incorrect passphrase')
				})
			})

			test('returns the parsed key', () => {
				const parsed = parseCredentials({ pfx: 'encryptedPfxData', passphrase: 'apntest' })
				expect(parsed.key).toBeInstanceOf(APNKey)
			})

			test('throws when passphrase is incorrect', () => {
				expect(() => {
					parseCredentials({ pfx: 'encryptedPfxData', passphrase: 'incorrectpassphrase' })
				}).toThrow(/incorrect passphrase/)
			})

			test('throws when passphrase is not supplied', () => {
				expect(() => {
					parseCredentials({ pfx: 'encryptedPfxData' })
				}).toThrow(/incorrect passphrase/)
			})
		})
	})

	describe('with PEM key', () => {
		test('returns the parsed key', () => {
			fakes.parsePemKey.mockReturnValue(pemKey)

			const parsed = parseCredentials({ key: 'pemKeyData' })
			expect(parsed.key).toBeInstanceOf(APNKey)
		})

		describe('having passphrase', () => {
			beforeEach(() => {
				fakes.parsePemKey.mockReturnValue(pemKey)
				fakes.parsePemKey.mockImplementation(() => {
					throw new Error('unable to load key, incorrect passphrase')
				})
			})

			test('returns the parsed key', () => {
				const parsed = parseCredentials({ key: 'encryptedPemKeyData', passphrase: 'apntest' })
				expect(parsed.key).toBeInstanceOf(APNKey)
			})

			test('throws when passphrase is incorrect', () => {
				expect(() => {
					parseCredentials({ key: 'encryptedPemKeyData', passphrase: 'incorrectpassphrase' })
				}).toThrow(/incorrect passphrase/)
			})

			test('throws when passphrase is not supplied', () => {
				expect(() => {
					parseCredentials({ key: 'encryptedPemKeyData' })
				}).toThrow(/incorrect passphrase/)
			})
		})
	})

	describe('with PEM certificate', () => {
		test('returns the parsed certificate', () => {
			fakes.parsePemCert.mockReturnValue([pemCert])

			const parsed = parseCredentials({ cert: 'pemCertData' })
			expect(parsed.certificates[0]).toBeInstanceOf(APNCertificate)
		})
	})

	describe('both PEM and PFX data is supplied', () => {
		test('test prefers PFX to PEM', () => {
			fakes.parsePkcs12.mockReturnValue({ key: pfxKey, certificates: [pfxCert] })
			fakes.parsePemKey.mockReturnValue(pemKey)
			fakes.parsePemCert.mockReturnValue([pemCert])

			const parsed = parseCredentials({ pfx: 'pfxData', key: 'pemKeyData', cert: 'pemCertData' })
			expect(parsed.key).toEqual(pfxKey)
			expect(parsed.certificates[0]).toEqual(pfxCert)
		})
	})
})
