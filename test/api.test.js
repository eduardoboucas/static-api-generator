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

    test('splits paginated results across multiple files and adds correct metadata block', () => {
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

  describe('`_filterTreeLevels()`', () => {
    const mockTree = {
      english: {
        action: {
          2015: [
            'movie1.yaml',
            'movie2.yaml',
            'movie3.yaml'
          ],
          2016: [
            'movie4.yaml',
            'movie5.yaml'
          ]
        },
        horror: {
          2016: [
            'movie6.yaml',
            'movie7.yaml'
          ],
          2017: [
            'movie8.yaml',
            'movie9.yaml'
          ]
        }
      },
      portuguese: {
        action: {
          2015: [
            'movie10.yaml'
          ]
        },
        horror: {
          2017: [
            'movie11.yaml',
            'movie12.yaml'
          ]
        }
      }
    }

    test('returns original tree if all levels are to be displayed', () => {
      const api = new API({
        blueprint: mockBlueprint,
        outputPath: mockOutputPath
      })
      

      const filteredTree = api._filterTreeLevels({
        currentLevel: 0,
        displayLevels: [1, 2, 3, 4],
        rootNode: 'movies',
        tree: mockTree
      })

      expect(filteredTree).toEqual(mockTree)
    })

    test('returns modified tree if first level is not displayed', () => {
      const api = new API({
        blueprint: mockBlueprint,
        outputPath: mockOutputPath
      })

      const filteredTree = api._filterTreeLevels({
        currentLevel: 0,
        displayLevels: [2, 3, 4],
        rootNode: 'movies',
        tree: mockTree
      })

      expect(filteredTree).toEqual({
        action: {
          2015: [
            'movie1.yaml',
            'movie2.yaml',
            'movie3.yaml',
            'movie10.yaml'
          ],
          2016: [
            'movie4.yaml',
            'movie5.yaml'          
          ]
        },
        horror: {
          2016: [
            'movie6.yaml',
            'movie7.yaml'
          ],
          2017: [
            'movie8.yaml',
            'movie9.yaml',
            'movie11.yaml',
            'movie12.yaml'            
          ]
        }
      })
    })

    test('returns modified tree if intermediate level is not displayed', () => {
      const api = new API({
        blueprint: mockBlueprint,
        outputPath: mockOutputPath
      })

      const filteredTree = api._filterTreeLevels({
        currentLevel: 0,
        displayLevels: [1, 3, 4],
        rootNode: 'movies',
        tree: mockTree
      })

      expect(filteredTree).toEqual({
        english: {
          2015: [
            'movie1.yaml',
            'movie2.yaml',
            'movie3.yaml'
          ],
          2016: [
            'movie4.yaml',
            'movie5.yaml',
            'movie6.yaml',
            'movie7.yaml'          
          ],
          2017: [
            'movie8.yaml',
            'movie9.yaml'
          ]
        },
        portuguese: {
          2015: [
            'movie10.yaml'
          ],
          2017: [
            'movie11.yaml',
            'movie12.yaml'        
          ]
        }
      })
    })

    test('returns modified tree if two intermediate levels are not displayed', () => {
      const api = new API({
        blueprint: mockBlueprint,
        outputPath: mockOutputPath
      })

      const filteredTree = api._filterTreeLevels({
        currentLevel: 0,
        displayLevels: [1, 4],
        rootNode: 'movies',
        tree: mockTree
      })

      expect(filteredTree).toEqual({
        english: [
          'movie1.yaml',
          'movie2.yaml',
          'movie3.yaml',
          'movie4.yaml',
          'movie5.yaml',
          'movie6.yaml',
          'movie7.yaml',
          'movie8.yaml',
          'movie9.yaml'
        ],
        portuguese: [
          'movie10.yaml',
          'movie11.yaml',
          'movie12.yaml'
        ]
      })
    })

    test('returns modified tree if last level is not displayed, replacing it with `null`', () => {
      const api = new API({
        blueprint: mockBlueprint,
        outputPath: mockOutputPath
      })

      const filteredTree = api._filterTreeLevels({
        currentLevel: 0,
        displayLevels: [1, 2, 3],
        rootNode: 'movies',
        tree: mockTree
      })

      expect(filteredTree).toEqual({
        english: {
          action: {
            2015: null,
            2016: null
          },
          horror: {
            2016: null,
            2017: null
          }
        },
        portuguese: {
          action: {
            2015: null
          },
          horror: {
            2017: null
          }
        }
      })
    })

    test('returns modified tree if last two levels are not displayed, replacing penultimate level with empty objects', () => {
      const api = new API({
        blueprint: mockBlueprint,
        outputPath: mockOutputPath
      })

      const filteredTree = api._filterTreeLevels({
        currentLevel: 0,
        displayLevels: [1, 2],
        rootNode: 'movies',
        tree: mockTree
      })

      expect(filteredTree).toEqual({
        english: {
          action: {},
          horror: {}
        },
        portuguese: {
          action: {},
          horror: {}
        }
      })
    })
  })
})