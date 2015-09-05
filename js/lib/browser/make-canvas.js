module.exports = makeCanvas

/**
 * Helper function for creating a canvas with a given width and height as we
 * need it in a few places.
 */
function makeCanvas (width, height) {
    var canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    return canvas
}