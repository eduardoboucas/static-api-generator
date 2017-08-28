'use strict'

const API = require('./../lib/api')
const mockBlueprint = 'data/:username/:repository/:message'
const mockOutputPath = '/Users/johndoe/Sites/movies-api/output'

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
  })

  describe('`_getPaginatedURL()`', () => {
    test('returns the base name + extension for page 1', () => {
      const api = new API({
        blueprint: mockBlueprint
      })

      expect(api._getPaginatedURL('foo', 1)).toBe('/foo.json')
    })

    test('returns the base name + page number + extension for pages >1', () => {
      const api = new API({
        blueprint: mockBlueprint
      })

      expect(api._getPaginatedURL('foo', 2)).toBe('/foo-2.json')
      expect(api._getPaginatedURL('foo', 1000)).toBe('/foo-1000.json')
    })
  })

  describe('`_getPaginatedFilename()`', () => {
    test('returns the full path to the file with name + extension for page 1', () => {
      const api = new API({
        blueprint: mockBlueprint,
        outputPath: mockOutputPath
      })

      expect(api._getPaginatedFilename('foo', 1)).toBe(mockOutputPath + '/foo.json')
    })

    test('returns the full path to the file with name + page number + extension for pages >1', () => {
      const api = new API({
        blueprint: mockBlueprint
      })

      api.outputPath = mockOutputPath

      expect(api._getPaginatedFilename('foo', 2))
        .toBe(mockOutputPath + '/foo-2.json')
      expect(api._getPaginatedFilename('foo', 20000))
        .toBe(mockOutputPath + '/foo-20000.json')
    })
  })

  describe('`_createEndpointPayload()`', () => {
    test('creates an object with a `results` and `metadata` properties', () => {
      const api = new API({
        blueprint: mockBlueprint,
        outputPath: mockOutputPath
      })
      const mockResults = [
        {
          movie_id: '1234567',
          name: 'Casablanca'
        },
        {
          movie_id: '7654321',
          name: 'Gone with the Wind'
        }
      ]

      let files = {}

      api._createEndpointPayload({
        itemsPerPage: 10,
        name: 'movies',
        results: mockResults,
        targetObj: files
      })

      expect(files[`${mockOutputPath}/movies.json`].results)
        .toEqual(mockResults)
      expect(files[`${mockOutputPath}/movies.json`].metadata)
        .toBeDefined()
    })

    test('paginates results and writes them to multiple files', () => {
      const api = new API({
        blueprint: mockBlueprint,
        outputPath: mockOutputPath
      })
      const mockResults = [
        {
          movie_id: '123',
          name: 'Casablanca'
        },
        {
          movie_id: '234',
          name: 'Gone with the Wind'
        },
        {
          movie_id: '345',
          name: 'King Kong'
        },
        {
          movie_id: '456',
          name: 'Rear Window'
        }
      ]

      let files = {}

      api._createEndpointPayload({
        itemsPerPage: 2,
        name: 'movies',
        results: mockResults,
        targetObj: files
      })

      expect(files[`${mockOutputPath}/movies.json`].results)
        .toEqual(mockResults.slice(0, 2))
      expect(files[`${mockOutputPath}/movies.json`].metadata.itemsPerPage)
        .toBe(2)
      expect(files[`${mockOutputPath}/movies.json`].metadata.pages)
        .toBe(Math.ceil(mockResults.length / 2))
      expect(files[`${mockOutputPath}/movies.json`].metadata.nextPage)
        .toBe('/movies-2.json')

      expect(files[`${mockOutputPath}/movies-2.json`].results)
        .toEqual(mockResults.slice(2, 4))
      expect(files[`${mockOutputPath}/movies-2.json`].metadata.itemsPerPage)
        .toBe(2)
      expect(files[`${mockOutputPath}/movies-2.json`].metadata.pages)
        .toBe(Math.ceil(mockResults.length / 2))
      expect(files[`${mockOutputPath}/movies-2.json`].metadata.previousPage)
        .toBe('/movies.json')
    })
  })
})