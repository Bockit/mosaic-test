module.exports = makeCanvas

function makeCanvas (width, height) {
    var canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    return canvas
}