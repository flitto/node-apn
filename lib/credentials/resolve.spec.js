const resolveSpec = require('./resolve')
const fs = require('fs')
const { describe, expect, test, beforeEach } = require('@jest/globals')

describe('resolve', () => {
  let pfx, cert, key
  beforeEach(() => {
    pfx = fs.readFileSync('test/support/initializeTest.pfx')
    cert = fs.readFileSync('test/support/initializeTest.crt')
    key = fs.readFileSync('test/support/initializeTest.key')
  })

  test('returns PEM string as supplied', () => {
    expect(resolveSpec(cert.toString())).toEqual(cert.toString())
  })

  test('returns Buffer as supplied', () => {
    expect(resolveSpec(pfx)).toBeInstanceOf(Buffer)
    expect(resolveSpec(pfx)).toEqual(pfx)
  })

  describe('with file path', () => {
    test('returns a Buffer for valid path', () => {
      expect(resolveSpec('test/support/initializeTest.key')).toBeInstanceOf(Buffer)
    })

    test('returns contents for valid path', () => {
      expect(resolveSpec('test/support/initializeTest.key').toString()).toEqual(key.toString())
    })

    test('throws for invalid path', () => {
      expect(() => {
        resolveSpec('test/support/fail/initializeTest.key')
      }).toThrow()
    })
  })

  test('returns null/undefined as supplied', () => {
    expect(resolveSpec(null)).toBeNull()
    expect(resolveSpec()).toBeUndefined()
  })
})
