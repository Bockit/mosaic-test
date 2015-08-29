module.exports = exports = rgb2Hex
exports.pad = pad

function rgb2Hex (r, g, b) {
    return pad(r.toString(16)) + pad(g.toString(16)) + pad(b.toString(16))
}

function pad (str) {
    if (str.length === 1) return '0' + str
    return str
}