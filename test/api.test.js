'use strict'

const API = require('./../lib/api')
const mockBlueprint = 'data/:username/:repository/:message'

beforeEach(() => {
  jest.resetModules()
})

describe('API', () => {
  describe('initialisation', () => {
    test('parses the blueprint', () => {
      const spy = jest.spyOn(API.prototype, '_parseBlueprint')
      const api = new API({
        blueprint: mockBlueprint
      })

      expect(spy).toHaveBeenCalledTimes(1)
      expect(spy.mock.calls[0][0]).toBe(mockBlueprint)
    })

    // test('initiates a walk through the base directory', () => {
    //   const mockWalkDirectory = jest.fn(() => Promise.resolve({
    //     path: 'path',
    //     tree: 'tree'
    //   }))

    //   jest.mock('./../lib/io', {
    //     walkDirectory: mockWalkDirectory
    //   })

    //   const api = new API({
    //     blueprint: mockBlueprint
    //   })

    //   console.log(mockWalkDirectory.mock.calls)

    //   jest.unmock('./../lib/io')
    // })
  })
})