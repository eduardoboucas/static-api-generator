'use strict'

const deepmerge = require('deepmerge')
const io = require('./io')
const md5 = require('md5')
const multimatch = require('multimatch')
const objectPath = require('object-path')
const path = require('path')
const pluralize = require('pluralize')

const API = function ({
  addIdToFiles = true,
  blueprint,
  outputPath = 'output',
  pluralise = true
}) {
  this.blueprint = this._parseBlueprint(blueprint)
  this.addIdToFiles = addIdToFiles
  this.usePluralisation = pluralise
  this.outputPath = outputPath
  this.baseDirectory = this.blueprint.base.join('/')
  this.readQueue = {}

  this.walk = io
    .walkDirectory(this.baseDirectory)
    .then(({paths, tree}) => {
      this.paths = paths
      this.tree = tree
    })
    .then(() => io.removeDirectory(outputPath))
}

API.prototype._createEndpointPayload = function ({
  itemsPerPage,
  name,
  page = 1,
  results,
  targetObj
}) {
  const filePath = this._getPaginatedFilename(name, page)
  const pageOffset = (page - 1) * itemsPerPage
  const numPages = Math.ceil(results.length / itemsPerPage)

  let metadata = {
    itemsPerPage,
    pages: numPages
  }

  if (page > 1) {
    metadata.previousPage = this._getPaginatedURL(
      name,
      page - 1
    )
  }

  if (page < numPages) {
    metadata.nextPage = this._getPaginatedURL(
      name,
      page + 1
    )
  }

  targetObj[filePath] = {
    results: results.slice(pageOffset, pageOffset + itemsPerPage),
    metadata
  }

  if (page < numPages) {
    this._createEndpointPayload({
      itemsPerPage,
      name,
      page: page + 1,
      results,
      targetObj
    })
  }
}

API.prototype._filterTreeLevels = function ({
  currentLevel = 0,
  displayLevels,
  rootNode,
  tree,
  unassignedKeys
}) {
  const includesNextLevel = displayLevels.includes(currentLevel + 1)
  const newUnassignedKeys = !includesNextLevel && rootNode

  if (!tree || Array.isArray(tree)) {
    if (includesNextLevel) {
      return tree
    }

    if (unassignedKeys) {
      return {}
    }

    return null
  }

  let filteredTree = {}

  if (includesNextLevel) {
    Object.keys(tree).forEach(key => {
      filteredTree[key] = this._filterTreeLevels({
        currentLevel: currentLevel + 1,
        displayLevels,
        rootNode,
        tree: tree[key],
        unassignedKeys: newUnassignedKeys
      })
    })
  } else {
    const treeValues = Object.keys(tree).map(key => this._filterTreeLevels({
      currentLevel: currentLevel + 1,
      displayLevels,
      rootNode,
      tree: tree[key],
      unassignedKeys: newUnassignedKeys
    })).filter(Boolean)

    filteredTree = treeValues.length > 1
      ? deepmerge.all(treeValues)
      : treeValues[0]
  }

  return filteredTree
}

API.prototype._getAggregator = function ({
  cumulativePath = [],
  currentLevel = 0,
  targetLevel,
  targetObject,
  tree
}) {
  if (!tree) {
    return
  }

  if (currentLevel > targetLevel) {
    targetObject[cumulativePath.join('/')] = tree

    return
  }

  if (Array.isArray(tree)) {
    tree.forEach(file => {
      const extension = path.extname(file)

      targetObject[file.slice(0, file.lastIndexOf(extension))] = file
    })

    return
  }

  return Object.keys(tree).map(node => {
    return this._getAggregator({
      cumulativePath: cumulativePath.concat(node),
      currentLevel: currentLevel + 1,
      targetLevel,
      targetObject,
      tree: tree[node]
    })
  })
}

