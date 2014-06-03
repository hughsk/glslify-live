var canvas        = document.body.appendChild(document.createElement('canvas'))
var triangle      = require('a-big-triangle')
var createContext = require('gl-context')
var glslify       = require('glslify')
var gl            = createContext(canvas, render)

var shader = glslify({
    vert: './test.vert'
  , frag: './test.frag'
})(gl)

function render() {
  shader.bind()
  triangle(gl)
}
