var canvas        = document.body.appendChild(document.createElement('canvas'))
var triangle      = require('a-big-triangle')
var createContext = require('gl-context')
var glslify       = require('glslify')
var glShader      = require('gl-shader')
var gl            = createContext(canvas, render)

var shader = glShader(gl
  , glslify('./test.vert')
  , glslify('./test.frag')
)

function render() {
  shader.bind()
  triangle(gl)
}
