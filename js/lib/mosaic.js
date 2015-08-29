module.exports = exports = mosaic
exports.tileTaskFactory = tileTaskFactory
exports.execute = execute

var imageToCanvas = require('./image-to-canvas')
var makeCanvas = require('./make-canvas')
var makeGrid = require('./grid')
var averageColour = require('./average-colour')
var rgb2Hex = require('./rgb-to-hex')
var uBound = require('./ubound')

function mosaic (target, file, settings) {
    // Draw the image into an offscreen canvas
    imageToCanvas(file, function (err, source) {
        // Need this info in a couple of places
        var dimensions = {
            rows: Math.ceil(source.height / settings.TILE_HEIGHT)
          , columns: Math.ceil(source.width / settings.TILE_WIDTH)
        }

        // Break it into a grid
        var grid = makeGrid(dimensions)

        // Map grid to server fetch tasks
        var taskSettings = {
            tileWidth: settings.TILE_WIDTH
          , tileHeight: settings.TILE_HEIGHT
          , width: source.width
          , height: source.height
        }
        var tasks = grid.map(tileTaskFactory(
            source.getContext('2d')
          , taskSettings
        ))

        // Add the canvas to the dom so users can see row-by-row
        var dest = makeCanvas(source.width, source.height)
        var ctx = dest.getContext('2d')
        target.appendChild(dest)

        var executeSettings = {
            rows: dimensions.rows
          , columns: dimensions.columns
          , tileWidth: settings.TILE_WIDTH
          , tileHeight: settings.TILE_HEIGHT
        }
        execute(tasks, executeSettings, function (row, i) {
            // target.appendChild(row)
            ctx.drawImage(row, 0, i * settings.TILE_HEIGHT)
        })
    })
}

// Closure so the tileTask function has what it needs
function tileTaskFactory (ctx, settings) {
    // Take a cell definition (an object with x and y properties) and return a
    // task object. A task object has x, y and hex value properties.
    return function (cell) {
        var pixels = ctx.getImageData(
            cell.x * settings.tileWidth
          , cell.y * settings.tileHeight
          // Bind these to the dimensions of the image, when it goes over
          // it's affecting the average values to make them darker. I suspect
          // it gives 0 values (black) for pixels outside the bounds. I'm
          // pretty sure I remember firefox would error out anyway.
          , uBound(settings.tileWidth, settings.width - cell.x * settings.tileWidth)
          , uBound(settings.tileHeight, settings.height - cell.y * settings.tileHeight)
        ).data

        return {
            x: cell.x
          , y: cell.y
          , hex: rgb2Hex.apply(null, averageColour(pixels))
        }
    }
}

// Execute the tasks in a way we can call n times, where n is the number of rows
// and the order of the calls matches the order of the rows.
function execute (tasks, settings, rowCallback) {
    // Reduce to rows
    var rows = tasks.reduce(function (previous, current) {
        previous[current.y] = previous[current.y] || []
        previous[current.y][current.x] = current
        return previous
    }, [])

    // Draw cells in each row to each context
    var queueStart = 0
    var queue = rows.map(function () {
        return false
    })
    rows.forEach(function (cells, i) {
        var rowCanvas = makeCanvas(
            settings.columns * settings.tileWidth
          , settings.tileHeight
        )
        var rowCtx = rowCanvas.getContext('2d')

        // As they are fetched, render to an offscreen context so we can render
        // the whole row at once to the user
        //
        // Use a promise here because I don't want to include the async package
        // just for this bit.
        Promise.all(cells.map(function (cell) {
            var x = cell.x * settings.tileWidth
            var url = '/color/' + cell.hex

            return new Promise(function (resolve, reject) {
                // Duplicate loading image into canvas, might be able to factor
                // this better.
                var img = new Image()
                img.onload = function () {
                    rowCtx.drawImage(img, x, 0)
                    resolve()
                }
                img.src = url
            })
        })).then(function () {
            // Queue for callback because we have to render rows in order
            // and we can't guarantee that right now with this fetching method
            queue[i] = rowCanvas

            for (var j = queueStart; j < queue.length; j++) {
                if (!queue[j]) break;
                rowCallback(queue[j], j)
                queueStart = j + 1
            }
        })
    })
}