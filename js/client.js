var dimennsions = require('./mosaic')
var FileDragger = require('./lib/file-dragger')

var dragger = FileDragger()
dragger.on('file', function (file) {
    console.log(file)
})