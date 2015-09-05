module.exports = rowGrouper

var through2 = require('through2')
var makeCanvas = require('../browser/make-canvas')

function rowGrouper (dimensions) {
    var grid = dimensions.grid
    var tile = dimensions.tile
    var rows = {}
    var finished = 0
    return through2.obj(function (cell, enc, callback) {
        rows[cell.y] = rows[cell.y] || []
        rows[cell.y].push(cell)

        if (rows[cell.y].length === grid.columns) {
            this.push({
                canvas: drawRow(rows[cell.y])
              , index: cell.y
            })

            finished++
        }
        callback()

        if (finished === grid.length) this.push(null)
    }, function () {})

    function drawRow (cells) {
        var canvas = makeCanvas(grid.width, tile.height)
        var ctx = canvas.getContext('2d')
        for (var i = 0; i < cells.length; i++) {
            ctx.drawImage(cells[i].img, cells[i].x * tile.width, 0)
        }
        return canvas
    }
}