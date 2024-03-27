const fs = require('fs')
const { describe, expect, test, beforeEach } = require('@jest/globals')

describe('loadCredentials', () => {
  let pfx, cert, key, loadCredentials
  beforeEach(() => {
    pfx = fs.readFileSync('test/support/initializeTest.pfx')
    cert = fs.readFileSync('test/support/initializeTest.crt')
    key = fs.readFileSync('test/support/initializeTest.key')

    const resolve = require('../resolve')
    loadCredentials = require('./load')({ resolve })
  })

  test('should load a pfx file from disk', () => {
    return expect(loadCredentials({ pfx: 'test/support/initializeTest.pfx' }).pfx.toString()).toEqual(pfx.toString())
  })

  test('should provide pfx data from memory', () => {
    return expect(loadCredentials({ pfx: pfx }).pfx.toString()).toEqual(pfx.toString())
  })

  test('should provide pfx data explicitly passed in pfxData parameter', () => {
    return expect(loadCredentials({ pfxData: pfx }).pfx.toString()).toEqual(pfx.toString())
  })

  test('should load a certificate from disk', () => {
    return expect(loadCredentials({ cert: 'test/support/initializeTest.crt', key: null }).cert.toString()).toEqual(
      cert.toString(),
    )
  })

  test('should provide a certificate from a Buffer', () => {
    return expect(loadCredentials({ cert: cert, key: null }).cert.toString()).toEqual(cert.toString())
  })

  test('should provide a certificate from a String', () => {
    return expect(loadCredentials({ cert: cert.toString(), key: null }).cert).toEqual(cert.toString())
  })

  test('should provide certificate data explicitly passed in the certData parameter', () => {
    return expect(loadCredentials({ certData: cert, key: null }).cert.toString()).toEqual(cert.toString())
  })

  test('should load a key from disk', () => {
    return expect(loadCredentials({ cert: null, key: 'test/support/initializeTest.key' }).key.toString()).toEqual(
      key.toString(),
    )
  })

  test('should provide a key from a Buffer', () => {
    return expect(loadCredentials({ cert: null, key: key }).key.toString()).toEqual(key.toString())
  })

  test('should provide a key from a String', () => {
    return expect(loadCredentials({ cert: null, key: key.toString() }).key).toEqual(key.toString())
  })

  test('should provide key data explicitly passed in the keyData parameter', () => {
    return expect(loadCredentials({ cert: null, keyData: key }).key.toString()).toEqual(key.toString())
  })

  test('should inclue the passphrase in the resolved value', () => {
    return expect(loadCredentials({ passphrase: 'apntest' }).passphrase).toEqual('apntest')
  })
})
