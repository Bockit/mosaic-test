var test = require('tape')

var averageColour = require('../lib/average-colour')
var rgb2Hex = require('../lib/rgb-to-hex')
var grid = require('../lib/grid')

test('Average colour', function (t) {
    t.plan(2)
    t.deepEquals(averageColour([0, 0, 0, 0, 10, 10, 10, 10]), [5, 5, 5], 'Simple average')
    t.deepEquals(averageColour([0, 0, 0, 0]), [0, 0, 0], 'Only 1 pixel')
})

test('RGB to Hex', function (t) {
    t.plan(2)
    t.equals(rgb2Hex(255, 255, 255), 'ffffff', 'White')
    t.equals(rgb2Hex(0, 0, 0), '000000', 'Black (needs padding)')
})

test('Grid', function (t) {
    t.plan(2)
    t.deepEquals(grid({ rows: 1, columns: 1 }), [{ x: 0, y: 0 }], 'Single cell')
    t.deepEquals(grid({ rows: 2, columns: 2 }), [
        { x: 0, y: 0 }
      , { x: 1, y: 0 }
      , { x: 0, y: 1 }
      , { x: 1, y: 1}
    ], 'Multi cell')
})