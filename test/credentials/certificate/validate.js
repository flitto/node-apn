// const sinon = require('sinon')
// const { expect } = require('chai')
// const validateCredentials = require('../../../lib/credentials/certificate/validate')
//
// const fakeCredentials = () => {
//   return {
//     key: {
//       _fingerprint: 'fingerprint1',
//       fingerprint: () => {
//         return this._fingerprint
//       },
//     },
//     certificates: [
//       {
//         _key: {
//           _fingerprint: 'fingerprint1',
//           fingerprint: () => {
//             return this._fingerprint
//           },
//         },
//         _validity: {
//           notBefore: new Date(Date.now() - 100000),
//           notAfter: new Date(Date.now() + 100000),
//         },
//         key: () => {
//           return this._key
//         },
//         validity: () => {
//           return this._validity
//         },
//         environment: () => {
//           return { production: true, sandbox: false }
//         },
//       },
//     ],
//     production: true,
//   }
// }
//
// describe('validateCredentials', () => {
//   let credentials
//   beforeEach(() => {
//     credentials = fakeCredentials()
//   })
//
//   describe('with valid credentials', () => {
//     it('returns',() => {
//       validateCredentials(credentials)
//     })
//   })
//
//   describe('with mismatched key and certificate', () => {
//     it('throws',() => {
//       sinon.stub(credentials.certificates[0]._key, 'fingerprint').returns('fingerprint2')
//       console.log('test2====', credentials.certificates[0]._key)
//
//       expect(() => {
//         validateCredentials(credentials)
//       }).to.throw(/certificate and key do not match/)
//     })
//   })
//
//   describe('with expired certificate', () => {
//     it('throws',() => {
//       sinon.stub(credentials.certificates[0], 'validity').returns({
//         notBefore: new Date(Date.now() - 100000),
//         notAfter: new Date(Date.now() - 10000),
//       })
//
//       expect(() => {
//         validateCredentials(credentials)
//       }).to.throw(/certificate has expired/)
//     })
//   })
//
//   describe('with incorrect environment', () => {
//     it('throws with sandbox cert in production', () => {
//       sinon.stub(credentials.certificates[0], 'environment').returns({
//         production: false,
//         sandbox: true,
//       })
//
//       expect(() => {
//         validateCredentials(credentials)
//       }).to.throw('certificate does not support configured environment, production: true')
//     })
//
//     it('throws with production cert in sandbox', () => {
//       sinon.stub(credentials.certificates[0], 'environment').returns({
//         production: true,
//         sandbox: false,
//       })
//       credentials.production = false
//
//       expect(() => {
//         validateCredentials(credentials)
//       }).to.throw('certificate does not support configured environment, production: false')
//     })
//   })
//
//   describe('with missing production flag', () => {
//     it('does not throw', () => {
//       sinon.stub(credentials.certificates[0], 'environment').returns({
//         production: true,
//         sandbox: false,
//       })
//       credentials.production = undefined
//
//       expect(() => {
//         validateCredentials(credentials)
//       }).to.not.throw()
//     })
//   })
//
//   describe('with certificate supporting both environments', () => {
//     it('does not throw', () => {
//       sinon.stub(credentials.certificates[0], 'environment').returns({
//         production: true,
//         sandbox: true,
//       })
//       credentials.production = false
//
//       expect(() => {
//         validateCredentials(credentials)
//       }).to.not.throw()
//     })
//   })
// })
