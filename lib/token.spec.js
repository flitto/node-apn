const tokenSpec = require('./token')
const { describe, expect, test } = require('@jest/globals')

describe('token', () => {
	describe('string input', () => {
		describe('contains valid tokenSpec', () => {
			test('returns tokenSpec as string', () => {
				expect(tokenSpec('a9d0ed10e9cfd022a61cb08753f49c5a0b0dfb784697bf9f9d750a1003da19c7')).toEqual(
					'a9d0ed10e9cfd022a61cb08753f49c5a0b0dfb784697bf9f9d750a1003da19c7',
				)
			})

			test('strips invalid characters', () => {
				expect(tokenSpec('<a9d0ed1 0e9cfd 022a61 cb0875 3f49c5 a0b0d fb784697bf9f9d750a1003da19c7>')).toEqual(
					'a9d0ed10e9cfd022a61cb08753f49c5a0b0dfb784697bf9f9d750a1003da19c7',
				)
			})

			test('supports uppercase input', () => {
				expect(tokenSpec('A9D0ED10E9CFD022A61CB08753F49C5A0B0DFB784697BF9F9D750A1003DA19C7')).toEqual(
					'A9D0ED10E9CFD022A61CB08753F49C5A0B0DFB784697BF9F9D750A1003DA19C7',
				)
			})
		})

		test('throws when input is empty', () => {
			expect(() => {
				tokenSpec('')
			}).toThrow(/invalid length/)
		})
	})

	describe('Buffer input', () => {
		describe('contains valid tokenSpec', () => {
			test('returns tokenSpec as string', () => {
				expect(
					tokenSpec(Buffer.from('a9d0ed10e9cfd022a61cb08753f49c5a0b0dfb784697bf9f9d750a1003da19c7', 'hex')),
				).toEqual('a9d0ed10e9cfd022a61cb08753f49c5a0b0dfb784697bf9f9d750a1003da19c7')
			})
		})

		test('throws when input is empty', () => {
			expect(() => {
				tokenSpec(Buffer.from([]))
			}).toThrow(/invalid length/)
		})
	})
})
