const APNKeySpec = require('./APN-key')
const forge = require('node-forge')
const fs = require('fs')
const { describe, expect, test } = require('@jest/globals')

describe('APNKeySpec', () => {
	test('initialises with a node-forge public key', () => {
		expect(new APNKeySpec({ n: 12345, e: 65536 })).toBeInstanceOf(APNKeySpec)
	})

	describe('throws', () => {
		test('missing modulus', () => {
			expect(() => {
				new APNKeySpec({ e: 65536 })
			}).toThrow('key is not a valid public key')
		})

		test('missing exponent', () => {
			expect(() => {
				new APNKeySpec({ n: 12345 })
			}).toThrow('key is not a valid public key')
		})

		test('undefined', () => {
			expect(() => {
				new APNKeySpec()
			}).toThrow('key is not a valid public key')
		})
	})

	describe('fingerprint', () => {
		test('returns the fingerprint of the public key', () => {
			const keyPem = fs.readFileSync('test/credentials/support/key.pem')
			const apnKey = new APNKeySpec(forge.pki.decryptRsaPrivateKey(keyPem))
			expect(apnKey.fingerprint()).toEqual('2d594c9861227dd22ba5ae37cc9354e9117a804d')
		})
	})
})
