const { describe, expect, test, beforeEach, jest: j } = require('@jest/globals')

describe('perpareCertificate', () => {
	let fakes, prepareCertificate

	beforeEach(() => {
		fakes = {
			load: j.fn(),
			parse: j.fn(),
			validate: j.fn(),
			logger: j.fn(),
		}

		prepareCertificate = require('./prepare')(fakes)
	})

	describe('with valid credentials', () => {
		let credentials
		const testOptions = {
			pfx: 'myCredentials.pfx',
			cert: 'myCert.pem',
			key: 'myKey.pem',
			ca: 'myCa.pem',
			passphrase: 'apntest',
			production: true,
		}

		beforeEach(() => {
			fakes.load.withArgs(sinon.match(testOptions)).returns({
				pfx: 'myPfxData',
				cert: 'myCertData',
				key: 'myKeyData',
				ca: ['myCaData'],
				passphrase: 'apntest',
			})

			fakes.parse.returnsArg(0)
			credentials = prepareCertificate(testOptions)
		})

		describe('the validation stage', () => {
			test('is called once', () => {
				expect(fakes.validate).toBeCalled()
			})

			test('is passed the production flag', () => {
				expect(fakes.validate.getCall(0).args[0]).toHaveProperty('production', true)
			})

			describe('passed credentials', () => {
				test('contains the PFX data', () => {
					expect(fakes.validate.getCall(0).args[0]).toHaveProperty('pfx', 'myPfxData')
				})

				test('contains the key data', () => {
					expect(fakes.validate.getCall(0).args[0]).toHaveProperty('key', 'myKeyData')
				})

				test('contains the certificate data', () => {
					expect(fakes.validate.getCall(0).args[0]).toHaveProperty('cert', 'myCertData')
				})

				test('includes passphrase', () => {
					expect(fakes.validate.getCall(0).args[0]).toHaveProperty('passphrase', 'apntest')
				})
			})
		})

		describe('resolution value', () => {
			test('contains the PFX data', () => {
				return expect(credentials).toHaveProperty('pfx', 'myPfxData')
			})

			test('contains the key data', () => {
				return expect(credentials).toHaveProperty('key', 'myKeyData')
			})

			test('contains the certificate data', () => {
				return expect(credentials).toHaveProperty('cert', 'myCertData')
			})

			test('contains the CA data', () => {
				return expect(credentials.ca[0]).toEqual('myCaData')
			})

			test('includes passphrase', () => {
				return expect(credentials).toHaveProperty('passphrase', 'apntest')
			})
		})
	})

	describe('credential file cannot be parsed', () => {
		beforeEach(() => {
			fakes.load.returns({ cert: 'myCertData', key: 'myKeyData' })
			fakes.parse.throws(new Error('unable to parse key'))
		})

		test('should resolve with the credentials', () => {
			const credentials = prepareCertificate({
				cert: 'myUnparseableCert.pem',
				key: 'myUnparseableKey.pem',
				production: true,
			})
			return expect(credentials).to.equal({ cert: 'myCertData', key: 'myKeyData' })
		})

		test('should log an error', () => {
			prepareCertificate({ cert: 'myUnparseableCert.pem', key: 'myUnparseableKey.pem' })

			expect(fakes.logger).to.be.calledWith(
				sinon.match(function (err) {
					return err.message ? err.message.match(/unable to parse key/) : false
				}, '"unable to parse key"'),
			)
		})

		test('should not attempt to validate', () => {
			prepareCertificate({ cert: 'myUnparseableCert.pem', key: 'myUnparseableKey.pem' })
			expect(fakes.validate).not.toBeCalled()
		})
	})

	describe('credential validation fails', () => {
		test('should throw', () => {
			fakes.load.returns(Promise.resolve({ cert: 'myCertData', key: 'myMismatchedKeyData' }))
			fakes.parse.returnsArg(0)
			fakes.validate.throws(new Error('certificate and key do not match'))

			return expect(() => prepareCertificate({ cert: 'myCert.pem', key: 'myMistmatchedKey.pem' })).to.throw(
				/certificate and key do not match/,
			)
		})
	})

	describe('credential file cannot be loaded', () => {
		test('should throw', () => {
			fakes.load.throws(new Error('ENOENT, no such file or directory'))

			return expect(() => prepareCertificate({ cert: 'noSuchFile.pem', key: 'myKey.pem' })).to.throw(
				'ENOENT, no such file or directory',
			)
		})
	})
})
