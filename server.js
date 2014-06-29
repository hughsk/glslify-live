var bundle   = require('glslify-bundle')
var qs       = require('querystring')
var sse      = require('sse-stream')
var chokidar = require('chokidar')
var once     = require('once')
var http     = require('http')
var path     = require('path')
var url      = require('url')

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
  var shaders = {}
  var files = []
  var ids = {}

  ping.on('connection', function(client) {
    connections.push(client)
    client.once('close', function() {
      var idx = connections.indexOf(client)
      if (idx !== -1) connections.splice(idx, 1)
    })
  }).install(server)

  watcher.on('change', function(name) {
    var send = ids[name]
    if (!send) return

    for (var i = 0; i < send.length; i++) (function(data, id) {
      if (!data) return

      bundle(data.cwd, data.info, function(err, results) {
        if (err) return console.error([err.message, err.stack].join('\n'))

        addFiles(id, results.files)
        var data = JSON.stringify({
            _id: id
          , vert: results.vert
          , frag: results.frag
        })

        for (var i = 0; i < connections.length; i++) {
          connections[i].write(data)
        }
      })
    })(shaders[send[i]], send[i])
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

    if (!query.data) return bail('Missing data', req, res)
    if (submit(req, res, query, split)) return

    return bail('Invalid URL', req, res)
  }

  function submit(req, res, query, split) {
    if (split[0] !== 'submit') return false

    var data = JSON.parse(query.data)
    var id = data._id
    var cd = data._cd
    delete data._id
    delete data._cd

    shaders[id] = { info: data, cwd: cd }

    bundle(cd, data, function(err, result) {
      if (err) return bail(err, req, res)
      var rfiles = result.files

      if (!data.inline) {
        rfiles.push(data.vert || data.vertex)
        rfiles.push(data.frag || data.fragment)
      }

      addFiles(id, rfiles)
    })

    res.end()
    return true
  }

  function addFiles(id, rfiles) {
    rfiles = Array.isArray(rfiles) ? rfiles : [rfiles]

    for (var i = 0; i < rfiles.length; i++) {
      var rfile = rfiles[i]

      ids[rfile] = ids[rfile] || []
      if (ids[rfile].indexOf(id) === -1) {
        ids[rfile].push(id)
      }

      if (files.indexOf(rfile) === -1) {
        files.push(rfile)
        watcher.add(rfile)
      }
    }
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
