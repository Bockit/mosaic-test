module.exports = ubound

function ubound (val, limit) {
    if (val > limit) return limit
    return val
}