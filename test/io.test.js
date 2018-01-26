'use strict'

const IOHelpers = require('./../lib/io')

beforeEach(() => {
  jest.resetModules()
})

describe('IO', () => {
  describe('`seprateFrontMatterFromBody`', () => {
    const seperator = '---'
    const frontMatter =
      'title: Title,\ntagline: Tagline,\nseperator: --- Seperator'
    const body = 'The rest of the content.\nNew line in the rest of the content.'

    const result = {
      frontMatter: `title: Title,\ntagline: Tagline,\nseperator: --- Seperator`,
      body: `The rest of the content.\nNew line in the rest of the content.`
    }

    test('perfect contents', () => {
      const contents = `${seperator}\n${frontMatter}\n${seperator}\n${body}`
      expect(IOHelpers.seprateFrontMatterFromBody(contents)).toEqual(result)
    })

    test('contents with empty frontMatter', () => {
      const contents = `${seperator}\n${seperator}\n${body}`
      expect(IOHelpers.seprateFrontMatterFromBody(contents).body).toEqual(result.body)
    })

    describe('funky contents returns all contents', () => {
      test('white space before opening seperator', () => {
        const contents = `    ${seperator}\n${frontMatter}\n${seperator}\n${body}`
        expect(IOHelpers.seprateFrontMatterFromBody(contents)).toBe(contents)
      })

      test('no opening seperator', () => {
        const contents = `${frontMatter}\n${seperator}\n${body}`
        expect(IOHelpers.seprateFrontMatterFromBody(contents)).toBe(contents)
      })

      test('no closing seperator', () => {
        const contents = `${seperator}\n${frontMatter}\n${body}`
        expect(IOHelpers.seprateFrontMatterFromBody(contents)).toBe(contents)
      })
    })
  })

  describe('`parseFile()`', () => {

    const ymlContent = 'budget: 58000000\ntagline: Witness the beginning of a happy ending\ntitle: Deadpool'
    const ymlJson = {
      budget: 58000000,
      tagline: 'Witness the beginning of a happy ending',
      title: 'Deadpool'
    }

    let mdContent = '---\n' + ymlContent + '\n---\nMore content with a \nnew line'

    const mdJson = Object.assign(
      {},
      ymlJson,
      {
        __body: 'More content with a \nnew line'
      }
    )

    test('parse content with .yml extention', () => {
      expect.assertions(1)
      return IOHelpers.parseFile(ymlContent, '.yml').then(json => expect(json).toEqual(ymlJson))
    })

    test('parse content with .yaml extention', () => {
      expect.assertions(1)
      return IOHelpers.parseFile(ymlContent, '.yaml').then(json => expect(json).toEqual(ymlJson))
    })

    test('parse content with .md extention', () => {
      expect.assertions(1)
      return IOHelpers.parseFile(mdContent, '.md').then(json => expect(json).toEqual(mdJson))
    })

    test('parse content with .markdown extention', () => {
      expect.assertions(1)
      return IOHelpers.parseFile(mdContent, '.markdown').then(json => expect(json).toEqual(mdJson))
    })
  })
})