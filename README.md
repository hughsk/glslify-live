# glslify-live [![experimental](http://badges.github.io/stability-badges/dist/experimental.svg)](http://github.com/badges/stability-badges)

A [browserify](http://browserify.org/) transform that transparently enables
live reloading of your shaders when using
[glslify](http://github.com/chrisdickinson/glslify).

## Usage

[![NPM](https://nodei.co/npm/glslify-live.png)](https://nodei.co/npm/glslify-live/)

After installing `glslify-live`, run this from your project root to start up
the live reloading server:

``` bash
npm start glslify-live
```

Provided that's running, you can simply include the `glslify-live` transform
*before* `glslify` when you're bundling with browserify. In the commandline:

``` bash
browserify -t glslify-live -t glslify
```

Or through browserify's JavaScript API:

``` javascript
var browserify = require('browserify')
var fs = require('fs')

var output = fs.createWriteStream('bundle.js')
var br = browserify('client.js')

br.transform('glslify-live')
br.transform('glslify')

br.bundle().pipe(output)
```

### Detecting File Changes

You might want to respond to these automatic updates, especially considering
that they may result in changing the values of your uniform/attribute variables.

In that case, you can simply require this module in your code and list to
the update event:

``` javascript
var live = require('glslify-live')

live.on('update', function(filename, shaderInstance) {
  // do things here
})
```

If you're not applying the transform, all that you're loading up is an
empty `EventEmitter` so it shouldn't be an issue including it in your
code. Enjoy!

## License

MIT. See [LICENSE.md](http://github.com/hughsk/glslify-live/blob/master/LICENSE.md) for details.
