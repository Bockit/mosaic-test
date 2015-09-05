var FileDragger = require('./lib/browser/file-dragger')
var mosaic = require('./lib/mosaic')

var settings = {
    allowedTypes: [ 'image/png', 'image/jpeg' ]
  , baseUrl: '/'
  , tileHeight: TILE_HEIGHT
  , tileWidth: TILE_WIDTH
}

var dragger = FileDragger()
dragger.on('file', function (file) {
    if (settings.allowedTypes.indexOf(file.type) === -1) return
    mosaic(document.querySelector('.output'), file, settings)
})