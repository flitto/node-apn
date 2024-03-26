const Notification = require('./index')
const { describe, expect, test, beforeEach, jest: j } = require('@jest/globals')

describe('Notification', () => {
	let note
	beforeEach(() => {
		note = new Notification()
	})

	describe('constructor', () => {
		test('accepts initialization values', () => {
			const properties = { priority: 5, topic: 'io.apn.node', payload: { foo: 'bar' }, badge: 5 }
			note = new Notification(properties)

			expect(note.payload).toEqual({ foo: 'bar' })
			expect(note.priority).toEqual(5)
			expect(note.topic).toEqual('io.apn.node')
			expect(compiledOutput()).toHaveProperty('aps.badge', 5)
		})
	})

	describe('rawPayload', () => {
		test('is used as the JSON output', () => {
			const payload = { some: 'payload' }
			note = new Notification({ rawPayload: payload })

			expect(note.rawPayload).toEqual({ some: 'payload' })
			expect(compiledOutput()).toEqual({ some: 'payload' })
		})

		test('does not get clobbered by aps accessors', () => {
			const payload = { some: 'payload', aps: { alert: 'Foo' } }

			note = new Notification({ rawPayload: payload })
			note.alertBody = 'Bar'

			expect(note.rawPayload).toEqual({ some: 'payload', aps: { alert: 'Foo' } })
			expect(compiledOutput()).toEqual({ some: 'payload', aps: { alert: 'Foo' } })
		})

		test('takes precedence over the `mdm` property', () => {
			const payload = { some: 'payload' }

			note = new Notification({ rawPayload: payload })
			note.mdm = 'abcd'

			expect(note.rawPayload).toEqual({ some: 'payload' })
			expect(compiledOutput()).toEqual({ some: 'payload' })
		})

		describe('when passed in the notification constructor', () => {
			beforeEach(() => {
				note = new Notification({
					rawPayload: { foo: 'bar', baz: 1, aps: { badge: 1, alert: 'Hi there!' } },
				})
			})

			test('contains all original payload properties', () => {
				expect(compiledOutput()).toHaveProperty('foo', 'bar')
				expect(compiledOutput()).toHaveProperty('baz', 1)
			})

			test('contains the correct aps properties', () => {
				expect(compiledOutput()).toHaveProperty('aps.badge', 1)
				expect(compiledOutput()).toHaveProperty('aps.alert', 'Hi there!')
			})
		})
	})

	describe('payload', () => {
		describe('when no aps properties are set', () => {
			test('contains all original payload properties', () => {
				note.payload = { foo: 'bar', baz: 1 }
				expect(compiledOutput()).toEqual({ foo: 'bar', baz: 1 })
			})
		})

		describe('when aps properties are given by setters', () => {
			test('should not mutate the originally given paylaod object', () => {
				const payload = { foo: 'bar', baz: 1 }
				note.payload = payload
				note.badge = 1
				note.sound = 'ping.aiff'
				note.toJSON()
				expect(payload).toEqual({ foo: 'bar', baz: 1 })
			})
		})

		describe('when aps payload is present', () => {
			beforeEach(() => {
				note.payload = { foo: 'bar', baz: 1, aps: { badge: 1, alert: 'Hi there!' } }
			})

			test('contains all original payload properties', () => {
				expect(compiledOutput()).toHaveProperty('foo', 'bar')
				expect(compiledOutput()).toHaveProperty('baz', 1)
			})

			test('does not contain the aps properties', () => {
				expect(compiledOutput()).not.toHaveProperty('aps')
			})
		})
	})

	describe('length', () => {
		test('returns the correct payload length', () => {
			note.alert = 'length'
			expect(note.length()).toEqual(26)
		})
	})

	describe('headers', () => {
		test('contains no properties by default', () => {
			expect(note.headers()).toEqual({})
		})

		describe('priority is non-default', () => {
			test('contains the apns-priority header', () => {
				note.priority = 5
				expect(note.headers()).toHaveProperty('apns-priority', 5)
			})
		})

		describe('id is set', () => {
			test('contains the apns-id header', () => {
				note.id = '123e4567-e89b-12d3-a456-42665544000'

				expect(note.headers()).toHaveProperty('apns-id', '123e4567-e89b-12d3-a456-42665544000')
			})
		})

		describe('expiry is greater than zero', () => {
			test('contains the apns-expiration header', () => {
				note.expiry = 1000

				expect(note.headers()).toHaveProperty('apns-expiration', 1000)
			})
		})

		describe('expiry is zero', () => {
			test('contains the apns-expiration header', () => {
				note.expiry = 0

				expect(note.headers()).toHaveProperty('apns-expiration', 0)
			})
		})

		describe('expiry is negative', () => {
			test('not contains the apns-expiration header', () => {
				note.expiry = -1

				expect(note.headers()).not.toHaveProperty('apns-expiration')
			})
		})

		describe('topic is set', () => {
			test('contains the apns-topic header', () => {
				note.topic = 'io.apn.node'

				expect(note.headers()).toHaveProperty('apns-topic', 'io.apn.node')
			})
		})

		describe('collapseId is set', () => {
			test('contains the apns-collapse-id header', () => {
				note.collapseId = 'io.apn.collapse'

				expect(note.headers()).toHaveProperty('apns-collapse-id', 'io.apn.collapse')
			})
		})

		describe('pushType is set', () => {
			test('contains the apns-push-type header', () => {
				note.pushType = 'alert'

				expect(note.headers()).toHaveProperty('apns-push-type', 'alert')
			})
		})
	})

	describe('compile', () => {
		let note

		beforeEach(() => {
			note = {
				toJSON: j.fn(),
				compiled: false,
				compile() {
					if (!this.compiled) {
						this.compiled = true
						return JSON.stringify(this.toJSON())
					}

					return 'test'
				},
			}
		})

		test('compiles the JSON payload', () => {
			note.toJSON.mockReturnValue('payload')

			expect(note.compile()).toEqual('"payload"')
		})

		test('returns the JSON payload', () => {
			note.toJSON.mockReturnValue({})

			expect(note.compile()).toEqual('{}')
		})

		test('re-compiles the JSON payload when `note.compiled` = false', () => {
			note.toJSON.mockReturnValue('payload1')
			note.compile()

			note.toJSON.mockReturnValue('payload2')
			note.compiled = false

			expect(note.compile()).toEqual('"payload2"')
		})
	})

	function compiledOutput() {
		return JSON.parse(note.compile())
	}
})
