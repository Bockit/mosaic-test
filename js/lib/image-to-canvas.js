module.exports = imageToCanvas

var makeCanvas = require('./make-canvas')

/**
 * Takes a browser file object and a callback. Calls back with an error if it
 * occurred (at the moment we're not looking for one to send) and a detached
 * canvas element matching the image's dimensions with the image blitted to it.
 */
function imageToCanvas (file, callback) {
    var url = URL.createObjectURL(file)
    var img = new Image()
    img.onload = function () {
        var canvas = makeCanvas(img.width, img.height)
        var ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        // Need to do this because of the way browser's gc these ObjectUrl
        // variables. See:
        // https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL
        URL.revokeObjectURL(url)
        callback(null, canvas)
    }
    img.src = url
}