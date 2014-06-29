var update = require('gl-shader-update')
var sse    = require('sse-stream')
var events = require('./')
var port   = parseInt(process.env.GLSLIFY_LIVE_PORT || 12874)

var watcher = sse('http://localhost:'+port+'/changes')

watcher.setMaxListeners(10000)

module.exports = function(id, createShader, shaderInfo) {
  shaderInfo = JSON.stringify(shaderInfo)

  return function(gl) {
    var shader = createShader(gl)
    var dispose = shader.dispose

    watcher.on('data', respond)
    shader.dispose = cleanup

    return shader

    function respond(data) {
      data = JSON.parse(data)

      if (data._id !== id) return

      update.vert(shader, data.vert)
      update.frag(shader, data.frag)
      events.emit('update', shader, id)
    }

    function cleanup() {
      watcher.removeListener('data', respond)
      return dispose.apply(this, arguments)
    }
  }
}
