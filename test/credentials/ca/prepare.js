const fs = require('fs')

describe('prepareCA', () => {
  let cert, prepareCA

  before(() => {
    cert = fs.readFileSync('test/support/initializeTest.crt')

    const resolve = require('../../../lib/credentials/resolve')
    prepareCA = require('../../../lib/credentials/ca/prepare')({ resolve })
  })

  it('should load a single CA certificate from disk', () => {
    return expect(prepareCA({ ca: 'test/support/initializeTest.crt' }).ca[0].toString()).to.equal(
      cert.toString()
    )
  })

  it('should provide a single CA certificate from a Buffer', () => {
    return expect(prepareCA({ ca: cert }).ca[0].toString()).to.equal(cert.toString())
  })

  it('should provide a single CA certificate from a String', () => {
    return expect(prepareCA({ ca: cert.toString() }).ca[0]).to.equal(cert.toString())
  })

  it('should load an array of CA certificates', () => {
    const certString = cert.toString()
    return expect(
      prepareCA({ ca: ['test/support/initializeTest.crt', cert, certString] }).ca.map(cert =>
        cert.toString()
      )
    ).to.deep.equal([certString, certString, certString])
  })

  it('returns undefined if no CA values are specified', () => {
    return expect(prepareCA({ ca: null }).ca).to.be.undefined
  })
})
