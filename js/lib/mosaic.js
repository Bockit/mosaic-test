module.exports = exports = mosaic
exports.tileTaskFactory = tileTaskFactory
exports.executeStrategy = executeStrategy

var imageToCanvas = require('./image-to-canvas')
var makeCanvas = require('./make-canvas')
var makeGrid = require('./grid')
var averageColour = require('./average-colour')
var rgb2Hex = require('./rgb-to-hex')
var loadImage = require('./load-image')
var arraySubset = require('./array-grid-subset')

/**
 * Renders an image to a canvas in a target element as a series of tiles
 * representing average colours of the areas they cover.
 *
 * Takes a target element to put the canvas into, a file object representing
 * the file from a file input or drag and drop event and a settings object
 * containing tile width, tile height and a base url for where to load the tiles
 * from.
 *
 * @param  {HTMLElement} target   Where in the DOM to append the mosaic to
 * @param  {File} file            File object representing the image to render
 * @param  {Object} settings      Settings for the mosaic call.
 *                  settings.TILE_WIDTH The width of tiles in this mosaic
 *                  settings.TILE_HEIGHT the height of tiles in this mosaic
 *                  settings.BASE_URL The base url for tile image requests
 */
function mosaic (target, file, settings) {
    var execute = settings.executeStrategy || executeStrategy

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
        var wrapper = makeWrapper(source.width, source.height)
        wrapper.appendChild(dest)
        target.appendChild(wrapper)

        var executeSettings = {
            rows: dimensions.rows
          , columns: dimensions.columns
          , tileWidth: settings.TILE_WIDTH
          , tileHeight: settings.TILE_HEIGHT
          , baseUrl: settings.BASE_URL
        }
        execute(tasks, executeSettings, function (row, i) {
            ctx.drawImage(row, 0, i * settings.TILE_HEIGHT)
        })
    })
}

// Execute the tasks in a way we can call n times, where n is the number of rows
// and the order of the calls matches the order of the rows.
function executeStrategy (tasks, settings, rowCallback) {
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
        Promise.all(cells.map(function (cell) {
            var x = cell.x * settings.tileWidth
            var url = settings.baseUrl + 'color/' + cell.hex

            return loadImage(url).then(function (img) {
                rowCtx.drawImage(img, x, 0)
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

// Closure so the tileTask function has what it needs
function tileTaskFactory (ctx, settings) {
    var imageData = ctx.getImageData(0, 0, settings.width, settings.height).data
    // Take a cell definition (an object with x and y properties) and return a
    // task object. A task object has x, y and hex value properties.
    return function (cell) {
        var pixels = arraySubset(imageData, {
            width: settings.width
          , height: settings.height
            // each pixel is actually 4 array cells
          , cellSize: 4
        }, {
            x: cell.x * settings.tileWidth
          , y: cell.y * settings.tileHeight
          // Bind these to the dimensions of the image
          , width: Math.min(settings.tileWidth, settings.width - cell.x * settings.tileWidth)
          , height: Math.min(settings.tileHeight, settings.height - cell.y * settings.tileHeight)
        })

        return {
            x: cell.x
          , y: cell.y
          , hex: rgb2Hex.apply(null, averageColour(pixels))
        }
    }
}

/**
 * Create a div with the wrapper style, of the height and width of the to-be
 * canvas to better show the user what's happening.
 *
 * Don't want DOM operations cluttering up my logic so chucking this in a helper
 */
function makeWrapper (width, height) {
    var ret = document.createElement('div')
    ret.classList.add('mosaic-wrapper')
    // +padding +border because of box-sizing: border-box;
    ret.style.width = (width + 42) + 'px'
    ret.style.height = (height + 42) + 'px'
    return ret
}