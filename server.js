// TODO: support glslify transform streams.

var glslify  = require('glslify-stream')
var deparser = require('glsl-deparser')
var qs       = require('querystring')
var sse      = require('sse-stream')
var chokidar = require('chokidar')
var once     = require('once')
var http     = require('http')
var path     = require('path')
var url      = require('url')
var bl       = require('bl')
var fs       = require('fs')

var port = parseInt(process.env.GLSLIFY_LIVE_PORT || 12874)

module.exports = createServer

if (!module.parent) {
  createServer().listen(port, function(err) {
    if (err) throw err
    console.log('http://localhost:'+port)
  })
}

function createServer() {
  var server = http.createServer(handler)
  var watcher = chokidar.watch([])
  var ping = sse('/changes')
  var connections = []
  var files = []

  ping.on('connection', function(client) {
    connections.push(client)
    client.once('close', function() {
      var idx = connections.indexOf(client)
      if (idx !== -1) connections.splice(idx, 1)
    })
  }).install(server)

  watcher.on('change', function(name) {
    makeShader(name, function(err, data) {
      if (err) {
        return console.error(err.stack)
      }

      for (var i = 0; i < connections.length; i++) {
        connections[i].write(JSON.stringify({
            name: name
          , data: data.toString()
        }))
      }
    })
  })

  // Force Access-Control-Allow-Origin everywhere,
  // including the SSE stream handlers
  var listeners = server.listeners('request')
  server.removeAllListeners('request')
  server.on('request', function(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*')
    for (var i = 0; i < listeners.length; i++) {
      listeners[i].call(server, req, res)
    }
  })

  return server

  function handler(req, res) {
    var uri = req.url
    req.url = url.parse(req.url).pathname

    var query = qs.parse(url.parse(uri).query)
    var split = req.url.split(/\/+/g).slice(1)
    if (split[0] !== 'submit') return bail('Invalid URL', req, res)
    if (!query.file) return bail('Missing filename', req, res)

    if (files.indexOf(query.file) === -1) {
      files.push(query.file)
      watcher.add(query.file)
    }

    res.end()
  }

  function bail(err, req, res) {
    if (typeof err === 'string') err = new Error(err)
    var message = [err.message, err.stack].join('\n')

    res.statusCode = 500
    res.setHeader('content-type', 'text/plain')
    res.end(message)
    console.error(message)
  }
}

function makeShader(file, done) {
  done = once(done)

  glslify(file)
    .on('error', done)
    .pipe(deparser())
    .on('error', done)
    .pipe(bl(done))
    .on('error', done)
}
