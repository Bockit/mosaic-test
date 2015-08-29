module.exports = grid

/**
 * Given a dimensions object (number of `rows` and number of `columns`) create
 * an array of cell objects, (`x` and `y` properties`) 1 for each cell
 * in the grid.
 */
function grid (dimensions) {
    var ret = []

    for (var y = 0; y < dimensions.rows; y++) {
        for (var x = 0; x < dimensions.columns; x++) {
            ret.push({ x: x, y: y })
        }
    }

    return ret
}