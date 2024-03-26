const Notification = require('./index')
const { describe, expect, test, beforeEach } = require('@jest/globals')

describe('Notification', () => {
  let note
  beforeEach(() => {
    note = new Notification()
  })

  describe('aps convenience properties', () => {
    describe('alert', () => {
      test('defaults to undefined', () => {
        expect(compiledOutput().aps?.alert).toBeUndefined()
      })

      test('can be set to a string', () => {
        note.alert = 'hello'
        expect(compiledOutput()).toHaveProperty('aps.alert', 'hello')
      })

      test('can be set to an object', () => {
        note.alert = { body: 'hello' }
        expect(compiledOutput()).toHaveProperty('aps.alert', { body: 'hello' })
      })

      test('can be set to undefined', () => {
        note.alert = { body: 'hello' }
        note.alert = undefined
        expect(compiledOutput().aps?.alert).toBeUndefined()
      })

      describe('setAlert', () => {
        test('is chainable', () => {
          expect(note.setAlert('hello')).toBe(note)
          expect(compiledOutput()).toHaveProperty('aps.alert', 'hello')
        })
      })
    })

    describe('body', () => {
      test('defaults to undefined', () => {
        expect(note.body).toBeUndefined()
      })

      test('can be set to a string', () => {
        note.body = 'Hello, world'
        expect(typeof compiledOutput().aps.alert).toBe('string')
      })

      test('sets alert as a string by default', () => {
        note.body = 'Hello, world'
        expect(compiledOutput()).toHaveProperty('aps.alert', 'Hello, world')
      })

      describe('alert is already an Object', () => {
        beforeEach(() => {
          note.alert = { body: 'Existing Body' }
        })

        test('reads the value from alert body', () => {
          expect(note.body).toBe('Existing Body')
        })

        test('sets the value correctly', () => {
          note.body = 'Hello, world'
          expect(compiledOutput()).toHaveProperty('aps.alert.body', 'Hello, world')
        })
      })

      describe('setBody', () => {
        test('is chainable', () => {
          expect(note.setBody('hello')).toBe(note)
          expect(compiledOutput()).toHaveProperty('aps.alert', 'hello')
        })
      })
    })

    describe('locKey', () => {
      test('sets the aps.alert.loc-key property', () => {
        note.locKey = 'hello_world'
        expect(compiledOutput()).toHaveProperty('aps.alert.loc-key', 'hello_world')
      })

      describe('alert is already an object', () => {
        beforeEach(() => {
          note.alert = { body: 'Test', 'launch-image': 'test.png' }
          note.locKey = 'hello_world'
        })

        test('contains all expected properties', () => {
          expect(compiledOutput()).toHaveProperty('aps.alert', {
            body: 'Test',
            'launch-image': 'test.png',
            'loc-key': 'hello_world',
          })
        })
      })

      describe('alert is already a string', () => {
        beforeEach(() => {
          note.alert = 'Good Morning'
          note.locKey = 'good_morning'
        })

        test('retains the alert body correctly', () => {
          expect(compiledOutput().aps.alert.body).toBe('Good Morning')
        })

        test('sets the aps.alert.loc-key property', () => {
          expect(compiledOutput()).toHaveProperty('aps.alert.loc-key', 'good_morning')
        })
      })

      describe('setLocKey', () => {
        test('is chainable', () => {
          expect(note.setLocKey('good_morning')).toBe(note)
          expect(compiledOutput()).toHaveProperty('aps.alert.loc-key', 'good_morning')
        })
      })
    })

    describe('locArgs', () => {
      test('sets the aps.alert.loc-args property', () => {
        note.locArgs = ['arg1', 'arg2']
        expect(compiledOutput()).toHaveProperty('aps.alert.loc-args', ['arg1', 'arg2'])
      })

      describe('alert is already an object', () => {
        beforeEach(() => {
          note.alert = { body: 'Test', 'launch-image': 'test.png' }
          note.locArgs = ['Hi there']
        })

        test('contains all expected properties', () => {
          expect(compiledOutput()).toHaveProperty('aps.alert', {
            body: 'Test',
            'launch-image': 'test.png',
            'loc-args': ['Hi there'],
          })
        })
      })

      describe('alert is already a string', () => {
        beforeEach(() => {
          note.alert = 'Hello, world'
          note.locArgs = ['Hi there']
        })

        test('retains the alert body', () => {
          expect(compiledOutput()).toHaveProperty('aps.alert.body', 'Hello, world')
        })

        test('sets the aps.alert.loc-args property', () => {
          expect(compiledOutput()).toHaveProperty('aps.alert.loc-args', ['Hi there'])
        })
      })

      describe('setLocArgs', () => {
        test('is chainable', () => {
          expect(note.setLocArgs(['Robert'])).toBe(note)
          expect(compiledOutput()).toHaveProperty('aps.alert.loc-args', ['Robert'])
        })
      })
    })

    describe('ttestle', () => {
      test('sets the aps.alert.title property', () => {
        note.title = 'node-apn'
        expect(compiledOutput()).toHaveProperty('aps.alert.title', 'node-apn')
      })

      describe('alert is already an object', () => {
        beforeEach(() => {
          note.alert = { body: 'Test', 'launch-image': 'test.png' }
          note.title = 'node-apn'
        })

        test('contains all expected properties', () => {
          expect(compiledOutput()).toHaveProperty('aps.alert', {
            body: 'Test',
            'launch-image': 'test.png',
            title: 'node-apn',
          })
        })
      })

      describe('alert is already a string', () => {
        beforeEach(() => {
          note.alert = 'Hello, world'
          note.title = 'Welcome'
        })

        test('retains the alert body', () => {
          expect(compiledOutput()).toHaveProperty('aps.alert.body', 'Hello, world')
        })

        test('sets the aps.alert.title property', () => {
          expect(compiledOutput()).toHaveProperty('aps.alert.title', 'Welcome')
        })
      })

      describe('setTitle', () => {
        test('is chainable', () => {
          expect(note.setTitle('Bienvenue')).toBe(note)
          expect(compiledOutput()).toHaveProperty('aps.alert.title', 'Bienvenue')
        })
      })
    })

    describe('subtitle', () => {
      test('sets the aps.alert.subtitle property', () => {
        note.subtitle = 'node-apn'
        expect(compiledOutput()).toHaveProperty('aps.alert.subtitle', 'node-apn')
      })

      describe('alert is already an object', () => {
        beforeEach(() => {
          note.alert = { body: 'Test', 'launch-image': 'test.png' }
          note.subtitle = 'node-apn'
        })

        test('contains all expected properties', () => {
          expect(compiledOutput()).toHaveProperty('aps.alert', {
            body: 'Test',
            'launch-image': 'test.png',
            subtitle: 'node-apn',
          })
        })
      })

      describe('alert is already a string', () => {
        beforeEach(() => {
          note.alert = 'Hello, world'
          note.subtitle = 'Welcome'
        })

        test('retains the alert body', () => {
          expect(compiledOutput()).toHaveProperty('aps.alert.body', 'Hello, world')
        })

        test('sets the aps.alert.subtitle property', () => {
          expect(compiledOutput()).toHaveProperty('aps.alert.subtitle', 'Welcome')
        })
      })

      describe('setSubtitle', () => {
        test('is chainable', () => {
          expect(note.setSubtitle('Bienvenue')).toBe(note)
          expect(compiledOutput()).toHaveProperty('aps.alert.subtitle', 'Bienvenue')
        })
      })
    })
    describe('titleLocKey', () => {
      test('sets the aps.alert.title-loc-key property', () => {
        note.titleLocKey = 'Warning'
        expect(compiledOutput()).toHaveProperty('aps.alert.title-loc-key', 'Warning')
      })

      describe('alert is already an object', () => {
        beforeEach(() => {
          note.alert = { body: 'Test', 'launch-image': 'test.png' }
          note.titleLocKey = 'Warning'
        })

        test('contains all expected properties', () => {
          expect(compiledOutput()).toHaveProperty('aps.alert', {
            body: 'Test',
            'launch-image': 'test.png',
            'title-loc-key': 'Warning',
          })
        })
      })

      describe('alert is already a string', () => {
        beforeEach(() => {
          note.alert = 'Hello, world'
          note.titleLocKey = 'Warning'
        })

        test('retains the alert body correctly', () => {
          expect(compiledOutput()).toHaveProperty('aps.alert.body', 'Hello, world')
        })

        test('sets the aps.alert.title-loc-key property', () => {
          expect(compiledOutput()).toHaveProperty('aps.alert.title-loc-key', 'Warning')
        })
      })

      describe('setAlert', () => {
        test('is chainable', () => {
          expect(note.setTitleLocKey('greeting')).toBe(note)
          expect(compiledOutput()).toHaveProperty('aps.alert.title-loc-key', 'greeting')
        })
      })
    })

    describe('titleLocArgs', () => {
      test('sets the aps.alert.title-loc-args property', () => {
        note.titleLocArgs = ['arg1', 'arg2']
        expect(compiledOutput()).toHaveProperty('aps.alert.title-loc-args', ['arg1', 'arg2'])
      })

      describe('alert is already an object', () => {
        beforeEach(() => {
          note.alert = { body: 'Test', 'launch-image': 'test.png' }
          note.titleLocArgs = ['Hi there']
        })

        test('contains all expected properties', () => {
          expect(compiledOutput()).toHaveProperty('aps.alert', {
            body: 'Test',
            'launch-image': 'test.png',
            'title-loc-args': ['Hi there'],
          })
        })
      })

      describe('alert is already a string', () => {
        beforeEach(() => {
          note.alert = 'Hello, world'
          note.titleLocArgs = ['Hi there']
        })

        test('retains the alert body', () => {
          expect(compiledOutput()).toHaveProperty('aps.alert.body', 'Hello, world')
        })

        test('sets the aps.alert.title-loc-args property', () => {
          expect(compiledOutput()).toHaveProperty('aps.alert.title-loc-args', ['Hi there'])
        })
      })

      describe('setTitleLocArgs', () => {
        test('is chainable', () => {
          expect(note.setTitleLocArgs(['iPhone 6s'])).toBe(note)
          expect(compiledOutput()).toHaveProperty('aps.alert.title-loc-args', ['iPhone 6s'])
        })
      })
    })

    describe('action', () => {
      test('sets the aps.alert.action property', () => {
        note.action = 'View'
        expect(compiledOutput()).toHaveProperty('aps.alert.action', 'View')
      })

      describe('alert is already an object', () => {
        beforeEach(() => {
          note.alert = { body: 'Test', 'launch-image': 'test.png' }
          note.action = 'View'
        })

        test('contains all expected properties', () => {
          expect(compiledOutput()).toHaveProperty('aps.alert', {
            body: 'Test',
            'launch-image': 'test.png',
            action: 'View',
          })
        })
      })

      describe('alert is already a string', () => {
        beforeEach(() => {
          note.alert = 'Alert'
          note.action = 'Investigate'
        })

        test('retains the alert body', () => {
          expect(compiledOutput()).toHaveProperty('aps.alert.body', 'Alert')
        })

        test('sets the aps.alert.action property', () => {
          expect(compiledOutput()).toHaveProperty('aps.alert.action', 'Investigate')
        })
      })

      describe('setAction', () => {
        test('is chainable', () => {
          expect(note.setAction('Reply')).toBe(note)
          expect(compiledOutput()).toHaveProperty('aps.alert.action', 'Reply')
        })
      })
    })

    describe('actionLocKey', () => {
      test('sets the aps.alert.action-loc-key property', () => {
        note.actionLocKey = 'reply_title'
        expect(compiledOutput()).toHaveProperty('aps.alert.action-loc-key', 'reply_title')
      })

      describe('alert is already an object', () => {
        beforeEach(() => {
          note.alert = { body: 'Test', 'launch-image': 'test.png' }
          note.actionLocKey = 'reply_title'
        })

        test('contains all expected properties', () => {
          expect(compiledOutput()).toHaveProperty('aps.alert', {
            body: 'Test',
            'launch-image': 'test.png',
            'action-loc-key': 'reply_title',
          })
        })
      })

      describe('alert is already a string', () => {
        beforeEach(() => {
          note.alert = 'Hello, world'
          note.actionLocKey = 'ignore_title'
        })

        test('retains the alert body correctly', () => {
          expect(compiledOutput()).toHaveProperty('aps.alert.body', 'Hello, world')
        })

        test('sets the aps.alert.action-loc-key property', () => {
          expect(compiledOutput()).toHaveProperty('aps.alert.action-loc-key', 'ignore_title')
        })
      })

      describe('setActionLocKey', () => {
        test('is chainable', () => {
          expect(note.setActionLocKey('ignore_title')).toBe(note)
          expect(compiledOutput()).toHaveProperty('aps.alert.action-loc-key', 'ignore_title')
        })
      })
    })

    describe('launchImage', () => {
      test('sets the aps.alert.launch-image property', () => {
        note.launchImage = 'testLaunch.png'
        expect(compiledOutput()).toHaveProperty('aps.alert.launch-image', 'testLaunch.png')
      })

      describe('alert is already an object', () => {
        beforeEach(() => {
          note.alert = { body: 'Test', 'title-loc-key': 'node-apn' }
          note.launchImage = 'apnLaunch.png'
        })

        test('contains all expected properties', () => {
          expect(compiledOutput()).toHaveProperty('aps.alert', {
            body: 'Test',
            'title-loc-key': 'node-apn',
            'launch-image': 'apnLaunch.png',
          })
        })
      })

      describe('alert is already a string', () => {
        beforeEach(() => {
          note.alert = 'Hello, world'
          note.launchImage = 'apnLaunch.png'
        })

        test('retains the alert body', () => {
          expect(compiledOutput()).toHaveProperty('aps.alert.body', 'Hello, world')
        })

        test('sets the aps.alert.launch-image property', () => {
          expect(compiledOutput()).toHaveProperty('aps.alert.launch-image', 'apnLaunch.png')
        })
      })

      describe('setLaunchImage', () => {
        test('is chainable', () => {
          expect(note.setLaunchImage('remoteLaunch.png')).toBe(note)
          expect(compiledOutput()).toHaveProperty('aps.alert.launch-image', 'remoteLaunch.png')
        })
      })
    })

    describe('badge', () => {
      test('defaults to undefined', () => {
        expect(compiledOutput()).not.toHaveProperty('aps.badge')
      })

      test('can be set to a number', () => {
        note.badge = 5

        expect(compiledOutput()).toHaveProperty('aps.badge', 5)
      })

      test('can be set to undefined', () => {
        note.badge = 5
        note.badge = undefined

        expect(compiledOutput()).not.toHaveProperty('aps.badge')
      })

      test('can be set to zero', () => {
        note.badge = 0

        expect(compiledOutput()).toHaveProperty('aps.badge', 0)
      })

      test('cannot be set to a string', () => {
        note.badge = 'hello'

        expect(compiledOutput()).not.toHaveProperty('aps.badge')
      })

      describe('setBadge', () => {
        test('is chainable', () => {
          expect(note.setBadge(7)).toBe(note)
          expect(compiledOutput()).toHaveProperty('aps.badge', 7)
        })
      })
    })

    describe('sound', () => {
      test('defaults to undefined', () => {
        expect(compiledOutput()).not.toHaveProperty('aps.sound')
      })

      test('can be set to a string', () => {
        note.sound = 'sound.caf'

        expect(compiledOutput()).toHaveProperty('aps.sound', 'sound.caf')
      })

      test('can be set to undefined', () => {
        note.sound = 'sound.caf'
        note.sound = undefined

        expect(compiledOutput()).not.toHaveProperty('aps.sound')
      })

      test('cannot be set to a number', () => {
        note.sound = 5

        expect(compiledOutput()).not.toHaveProperty('aps.sound')
      })

      test('can be set to object', () => {
        note.sound = {
          name: 'sound.caf',
          critical: 1,
          volume: 0.75,
        }

        expect(compiledOutput()).toHaveProperty('aps.sound.name', 'sound.caf')
        expect(compiledOutput()).toHaveProperty('aps.sound.critical', 1)
        expect(compiledOutput()).toHaveProperty('aps.sound.volume', 0.75)
      })

      describe('setSound', () => {
        test('is chainable', () => {
          expect(note.setSound('bee.caf')).toBe(note)
          expect(compiledOutput()).toHaveProperty('aps.sound', 'bee.caf')
        })
      })
    })

    describe('content-available', () => {
      test('defaults to undefined', () => {
        expect(compiledOutput()).not.toHaveProperty('aps.content-available')
      })

      test('can be set to a boolean value', () => {
        note.contentAvailable = true

        expect(compiledOutput()).toHaveProperty('aps.content-available', 1)
      })

      test('can be set to `1`', () => {
        note.contentAvailable = 1

        expect(compiledOutput()).toHaveProperty('aps.content-available', 1)
      })

      test('can be set to undefined', () => {
        note.contentAvailable = true
        note.contentAvailable = undefined

        expect(compiledOutput()).not.toHaveProperty('aps.content-available')
      })

      describe('setContentAvailable', () => {
        test('is chainable', () => {
          expect(note.setContentAvailable(true)).toBe(note)
          expect(compiledOutput()).toHaveProperty('aps.content-available', 1)
        })
      })
    })

    describe('mutable-content', () => {
      test('defaults to undefined', () => {
        expect(compiledOutput()).not.toHaveProperty('aps.mutable-content')
      })

      test('can be set to a boolean value', () => {
        note.mutableContent = true

        expect(compiledOutput()).toHaveProperty('aps.mutable-content', 1)
      })

      test('can be set to `1`', () => {
        note.mutableContent = 1

        expect(compiledOutput()).toHaveProperty('aps.mutable-content', 1)
      })

      test('can be set to undefined', () => {
        note.mutableContent = true
        note.mutableContent = undefined

        expect(compiledOutput()).not.toHaveProperty('aps.mutable-content')
      })

      describe('setMutableContent', () => {
        test('is chainable', () => {
          expect(note.setMutableContent(true)).toBe(note)
          expect(compiledOutput()).toHaveProperty('aps.mutable-content', 1)
        })
      })
    })

    describe('mdm', () => {
      test('defaults to undefined', () => {
        expect(compiledOutput()).not.toHaveProperty('mdm')
      })

      test('can be set to a string', () => {
        note.mdm = 'mdm payload'

        expect(compiledOutput()).toEqual({ mdm: 'mdm payload' })
      })

      test('can be set to undefined', () => {
        note.mdm = 'mdm payload'
        note.mdm = undefined

        expect(compiledOutput()).not.toHaveProperty('mdm')
      })

      test('does not include the aps payload', () => {
        note.mdm = 'mdm payload'
        note.badge = 5

        expect(compiledOutput()).not.toHaveProperty('aps')
      })

      describe('setMdm', () => {
        test('is chainable', () => {
          expect(note.setMdm('hello')).toBe(note)
          expect(compiledOutput()).toHaveProperty('mdm', 'hello')
        })
      })
    })

    describe('urlArgs', () => {
      test('defaults to undefined', () => {
        expect(compiledOutput()).not.toHaveProperty('aps.url-args')
      })

      test('can be set to an array', () => {
        note.urlArgs = ['arg1', 'arg2']

        expect(compiledOutput()).toHaveProperty('aps.url-args', ['arg1', 'arg2'])
      })

      test('can be set to undefined', () => {
        note.urlArgs = ['arg1', 'arg2']
        note.urlArgs = undefined

        expect(compiledOutput()).not.toHaveProperty('aps.url-args')
      })

      describe('setUrlArgs', () => {
        test('is chainable', () => {
          expect(note.setUrlArgs(['A318', 'BA001'])).toBe(note)
          expect(compiledOutput()).toHaveProperty('aps.url-args', ['A318', 'BA001'])
        })
      })
    })

    describe('category', () => {
      test('defaults to undefined', () => {
        expect(compiledOutput()).not.toHaveProperty('aps.category')
      })

      test('can be set to a string', () => {
        note.category = 'the-category'
        expect(compiledOutput()).toHaveProperty('aps.category', 'the-category')
      })

      test('can be set to undefined', () => {
        note.category = 'the-category'
        note.category = undefined
        expect(compiledOutput()).not.toHaveProperty('aps.category')
      })

      describe('setCategory', () => {
        test('is chainable', () => {
          expect(note.setCategory('reminder')).toBe(note)
          expect(compiledOutput()).toHaveProperty('aps.category', 'reminder')
        })
      })
    })

    describe('target-content-id', () => {
      test('defaults to undefined', () => {
        expect(compiledOutput()).not.toHaveProperty('aps.target-content-id')
      })

      test('can be set to a string', () => {
        note.targetContentIdentifier = 'the-target-content-id'

        expect(compiledOutput()).toHaveProperty('aps.target-content-id', 'the-target-content-id')
      })

      test('can be set to undefined', () => {
        note.targetContentIdentifier = 'the-target-content-identifier'
        note.targetContentIdentifier = undefined

        expect(compiledOutput()).not.toHaveProperty('aps.target-content-id')
      })

      describe('setTargetContentIdentifier', () => {
        test('is chainable', () => {
          expect(note.setTargetContentIdentifier('the-target-content-id')).toBe(note)
          expect(compiledOutput()).toHaveProperty('aps.target-content-id', 'the-target-content-id')
        })
      })
    })

    describe('thread-id', () => {
      test('defaults to undefined', () => {
        expect(compiledOutput()).not.toHaveProperty('aps.thread-id')
      })

      test('can be set to a string', () => {
        note.threadId = 'the-thread-id'

        expect(compiledOutput()).toHaveProperty('aps.thread-id', 'the-thread-id')
      })

      test('can be set to undefined', () => {
        note.threadId = 'the-thread-id'
        note.threadId = undefined

        expect(compiledOutput()).not.toHaveProperty('aps.thread-id')
      })

      describe('setThreadId', () => {
        test('is chainable', () => {
          expect(note.setThreadId('the-thread-id')).toBe(note)
          expect(compiledOutput()).toHaveProperty('aps.thread-id', 'the-thread-id')
        })
      })
    })

    describe('interruption-level', () => {
      test('defaults to undefined', () => {
        expect(compiledOutput()).not.toHaveProperty('aps.interruption-level')
      })

      test('can be set to a string', () => {
        note.interruptionLevel = 'the-interruption-level'

        expect(compiledOutput()).toHaveProperty('aps.interruption-level', 'the-interruption-level')
      })

      test('can be set to undefined', () => {
        note.interruptionLevel = 'the-interruption-level'
        note.interruptionLevel = undefined

        expect(compiledOutput()).not.toHaveProperty('aps.interruption-level')
      })

      describe('setInterruptionLevel', () => {
        test('is chainable', () => {
          expect(note.setInterruptionLevel('the-interruption-level')).toBe(note)
          expect(compiledOutput()).toHaveProperty('aps.interruption-level', 'the-interruption-level')
        })
      })
    })

    describe('when no aps properties are set', () => {
      test('is not present', () => {
        expect(compiledOutput().aps).toBeUndefined()
      })
    })
  })

  function compiledOutput() {
    return JSON.parse(note.compile())
  }
})
