var arraySubset = require('./array-grid-subset')
var rgb2Hex = require('../colour/rgb-to-hex')
var averageColour = require('../colour/average-colour')

var count = 0

module.exports = function (self) {
    self.addEventListener('message', function (ev) {
        var id = ev.data.id
        var grid = ev.data.grid
        var tile = ev.data.tile
        var imageData = ev.data.imageData

        for (var y = 0; y < grid.rows; y++) {
            for (var x = 0; x < grid.columns; x++) {
                var pixels = arraySubset(imageData, {
                    width: grid.width
                  , height: grid.height
                    // each pixel is actually 4 array cells
                  , cellSize: 4
                }, {
                    x: x * tile.width
                  , y: y * tile.height
                    // Bind these to the dimensions of the image
                  , width: Math.min(tile.width, grid.width - x * tile.width)
                  , height: Math.min(tile.height, grid.height - y * tile.height)
                })

                var hex = rgb2Hex.apply(null, averageColour(pixels))

                self.postMessage({
                    type: 'tile'
                  , id: id
                  , tile: { x: x, y: y, hex: hex }
                })
            }
        }

        self.postMessage({
            type: 'end'
        })
    })
}