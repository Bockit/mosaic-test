module.exports = imageLoader

var through2 = require('through2')
var loadImage = require('../browser/load-image')

function imageLoader (baseUrl) {
    return through2.obj(function (cell, enc, callback) {
        var url = baseUrl + 'color/' + cell.hex
        loadImage(url).then(function (img) {
            cell.img = img
            callback(null, cell)
        })
    })
}