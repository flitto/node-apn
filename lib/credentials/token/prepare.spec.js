const prepareToken = require('./prepare')
const jwt = require('jsonwebtoken')
const { describe, expect, test, jest: j, beforeEach } = require('@jest/globals')

j.mock('jsonwebtoken', () => ({
	sign: j.fn(),
}))

describe('perpareToken', () => {
	let fakes

	beforeEach(() => {
		fakes = {
			resolve: j.fn(),
			decode: j.fn(),
		}
	})

	const testOptions = {
		key: 'key.pem',
		keyId: '123KeyId',
		teamId: 'abcTeamId',
	}

	describe('with valid options', () => {
		let tokenSpec

		beforeEach(() => {
			fakes.resolve.mockReturnValue('keyData')
			jwt.sign.mockReturnValue('generated-tokenSpec')

			tokenSpec = prepareToken(testOptions, fakes)
		})

		describe('return value', () => {
			describe('`current` property', () => {
				test('is initialized to a signed tokenSpec', () => {
					expect(tokenSpec.current).toEqual('generated-tokenSpec')
				})
			})

			describe('`generation` property', () => {
				test('is initialized to 0', () => {
					expect(tokenSpec.generation).toEqual(0)
				})
			})

			describe('`regenerate` method', () => {
				context('called with the current `generation` value', () => {
					let generation

					beforeEach(() => {
						generation = Math.floor(Math.random() * 10) + 2
						tokenSpec.generation = generation
						jwt.sign.mockReturnValue('second-tokenSpec')

						tokenSpec.regenerate(generation)
					})

					test('increments `generation` property', () => {
						expect(tokenSpec.generation).toEqual(generation + 1)
					})

					test('invokes the sign method with the correct arguments', () => {
						expect(jwt.sign).toHaveBeenCalledWith(
							{},
							'keyData',
							expect.objectContaining({
								algorithm: 'ES256',
								issuer: 'abcTeamId',
								header: expect.objectContaining({
									kid: '123KeyId',
								}),
							}),
						)
					})

					test('updates the `current` property to the return value of the sign method', () => {
						expect(tokenSpec.current).toEqual('second-tokenSpec')
					})
				})

				context('called with a lower `generation` value', () => {
					let generation

					beforeEach(() => {
						generation = Math.floor(Math.random() * 10) + 2
						tokenSpec.generation = generation
						jwt.sign.mockClear()

						tokenSpec.regenerate(generation - 1)
					})

					test('does not increment `generation` property', () => {
						expect(tokenSpec.generation).toEqual(generation)
					})

					test('does not invoke the sign method', () => {
						expect(jwt.sign).not.toHaveBeenCalled()
					})

					test('does not change the `current` property', () => {
						expect(tokenSpec.current).toEqual('generated-tokenSpec')
					})
				})
			})

			// Additional tests for `isExpired` method
		})
	})

	describe('with bad `key` parameter', () => {
		beforeEach(() => {
			fakes.resolve.mockImplementation(() => {
				throw new Error('ENOENT: Unable to read file key.pem')
			})
		})

		test('throws a wrapped error when key resolution fails', () => {
			expect(() => prepareToken(testOptions, fakes)).toThrowError(
				/Failed loading tokenSpec key: ENOENT: Unable to read file key.pem/,
			)
		})

		// Additional tests for key resolution failure
	})
})
