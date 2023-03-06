const token = require('../lib/token')

describe('token', () => {
  context('string input', () => {
    context('contains valid token', () => {
      it('returns token as string', () => {
        expect(token('a9d0ed10e9cfd022a61cb08753f49c5a0b0dfb784697bf9f9d750a1003da19c7')).to.equal(
          'a9d0ed10e9cfd022a61cb08753f49c5a0b0dfb784697bf9f9d750a1003da19c7'
        )
      })

      it('strips invalid characters', () => {
        expect(
          token('<a9d0ed1 0e9cfd 022a61 cb0875 3f49c5 a0b0d fb784697bf9f9d750a1003da19c7>')
        ).to.equal('a9d0ed10e9cfd022a61cb08753f49c5a0b0dfb784697bf9f9d750a1003da19c7')
      })

      it('supports uppercase input', () => {
        expect(token('A9D0ED10E9CFD022A61CB08753F49C5A0B0DFB784697BF9F9D750A1003DA19C7')).to.equal(
          'A9D0ED10E9CFD022A61CB08753F49C5A0B0DFB784697BF9F9D750A1003DA19C7'
        )
      })
    })

    it('throws when input is empty', () => {
      expect(() => {
        token('')
      }).to.throw(/invalid length/)
    })
  })

  context('Buffer input', () => {
    context('contains valid token', () => {
      it('returns token as string', () => {
        expect(
          token(
            Buffer.from('a9d0ed10e9cfd022a61cb08753f49c5a0b0dfb784697bf9f9d750a1003da19c7', 'hex')
          )
        ).to.equal('a9d0ed10e9cfd022a61cb08753f49c5a0b0dfb784697bf9f9d750a1003da19c7')
      })
    })

    it('throws when input is empty', () => {
      expect(() => {
        token(Buffer.from([]))
      }).to.throw(/invalid length/)
    })
  })
})
