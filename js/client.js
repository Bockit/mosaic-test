var settings = require('./mosaic')
var FileDragger = require('./lib/file-dragger')
var mosaic = require('./lib/mosaic')

settings.ALLOWED_TYPES = [ 'image/png', 'image/jpeg' ];
settings.BASE_URL = '/'

var dragger = FileDragger()
dragger.on('file', function (file) {
    if (settings.ALLOWED_TYPES.indexOf(file.type) === -1) return
    mosaic(document.querySelector('.output'), file, settings)
})