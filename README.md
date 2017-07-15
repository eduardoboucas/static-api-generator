# pluma

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

Start by initialising Pluma and specifiying the API blueprint, so it can make sense of the data, as well as the base directory where the files will be created.

```js
const api = new Pluma({
  blueprint: 'data/:country/:brand/:review',
  targetDirectory: 'output'
})
```

The next step is to start adding endpoints, as many as you'd like. Let's say that you want to create an endpoint that lists all the whisky brands for each country.

```js
api.addEndpoint({
  forEach: 'country'
})
```

This will generate 3 files: `output/american.json`, `output/japanese.json` and `output/scotch.json`, looking something like this:

*output/american.json*

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

