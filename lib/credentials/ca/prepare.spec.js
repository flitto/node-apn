const fs = require('fs')
const { describe, expect, test, beforeEach } = require('@jest/globals')

describe('prepareCA', () => {
	let cert, prepareCA

	beforeEach(() => {
		cert = fs.readFileSync('test/support/initializeTest.crt')

		const resolve = require('../resolve')
		prepareCA = require('./prepare')({ resolve })
	})

	test('should load a single CA certificate from disk', () => {
		return expect(prepareCA({ ca: 'test/support/initializeTest.crt' }).ca[0].toString()).toEqual(cert.toString())
	})

	test('should provide a single CA certificate from a Buffer', () => {
		return expect(prepareCA({ ca: cert }).ca[0].toString()).toEqual(cert.toString())
	})

	test('should provide a single CA certificate from a String', () => {
		return expect(prepareCA({ ca: cert.toString() }).ca[0]).toEqual(cert.toString())
	})

	test('should load an array of CA certificates', () => {
		const certString = cert.toString()
		return expect(
			prepareCA({ ca: ['test/support/initializeTest.crt', cert, certString] }).ca.map((cert) => cert.toString()),
		).toEqual([certString, certString, certString])
	})

	test('returns undefined if no CA values are specified', () => {
		return expect(prepareCA({ ca: null }).ca).toBeUndefined()
	})
})
