const resolve = require('../../lib/credentials/resolve')
const fs = require('fs')

describe('resolve', () => {
  let pfx, cert, key
  before(() => {
    pfx = fs.readFileSync('test/support/initializeTest.pfx')
    cert = fs.readFileSync('test/support/initializeTest.crt')
    key = fs.readFileSync('test/support/initializeTest.key')
  })

  it('returns PEM string as supplied', () => {
    expect(resolve(cert.toString())).to.be.a('string').and.to.equal(cert.toString())
  })

  it('returns Buffer as supplied', () => {
    expect(resolve(pfx)).to.satisfy(Buffer.isBuffer).and.to.equal(pfx)
  })

  describe('with file path', () => {
    it('returns a Buffer for valid path', () => {
      return expect(resolve('test/support/initializeTest.key')).to.satisfy(Buffer.isBuffer)
    })

    it('returns contents for value path', () => {
      return expect(resolve('test/support/initializeTest.key').toString()).to.equal(key.toString())
    })

    it('throws for invalid path', () => {
      return expect(() => {
        resolve('test/support/fail/initializeTest.key')
      }).to.throw
    })
  })

  it('returns null/undefined as supplied', () => {
    expect(resolve(null)).to.be.null
    expect(resolve()).to.be.undefined
  })
})
