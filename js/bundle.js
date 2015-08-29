(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
},{"./lib/file-dragger":3,"./lib/mosaic":7,"./mosaic":9}],2:[function(require,module,exports){
module.exports = averageColour

/**
 * Given an array of canvas pixel data, give us the average colour as an [r, g, b]
 */
function averageColour (pixels) {
    var red = 0
    var green = 0
    var blue = 0

    for (var i = 0; i < pixels.length; i += 4) {
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
},{}],3:[function(require,module,exports){
module.exports = FileDragger

var EventEmitter = require('events').EventEmitter

/**
 * Returns and event emitter that emits `'file'` events whenever files are
 * dropped into the window.
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

    /**
     * Prevent the browser from redirecting to the file dropped in.
     */
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
},{"events":10}],4:[function(require,module,exports){
module.exports = grid

/**
 * Given a dimensions object (number of `rows` and number of `columns`) create
 * an array of cell objects, (`x` and `y` properties`) 1 for each cell
 * in the grid.
 */
function grid (dimensions) {
    var ret = []

    for (var y = 0; y < dimensions.rows; y++) {
        for (var x = 0; x < dimensions.columns; x++) {
            ret.push({ x: x, y: y })
        }
    }

    return ret
}
},{}],5:[function(require,module,exports){
module.exports = imageToCanvas

var makeCanvas = require('./make-canvas')

/**
 * Takes a browser file object and a callback. Calls back with an error if it
 * occurred (at the moment we're not looking for one to send) and a detached
 * canvas element matching the image's dimensions with the image blitted to it.
 */
function imageToCanvas (file, callback) {
    var url = URL.createObjectURL(file)
    var img = new Image()
    img.onload = function () {
        var canvas = makeCanvas(img.width, img.height)
        var ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        // Need to do this because of the way browser's gc these ObjectUrl
        // variables. See:
        // https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL
        URL.revokeObjectURL(url)
        callback(null, canvas)
    }
    img.src = url
}
},{"./make-canvas":6}],6:[function(require,module,exports){
module.exports = makeCanvas

/**
 * Helper function for creating a canvas with a given width and height as we
 * need it in a few places.
 */
function makeCanvas (width, height) {
    var canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    return canvas
}
},{}],7:[function(require,module,exports){
module.exports = exports = mosaic
exports.tileTaskFactory = tileTaskFactory
exports.execute = execute

var imageToCanvas = require('./image-to-canvas')
var makeCanvas = require('./make-canvas')
var makeGrid = require('./grid')
var averageColour = require('./average-colour')
var rgb2Hex = require('./rgb-to-hex')

/**
 * Renders an image to a canvas in a target element as a series of tiles
 * representing average colours of the areas they cover.
 *
 * Takes a target element to put the canvas into, a file object representing
 * the file from a file input or drag and drop event and a settings object
 * containing tile width, tile height and a base url for where to load the tiles
 * from.
 *
 * @param  {HTMLElement} target   Where in the DOM to append the mosaic to
 * @param  {File} file            File object representing the image to render
 * @param  {Object} settings      Settings for the mosaic call.
 *                  settings.TILE_WIDTH The width of tiles in this mosaic
 *                  settings.TILE_HEIGHT the height of tiles in this mosaic
 *                  settings.BASE_URL The base url for tile image requests
 */
function mosaic (target, file, settings) {
    // Draw the image into an offscreen canvas
    imageToCanvas(file, function (err, source) {
        // Need this info in a couple of places
        var dimensions = {
            rows: Math.ceil(source.height / settings.TILE_HEIGHT)
          , columns: Math.ceil(source.width / settings.TILE_WIDTH)
        }

        // Break it into a grid
        var grid = makeGrid(dimensions)

        // Map grid to server fetch tasks
        var taskSettings = {
            tileWidth: settings.TILE_WIDTH
          , tileHeight: settings.TILE_HEIGHT
          , width: source.width
          , height: source.height
        }
        var tasks = grid.map(tileTaskFactory(
            source.getContext('2d')
          , taskSettings
        ))

        // Add the canvas to the dom so users can see row-by-row
        var dest = makeCanvas(source.width, source.height)
        var ctx = dest.getContext('2d')
        var wrapper = makeWrapper(source.width, source.height)
        wrapper.appendChild(dest)
        target.appendChild(wrapper)

        var executeSettings = {
            rows: dimensions.rows
          , columns: dimensions.columns
          , tileWidth: settings.TILE_WIDTH
          , tileHeight: settings.TILE_HEIGHT
          , baseUrl: settings.BASE_URL
        }
        execute(tasks, executeSettings, function (row, i) {
            ctx.drawImage(row, 0, i * settings.TILE_HEIGHT)
        })
    })
}

// Closure so the tileTask function has what it needs
function tileTaskFactory (ctx, settings) {
    // Take a cell definition (an object with x and y properties) and return a
    // task object. A task object has x, y and hex value properties.
    return function (cell) {
        var pixels = ctx.getImageData(
            cell.x * settings.tileWidth
          , cell.y * settings.tileHeight
          // Bind these to the dimensions of the image, when it goes over
          // it's affecting the average values to make them darker. I suspect
          // it gives 0 values (black) for pixels outside the bounds. I'm
          // pretty sure I remember firefox would error out anyway.
          , Math.min(settings.tileWidth, settings.width - cell.x * settings.tileWidth)
          , Math.min(settings.tileHeight, settings.height - cell.y * settings.tileHeight)
        ).data

        return {
            x: cell.x
          , y: cell.y
          , hex: rgb2Hex.apply(null, averageColour(pixels))
        }
    }
}

// Execute the tasks in a way we can call n times, where n is the number of rows
// and the order of the calls matches the order of the rows.
function execute (tasks, settings, rowCallback) {
    // Reduce to rows
    var rows = tasks.reduce(function (previous, current) {
        previous[current.y] = previous[current.y] || []
        previous[current.y][current.x] = current
        return previous
    }, [])

    // Draw cells in each row to each context
    var queueStart = 0
    var queue = rows.map(function () {
        return false
    })
    rows.forEach(function (cells, i) {
        var rowCanvas = makeCanvas(
            settings.columns * settings.tileWidth
          , settings.tileHeight
        )
        var rowCtx = rowCanvas.getContext('2d')

        // As they are fetched, render to an offscreen context so we can render
        // the whole row at once to the user
        //
        // Use a promise here because I don't want to include the async package
        // just for this bit.
        Promise.all(cells.map(function (cell) {
            var x = cell.x * settings.tileWidth
            var url = settings.baseUrl + 'color/' + cell.hex

            return new Promise(function (resolve, reject) {
                // Duplicate loading image into canvas, might be able to factor
                // this better.
                var img = new Image()
                img.onload = function () {
                    rowCtx.drawImage(img, x, 0)
                    resolve()
                }
                img.src = url
            })
        })).then(function () {
            // Queue for callback because we have to render rows in order
            // and we can't guarantee that right now with this fetching method
            queue[i] = rowCanvas

            for (var j = queueStart; j < queue.length; j++) {
                if (!queue[j]) break;
                rowCallback(queue[j], j)
                queueStart = j + 1
            }
        })
    })
}

/**
 * Create a div with the wrapper style, of the height and width of the to-be
 * canvas to better show the user what's happening.
 *
 * Don't want DOM operations cluttering up my logic so chucking this in a helper
 */
function makeWrapper (width, height) {
    var ret = document.createElement('div')
    ret.classList.add('mosaic-wrapper')
    // +padding +border because border-box
    ret.style.width = (width + 42) + 'px'
    ret.style.height = (height + 42) + 'px'
    return ret
}
},{"./average-colour":2,"./grid":4,"./image-to-canvas":5,"./make-canvas":6,"./rgb-to-hex":8}],8:[function(require,module,exports){
module.exports = exports = rgb2Hex
exports.pad = pad

/**
 * Convert `r`, `g` and `b` values to a single hex string. E.g.:
 *
 *     rgb2Hex(0, 0, 0) // 000000
 *     rgb2Hex(255, 255, 255) // ffffff
 */
function rgb2Hex (r, g, b) {
    // Pad because 0.toString(16) is 0 not 00 and the server expects 6 character
    // hex strings.
    return pad(r.toString(16)) + pad(g.toString(16)) + pad(b.toString(16))
}

function pad (str) {
    if (str.length === 1) return '0' + str
    return str
}
},{}],9:[function(require,module,exports){
// Constants shared between client and server.

var TILE_WIDTH = 16;
var TILE_HEIGHT = 16;

var exports = exports || null;
if (exports) {
  exports.TILE_WIDTH = TILE_WIDTH;
  exports.TILE_HEIGHT = TILE_HEIGHT;
}


},{}],10:[function(require,module,exports){
// Copyright Joyent, Inc. and other Node contributors.
//
// Permission is hereby granted, free of charge, to any person obtaining a
// copy of this software and associated documentation files (the
// "Software"), to deal in the Software without restriction, including
// without limitation the rights to use, copy, modify, merge, publish,
// distribute, sublicense, and/or sell copies of the Software, and to permit
// persons to whom the Software is furnished to do so, subject to the
// following conditions:
//
// The above copyright notice and this permission notice shall be included
// in all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
// OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
// MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN
// NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
// DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR
// OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
// USE OR OTHER DEALINGS IN THE SOFTWARE.

function EventEmitter() {
  this._events = this._events || {};
  this._maxListeners = this._maxListeners || undefined;
}
module.exports = EventEmitter;

// Backwards-compat with node 0.10.x
EventEmitter.EventEmitter = EventEmitter;

EventEmitter.prototype._events = undefined;
EventEmitter.prototype._maxListeners = undefined;

// By default EventEmitters will print a warning if more than 10 listeners are
// added to it. This is a useful default which helps finding memory leaks.
EventEmitter.defaultMaxListeners = 10;

// Obviously not all Emitters should be limited to 10. This function allows
// that to be increased. Set to zero for unlimited.
EventEmitter.prototype.setMaxListeners = function(n) {
  if (!isNumber(n) || n < 0 || isNaN(n))
    throw TypeError('n must be a positive number');
  this._maxListeners = n;
  return this;
};

EventEmitter.prototype.emit = function(type) {
  var er, handler, len, args, i, listeners;

  if (!this._events)
    this._events = {};

  // If there is no 'error' event listener then throw.
  if (type === 'error') {
    if (!this._events.error ||
        (isObject(this._events.error) && !this._events.error.length)) {
      er = arguments[1];
      if (er instanceof Error) {
        throw er; // Unhandled 'error' event
      }
      throw TypeError('Uncaught, unspecified "error" event.');
    }
  }

  handler = this._events[type];

  if (isUndefined(handler))
    return false;

  if (isFunction(handler)) {
    switch (arguments.length) {
      // fast cases
      case 1:
        handler.call(this);
        break;
      case 2:
        handler.call(this, arguments[1]);
        break;
      case 3:
        handler.call(this, arguments[1], arguments[2]);
        break;
      // slower
      default:
        len = arguments.length;
        args = new Array(len - 1);
        for (i = 1; i < len; i++)
          args[i - 1] = arguments[i];
        handler.apply(this, args);
    }
  } else if (isObject(handler)) {
    len = arguments.length;
    args = new Array(len - 1);
    for (i = 1; i < len; i++)
      args[i - 1] = arguments[i];

    listeners = handler.slice();
    len = listeners.length;
    for (i = 0; i < len; i++)
      listeners[i].apply(this, args);
  }

  return true;
};

EventEmitter.prototype.addListener = function(type, listener) {
  var m;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events)
    this._events = {};

  // To avoid recursion in the case that type === "newListener"! Before
  // adding it to the listeners, first emit "newListener".
  if (this._events.newListener)
    this.emit('newListener', type,
              isFunction(listener.listener) ?
              listener.listener : listener);

  if (!this._events[type])
    // Optimize the case of one listener. Don't need the extra array object.
    this._events[type] = listener;
  else if (isObject(this._events[type]))
    // If we've already got an array, just append.
    this._events[type].push(listener);
  else
    // Adding the second element, need to change to array.
    this._events[type] = [this._events[type], listener];

  // Check for listener leak
  if (isObject(this._events[type]) && !this._events[type].warned) {
    var m;
    if (!isUndefined(this._maxListeners)) {
      m = this._maxListeners;
    } else {
      m = EventEmitter.defaultMaxListeners;
    }

    if (m && m > 0 && this._events[type].length > m) {
      this._events[type].warned = true;
      console.error('(node) warning: possible EventEmitter memory ' +
                    'leak detected. %d listeners added. ' +
                    'Use emitter.setMaxListeners() to increase limit.',
                    this._events[type].length);
      if (typeof console.trace === 'function') {
        // not supported in IE 10
        console.trace();
      }
    }
  }

  return this;
};

EventEmitter.prototype.on = EventEmitter.prototype.addListener;

EventEmitter.prototype.once = function(type, listener) {
  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  var fired = false;

  function g() {
    this.removeListener(type, g);

    if (!fired) {
      fired = true;
      listener.apply(this, arguments);
    }
  }

  g.listener = listener;
  this.on(type, g);

  return this;
};

// emits a 'removeListener' event iff the listener was removed
EventEmitter.prototype.removeListener = function(type, listener) {
  var list, position, length, i;

  if (!isFunction(listener))
    throw TypeError('listener must be a function');

  if (!this._events || !this._events[type])
    return this;

  list = this._events[type];
  length = list.length;
  position = -1;

  if (list === listener ||
      (isFunction(list.listener) && list.listener === listener)) {
    delete this._events[type];
    if (this._events.removeListener)
      this.emit('removeListener', type, listener);

  } else if (isObject(list)) {
    for (i = length; i-- > 0;) {
      if (list[i] === listener ||
          (list[i].listener && list[i].listener === listener)) {
        position = i;
        break;
      }
    }

    if (position < 0)
      return this;

    if (list.length === 1) {
      list.length = 0;
      delete this._events[type];
    } else {
      list.splice(position, 1);
    }

    if (this._events.removeListener)
      this.emit('removeListener', type, listener);
  }

  return this;
};

EventEmitter.prototype.removeAllListeners = function(type) {
  var key, listeners;

  if (!this._events)
    return this;

  // not listening for removeListener, no need to emit
  if (!this._events.removeListener) {
    if (arguments.length === 0)
      this._events = {};
    else if (this._events[type])
      delete this._events[type];
    return this;
  }

  // emit removeListener for all listeners on all events
  if (arguments.length === 0) {
    for (key in this._events) {
      if (key === 'removeListener') continue;
      this.removeAllListeners(key);
    }
    this.removeAllListeners('removeListener');
    this._events = {};
    return this;
  }

  listeners = this._events[type];

  if (isFunction(listeners)) {
    this.removeListener(type, listeners);
  } else {
    // LIFO order
    while (listeners.length)
      this.removeListener(type, listeners[listeners.length - 1]);
  }
  delete this._events[type];

  return this;
};

EventEmitter.prototype.listeners = function(type) {
  var ret;
  if (!this._events || !this._events[type])
    ret = [];
  else if (isFunction(this._events[type]))
    ret = [this._events[type]];
  else
    ret = this._events[type].slice();
  return ret;
};

EventEmitter.listenerCount = function(emitter, type) {
  var ret;
  if (!emitter._events || !emitter._events[type])
    ret = 0;
  else if (isFunction(emitter._events[type]))
    ret = 1;
  else
    ret = emitter._events[type].length;
  return ret;
};

function isFunction(arg) {
  return typeof arg === 'function';
}

function isNumber(arg) {
  return typeof arg === 'number';
}

function isObject(arg) {
  return typeof arg === 'object' && arg !== null;
}

function isUndefined(arg) {
  return arg === void 0;
}

},{}]},{},[1])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwianMvY2xpZW50LmpzIiwianMvbGliL2F2ZXJhZ2UtY29sb3VyLmpzIiwianMvbGliL2ZpbGUtZHJhZ2dlci5qcyIsImpzL2xpYi9ncmlkLmpzIiwianMvbGliL2ltYWdlLXRvLWNhbnZhcy5qcyIsImpzL2xpYi9tYWtlLWNhbnZhcy5qcyIsImpzL2xpYi9tb3NhaWMuanMiLCJqcy9saWIvcmdiLXRvLWhleC5qcyIsImpzL21vc2FpYy5qcyIsIm5vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvZXZlbnRzL2V2ZW50cy5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgc2V0dGluZ3MgPSByZXF1aXJlKCcuL21vc2FpYycpXG52YXIgRmlsZURyYWdnZXIgPSByZXF1aXJlKCcuL2xpYi9maWxlLWRyYWdnZXInKVxudmFyIG1vc2FpYyA9IHJlcXVpcmUoJy4vbGliL21vc2FpYycpXG5cbnNldHRpbmdzLkFMTE9XRURfVFlQRVMgPSBbICdpbWFnZS9wbmcnLCAnaW1hZ2UvanBlZycgXTtcbnNldHRpbmdzLkJBU0VfVVJMID0gJy8nXG5cbnZhciBkcmFnZ2VyID0gRmlsZURyYWdnZXIoKVxuZHJhZ2dlci5vbignZmlsZScsIGZ1bmN0aW9uIChmaWxlKSB7XG4gICAgaWYgKHNldHRpbmdzLkFMTE9XRURfVFlQRVMuaW5kZXhPZihmaWxlLnR5cGUpID09PSAtMSkgcmV0dXJuXG4gICAgbW9zYWljKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5vdXRwdXQnKSwgZmlsZSwgc2V0dGluZ3MpXG59KSIsIm1vZHVsZS5leHBvcnRzID0gYXZlcmFnZUNvbG91clxuXG4vKipcbiAqIEdpdmVuIGFuIGFycmF5IG9mIGNhbnZhcyBwaXhlbCBkYXRhLCBnaXZlIHVzIHRoZSBhdmVyYWdlIGNvbG91ciBhcyBhbiBbciwgZywgYl1cbiAqL1xuZnVuY3Rpb24gYXZlcmFnZUNvbG91ciAocGl4ZWxzKSB7XG4gICAgdmFyIHJlZCA9IDBcbiAgICB2YXIgZ3JlZW4gPSAwXG4gICAgdmFyIGJsdWUgPSAwXG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBpeGVscy5sZW5ndGg7IGkgKz0gNCkge1xuICAgICAgICByZWQgKz0gcGl4ZWxzW2ldXG4gICAgICAgIGdyZWVuICs9IHBpeGVsc1tpICsgMV1cbiAgICAgICAgYmx1ZSArPSBwaXhlbHNbaSArIDJdXG4gICAgfVxuXG4gICAgcmV0dXJuIFtcbiAgICAgICAgTWF0aC5yb3VuZChyZWQgLyAoaSAvIDQpKVxuICAgICAgLCBNYXRoLnJvdW5kKGdyZWVuIC8gKGkgLyA0KSlcbiAgICAgICwgTWF0aC5yb3VuZChibHVlIC8gKGkgLyA0KSlcbiAgICBdXG59IiwibW9kdWxlLmV4cG9ydHMgPSBGaWxlRHJhZ2dlclxuXG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRzJykuRXZlbnRFbWl0dGVyXG5cbi8qKlxuICogUmV0dXJucyBhbmQgZXZlbnQgZW1pdHRlciB0aGF0IGVtaXRzIGAnZmlsZSdgIGV2ZW50cyB3aGVuZXZlciBmaWxlcyBhcmVcbiAqIGRyb3BwZWQgaW50byB0aGUgd2luZG93LlxuICpcbiAqIEZvciB0aGUgcHVycG9zZXMgb2YgdGhpcyBjb2RlYmFzZSBpdCBvbmx5IGVtaXRzIHRoZSBmaWxlIGF0IHBvc2l0aW9uIFswXVxuICogc28gbXV0bGkgZmlsZSBkcm9wcyB3b24ndCBlbWl0IGZvciBlYWNoIGZpbGUsIGJ1dCB0aGF0IHNob3VsZCBpZGVhbGx5IGJlXG4gKiByZW1vdmVkLlxuICpcbiAqIGBlbWl0dGVyLmNsZWFudXBgIHdpbGwgcmVsZWFzZSBhbGwgZXZlbnQgaGFuZGxlcnMuXG4gKi9cbmZ1bmN0aW9uIEZpbGVEcmFnZ2VyICgpIHtcbiAgICB2YXIgZW1pdHRlciA9IG5ldyBFdmVudEVtaXR0ZXJcblxuICAgIC8vIGRyYWdvdmVyIGFuZCBkcmFnZW50ZXIgbWFrZSB0aGUgZWxlbWVudCBhIGRyYWcgdGFyZ2V0LCB3aXRob3V0IHdoaWNoXG4gICAgLy8gZHJvcCB3b24ndCBmaXJlIGFuZCB0aGUgcGFnZSB3aWxsIHJlZGlyZWN0IHRvIHRoZSBkcm9wcGVkIGZpbGVcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignZHJhZ292ZXInLCBjYW5jZWwsIGZhbHNlKVxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdkcmFnZW50ZXInLCBjYW5jZWwsIGZhbHNlKVxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdkcm9wJywgZHJvcCwgZmFsc2UpXG5cbiAgICBlbWl0dGVyLmNsZWFudXAgPSBjbGVhbnVwXG5cbiAgICByZXR1cm4gZW1pdHRlclxuXG4gICAgZnVuY3Rpb24gZHJvcCAoZSkge1xuICAgICAgICBjYW5jZWwoZSlcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGUuZGF0YVRyYW5zZmVyLmZpbGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBlbWl0dGVyLmVtaXQoJ2ZpbGUnLCBlLmRhdGFUcmFuc2Zlci5maWxlc1tpXSlcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFByZXZlbnQgdGhlIGJyb3dzZXIgZnJvbSByZWRpcmVjdGluZyB0byB0aGUgZmlsZSBkcm9wcGVkIGluLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGNhbmNlbCAoZSkge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNsZWFudXAgKCkge1xuICAgICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcignZHJhZ292ZXInLCBjYW5jZWwpXG4gICAgICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdkcmFnZW50ZXInLCBjYW5jZWwpXG4gICAgICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdkcm9wJywgZHJvcClcbiAgICB9XG59IiwibW9kdWxlLmV4cG9ydHMgPSBncmlkXG5cbi8qKlxuICogR2l2ZW4gYSBkaW1lbnNpb25zIG9iamVjdCAobnVtYmVyIG9mIGByb3dzYCBhbmQgbnVtYmVyIG9mIGBjb2x1bW5zYCkgY3JlYXRlXG4gKiBhbiBhcnJheSBvZiBjZWxsIG9iamVjdHMsIChgeGAgYW5kIGB5YCBwcm9wZXJ0aWVzYCkgMSBmb3IgZWFjaCBjZWxsXG4gKiBpbiB0aGUgZ3JpZC5cbiAqL1xuZnVuY3Rpb24gZ3JpZCAoZGltZW5zaW9ucykge1xuICAgIHZhciByZXQgPSBbXVxuXG4gICAgZm9yICh2YXIgeSA9IDA7IHkgPCBkaW1lbnNpb25zLnJvd3M7IHkrKykge1xuICAgICAgICBmb3IgKHZhciB4ID0gMDsgeCA8IGRpbWVuc2lvbnMuY29sdW1uczsgeCsrKSB7XG4gICAgICAgICAgICByZXQucHVzaCh7IHg6IHgsIHk6IHkgfSlcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByZXRcbn0iLCJtb2R1bGUuZXhwb3J0cyA9IGltYWdlVG9DYW52YXNcblxudmFyIG1ha2VDYW52YXMgPSByZXF1aXJlKCcuL21ha2UtY2FudmFzJylcblxuLyoqXG4gKiBUYWtlcyBhIGJyb3dzZXIgZmlsZSBvYmplY3QgYW5kIGEgY2FsbGJhY2suIENhbGxzIGJhY2sgd2l0aCBhbiBlcnJvciBpZiBpdFxuICogb2NjdXJyZWQgKGF0IHRoZSBtb21lbnQgd2UncmUgbm90IGxvb2tpbmcgZm9yIG9uZSB0byBzZW5kKSBhbmQgYSBkZXRhY2hlZFxuICogY2FudmFzIGVsZW1lbnQgbWF0Y2hpbmcgdGhlIGltYWdlJ3MgZGltZW5zaW9ucyB3aXRoIHRoZSBpbWFnZSBibGl0dGVkIHRvIGl0LlxuICovXG5mdW5jdGlvbiBpbWFnZVRvQ2FudmFzIChmaWxlLCBjYWxsYmFjaykge1xuICAgIHZhciB1cmwgPSBVUkwuY3JlYXRlT2JqZWN0VVJMKGZpbGUpXG4gICAgdmFyIGltZyA9IG5ldyBJbWFnZSgpXG4gICAgaW1nLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgdmFyIGNhbnZhcyA9IG1ha2VDYW52YXMoaW1nLndpZHRoLCBpbWcuaGVpZ2h0KVxuICAgICAgICB2YXIgY3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJylcbiAgICAgICAgY3R4LmRyYXdJbWFnZShpbWcsIDAsIDApXG4gICAgICAgIC8vIE5lZWQgdG8gZG8gdGhpcyBiZWNhdXNlIG9mIHRoZSB3YXkgYnJvd3NlcidzIGdjIHRoZXNlIE9iamVjdFVybFxuICAgICAgICAvLyB2YXJpYWJsZXMuIFNlZTpcbiAgICAgICAgLy8gaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQVBJL1VSTC9jcmVhdGVPYmplY3RVUkxcbiAgICAgICAgVVJMLnJldm9rZU9iamVjdFVSTCh1cmwpXG4gICAgICAgIGNhbGxiYWNrKG51bGwsIGNhbnZhcylcbiAgICB9XG4gICAgaW1nLnNyYyA9IHVybFxufSIsIm1vZHVsZS5leHBvcnRzID0gbWFrZUNhbnZhc1xuXG4vKipcbiAqIEhlbHBlciBmdW5jdGlvbiBmb3IgY3JlYXRpbmcgYSBjYW52YXMgd2l0aCBhIGdpdmVuIHdpZHRoIGFuZCBoZWlnaHQgYXMgd2VcbiAqIG5lZWQgaXQgaW4gYSBmZXcgcGxhY2VzLlxuICovXG5mdW5jdGlvbiBtYWtlQ2FudmFzICh3aWR0aCwgaGVpZ2h0KSB7XG4gICAgdmFyIGNhbnZhcyA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2NhbnZhcycpXG4gICAgY2FudmFzLndpZHRoID0gd2lkdGhcbiAgICBjYW52YXMuaGVpZ2h0ID0gaGVpZ2h0XG4gICAgcmV0dXJuIGNhbnZhc1xufSIsIm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IG1vc2FpY1xuZXhwb3J0cy50aWxlVGFza0ZhY3RvcnkgPSB0aWxlVGFza0ZhY3RvcnlcbmV4cG9ydHMuZXhlY3V0ZSA9IGV4ZWN1dGVcblxudmFyIGltYWdlVG9DYW52YXMgPSByZXF1aXJlKCcuL2ltYWdlLXRvLWNhbnZhcycpXG52YXIgbWFrZUNhbnZhcyA9IHJlcXVpcmUoJy4vbWFrZS1jYW52YXMnKVxudmFyIG1ha2VHcmlkID0gcmVxdWlyZSgnLi9ncmlkJylcbnZhciBhdmVyYWdlQ29sb3VyID0gcmVxdWlyZSgnLi9hdmVyYWdlLWNvbG91cicpXG52YXIgcmdiMkhleCA9IHJlcXVpcmUoJy4vcmdiLXRvLWhleCcpXG5cbi8qKlxuICogUmVuZGVycyBhbiBpbWFnZSB0byBhIGNhbnZhcyBpbiBhIHRhcmdldCBlbGVtZW50IGFzIGEgc2VyaWVzIG9mIHRpbGVzXG4gKiByZXByZXNlbnRpbmcgYXZlcmFnZSBjb2xvdXJzIG9mIHRoZSBhcmVhcyB0aGV5IGNvdmVyLlxuICpcbiAqIFRha2VzIGEgdGFyZ2V0IGVsZW1lbnQgdG8gcHV0IHRoZSBjYW52YXMgaW50bywgYSBmaWxlIG9iamVjdCByZXByZXNlbnRpbmdcbiAqIHRoZSBmaWxlIGZyb20gYSBmaWxlIGlucHV0IG9yIGRyYWcgYW5kIGRyb3AgZXZlbnQgYW5kIGEgc2V0dGluZ3Mgb2JqZWN0XG4gKiBjb250YWluaW5nIHRpbGUgd2lkdGgsIHRpbGUgaGVpZ2h0IGFuZCBhIGJhc2UgdXJsIGZvciB3aGVyZSB0byBsb2FkIHRoZSB0aWxlc1xuICogZnJvbS5cbiAqXG4gKiBAcGFyYW0gIHtIVE1MRWxlbWVudH0gdGFyZ2V0ICAgV2hlcmUgaW4gdGhlIERPTSB0byBhcHBlbmQgdGhlIG1vc2FpYyB0b1xuICogQHBhcmFtICB7RmlsZX0gZmlsZSAgICAgICAgICAgIEZpbGUgb2JqZWN0IHJlcHJlc2VudGluZyB0aGUgaW1hZ2UgdG8gcmVuZGVyXG4gKiBAcGFyYW0gIHtPYmplY3R9IHNldHRpbmdzICAgICAgU2V0dGluZ3MgZm9yIHRoZSBtb3NhaWMgY2FsbC5cbiAqICAgICAgICAgICAgICAgICAgc2V0dGluZ3MuVElMRV9XSURUSCBUaGUgd2lkdGggb2YgdGlsZXMgaW4gdGhpcyBtb3NhaWNcbiAqICAgICAgICAgICAgICAgICAgc2V0dGluZ3MuVElMRV9IRUlHSFQgdGhlIGhlaWdodCBvZiB0aWxlcyBpbiB0aGlzIG1vc2FpY1xuICogICAgICAgICAgICAgICAgICBzZXR0aW5ncy5CQVNFX1VSTCBUaGUgYmFzZSB1cmwgZm9yIHRpbGUgaW1hZ2UgcmVxdWVzdHNcbiAqL1xuZnVuY3Rpb24gbW9zYWljICh0YXJnZXQsIGZpbGUsIHNldHRpbmdzKSB7XG4gICAgLy8gRHJhdyB0aGUgaW1hZ2UgaW50byBhbiBvZmZzY3JlZW4gY2FudmFzXG4gICAgaW1hZ2VUb0NhbnZhcyhmaWxlLCBmdW5jdGlvbiAoZXJyLCBzb3VyY2UpIHtcbiAgICAgICAgLy8gTmVlZCB0aGlzIGluZm8gaW4gYSBjb3VwbGUgb2YgcGxhY2VzXG4gICAgICAgIHZhciBkaW1lbnNpb25zID0ge1xuICAgICAgICAgICAgcm93czogTWF0aC5jZWlsKHNvdXJjZS5oZWlnaHQgLyBzZXR0aW5ncy5USUxFX0hFSUdIVClcbiAgICAgICAgICAsIGNvbHVtbnM6IE1hdGguY2VpbChzb3VyY2Uud2lkdGggLyBzZXR0aW5ncy5USUxFX1dJRFRIKVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gQnJlYWsgaXQgaW50byBhIGdyaWRcbiAgICAgICAgdmFyIGdyaWQgPSBtYWtlR3JpZChkaW1lbnNpb25zKVxuXG4gICAgICAgIC8vIE1hcCBncmlkIHRvIHNlcnZlciBmZXRjaCB0YXNrc1xuICAgICAgICB2YXIgdGFza1NldHRpbmdzID0ge1xuICAgICAgICAgICAgdGlsZVdpZHRoOiBzZXR0aW5ncy5USUxFX1dJRFRIXG4gICAgICAgICAgLCB0aWxlSGVpZ2h0OiBzZXR0aW5ncy5USUxFX0hFSUdIVFxuICAgICAgICAgICwgd2lkdGg6IHNvdXJjZS53aWR0aFxuICAgICAgICAgICwgaGVpZ2h0OiBzb3VyY2UuaGVpZ2h0XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHRhc2tzID0gZ3JpZC5tYXAodGlsZVRhc2tGYWN0b3J5KFxuICAgICAgICAgICAgc291cmNlLmdldENvbnRleHQoJzJkJylcbiAgICAgICAgICAsIHRhc2tTZXR0aW5nc1xuICAgICAgICApKVxuXG4gICAgICAgIC8vIEFkZCB0aGUgY2FudmFzIHRvIHRoZSBkb20gc28gdXNlcnMgY2FuIHNlZSByb3ctYnktcm93XG4gICAgICAgIHZhciBkZXN0ID0gbWFrZUNhbnZhcyhzb3VyY2Uud2lkdGgsIHNvdXJjZS5oZWlnaHQpXG4gICAgICAgIHZhciBjdHggPSBkZXN0LmdldENvbnRleHQoJzJkJylcbiAgICAgICAgdmFyIHdyYXBwZXIgPSBtYWtlV3JhcHBlcihzb3VyY2Uud2lkdGgsIHNvdXJjZS5oZWlnaHQpXG4gICAgICAgIHdyYXBwZXIuYXBwZW5kQ2hpbGQoZGVzdClcbiAgICAgICAgdGFyZ2V0LmFwcGVuZENoaWxkKHdyYXBwZXIpXG5cbiAgICAgICAgdmFyIGV4ZWN1dGVTZXR0aW5ncyA9IHtcbiAgICAgICAgICAgIHJvd3M6IGRpbWVuc2lvbnMucm93c1xuICAgICAgICAgICwgY29sdW1uczogZGltZW5zaW9ucy5jb2x1bW5zXG4gICAgICAgICAgLCB0aWxlV2lkdGg6IHNldHRpbmdzLlRJTEVfV0lEVEhcbiAgICAgICAgICAsIHRpbGVIZWlnaHQ6IHNldHRpbmdzLlRJTEVfSEVJR0hUXG4gICAgICAgICAgLCBiYXNlVXJsOiBzZXR0aW5ncy5CQVNFX1VSTFxuICAgICAgICB9XG4gICAgICAgIGV4ZWN1dGUodGFza3MsIGV4ZWN1dGVTZXR0aW5ncywgZnVuY3Rpb24gKHJvdywgaSkge1xuICAgICAgICAgICAgY3R4LmRyYXdJbWFnZShyb3csIDAsIGkgKiBzZXR0aW5ncy5USUxFX0hFSUdIVClcbiAgICAgICAgfSlcbiAgICB9KVxufVxuXG4vLyBDbG9zdXJlIHNvIHRoZSB0aWxlVGFzayBmdW5jdGlvbiBoYXMgd2hhdCBpdCBuZWVkc1xuZnVuY3Rpb24gdGlsZVRhc2tGYWN0b3J5IChjdHgsIHNldHRpbmdzKSB7XG4gICAgLy8gVGFrZSBhIGNlbGwgZGVmaW5pdGlvbiAoYW4gb2JqZWN0IHdpdGggeCBhbmQgeSBwcm9wZXJ0aWVzKSBhbmQgcmV0dXJuIGFcbiAgICAvLyB0YXNrIG9iamVjdC4gQSB0YXNrIG9iamVjdCBoYXMgeCwgeSBhbmQgaGV4IHZhbHVlIHByb3BlcnRpZXMuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIChjZWxsKSB7XG4gICAgICAgIHZhciBwaXhlbHMgPSBjdHguZ2V0SW1hZ2VEYXRhKFxuICAgICAgICAgICAgY2VsbC54ICogc2V0dGluZ3MudGlsZVdpZHRoXG4gICAgICAgICAgLCBjZWxsLnkgKiBzZXR0aW5ncy50aWxlSGVpZ2h0XG4gICAgICAgICAgLy8gQmluZCB0aGVzZSB0byB0aGUgZGltZW5zaW9ucyBvZiB0aGUgaW1hZ2UsIHdoZW4gaXQgZ29lcyBvdmVyXG4gICAgICAgICAgLy8gaXQncyBhZmZlY3RpbmcgdGhlIGF2ZXJhZ2UgdmFsdWVzIHRvIG1ha2UgdGhlbSBkYXJrZXIuIEkgc3VzcGVjdFxuICAgICAgICAgIC8vIGl0IGdpdmVzIDAgdmFsdWVzIChibGFjaykgZm9yIHBpeGVscyBvdXRzaWRlIHRoZSBib3VuZHMuIEknbVxuICAgICAgICAgIC8vIHByZXR0eSBzdXJlIEkgcmVtZW1iZXIgZmlyZWZveCB3b3VsZCBlcnJvciBvdXQgYW55d2F5LlxuICAgICAgICAgICwgTWF0aC5taW4oc2V0dGluZ3MudGlsZVdpZHRoLCBzZXR0aW5ncy53aWR0aCAtIGNlbGwueCAqIHNldHRpbmdzLnRpbGVXaWR0aClcbiAgICAgICAgICAsIE1hdGgubWluKHNldHRpbmdzLnRpbGVIZWlnaHQsIHNldHRpbmdzLmhlaWdodCAtIGNlbGwueSAqIHNldHRpbmdzLnRpbGVIZWlnaHQpXG4gICAgICAgICkuZGF0YVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB4OiBjZWxsLnhcbiAgICAgICAgICAsIHk6IGNlbGwueVxuICAgICAgICAgICwgaGV4OiByZ2IySGV4LmFwcGx5KG51bGwsIGF2ZXJhZ2VDb2xvdXIocGl4ZWxzKSlcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLy8gRXhlY3V0ZSB0aGUgdGFza3MgaW4gYSB3YXkgd2UgY2FuIGNhbGwgbiB0aW1lcywgd2hlcmUgbiBpcyB0aGUgbnVtYmVyIG9mIHJvd3Ncbi8vIGFuZCB0aGUgb3JkZXIgb2YgdGhlIGNhbGxzIG1hdGNoZXMgdGhlIG9yZGVyIG9mIHRoZSByb3dzLlxuZnVuY3Rpb24gZXhlY3V0ZSAodGFza3MsIHNldHRpbmdzLCByb3dDYWxsYmFjaykge1xuICAgIC8vIFJlZHVjZSB0byByb3dzXG4gICAgdmFyIHJvd3MgPSB0YXNrcy5yZWR1Y2UoZnVuY3Rpb24gKHByZXZpb3VzLCBjdXJyZW50KSB7XG4gICAgICAgIHByZXZpb3VzW2N1cnJlbnQueV0gPSBwcmV2aW91c1tjdXJyZW50LnldIHx8IFtdXG4gICAgICAgIHByZXZpb3VzW2N1cnJlbnQueV1bY3VycmVudC54XSA9IGN1cnJlbnRcbiAgICAgICAgcmV0dXJuIHByZXZpb3VzXG4gICAgfSwgW10pXG5cbiAgICAvLyBEcmF3IGNlbGxzIGluIGVhY2ggcm93IHRvIGVhY2ggY29udGV4dFxuICAgIHZhciBxdWV1ZVN0YXJ0ID0gMFxuICAgIHZhciBxdWV1ZSA9IHJvd3MubWFwKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfSlcbiAgICByb3dzLmZvckVhY2goZnVuY3Rpb24gKGNlbGxzLCBpKSB7XG4gICAgICAgIHZhciByb3dDYW52YXMgPSBtYWtlQ2FudmFzKFxuICAgICAgICAgICAgc2V0dGluZ3MuY29sdW1ucyAqIHNldHRpbmdzLnRpbGVXaWR0aFxuICAgICAgICAgICwgc2V0dGluZ3MudGlsZUhlaWdodFxuICAgICAgICApXG4gICAgICAgIHZhciByb3dDdHggPSByb3dDYW52YXMuZ2V0Q29udGV4dCgnMmQnKVxuXG4gICAgICAgIC8vIEFzIHRoZXkgYXJlIGZldGNoZWQsIHJlbmRlciB0byBhbiBvZmZzY3JlZW4gY29udGV4dCBzbyB3ZSBjYW4gcmVuZGVyXG4gICAgICAgIC8vIHRoZSB3aG9sZSByb3cgYXQgb25jZSB0byB0aGUgdXNlclxuICAgICAgICAvL1xuICAgICAgICAvLyBVc2UgYSBwcm9taXNlIGhlcmUgYmVjYXVzZSBJIGRvbid0IHdhbnQgdG8gaW5jbHVkZSB0aGUgYXN5bmMgcGFja2FnZVxuICAgICAgICAvLyBqdXN0IGZvciB0aGlzIGJpdC5cbiAgICAgICAgUHJvbWlzZS5hbGwoY2VsbHMubWFwKGZ1bmN0aW9uIChjZWxsKSB7XG4gICAgICAgICAgICB2YXIgeCA9IGNlbGwueCAqIHNldHRpbmdzLnRpbGVXaWR0aFxuICAgICAgICAgICAgdmFyIHVybCA9IHNldHRpbmdzLmJhc2VVcmwgKyAnY29sb3IvJyArIGNlbGwuaGV4XG5cbiAgICAgICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgICAgICAgICAgLy8gRHVwbGljYXRlIGxvYWRpbmcgaW1hZ2UgaW50byBjYW52YXMsIG1pZ2h0IGJlIGFibGUgdG8gZmFjdG9yXG4gICAgICAgICAgICAgICAgLy8gdGhpcyBiZXR0ZXIuXG4gICAgICAgICAgICAgICAgdmFyIGltZyA9IG5ldyBJbWFnZSgpXG4gICAgICAgICAgICAgICAgaW1nLm9ubG9hZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgICAgICAgICAgcm93Q3R4LmRyYXdJbWFnZShpbWcsIHgsIDApXG4gICAgICAgICAgICAgICAgICAgIHJlc29sdmUoKVxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICBpbWcuc3JjID0gdXJsXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KSkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvLyBRdWV1ZSBmb3IgY2FsbGJhY2sgYmVjYXVzZSB3ZSBoYXZlIHRvIHJlbmRlciByb3dzIGluIG9yZGVyXG4gICAgICAgICAgICAvLyBhbmQgd2UgY2FuJ3QgZ3VhcmFudGVlIHRoYXQgcmlnaHQgbm93IHdpdGggdGhpcyBmZXRjaGluZyBtZXRob2RcbiAgICAgICAgICAgIHF1ZXVlW2ldID0gcm93Q2FudmFzXG5cbiAgICAgICAgICAgIGZvciAodmFyIGogPSBxdWV1ZVN0YXJ0OyBqIDwgcXVldWUubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoIXF1ZXVlW2pdKSBicmVhaztcbiAgICAgICAgICAgICAgICByb3dDYWxsYmFjayhxdWV1ZVtqXSwgailcbiAgICAgICAgICAgICAgICBxdWV1ZVN0YXJ0ID0gaiArIDFcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICB9KVxufVxuXG4vKipcbiAqIENyZWF0ZSBhIGRpdiB3aXRoIHRoZSB3cmFwcGVyIHN0eWxlLCBvZiB0aGUgaGVpZ2h0IGFuZCB3aWR0aCBvZiB0aGUgdG8tYmVcbiAqIGNhbnZhcyB0byBiZXR0ZXIgc2hvdyB0aGUgdXNlciB3aGF0J3MgaGFwcGVuaW5nLlxuICpcbiAqIERvbid0IHdhbnQgRE9NIG9wZXJhdGlvbnMgY2x1dHRlcmluZyB1cCBteSBsb2dpYyBzbyBjaHVja2luZyB0aGlzIGluIGEgaGVscGVyXG4gKi9cbmZ1bmN0aW9uIG1ha2VXcmFwcGVyICh3aWR0aCwgaGVpZ2h0KSB7XG4gICAgdmFyIHJldCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG4gICAgcmV0LmNsYXNzTGlzdC5hZGQoJ21vc2FpYy13cmFwcGVyJylcbiAgICAvLyArcGFkZGluZyArYm9yZGVyIGJlY2F1c2UgYm9yZGVyLWJveFxuICAgIHJldC5zdHlsZS53aWR0aCA9ICh3aWR0aCArIDQyKSArICdweCdcbiAgICByZXQuc3R5bGUuaGVpZ2h0ID0gKGhlaWdodCArIDQyKSArICdweCdcbiAgICByZXR1cm4gcmV0XG59IiwibW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gcmdiMkhleFxuZXhwb3J0cy5wYWQgPSBwYWRcblxuLyoqXG4gKiBDb252ZXJ0IGByYCwgYGdgIGFuZCBgYmAgdmFsdWVzIHRvIGEgc2luZ2xlIGhleCBzdHJpbmcuIEUuZy46XG4gKlxuICogICAgIHJnYjJIZXgoMCwgMCwgMCkgLy8gMDAwMDAwXG4gKiAgICAgcmdiMkhleCgyNTUsIDI1NSwgMjU1KSAvLyBmZmZmZmZcbiAqL1xuZnVuY3Rpb24gcmdiMkhleCAociwgZywgYikge1xuICAgIC8vIFBhZCBiZWNhdXNlIDAudG9TdHJpbmcoMTYpIGlzIDAgbm90IDAwIGFuZCB0aGUgc2VydmVyIGV4cGVjdHMgNiBjaGFyYWN0ZXJcbiAgICAvLyBoZXggc3RyaW5ncy5cbiAgICByZXR1cm4gcGFkKHIudG9TdHJpbmcoMTYpKSArIHBhZChnLnRvU3RyaW5nKDE2KSkgKyBwYWQoYi50b1N0cmluZygxNikpXG59XG5cbmZ1bmN0aW9uIHBhZCAoc3RyKSB7XG4gICAgaWYgKHN0ci5sZW5ndGggPT09IDEpIHJldHVybiAnMCcgKyBzdHJcbiAgICByZXR1cm4gc3RyXG59IiwiLy8gQ29uc3RhbnRzIHNoYXJlZCBiZXR3ZWVuIGNsaWVudCBhbmQgc2VydmVyLlxuXG52YXIgVElMRV9XSURUSCA9IDE2O1xudmFyIFRJTEVfSEVJR0hUID0gMTY7XG5cbnZhciBleHBvcnRzID0gZXhwb3J0cyB8fCBudWxsO1xuaWYgKGV4cG9ydHMpIHtcbiAgZXhwb3J0cy5USUxFX1dJRFRIID0gVElMRV9XSURUSDtcbiAgZXhwb3J0cy5USUxFX0hFSUdIVCA9IFRJTEVfSEVJR0hUO1xufVxuXG4iLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkge1xuICB0aGlzLl9ldmVudHMgPSB0aGlzLl9ldmVudHMgfHwge307XG4gIHRoaXMuX21heExpc3RlbmVycyA9IHRoaXMuX21heExpc3RlbmVycyB8fCB1bmRlZmluZWQ7XG59XG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcblxuLy8gQmFja3dhcmRzLWNvbXBhdCB3aXRoIG5vZGUgMC4xMC54XG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9ldmVudHMgPSB1bmRlZmluZWQ7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9tYXhMaXN0ZW5lcnMgPSB1bmRlZmluZWQ7XG5cbi8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW4gMTAgbGlzdGVuZXJzIGFyZVxuLy8gYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaCBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbkV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbi8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcbiAgaWYgKCFpc051bWJlcihuKSB8fCBuIDwgMCB8fCBpc05hTihuKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ24gbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlcicpO1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGVyLCBoYW5kbGVyLCBsZW4sIGFyZ3MsIGksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG4gIGlmICh0eXBlID09PSAnZXJyb3InKSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHMuZXJyb3IgfHxcbiAgICAgICAgKGlzT2JqZWN0KHRoaXMuX2V2ZW50cy5lcnJvcikgJiYgIXRoaXMuX2V2ZW50cy5lcnJvci5sZW5ndGgpKSB7XG4gICAgICBlciA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIGlmIChlciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHRocm93IGVyOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgfVxuICAgICAgdGhyb3cgVHlwZUVycm9yKCdVbmNhdWdodCwgdW5zcGVjaWZpZWQgXCJlcnJvclwiIGV2ZW50LicpO1xuICAgIH1cbiAgfVxuXG4gIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzVW5kZWZpbmVkKGhhbmRsZXIpKVxuICAgIHJldHVybiBmYWxzZTtcblxuICBpZiAoaXNGdW5jdGlvbihoYW5kbGVyKSkge1xuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgLy8gZmFzdCBjYXNlc1xuICAgICAgY2FzZSAxOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgLy8gc2xvd2VyXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgICAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGhhbmRsZXIpKSB7XG4gICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuXG4gICAgbGlzdGVuZXJzID0gaGFuZGxlci5zbGljZSgpO1xuICAgIGxlbiA9IGxpc3RlbmVycy5sZW5ndGg7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKVxuICAgICAgbGlzdGVuZXJzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIG07XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT09IFwibmV3TGlzdGVuZXJcIiEgQmVmb3JlXG4gIC8vIGFkZGluZyBpdCB0byB0aGUgbGlzdGVuZXJzLCBmaXJzdCBlbWl0IFwibmV3TGlzdGVuZXJcIi5cbiAgaWYgKHRoaXMuX2V2ZW50cy5uZXdMaXN0ZW5lcilcbiAgICB0aGlzLmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSxcbiAgICAgICAgICAgICAgaXNGdW5jdGlvbihsaXN0ZW5lci5saXN0ZW5lcikgP1xuICAgICAgICAgICAgICBsaXN0ZW5lci5saXN0ZW5lciA6IGxpc3RlbmVyKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgZWxzZSBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhcHBlbmQuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdLnB1c2gobGlzdGVuZXIpO1xuICBlbHNlXG4gICAgLy8gQWRkaW5nIHRoZSBzZWNvbmQgZWxlbWVudCwgbmVlZCB0byBjaGFuZ2UgdG8gYXJyYXkuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXSwgbGlzdGVuZXJdO1xuXG4gIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pICYmICF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkKSB7XG4gICAgdmFyIG07XG4gICAgaWYgKCFpc1VuZGVmaW5lZCh0aGlzLl9tYXhMaXN0ZW5lcnMpKSB7XG4gICAgICBtID0gdGhpcy5fbWF4TGlzdGVuZXJzO1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnM7XG4gICAgfVxuXG4gICAgaWYgKG0gJiYgbSA+IDAgJiYgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IG0pIHtcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgPSB0cnVlO1xuICAgICAgY29uc29sZS5lcnJvcignKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXG4gICAgICAgICAgICAgICAgICAgICdsZWFrIGRldGVjdGVkLiAlZCBsaXN0ZW5lcnMgYWRkZWQuICcgK1xuICAgICAgICAgICAgICAgICAgICAnVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXQuJyxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCk7XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUudHJhY2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgLy8gbm90IHN1cHBvcnRlZCBpbiBJRSAxMFxuICAgICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIHZhciBmaXJlZCA9IGZhbHNlO1xuXG4gIGZ1bmN0aW9uIGcoKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBnKTtcblxuICAgIGlmICghZmlyZWQpIHtcbiAgICAgIGZpcmVkID0gdHJ1ZTtcbiAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICB9XG5cbiAgZy5saXN0ZW5lciA9IGxpc3RlbmVyO1xuICB0aGlzLm9uKHR5cGUsIGcpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gZW1pdHMgYSAncmVtb3ZlTGlzdGVuZXInIGV2ZW50IGlmZiB0aGUgbGlzdGVuZXIgd2FzIHJlbW92ZWRcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbGlzdCwgcG9zaXRpb24sIGxlbmd0aCwgaTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXR1cm4gdGhpcztcblxuICBsaXN0ID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICBsZW5ndGggPSBsaXN0Lmxlbmd0aDtcbiAgcG9zaXRpb24gPSAtMTtcblxuICBpZiAobGlzdCA9PT0gbGlzdGVuZXIgfHxcbiAgICAgIChpc0Z1bmN0aW9uKGxpc3QubGlzdGVuZXIpICYmIGxpc3QubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgfSBlbHNlIGlmIChpc09iamVjdChsaXN0KSkge1xuICAgIGZvciAoaSA9IGxlbmd0aDsgaS0tID4gMDspIHtcbiAgICAgIGlmIChsaXN0W2ldID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAgIChsaXN0W2ldLmxpc3RlbmVyICYmIGxpc3RbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgICAgICBwb3NpdGlvbiA9IGk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChwb3NpdGlvbiA8IDApXG4gICAgICByZXR1cm4gdGhpcztcblxuICAgIGlmIChsaXN0Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgbGlzdC5sZW5ndGggPSAwO1xuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGlzdC5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGtleSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIC8vIG5vdCBsaXN0ZW5pbmcgZm9yIHJlbW92ZUxpc3RlbmVyLCBubyBuZWVkIHRvIGVtaXRcbiAgaWYgKCF0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMClcbiAgICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIGVsc2UgaWYgKHRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBlbWl0IHJlbW92ZUxpc3RlbmVyIGZvciBhbGwgbGlzdGVuZXJzIG9uIGFsbCBldmVudHNcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICBmb3IgKGtleSBpbiB0aGlzLl9ldmVudHMpIHtcbiAgICAgIGlmIChrZXkgPT09ICdyZW1vdmVMaXN0ZW5lcicpIGNvbnRpbnVlO1xuICAgICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoa2V5KTtcbiAgICB9XG4gICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoJ3JlbW92ZUxpc3RlbmVyJyk7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzRnVuY3Rpb24obGlzdGVuZXJzKSkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBMSUZPIG9yZGVyXG4gICAgd2hpbGUgKGxpc3RlbmVycy5sZW5ndGgpXG4gICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyc1tsaXN0ZW5lcnMubGVuZ3RoIC0gMV0pO1xuICB9XG4gIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSBbXTtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbih0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICBlbHNlXG4gICAgcmV0ID0gdGhpcy5fZXZlbnRzW3R5cGVdLnNsaWNlKCk7XG4gIHJldHVybiByZXQ7XG59O1xuXG5FdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKGVtaXR0ZXIsIHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCFlbWl0dGVyLl9ldmVudHMgfHwgIWVtaXR0ZXIuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSAwO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKGVtaXR0ZXIuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gMTtcbiAgZWxzZVxuICAgIHJldCA9IGVtaXR0ZXIuX2V2ZW50c1t0eXBlXS5sZW5ndGg7XG4gIHJldHVybiByZXQ7XG59O1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG4iXX0=
