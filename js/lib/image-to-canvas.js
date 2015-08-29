module.exports = imageToCanvas

var makeCanvas = require('./make-canvas')

function imageToCanvas (file, callback) {
    var url = URL.createObjectURL(file)
    var img = new Image()
    img.onload = function () {
        var canvas = makeCanvas(img.width, img.height)
        var ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        URL.revokeObjectURL(url)
        callback(null, canvas)
    }
    img.src = url
}