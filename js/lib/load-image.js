var memoize = require('lodash/function/memoize')

module.exports = memoize(loadImage)

/**
 * Takes a url and returns a promise that resolves to a loaded img object.
 */
function loadImage(url) {
    return new Promise(function (resolve, reject) {
        var img = new Image()
        img.onload = function () {
            resolve(img)
        }
        img.src = url
    })
}