API.prototype._getCompareFunction = function (order, field) {
  return (a, b) => {
    const itemA = field ? a[field] : a
    const itemB = field ? b[field] : b
    const diff = order === 'descending'
      ? itemB - itemA
      : itemA - itemB

    if (diff < 0) {
      return -1
    } else if (diff > 0) {
      return 1
    }

    return 0
  }
}

API.prototype._getEndpointTree = function (baseLevel, displayLevels) {
  const matches = multimatch(
    Object.keys(this.paths),
    '*' + '/*'.repeat(baseLevel)
  )

  let tree = {}

  matches.forEach(match => {
    let matchPath
    let newDataAtMatchPath

    if (this.paths[match] && this.paths[match].file) {
      matchPath = path.dirname(match) + path.basename(match, path.extname(match))
      newDataAtMatchPath = match
    } else {
      const matchNodes = match.split('/')
      const matchRoot = matchNodes[matchNodes.length - 1]

      const subTree = this._filterTreeLevels({
        currentLevel: matchNodes.length - 1,
        displayLevels,
        rootNode: matchNodes[0],
        tree: objectPath.get(this.tree, matchNodes.join('.'))
      })

      matchPath = [matchRoot]
        .concat(matchNodes.slice(0, -1))
        .filter((node, index) => displayLevels.includes(index))
        .join('.')

      const dataAtMatchPath = objectPath.get(tree, matchPath)

      newDataAtMatchPath = dataAtMatchPath
        ? deepmerge(dataAtMatchPath, subTree)
        : subTree
    }

    objectPath.set(tree, matchPath, newDataAtMatchPath)
  })

  return tree
}

API.prototype._getFileContents = function (filePath, levelName, readQueue) {
  this.readQueue[filePath] = this.readQueue[filePath] ||
    io.readFile(filePath, true)

  const read = this.readQueue[filePath].then(contents => {
    const fileContents = this.addIdToFiles
      ? Object.assign({}, {
        [`${levelName}_id`]: md5(filePath)
      }, contents)
      : contents

    return fileContents
  })

  readQueue.push(read)

  return read
}

API.prototype._getLevelNames = function (baseLevel) {
  let levels = Array.from(this.blueprint.levels)
  const base = levels.splice(baseLevel, 1)

  return base.concat(levels)
}

API.prototype._getOutputFromTree = function ({
  level = 0,
  levelNames,
  parentLevelName = null,
  privateReadQueue,
  root = null,
  sort,
  tree
}) {
  const levelName = levelNames[level]

  if (!tree && level < levelNames.length) {
    return null
  }

  let newTree = {}

  if (root) {
    newTree[parentLevelName + '_id'] = root
  }

  if (tree) {
    const nodeName = root
      ? this._pluralise(levelName)
      : 'results'

    if (Array.isArray(tree)) {
      newTree[nodeName] = []

      tree.forEach(file => {
        const filePath = path.join(this.baseDirectory, file)

        this._getFileContents(filePath, levelName, privateReadQueue)
          .then(fileContents => {
            if (sort[levelName]) {
              newTree[nodeName] = this._mergeSortedArrays(
                newTree[nodeName],
                [fileContents],
                this._getCompareFunction(
                  sort[levelName].order,
                  sort[levelName].field
                )
              )
            } else {
              newTree[nodeName].push(fileContents)
            }
          })
      })
    } else {
      let sortedKeys = Object.keys(tree)

      if (sortedKeys.length === 0) {
        newTree[nodeName] = []

        return newTree
      }

      if (sort[levelName]) {
        const compareFn = this._getCompareFunction(
          sort[levelName].order
        )

        sortedKeys = sortedKeys.sort(compareFn)
      }

      newTree[nodeName] = sortedKeys.map((node, index) => {
        if (typeof tree[node] === 'string') {
          const filePath = path.join(this.baseDirectory, tree[node])

          this._getFileContents(filePath, levelName, privateReadQueue)
            .then(fileContents => {
              newTree[nodeName][index] = fileContents
            })

          return
        }

        return this._getOutputFromTree({
          level: level + 1,
          levelNames,
          parentLevelName: levelName,
          privateReadQueue,
          root: node,
          sort,
          tree: tree[node]
        })
      })
    }
  }

  return newTree
}

