var FileDragger = require('./lib/file-dragger')
var mosaic = require('./lib/mosaic')

var settings = {
    ALLOWED_TYPES: [ 'image/png', 'image/jpeg' ]
  , BASE_URL: '/'
  , TILE_HEIGHT: TILE_HEIGHT
  , TILE_WIDTH: TILE_WIDTH
}

var dragger = FileDragger()
dragger.on('file', function (file) {
    if (settings.ALLOWED_TYPES.indexOf(file.type) === -1) return
    mosaic(document.querySelector('.output'), file, settings)
})