module.exports = subset

/**
 * Given an array (or an array-like), return an array representing a view into a
 * subset of that array. The veiw is calculated by treating the array as a grid
 * and passing the grid coordintes of the desired view as an argument.
 *
 * @param  {Array} arr             The array/array-like to view
 *
 * @param  {Object} dimensions     The grid dimensions of the array
 *                  dimensions.width How many cells wide is the grid
 *                  dimensions.height How many cells high is the grid
 *                  dimensions.cellSize How many cells in the arr represent 1
 *                                      cell in the grid we're treating it as.
 *                                      E.g., with pixel data 4 values makes one
 *                                      pixel (r, g, b, a)
 *
 * @param  {Object} viewDimensions The dimensions of the view we're looking for
 *                  viewDimensions.x X coordinate of the view in the grid
 *                  viewDimensions.y Y coordinate of the view in the grid
 *                  viewDimensions.width Width of the view in the grid
 *                  viewDimensions.height Height of the view in the grid
 *
 * @return {Array}                 The array representing the view asked for.
 */
function subset (arr, dimensions, viewDimensions) {
    var ret = []

    var vd = viewDimensions
    var d = dimensions
    var cellSize = d.cellSize == null ? 1 : d.cellSize

    for (var x = vd.x; x < vd.x + vd.width; x += 1) {
        for (var y = vd.y; y < vd.y + vd.height; y += 1) {
            var index = (y * cellSize) * d.width + (x * cellSize)
            ret.push.apply(ret, [].slice.call(arr, index, index + cellSize))
        }
    }

    return ret
}