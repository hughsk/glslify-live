var update = require('gl-shader-update')
var sse    = require('sse-stream')
var xhr    = require('xhr')
var events = require('./')
var port   = parseInt(process.env.GLSLIFY_LIVE_PORT || 12874)

var watcher = sse('http://localhost:'+port+'/changes')

watcher.setMaxListeners(10000)

module.exports = function(createShader, vertFile, fragFile) {
  return function(gl) {
    var shader = createShader(gl)
    var dispose = shader.dispose

    watcher.on('data', respond)
    shader.dispose = cleanup

    return shader

    function respond(data) {
      data = JSON.parse(data)

      if (data.name === vertFile) {
        update.vert(shader, data.data)
        events.emit('update', vertFile, shader)
        events.emit('update-vert', vertFile, shader)
      }

      if (data.name === fragFile) {
        update.frag(shader, data.data)
        events.emit('update', fragFile, shader)
        events.emit('update-frag', fragFile, shader)
      }
    }

    function cleanup() {
      watcher.removeListener('data', respond)
      return dispose.apply(this, arguments)
    }
  }
}
