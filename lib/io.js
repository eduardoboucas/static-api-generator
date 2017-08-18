'use strict'

const fs = require('fs')
const mkdirp = require('mkdirp-promise')
const objectPath = require('object-path')
const path = require('path')
const rimraf = require('rimraf-promise')
const walk = require('walk')
const yaml = require('js-yaml')

const IOHelpers = function () {}

IOHelpers.prototype.ensureDirectory = function (directory) {
  return mkdirp(directory)
}

IOHelpers.prototype.parseFile = function (contents, extension) {
  switch (extension) {
    case '.yml':
    case '.yaml':
      return Promise.resolve(yaml.safeLoad(contents))
  }

  return Promise.resolve(contents)
}

IOHelpers.prototype.readFile = function (file, parse) {
  const extension = path.extname(file)

  return new Promise((resolve, reject) => {
    fs.readFile(file, 'utf8', (err, content) => {
      if (err) return reject(err)

      if (parse) {
        return resolve(this.parseFile(content, extension))
      }

      return resolve(content)
    })
  })
}

IOHelpers.prototype.removeDirectory = function (directory) {
  return rimraf(directory)
}

IOHelpers.prototype.walkDirectory = function (directory) {
  const walker = walk.walk(directory, {})

  let paths = {}
  let tree = {}

  return new Promise((resolve, reject) => {
    walker.on('directory', (root, stat, next) => {
      const basePath = root.split('/').slice(1).join('.')

      if (objectPath.get(tree, basePath) === null) {
        objectPath.set(tree, basePath, {})
      }

      const directoryPath = basePath ? `${basePath}.${stat.name}` : stat.name

      objectPath.set(tree, directoryPath, null)

      const newPath = path.relative(
        directory,
        path.join(root, stat.name)
      )

      paths[newPath] = {
        directory: true
      }

      next()
    })

    walker.on('file', (root, stat, next) => {
      if (stat.name.indexOf('.') === 0) return next()

      const basePath = root.split('/').slice(1).join('.')
      const filePath = path.relative(
        directory,
        path.join(root, stat.name)
      )

      objectPath.push(tree, basePath, filePath)

      paths[filePath] = {
        file: true
      }

      next()
    })

    walker.on('end', (root, stat, next) => {
      return resolve({
        paths,
        tree
      })
    })
  })
}

IOHelpers.prototype.writeFile = function (target, content) {
  content = JSON.stringify(content)

  return this.ensureDirectory(path.dirname(target)).then(() => {
    return new Promise((resolve, reject) => {
      fs.writeFile(target, content, err => {
        if (err) return reject(err)

        return resolve()
      })
    })
  })
}

module.exports = new IOHelpers()
