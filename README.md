<img src=".github/logo.png" alt="Pluma logo" height="185"/>

[![npm (scoped)](https://img.shields.io/npm/v/pluma.svg?maxAge=10800&style=flat-square)](https://www.npmjs.com/package/pluma)
[![coverage](https://img.shields.io/badge/coverage-88%25-yellow.svg?style=flat?style=flat-square)](https://github.com/dadi/pluma)
[![Build Status](https://travis-ci.org/dadi/pluma.svg?branch=master)](https://travis-ci.org/dadi/pluma)
[![JavaScript Style Guide](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square)](http://standardjs.com/)

Pluma is a Node application that creates a basic JSON API from a tree of directories and files. Think a static site generator like Jekyll or Hugo but for APIs.

It allows you to create an API layer with whatever structure you want, whilst keeping the data files in a human-friendly format and easy to edit by hand. With Pluma, you can create an API that can be consumed by a client-side application or a third-party service, and serve it right from your GitHHub repository.

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

    This will generate 3 files: `output/american.json`, `output/japanese.json` and `output/scotch.json`, looking something like this:

    *output/american.json*:

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

1. Configure each endpoint to contain the exact amount of information you want. We can tweak the previous endpoint to also include the list of reviews for each brand, by changing the `depth` property, which configures the amount of nested levels that the endpoint will pick up (defaults to 1).

    ```js
    api.addEndpoint({
      forEach: 'country',
      depth: 2
    })
    ```

    *output/american.json*:

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
