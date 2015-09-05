module.exports = exports = mosaic

var imageToCanvas = require('../browser/image-to-canvas')
var makeCanvas = require('../browser/make-canvas')
var canvasToTiles = require('./canvas-to-tiles')
var imageLoader = require('./image-loader')
var rowGrouper = require('./row-grouper')

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
 *                  settings.tileWidth The width of tiles in this mosaic
 *                  settings.tileHeight the height of tiles in this mosaic
 *                  settings.baseUrl The base url for tile image requests
 */
function mosaic (target, file, settings) {
    // Draw the image into an offscreen canvas
    imageToCanvas(file, function (err, source) {
        var tile = {
            width: settings.tileWidth
          , height: settings.tileHeight
        }
        var grid = {
            rows: Math.ceil(source.height / tile.height)
          , columns: Math.ceil(source.width / tile.width)
          , width: source.width
          , height: source.height
        }

        // Add the canvas to the dom so users can see row-by-row
        var dest = makeCanvas(source.width, source.height)
        var ctx = dest.getContext('2d')
        var wrapper = makeWrapper(source.width, source.height)
        wrapper.appendChild(dest)
        target.appendChild(wrapper)

        canvasToTiles(source, { grid, grid, tile: tile })
            .pipe(imageLoader(settings.baseUrl))
            .pipe(rowGrouper({ grid: grid, tile: tile }))
            .on('data', function (row) {
                ctx.drawImage(row.canvas, 0, row.index * tile.height)
            })
    })
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