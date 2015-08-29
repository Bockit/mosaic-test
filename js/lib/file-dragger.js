module.exports = FileDragger

var EventEmitter = require('events').EventEmitter

/**
 * Returns and event emitter that emits `'file'` events whenever files are dropped
 * into the window.
 *
 * For the purposes of this codebase it only emits the file at position [0]
 * so mutli file drops won't emit for each file, but that should ideally be
 * removed.
 *
 * `emitter.cleanup` will release all event handlers.
 */
function FileDragger () {
    var emitter = new EventEmitter

    // dragover and dragenter make the element a drag target, without which
    // drop won't fire and the page will redirect to the dropped file
    window.addEventListener('dragover', cancel, false)
    window.addEventListener('dragenter', cancel, false)
    window.addEventListener('drop', drop, false)

    emitter.cleanup = cleanup

    return emitter

    function drop (e) {
        cancel(e)

        for (var i = 0; i < e.dataTransfer.files.length; i++) {
            emitter.emit('file', e.dataTransfer.files[i])
        }
    }

    function cancel (e) {
        e.preventDefault()
        e.stopPropagation()
    }

    function cleanup () {
        window.removeEventListener('dragover', cancel)
        window.removeEventListener('dragenter', cancel)
        window.removeEventListener('drop', drop)
    }
}