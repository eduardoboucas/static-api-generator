<img src=".github/logo.png" alt="Pluma logo" height="185"/>

[![npm (scoped)](https://img.shields.io/npm/v/pluma.svg?maxAge=10800&style=flat-square)](https://www.npmjs.com/package/pluma)
[![coverage](https://img.shields.io/badge/coverage-88%25-yellow.svg?style=flat?style=flat-square)](https://github.com/dadi/pluma)
[![Build Status](https://travis-ci.org/dadi/pluma.svg?branch=master)](https://travis-ci.org/dadi/pluma)
[![JavaScript Style Guide](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](http://standardjs.com/)

Pluma is a lightweight Node.js application that creates a basic JSON API from a tree of directories and files. Think of a static site generator, like Jekyll or Hugo, but for APIs.

It takes your existing data files, which you may already be using to feed a static site generator or similar, and creates an API layer with whatever structure you want, leaving the original files untouched. Pluma helps you deliver your data to client-side applications or third-party syndication services.

Couple it with services like [GitHub Pages](https://pages.github.com/) or [Netlify](https://www.netlify.com/) and you can serve your API right from the repository too. :boom:

## Usage

Imagine the following repository holding reviews for whisky brands, organised by country of origin. Each review will be in a YAML file within the directory of the brand.

```
data/
|__ american/
|   |_ anchor-distilling/
|   |  |_ review1.yml
|   |  |_ review2.yml
|   |_ bakers/
|   |  |_ review3.yml
|   |_ bernheim/
|   |  |_ review4.yml
|__ japanese/
|   |_ chichibu/
|   |  |_ review7.yml
|   |_ hanyu/
|   |_ nikka/
|   |  |_ review8.yml
|__ scotch/
|   |_ aberlour/
|   |  |_ review9.yml
|   |_ glendronach/
|   |  |_ review10.yml
|   |  |_ review11.yml
|   |_ macallan/
```

1. Initialise Pluma and specifiy the API blueprint, so it can make sense of the data, as well as the base directory where the files will be created.

    ```js
    const api = new Pluma({
      blueprint: 'data/:country/:brand/:review',
      targetDirectory: 'output'
    })
    ```

1. Add an endpoint (or as many as you'd like). The following creates an endpoint that lists all the whisky brands for each country.

    ```js
    api.addEndpoint({
      forEach: 'country'
    })
    ```

    This will generate 3 files: `output/american.json`, `output/japanese.json` and `output/scotch.json`.

    <details>
      <summary><i>output/american.json</i></summary>

      ```json
      {
        "brands": [
          {
            "brand_id": "anchor-distilling"
          },
          {
            "brand_id": "bakers"
          },
          {
            "brand_id": "bernheim"
          }
        ]
      }
      ```
    </details>

1. Configure each endpoint to contain the exact amount of information you want. We can tweak the previous endpoint to also include the list of reviews for each brand, by changing the `depth` property, which configures the amount of nested data levels that the endpoint will pick up.

    ```js
    api.addEndpoint({
      forEach: 'country',
      depth: 2
    })
    ```

    <details>
      <summary><i>output/american.json</i></summary>

      ```json
      {
        "brands": [
          {
            "brand_id": "anchor-distilling",
            "reviews": [
              {
                "review_id": "04440f660f472e81eda881cbd8ee6ab0",
                "name": "John Appleseed",
                "message": "I've got 99 whiskies but this is the one!"
              },
              {
                "review_id": "05cc65f24af5ec420da8950d539a926d",
                "name": "Jane Doe",
                "message": "Hmm, not my cup of tea."
              }
            ]
          },
          {
            "brand_id": "bakers",
            "reviews": null
          },
          {
            "brand_id": "bernheim",
            "reviews": [
              {
                "review_id": "96a9b996439528ecb9050774c3e79ff2",
                "name": "Justin Case",
                "message": "First two glasses tasted great, can't really remember the rest!"
              }
            ]
          } 
        ]
      }
      ```
    </details>

## Installation

- Install via npm

    ```shell
    npm install pluma --save
    ```

- Require the module and create an API

    ```js
    const pluma = require('pluma')
    const api = new Pluma(constructorOptions)
    ```

## API

### Constructor

```js
const pluma = require('pluma')
const api = new Pluma({
  blueprint: String,
  targetDirectory: String
})
```

The constructor method takes an object with the following properties.

---

- #### `blueprint`

    **Required**. A path describing the hierarchy and nomenclature of your data. It should start with a static path to the directory where all the files are located, followed by the name of each data level (starting with a colon).

    For the [pluralise](#) option to work well, the names of the data levels should be singular (e.g. `country` instead of `countries`)

    *Example:*
    
    `'data/:country/:brand/:review'`
    
---

- #### `targetDirectory`

    **Required**. The path to the directory where endpoint files should be created.

    *Example:*
    
    `'output'`
    
---

### Method: `addEndpoint`

```js
api.addEndpoint({
  addIdToFiles: Boolean,
  customFields: Object,
  depth: Number,
  forEach: String
})
```

The `addEndpoint` method creates an endpoint for a data level. It takes an object with the following properties.

---

- #### `addIdToFiles`

    Whether to add an `id` field to uniquely identify each data file. IDs are generated by computing an MD5 hash of the full path of the file.

    *Default:*

    `false`

    *Example result:*
    
    `"review_id": "96a9b996439528ecb9050774c3e79ff2"`
    
---

- #### `customFields`

    An object containing a list of custom fields to be appended to each data level. If a field is defined as a function, it acts as a callback receiving the name of the node at the given level and its entire sub-tree. Otherwise, its value is used directly as the value of the custom field.

    *Default:*

    `{}`    

    *Example:*
    
    ```js
    {
      country: {
        // Adds a static property called `apiVersion`
        apiVersion: 2,

        // Adds a field called `brandCount`, counting the number of
        // child nodes.
        brandCount: (node, tree) => Object.keys(tree).length
      }
    }
    ```

    <details>
      <summary><i>Example result (output/american.json)</i></summary>

      {
        "apiVersion": 2,
        "brands": [
          {
            "brand_id": "anchor-distilling"
          },
          {
            "brand_id": "bakers"
          },
          {
            "brand_id": "bernheim"
          } 
        ],
        "brandCount": 3
      }      
    </details>
    
---

- #### `depth`

    The number of nested data levels that should be included in the endpoint.

    *Default:*
    
    `1`

    *Example:*
    
    `2`

    <details>
    <summary><i>Example result</i></summary>

        {
          "brands": [
            {
              "brand_id": "anchor-distilling",
              "reviews": [
                {
                  "review_id": "04440f660f472e81eda881cbd8ee6ab0",
                  "name": "John Appleseed",
                  "message": "I've got 99 whiskies but this is the one!"
                },
                {
                  "review_id": "05cc65f24af5ec420da8950d539a926d",
                  "name": "Jane Doe",
                  "message": "Hmm, not my cup of tea."
                }
              ]
            },
            {
              "brand_id": "bakers",
              "reviews": null
            },
            {
              "brand_id": "bernheim",
              "reviews": [
                {
                  "review_id": "96a9b996439528ecb9050774c3e79ff2",
                  "name": "Justin Case",
                  "message": "First two glasses tasted great, can't really remember the rest!"
                }
              ]
            } 
          ]
        }
    </details>
    
---

- ### `forEach`

    **Required**. The name of the data level to be used as the source for the endpoint. Effectively, an endpoint will be created for each directory or file found at the given data level.

    *Example:*
    
    `brand`
    
---

- ### `pluralise`

    The name of each data level (e.g. `"brand"`) is used in the singular form when identifying a single entity (e.g. `{"brand_id": "12345"}) and in the plural form when identifying a list of entities (e.g. `{"brands": [...]}). That behaviour can be disabled by setting this property to `false`.

    *Default:*
    
    `true`
    
---

## Q&A

- **Why did you build this?**

    GitHub has been the centrepiece of my daily workflow as a developer for many years. I love the idea of using a repository not only for version control, but also as the single source of truth for a data set. As a result, I created [several](https://staticman.net) [projects](https://speedtracker.org) that explore the usage of GitHub repositories as data stores, and I've used that approach in several professional and personal projects, including [my own site/blog](https://eduardoboucas.com).

- **Couldn't Jekyll, Hugo or XYZ do the same thing?**

    Possibly. Most static site generators are capable of generating JSON, but usually using awkward/brittle methods. Most of those applications were built to generate HTML pages and that's where they excel on. I tried to create a minimalistic and easy-as-it-gets way of generating something very specific: a bunch of JSON files that, when bundled together, form a very basic API layer.

- **Where can I host this?**

    [GitHub Pages](https://pages.github.com/) is a very appealing option, since you could serve the API right from the repository. It has CORS enabled, so you could easily consume it from a client-side application using React, Angular, Vue or whatever you prefer. You could even use a CI service like [Travis](https://travis-ci.org/) to listen for commits on a given branch (say `master`) and automatically run Pluma and push the generated output to a `gh-pages` branch, making the process of generating the API when data changes fully automated.

    [Netlify](https://www.netlify.com/) is also very cool and definitely worth trying.

- **Would it be possible to add feature X, Y or Z?**

    Probably. File an [issue](https://github.com/eduardoboucas/pluma/issues) or, even better, a [pull request](https://github.com/eduardoboucas/pluma/pulls) and I'm happy to help. Bare in mind that this is a side project (one of too many) which I'm able to dedicate a very limited amount of time to, so please be patient and try to understand if I tell you I don't have the capacity to build what you're looking for.

- **Who designed the logo?**

    The logo was created by [Sara Giacomini](https://thenounproject.com/sara_giacomini/) from The Noun Project and it's licensed under a [Creative Commons Attribution](https://creativecommons.org/licenses/by/3.0/us/) license.
