const prepareTokenFactory = require('./prepare') // 파일 이름은 실제 경로에 맞게 조정해주세요.
const { describe, expect, test, jest: j, beforeEach } = require('@jest/globals')

describe('prepareToken', () => {
  let mockDependencies
  let prepareToken
  const testOptions = {
    key: 'key.pem',
    keyId: '123KeyId',
    teamId: 'abcTeamId',
  }

  beforeEach(() => {
    // 의존성 모킹
    mockDependencies = {
      sign: j.fn().mockImplementation((payload, keyData, options, callback) => {
        if (typeof callback === 'function') {
          callback(null, 'generated-tokenSpec')
        }
        return 'generated-tokenSpec'
      }),
      decode: j.fn().mockReturnValue({ iat: Math.floor(Date.now() / 1000) - 100 }), // 예시로 100초 전 생성된 것으로 설정
      resolve: j.fn().mockReturnValue('resolved-keyData'),
    }

    // prepareTokenFactory에 의존성 주입
    prepareToken = prepareTokenFactory(mockDependencies)
  })

  describe('with valid options', () => {
    test('initializes `current` property to a signed tokenSpec', () => {
      const tokenSpec = prepareToken(testOptions)
      expect(tokenSpec.current).toEqual('generated-tokenSpec')
    })

    test('initializes `generation` property to 0', () => {
      const tokenSpec = prepareToken(testOptions)
      expect(tokenSpec.generation).toEqual(0)
    })

    // regenerate 메서드와 isExpired 메서드에 대한 추가 테스트...
    test('regenerate increments generation when called with the current generation value', () => {
      const tokenSpec = prepareToken(testOptions)
      const initialGeneration = tokenSpec.generation
      tokenSpec.regenerate(initialGeneration)
      expect(tokenSpec.generation).toEqual(initialGeneration + 1)
    })

    test('isExpired returns false shortly after token generation', () => {
      const tokenSpec = prepareToken(testOptions)
      expect(tokenSpec.isExpired(1000)).toBe(false) // 유효 시간으로 1000초를 넘겨줌
    })
  })

  describe('with bad `key` parameter', () => {
    beforeEach(() => {
      mockDependencies.resolve.mockImplementation(() => {
        throw new Error('ENOENT: Unable to read file key.pem')
      })
    })

    test('throws a wrapped error when key resolution fails', () => {
      expect(() => prepareToken(testOptions)).toThrow(/Failed loading token key/)
    })
  })
})
