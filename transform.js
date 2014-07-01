var replace  = require('replace-method')
var resolve  = require('glsl-resolve')
var evaluate = require('static-eval')
var qs       = require('querystring')
var uuid     = require('uuid').v4
var esprima  = require('esprima')
var through  = require('through')
var request  = require('request')
var sleuth   = require('sleuth')
var path     = require('path')
var port     = parseInt(process.env.GLSLIFY_LIVE_PORT || 12874)

module.exports = transform

function transform(file, opts) {
  var dirname = path.dirname(file)
  var buffer = []

  return through(function write(data) {
    buffer.push(data)
  }, function flush() {
    buffer = buffer.join('\n')

    if (buffer.indexOf('glslify') === -1) {
      this.queue(buffer)
      this.queue(null)
      return
    }

    var ast = esprima.parse(buffer)
    var src = replace(ast)

    var required = sleuth(ast)
    var varname  = Object.keys(required).filter(function(key) {
      return required[key] === 'glslify'
    }).pop()

    if (!varname) {
      this.queue(buffer)
      this.queue(null)
      return
    }

    src.replace([ varname ], function(node) {
      var dest = './' + path.relative(dirname, __dirname + '/client.js')
      var data = evaluate(node.arguments[0])
      var vertFile = data.vertex || data.vert
      var fragFile = data.fragment || data.frag

      var cd = data._cd = path.dirname(file)
      var id = data._id = uuid()

      if (!data.inline) {
        vertFile = data.vert = vertFile && resolve.sync(vertFile, { basedir: dirname })
        fragFile = data.frag = fragFile && resolve.sync(fragFile, { basedir: dirname })
      }

      announce(data)

      return {
          type: 'CallExpression'
        , callee: {
            type: 'CallExpression'
          , callee: { type: 'Identifier', name: 'require' }
          , arguments: [{
              type: 'Literal'
            , value: dest
          }]
        }
        , arguments: [{
            type: 'Literal'
          , value: id
        }, node, {
            type: 'Literal'
          , value: port
        }]
      }
    })

    this.queue(src.code())
    this.queue(null)
  })
}

function announce(data) {
  return request.get('http://localhost:'+port+'/submit?' + qs.stringify({
    data: JSON.stringify(data)
  }))
}