API.prototype._getPaginatedFilename = function (filePath, page) {
  return path.join(
    this.outputPath,
    this._getPaginatedURL(filePath, page)
  )
}

API.prototype._getPaginatedURL = function (filePath, page) {
  return '/' + filePath + (page > 1 ? `-${page}` : '') + '.json'
}

API.prototype._mergeSortedArrays = function (a, b, compareFn) {
  let result = []
  let i = 0
  let j = 0

  while (a[i] && b[j]) {
    if (compareFn(a[i], b[j]) === -1) {
      result.push(a[i])

      i++
    } else {
      result.push(b[j])

      j++
    }
  }

  return result.concat(a.slice(i)).concat(b.slice(j))
}

API.prototype._parseBlueprint = function (blueprint) {
  let parsedblueprint = {
    base: [],
    levels: []
  }

  blueprint.split('/').forEach(node => {
    if (node.indexOf(':') === 0) {
      parsedblueprint.levels.push(node.slice(1))
    } else {
      parsedblueprint.base.push(node)
    }
  })

  return parsedblueprint
}

API.prototype._pluralise = function (text) {
  return text && this.usePluralisation
    ? pluralize(text)
    : text
}

API.prototype.generate = function ({
  endpoints: aggregators = [],
  entriesPerPage: itemsPerPage = 10,
  index: endpointPath,
  levels,
  root = this.blueprint.levels[0],
  sort = {}
}) {
  return this.walk.then(() => {
    const baseLevel = root
     ? this.blueprint.levels.findIndex(l => l === root)
     : 0
    const levelNames = this._getLevelNames(baseLevel)
    const displayLevels = (levels || levelNames)
      .map(name => {
        return levelNames.findIndex(level => level === name)
      })
      .filter(index => index > -1)
      .concat(0)
    const displayLevelNames = levelNames.filter((level, index) => {
      return displayLevels.includes(index)
    })
    const endpointTree = this._getEndpointTree(baseLevel, displayLevels)

    let files = {}
    let queue = []

    const mainResults = this._getOutputFromTree({
      levelNames: displayLevelNames,
      privateReadQueue: queue,
      sort,
      tree: endpointTree
    }).results

    this._createEndpointPayload({
      itemsPerPage,
      name: endpointPath || this._pluralise(levelNames[0]),
      results: mainResults,
      targetObj: files
    })

    let aggregatorResults = {}

    aggregators.forEach(levelName => {
      const level = displayLevelNames.findIndex(level => level === levelName)

      let aggregatorFiles = {}

      this._getAggregator({
        tree: endpointTree,
        targetLevel: level,
        targetObject: aggregatorFiles
      })

      Object.keys(aggregatorFiles).forEach(file => {
        if (typeof aggregatorFiles[file] === 'string') {
          const inputFilePath = path.join(this.baseDirectory, aggregatorFiles[file])
          const outputFilePath = this._getPaginatedFilename(file, 1)

          this._getFileContents(inputFilePath, levelName, queue)
            .then(fileContents => {
              files[outputFilePath] = fileContents
            })
        } else {
          aggregatorResults[file] = this._getOutputFromTree({
            level: level + 1,
            levelNames: displayLevelNames,
            parentLevelName: levelName,
            privateReadQueue: queue,
            sort,
            tree: aggregatorFiles[file]
          })
        }
      })
    })

    return Promise.all(queue).then(() => {
      Object.keys(aggregatorResults).forEach(file => {
        this._createEndpointPayload({
          itemsPerPage,
          name: file,
          results: aggregatorResults[file].results,
          targetObj: files
        })
      })

      const writes = Object.keys(files).map(name => {
        console.log('** Creating file:', name)

        return io.writeFile(name, files[name])
      })

      return Promise.all(writes)
    })
  })
}

module.exports = API
