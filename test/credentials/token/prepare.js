const sinon = require('sinon')

describe('perpareToken', () => {
  let fakes, prepareToken

  beforeEach(() => {
    fakes = {
      sign: sinon.stub(),
      resolve: sinon.stub(),
      decode: sinon.stub(),
    }

    prepareToken = require('../../../lib/credentials/token/prepare')(fakes)
  })

  const testOptions = {
    key: 'key.pem',
    keyId: '123KeyId',
    teamId: 'abcTeamId',
  }

  context('with valid options', () => {
    let token

    beforeEach(() => {
      fakes.resolve.withArgs('key.pem').returns('keyData')
      fakes.sign.returns('generated-token')

      token = prepareToken(testOptions)
    })

    describe('return value', () => {
      describe('`current` property', () => {
        it('is initialized to a signed token', () => {
          expect(token.current).to.have.equal('generated-token')
        })
      })

      describe('`generation` property', () => {
        it('is initialized to 0', () => {
          expect(token.generation).to.equal(0)
        })
      })

      context('`regenerate` called with the current `generation` value', () => {
        let generation

        beforeEach(() => {
          generation = Math.floor(Math.random() * 10) + 2

          token.generation = generation

          fakes.sign.reset()
          fakes.sign.onCall(0).returns('second-token')

          token.regenerate(generation)
        })

        it('increments `generation` property', () => {
          expect(token.generation).to.equal(generation + 1)
        })

        it('invokes the sign method with the correct arguments', () => {
          expect(fakes.sign).to.have.been.calledWith(
            sinon.match({}), // empty payload
            'keyData',
            sinon.match({
              algorithm: 'ES256',
              issuer: 'abcTeamId',
              header: sinon.match({
                kid: '123KeyId',
              }),
            })
          )
        })

        it('updates the `current` property to the return value of the sign method', () => {
          expect(token.current).to.equal('second-token')
        })
      })

      context('`regenerate` called with a lower `generation` value', () => {
        let generation

        beforeEach(() => {
          generation = Math.floor(Math.random() * 10) + 2

          token.generation = generation

          fakes.sign.reset()
          fakes.sign.onCall(0).returns('second-token')

          token.regenerate(generation - 1)
        })

        it('does not increment `generation` property', () => {
          expect(token.generation).to.equal(generation)
        })

        it('does not invoke the sign method', () => {
          expect(fakes.sign).to.have.not.been.called
        })

        it('does not change the `current` property', () => {
          expect(token.current).to.equal('generated-token')
        })
      })

      context('`isExpired` called with expired token', () => {
        let token
        beforeEach(() => {
          fakes.resolve.withArgs('key.pem').returns('keyData')
          fakes.decode.onCall(0).returns({ iat: Math.floor(Date.now() / 1000) - 1 })
          token = prepareToken(testOptions)
        })

        it('token is not expired', () => {
          expect(token.isExpired(0)).to.equal(true)
        })
      })

      context('`isExpired` called with valid token', () => {
        let token
        beforeEach(() => {
          fakes.resolve.withArgs('key.pem').returns('keyData')
          fakes.decode.onCall(0).returns({ iat: Math.floor(Date.now() / 1000) })
          token = prepareToken(testOptions)
        })

        it('token is not expired', () => {
          expect(token.isExpired(5)).to.equal(false)
        })
      })
    })
  })

  context('with bad `key` parameter', () => {
    context('key resolution fails', () => {
      it('throws a wrapped error', () => {
        fakes.resolve.withArgs('key.pem').throws(new Error('ENOENT: Unable to read file key.pem'))

        expect(() => prepareToken(testOptions)).to.throw(
          /Failed loading token key: ENOENT: Unable to read file key.pem/
        )
      })
    })

    context('key cannot be used for signing', () => {
      it('throws a wrapped error from jwt.sign', () => {
        fakes.sign.throws(new Error('Unable to sign token'))

        expect(() => prepareToken(testOptions)).to.throw(
          /Failed to generate token: Unable to sign token/
        )
      })
    })
  })
})
