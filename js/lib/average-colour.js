module.exports = averageColour

/**
 * Given an array of canvas pixel data, give us the average colour as an [r, g, b]
 */
function averageColour (pixels) {
    var red = 0
    var green = 0
    var blue = 0

    for (var i = 0; i < pixels.length; i+=4) {
        red += pixels[i]
        green += pixels[i + 1]
        blue += pixels[i + 2]
    }

    return [
        Math.round(red / (i / 4))
      , Math.round(green / (i / 4))
      , Math.round(blue / (i / 4))
    ]
}