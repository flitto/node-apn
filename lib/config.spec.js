const { describe, expect, test, beforeEach, jest: j } = require('@jest/globals')
const { afterEach } = require('node:test')

describe('config', () => {
	let config
	let fakes

	beforeEach(() => {
		fakes = {
			logger: j.fn(),
			prepareCertificate: j.fn(),
			prepareToken: j.fn(),
			prepareCA: j.fn(),
		}

		config = require('./config')(fakes)
	})

	test('supplies sensible defaults', () => {
		expect(config()).to.deep.equal({
			tokenSpec: null,
			cert: 'cert.pem',
			key: 'key.pem',
			ca: null,
			pfx: null,
			passphrase: null,
			production: false,
			sandbox: true,
			address: 'api.sandbox.push.apple.com',
			port: 443,
			proxy: null,
			rejectUnauthorized: true,
			connectionRetryLimit: 10,
			heartBeat: 60000,
			requestTimeout: 5000,
		})
	})

	describe('address configuration', () => {
		let originalEnv

		beforeEach(() => {
			originalEnv = process.env.NODE_ENV
			process.env.NODE_ENV = ''
		})

		afterEach(() => {
			process.env.NODE_ENV = originalEnv
		})

		test('should use api.sandbox.push.apple.com as the default connection address', () => {
			expect(config()).toHaveProperty('address', 'api.sandbox.push.apple.com')
		})

		test('should use api.push.apple.com when mode=production', () => {
			expect(config({ production: true, sandbox: false })).toHaveProperty('address', 'api.push.apple.com')
		})

		test('should give precedence to production flag over mode=sandbox', () => {
			expect(config({ production: false, sandbox: true })).toHaveProperty('address', 'api.sandbox.push.apple.com')
		})

		test('should use a custom address when passed', () => {
			expect(config({ address: 'testaddress' })).toHaveProperty('address', 'testaddress')
		})

		test('should use a custom address to production and sandbox mode to false', () => {
			expect(config({ address: 'testaddress' })).toHaveProperty('production', false)
			expect(config({ address: 'testaddress' })).toHaveProperty('sandbox', false)
		})

		describe('address is passed', () => {
			test('sets production to true when using production address', () => {
				expect(config({ address: 'api.push.apple.com' })).toHaveProperty('production', true)
			})

			test('sets production to false when using sandbox address', () => {
				expect(config({ address: 'api.sandbox.push.apple.com' })).toHaveProperty('production', false)
			})
		})
	})

	describe('credentials', () => {
		describe('`tokenSpec` not supplied, use certificate', () => {
			describe('passphrase', () => {
				test('throws an error when supplied passphrase is not a string', () => {
					expect(() => config({ passphrase: 123 })).toThrow('Passphrase must be a string')
				})

				test('does not throw when passphrase is a string', () => {
					expect(() => config({ passphrase: 'seekrit' })).not.toThrow()
				})

				test('does not throw when passphrase is not supplied', () => {
					expect(() => config({})).not.toThrow()
				})
			})

			describe('pfx value is supplied without cert and key', () => {
				test('includes the value of `pfx`', () => {
					expect(config({ pfx: 'apn.pfx' })).toHaveProperty('pfx', 'apn.pfx')
				})

				test('does not include a value for `cert`', () => {
					expect(config({ pfx: 'apn.pfx' }).cert).toBeUndefined()
				})

				test('does not include a value for `key`', () => {
					expect(config({ pfx: 'apn.pfx' }).key).toBeUndefined()
				})
			})

			describe('pfx value is supplied along with a cert and key', () => {
				test('includes the value of `pfx`', () => {
					expect(config({ pfx: 'apn.pfx', cert: 'cert.pem', key: 'key.pem' })).toHaveProperty('pfx', 'apn.pfx')
				})

				test('does not include a value for `cert`', () => {
					expect(config({ pfx: 'apn.pfx', cert: 'cert.pem', key: 'key.pem' })).toHaveProperty('cert', 'cert.pem')
				})

				test('does not include a value for `key`', () => {
					expect(config({ pfx: 'apn.pfx', cert: 'cert.pem', key: 'key.pem' })).toHaveProperty('key', 'key.pem')
				})
			})

			describe('pfxData value is supplied without cert and key', () => {
				test('includes the value of `pfxData`', () => {
					expect(config({ pfxData: 'apnData' })).toHaveProperty('pfxData', 'apnData')
				})

				test('does not include a value for `cert`', () => {
					expect(config({ pfxData: 'apnData' }).cert).toBeUndefined()
				})

				test('does not include a value for `key`', () => {
					expect(config({ pfxData: 'apnData' }).key).toBeUndefined()
				})
			})

			describe('pfxData value is supplied along with a cert and key', () => {
				test('includes the value of `pfxData`', () => {
					expect(config({ pfxData: 'apnData', cert: 'cert.pem', key: 'key.pem' })).toHaveProperty(
						'pfxData',
						'apnData',
					)
				})

				test('does not include a value for `cert`', () => {
					expect(config({ pfxData: 'apnData', cert: 'cert.pem', key: 'key.pem' })).toHaveProperty('cert', 'cert.pem')
				})

				test('does not include a value for `key`', () => {
					expect(config({ pfxData: 'apnData', cert: 'cert.pem', key: 'key.pem' })).toHaveProperty('key', 'key.pem')
				})
			})

			test('loads and validates the TLS credentials', () => {
				fakes.prepareCertificate.returns({ cert: 'certData', key: 'keyData', pfx: 'pfxData' })

				const configuration = config({})
				expect(configuration).toHaveProperty('cert', 'certData')
				expect(configuration).toHaveProperty('key', 'keyData')
				expect(configuration).toHaveProperty('pfx', 'pfxData')
			})

			test('prepares the CA certificates', () => {
				fakes.prepareCA.returns({ ca: 'certificate1' })

				const configuration = config({})
				expect(configuration).toHaveProperty('ca', 'certificate1')
			})
		})

		describe('`tokenSpec` supplied', () => {
			const key = 'testKey'
			const keyId = 'abckeyId'
			const teamId = 'teamId123'

			// Clear these to ensure tls.Socket doesn't attempt to do client-auth
			test('clears the `pfx` property', () => {
				expect(config({ tokenSpec: { key, keyId, teamId } })).not.toHaveProperty('pfx')
			})

			test('clears the `key` property', () => {
				expect(config({ tokenSpec: { key, keyId, teamId } })).not.toHaveProperty('key')
			})

			test('clears the `cert` property', () => {
				expect(config({ tokenSpec: { key, keyId, teamId } })).not.toHaveProperty('cert')
			})

			describe('tokenSpec', () => {
				test('throws an error if keyId is missing', () => {
					expect(() => config({ tokenSpec: { key, teamId } })).toThrow(/tokenSpec\.keyId is missing/)
				})

				test('throws an error if keyId is not a string', () => {
					expect(() => config({ tokenSpec: { key, teamId, keyId: 123 } })).toThrow(/tokenSpec\.keyId must be a string/)
				})

				test('throws an error if teamId is missing', () => {
					expect(() => config({ tokenSpec: { key, keyId } })).toThrow(/tokenSpec\.teamId is missing/)
				})

				test('throws an error if teamId is not a string', () => {
					expect(() => config({ tokenSpec: { key, keyId, teamId: 123 } })).toThrow(/tokenSpec\.teamId must be a string/)
				})
			})

			test('does not invoke prepareCertificate', () => {
				config({ tokenSpec: { key, keyId, teamId } })

				expect(fakes.prepareCertificate).not.toHaveBeenCalled()
			})

			test('prepares the CA certificates', () => {
				fakes.prepareCA.returns({ ca: 'certificate1' })

				const configuration = config({})
				expect(configuration).toHaveProperty('ca', 'certificate1')
			})
		})
	})

	describe('a null config value is passed', () => {
		test('should log a message with `debug`', () => {
			config({ address: null })

			expect(fakes.logger).toHaveBeenCalledWith('Option [address] is null. This may cause unexpected behaviour.')
		})
	})

	describe('a config value is undefined', () => {
		test('should log a message with `debug`', () => {
			config({ anOption: undefined })

			expect(fakes.logger).toHaveBeenCalledWith('Option [anOption] is undefined. This may cause unexpected behaviour.')
		})
	})
})
