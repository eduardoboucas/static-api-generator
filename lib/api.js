'use strict'

const io = require('./io')
const md5 = require('md5')
const multimatch = require('multimatch')
const path = require('path')
const pluralize = require('pluralize')

const API = function ({blueprint, targetDirectory}) {
  this.blueprint = this._parseBlueprint(blueprint)
  this.targetDirectory = targetDirectory

  const baseDirectory = this.blueprint.base.join('/')

  this.walk = io.walkDirectory(baseDirectory).then(({paths, tree}) => {
    this.paths = paths
    this.tree = tree
  }).then(() => {
    return io.removeDirectory(targetDirectory)
  })
}

API.prototype._generateBlobForLevel = function (level) {
  return this.blueprint.base.join('/') + '/*'.repeat(level + 1)
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

API.prototype._processLevel = function ({
  addIdToFiles,
  currentDepth,
  customFields,
  depth,
  initialLevel,
  nodeName,
  pluralise,
  queue,
  tree
}) {
  currentDepth = currentDepth || 0

  const levelName = this.blueprint.levels[initialLevel + currentDepth]
  const subLevelName = this.blueprint.levels[initialLevel + currentDepth + 1]
  const subLevelNamePlural = pluralise ? pluralize(subLevelName) : subLevelName

  let item = {
    [`${levelName}_id`]: nodeName
  }

  if (customFields[levelName]) {
    Object.keys(customFields[levelName]).forEach(customField => {
      if (typeof customFields[levelName][customField] === 'function') {
        item[customField] = customFields[levelName][customField](nodeName, tree)
      } else {
        item[customField] = customFields[levelName][customField]
      }
    })
  }

  if (!tree) {
    item[subLevelName] = null

    return item
  }

  if (currentDepth < depth) {
    if (Array.isArray(tree)) {
      item[subLevelNamePlural] = []

      tree.forEach((file, index) => {
        const id = addIdToFiles ? {
          [`${subLevelName}_id`]: md5(file)
        } : {}
        const read = io.readFile(file, true).then(contents => {
          item[subLevelNamePlural][index] = Object.assign({}, id, contents)
        })

        queue.push(read)
      })
    } else {
      const subLevels = Object.keys(tree).map(node => {
        return this._processLevel({
          addIdToFiles,
          currentDepth: currentDepth + 1,
          customFields,
          depth,
          initialLevel,
          nodeName: node,
          pluralise,
          queue,
          tree: tree[node]
        })
      })

      if (!nodeName) {
        return {
          [subLevelNamePlural]: subLevels
        }
      }

      item[subLevelNamePlural] = subLevels
    }
  }

  return item
}

API.prototype.addEndpoint = function ({
  addIdToFiles = false,
  customFields = {},
  depth,
  forEach,
  pluralise = true
}) {
  depth = Math.max(1, depth)

  return this.walk.then(() => {
    const initialLevel = forEach
     ? this.blueprint.levels.findIndex(l => l === forEach)
     : 0
    const blob = this._generateBlobForLevel(initialLevel)
    const matches = multimatch(this.paths, blob)

    let files = {}
    let queue = []

    matches.forEach(match => {
      let currentPath = match.split('/')
      let subTree = Object.assign({}, this.tree)

      currentPath.forEach(node => {
        subTree = subTree[node]
      })

      const targetFile = path.join(
        this.targetDirectory,
        `${currentPath.join('/')}.json`
      )

      const item = this._processLevel({
        addIdToFiles,
        customFields,
        depth,
        initialLevel,
        pluralise,
        queue,
        tree: subTree
      })

      files[targetFile] = item
    })

    return Promise.all(queue).then(() => {
      const writes = Object.keys(files).map(name => {
        // console.log('** Creating', name, files[name])

        // return io.writeFile(name, files[name])
      })

      console.log(JSON.stringify(files, null, 2))

      return Promise.all(writes)
    })
  })
}

module.exports = API
