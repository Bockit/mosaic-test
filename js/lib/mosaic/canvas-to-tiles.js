module.exports = canvasToTiles

var through2 = require('through2')
var work = require('webworkify')
var tileWorker = work(require('./tile-worker'))

var nonce = (function () {
    var count = 0
    return function () {
        return count++
    }
})(0)

function canvasToTiles (canvas, dimensions) {
    var id = nonce()
    var grid = dimensions.grid
    var tile = dimensions.tile
    var ctx = canvas.getContext('2d')
    var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height).data

    var stream = through2.obj()

    function handleMessage (ev) {
        if (ev.data.id !== id) return

        if (ev.data.type === 'tile') {
            stream.push(ev.data.tile)
        }
        else if (ev.data.type === 'end') {
            stream.push(null)
            tileWorker.removeEventListener('message', handleMessage)
        }
    }

    tileWorker.addEventListener('message', handleMessage)

    tileWorker.postMessage({
        id: id
      , imageData: imageData
      , grid: grid
      , tile: tile
    })

    return stream
}