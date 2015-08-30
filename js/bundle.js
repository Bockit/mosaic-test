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
},{"./lib/file-dragger":4,"./lib/mosaic":9,"./mosaic":11}],2:[function(require,module,exports){
module.exports = subset

/**
 * Given an array (or an array-like), return an array representing a view into a
 * subset of that array. The veiw is calculated by treating the array as a grid
 * and passing the grid coordintes of the desired view as an argument.
 *
 * @param  {Array} arr             The array/array-like to view
 *
 * @param  {Object} dimensions     The grid dimensions of the array
 *                  dimensions.width How many cells wide is the grid
 *                  dimensions.height How many cells high is the grid
 *                  dimensions.cellSize How many cells in the arr represent 1
 *                                      cell in the grid we're treating it as.
 *                                      E.g., with pixel data 4 values makes one
 *                                      pixel (r, g, b, a)
 *
 * @param  {Object} viewDimensions The dimensions of the view we're looking for
 *                  viewDimensions.x X coordinate of the view in the grid
 *                  viewDimensions.y Y coordinate of the view in the grid
 *                  viewDimensions.width Width of the view in the grid
 *                  viewDimensions.height Height of the view in the grid
 *
 * @return {Array}                 The array representing the view asked for.
 */
function subset (arr, dimensions, viewDimensions) {
    var ret = []

    var vd = viewDimensions
    var d = dimensions
    var cellSize = d.cellSize == null ? 1 : d.cellSize

    for (var x = vd.x; x < vd.x + vd.width; x += 1) {
        for (var y = vd.y; y < vd.y + vd.height; y += 1) {
            var index = (y * cellSize) * d.width + (x * cellSize)
            ret.push.apply(ret, [].slice.call(arr, index, index + cellSize))
        }
    }

    return ret
}
},{}],3:[function(require,module,exports){
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
},{}],4:[function(require,module,exports){
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
},{"events":18}],5:[function(require,module,exports){
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
},{}],6:[function(require,module,exports){
module.exports = imageToCanvas

var makeCanvas = require('./make-canvas')
var loadImage = require('./load-image')

/**
 * Takes a browser file object and a callback. Calls back with an error if it
 * occurred (at the moment we're not looking for one to send) and a detached
 * canvas element matching the image's dimensions with the image blitted to it.
 */
function imageToCanvas (file, callback) {
    var url = URL.createObjectURL(file)
    loadImage(url).then(function (img) {
        var canvas = makeCanvas(img.width, img.height)
        var ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        // Need to do this because of the way browser's gc these ObjectUrl
        // variables. See:
        // https://developer.mozilla.org/en-US/docs/Web/API/URL/createObjectURL
        URL.revokeObjectURL(url)
        callback(null, canvas)
    })
}
},{"./load-image":7,"./make-canvas":8}],7:[function(require,module,exports){
var memoize = require('lodash/function/memoize')

module.exports = memoize(loadImage)

/**
 * Takes a url and returns a promise that resolves to a loaded Image object.
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
},{"lodash/function/memoize":12}],8:[function(require,module,exports){
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
},{}],9:[function(require,module,exports){
module.exports = exports = mosaic
exports.tileTaskFactory = tileTaskFactory
exports.executeStrategy = executeStrategy

var imageToCanvas = require('./image-to-canvas')
var makeCanvas = require('./make-canvas')
var makeGrid = require('./grid')
var averageColour = require('./average-colour')
var rgb2Hex = require('./rgb-to-hex')
var loadImage = require('./load-image')
var arraySubset = require('./array-grid-subset')

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
    var execute = settings.executeStrategy || executeStrategy

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

// Execute the tasks in a way we can call n times, where n is the number of rows
// and the order of the calls matches the order of the rows.
function executeStrategy (tasks, settings, rowCallback) {
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
        Promise.all(cells.map(function (cell) {
            var x = cell.x * settings.tileWidth
            var url = settings.baseUrl + 'color/' + cell.hex

            return loadImage(url).then(function (img) {
                rowCtx.drawImage(img, x, 0)
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

// Closure so the tileTask function has what it needs
function tileTaskFactory (ctx, settings) {
    var imageData = ctx.getImageData(0, 0, settings.width, settings.height).data
    // Take a cell definition (an object with x and y properties) and return a
    // task object. A task object has x, y and hex value properties.
    return function (cell) {
        var pixels = arraySubset(imageData, {
            width: settings.width
          , height: settings.height
            // each pixel is actually 4 array cells
          , cellSize: 4
        }, {
            x: cell.x * settings.tileWidth
          , y: cell.y * settings.tileHeight
          // Bind these to the dimensions of the image
          , width: Math.min(settings.tileWidth, settings.width - cell.x * settings.tileWidth)
          , height: Math.min(settings.tileHeight, settings.height - cell.y * settings.tileHeight)
        })

        return {
            x: cell.x
          , y: cell.y
          , hex: rgb2Hex.apply(null, averageColour(pixels))
        }
    }
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
    // +padding +border because of box-sizing: border-box;
    ret.style.width = (width + 42) + 'px'
    ret.style.height = (height + 42) + 'px'
    return ret
}
},{"./array-grid-subset":2,"./average-colour":3,"./grid":5,"./image-to-canvas":6,"./load-image":7,"./make-canvas":8,"./rgb-to-hex":10}],10:[function(require,module,exports){
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
},{}],11:[function(require,module,exports){
// Constants shared between client and server.

var TILE_WIDTH = 16;
var TILE_HEIGHT = 16;

var exports = exports || null;
if (exports) {
  exports.TILE_WIDTH = TILE_WIDTH;
  exports.TILE_HEIGHT = TILE_HEIGHT;
}


},{}],12:[function(require,module,exports){
var MapCache = require('../internal/MapCache');

/** Used as the `TypeError` message for "Functions" methods. */
var FUNC_ERROR_TEXT = 'Expected a function';

/**
 * Creates a function that memoizes the result of `func`. If `resolver` is
 * provided it determines the cache key for storing the result based on the
 * arguments provided to the memoized function. By default, the first argument
 * provided to the memoized function is coerced to a string and used as the
 * cache key. The `func` is invoked with the `this` binding of the memoized
 * function.
 *
 * **Note:** The cache is exposed as the `cache` property on the memoized
 * function. Its creation may be customized by replacing the `_.memoize.Cache`
 * constructor with one whose instances implement the [`Map`](http://ecma-international.org/ecma-262/6.0/#sec-properties-of-the-map-prototype-object)
 * method interface of `get`, `has`, and `set`.
 *
 * @static
 * @memberOf _
 * @category Function
 * @param {Function} func The function to have its output memoized.
 * @param {Function} [resolver] The function to resolve the cache key.
 * @returns {Function} Returns the new memoizing function.
 * @example
 *
 * var upperCase = _.memoize(function(string) {
 *   return string.toUpperCase();
 * });
 *
 * upperCase('fred');
 * // => 'FRED'
 *
 * // modifying the result cache
 * upperCase.cache.set('fred', 'BARNEY');
 * upperCase('fred');
 * // => 'BARNEY'
 *
 * // replacing `_.memoize.Cache`
 * var object = { 'user': 'fred' };
 * var other = { 'user': 'barney' };
 * var identity = _.memoize(_.identity);
 *
 * identity(object);
 * // => { 'user': 'fred' }
 * identity(other);
 * // => { 'user': 'fred' }
 *
 * _.memoize.Cache = WeakMap;
 * var identity = _.memoize(_.identity);
 *
 * identity(object);
 * // => { 'user': 'fred' }
 * identity(other);
 * // => { 'user': 'barney' }
 */
function memoize(func, resolver) {
  if (typeof func != 'function' || (resolver && typeof resolver != 'function')) {
    throw new TypeError(FUNC_ERROR_TEXT);
  }
  var memoized = function() {
    var args = arguments,
        key = resolver ? resolver.apply(this, args) : args[0],
        cache = memoized.cache;

    if (cache.has(key)) {
      return cache.get(key);
    }
    var result = func.apply(this, args);
    memoized.cache = cache.set(key, result);
    return result;
  };
  memoized.cache = new memoize.Cache;
  return memoized;
}

// Assign cache to `_.memoize`.
memoize.Cache = MapCache;

module.exports = memoize;

},{"../internal/MapCache":13}],13:[function(require,module,exports){
var mapDelete = require('./mapDelete'),
    mapGet = require('./mapGet'),
    mapHas = require('./mapHas'),
    mapSet = require('./mapSet');

/**
 * Creates a cache object to store key/value pairs.
 *
 * @private
 * @static
 * @name Cache
 * @memberOf _.memoize
 */
function MapCache() {
  this.__data__ = {};
}

// Add functions to the `Map` cache.
MapCache.prototype['delete'] = mapDelete;
MapCache.prototype.get = mapGet;
MapCache.prototype.has = mapHas;
MapCache.prototype.set = mapSet;

module.exports = MapCache;

},{"./mapDelete":14,"./mapGet":15,"./mapHas":16,"./mapSet":17}],14:[function(require,module,exports){
/**
 * Removes `key` and its value from the cache.
 *
 * @private
 * @name delete
 * @memberOf _.memoize.Cache
 * @param {string} key The key of the value to remove.
 * @returns {boolean} Returns `true` if the entry was removed successfully, else `false`.
 */
function mapDelete(key) {
  return this.has(key) && delete this.__data__[key];
}

module.exports = mapDelete;

},{}],15:[function(require,module,exports){
/**
 * Gets the cached value for `key`.
 *
 * @private
 * @name get
 * @memberOf _.memoize.Cache
 * @param {string} key The key of the value to get.
 * @returns {*} Returns the cached value.
 */
function mapGet(key) {
  return key == '__proto__' ? undefined : this.__data__[key];
}

module.exports = mapGet;

},{}],16:[function(require,module,exports){
/** Used for native method references. */
var objectProto = Object.prototype;

/** Used to check objects for own properties. */
var hasOwnProperty = objectProto.hasOwnProperty;

/**
 * Checks if a cached value for `key` exists.
 *
 * @private
 * @name has
 * @memberOf _.memoize.Cache
 * @param {string} key The key of the entry to check.
 * @returns {boolean} Returns `true` if an entry for `key` exists, else `false`.
 */
function mapHas(key) {
  return key != '__proto__' && hasOwnProperty.call(this.__data__, key);
}

module.exports = mapHas;

},{}],17:[function(require,module,exports){
/**
 * Sets `value` to `key` of the cache.
 *
 * @private
 * @name set
 * @memberOf _.memoize.Cache
 * @param {string} key The key of the value to cache.
 * @param {*} value The value to cache.
 * @returns {Object} Returns the cache object.
 */
function mapSet(key, value) {
  if (key != '__proto__') {
    this.__data__[key] = value;
  }
  return this;
}

module.exports = mapSet;

},{}],18:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwianMvY2xpZW50LmpzIiwianMvbGliL2FycmF5LWdyaWQtc3Vic2V0LmpzIiwianMvbGliL2F2ZXJhZ2UtY29sb3VyLmpzIiwianMvbGliL2ZpbGUtZHJhZ2dlci5qcyIsImpzL2xpYi9ncmlkLmpzIiwianMvbGliL2ltYWdlLXRvLWNhbnZhcy5qcyIsImpzL2xpYi9sb2FkLWltYWdlLmpzIiwianMvbGliL21ha2UtY2FudmFzLmpzIiwianMvbGliL21vc2FpYy5qcyIsImpzL2xpYi9yZ2ItdG8taGV4LmpzIiwianMvbW9zYWljLmpzIiwibm9kZV9tb2R1bGVzL2xvZGFzaC9mdW5jdGlvbi9tZW1vaXplLmpzIiwibm9kZV9tb2R1bGVzL2xvZGFzaC9pbnRlcm5hbC9NYXBDYWNoZS5qcyIsIm5vZGVfbW9kdWxlcy9sb2Rhc2gvaW50ZXJuYWwvbWFwRGVsZXRlLmpzIiwibm9kZV9tb2R1bGVzL2xvZGFzaC9pbnRlcm5hbC9tYXBHZXQuanMiLCJub2RlX21vZHVsZXMvbG9kYXNoL2ludGVybmFsL21hcEhhcy5qcyIsIm5vZGVfbW9kdWxlcy9sb2Rhc2gvaW50ZXJuYWwvbWFwU2V0LmpzIiwibm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9ldmVudHMvZXZlbnRzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0pBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBzZXR0aW5ncyA9IHJlcXVpcmUoJy4vbW9zYWljJylcbnZhciBGaWxlRHJhZ2dlciA9IHJlcXVpcmUoJy4vbGliL2ZpbGUtZHJhZ2dlcicpXG52YXIgbW9zYWljID0gcmVxdWlyZSgnLi9saWIvbW9zYWljJylcblxuc2V0dGluZ3MuQUxMT1dFRF9UWVBFUyA9IFsgJ2ltYWdlL3BuZycsICdpbWFnZS9qcGVnJyBdO1xuc2V0dGluZ3MuQkFTRV9VUkwgPSAnLydcblxudmFyIGRyYWdnZXIgPSBGaWxlRHJhZ2dlcigpXG5kcmFnZ2VyLm9uKCdmaWxlJywgZnVuY3Rpb24gKGZpbGUpIHtcbiAgICBpZiAoc2V0dGluZ3MuQUxMT1dFRF9UWVBFUy5pbmRleE9mKGZpbGUudHlwZSkgPT09IC0xKSByZXR1cm5cbiAgICBtb3NhaWMoZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLm91dHB1dCcpLCBmaWxlLCBzZXR0aW5ncylcbn0pIiwibW9kdWxlLmV4cG9ydHMgPSBzdWJzZXRcblxuLyoqXG4gKiBHaXZlbiBhbiBhcnJheSAob3IgYW4gYXJyYXktbGlrZSksIHJldHVybiBhbiBhcnJheSByZXByZXNlbnRpbmcgYSB2aWV3IGludG8gYVxuICogc3Vic2V0IG9mIHRoYXQgYXJyYXkuIFRoZSB2ZWl3IGlzIGNhbGN1bGF0ZWQgYnkgdHJlYXRpbmcgdGhlIGFycmF5IGFzIGEgZ3JpZFxuICogYW5kIHBhc3NpbmcgdGhlIGdyaWQgY29vcmRpbnRlcyBvZiB0aGUgZGVzaXJlZCB2aWV3IGFzIGFuIGFyZ3VtZW50LlxuICpcbiAqIEBwYXJhbSAge0FycmF5fSBhcnIgICAgICAgICAgICAgVGhlIGFycmF5L2FycmF5LWxpa2UgdG8gdmlld1xuICpcbiAqIEBwYXJhbSAge09iamVjdH0gZGltZW5zaW9ucyAgICAgVGhlIGdyaWQgZGltZW5zaW9ucyBvZiB0aGUgYXJyYXlcbiAqICAgICAgICAgICAgICAgICAgZGltZW5zaW9ucy53aWR0aCBIb3cgbWFueSBjZWxscyB3aWRlIGlzIHRoZSBncmlkXG4gKiAgICAgICAgICAgICAgICAgIGRpbWVuc2lvbnMuaGVpZ2h0IEhvdyBtYW55IGNlbGxzIGhpZ2ggaXMgdGhlIGdyaWRcbiAqICAgICAgICAgICAgICAgICAgZGltZW5zaW9ucy5jZWxsU2l6ZSBIb3cgbWFueSBjZWxscyBpbiB0aGUgYXJyIHJlcHJlc2VudCAxXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgY2VsbCBpbiB0aGUgZ3JpZCB3ZSdyZSB0cmVhdGluZyBpdCBhcy5cbiAqICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBFLmcuLCB3aXRoIHBpeGVsIGRhdGEgNCB2YWx1ZXMgbWFrZXMgb25lXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgcGl4ZWwgKHIsIGcsIGIsIGEpXG4gKlxuICogQHBhcmFtICB7T2JqZWN0fSB2aWV3RGltZW5zaW9ucyBUaGUgZGltZW5zaW9ucyBvZiB0aGUgdmlldyB3ZSdyZSBsb29raW5nIGZvclxuICogICAgICAgICAgICAgICAgICB2aWV3RGltZW5zaW9ucy54IFggY29vcmRpbmF0ZSBvZiB0aGUgdmlldyBpbiB0aGUgZ3JpZFxuICogICAgICAgICAgICAgICAgICB2aWV3RGltZW5zaW9ucy55IFkgY29vcmRpbmF0ZSBvZiB0aGUgdmlldyBpbiB0aGUgZ3JpZFxuICogICAgICAgICAgICAgICAgICB2aWV3RGltZW5zaW9ucy53aWR0aCBXaWR0aCBvZiB0aGUgdmlldyBpbiB0aGUgZ3JpZFxuICogICAgICAgICAgICAgICAgICB2aWV3RGltZW5zaW9ucy5oZWlnaHQgSGVpZ2h0IG9mIHRoZSB2aWV3IGluIHRoZSBncmlkXG4gKlxuICogQHJldHVybiB7QXJyYXl9ICAgICAgICAgICAgICAgICBUaGUgYXJyYXkgcmVwcmVzZW50aW5nIHRoZSB2aWV3IGFza2VkIGZvci5cbiAqL1xuZnVuY3Rpb24gc3Vic2V0IChhcnIsIGRpbWVuc2lvbnMsIHZpZXdEaW1lbnNpb25zKSB7XG4gICAgdmFyIHJldCA9IFtdXG5cbiAgICB2YXIgdmQgPSB2aWV3RGltZW5zaW9uc1xuICAgIHZhciBkID0gZGltZW5zaW9uc1xuICAgIHZhciBjZWxsU2l6ZSA9IGQuY2VsbFNpemUgPT0gbnVsbCA/IDEgOiBkLmNlbGxTaXplXG5cbiAgICBmb3IgKHZhciB4ID0gdmQueDsgeCA8IHZkLnggKyB2ZC53aWR0aDsgeCArPSAxKSB7XG4gICAgICAgIGZvciAodmFyIHkgPSB2ZC55OyB5IDwgdmQueSArIHZkLmhlaWdodDsgeSArPSAxKSB7XG4gICAgICAgICAgICB2YXIgaW5kZXggPSAoeSAqIGNlbGxTaXplKSAqIGQud2lkdGggKyAoeCAqIGNlbGxTaXplKVxuICAgICAgICAgICAgcmV0LnB1c2guYXBwbHkocmV0LCBbXS5zbGljZS5jYWxsKGFyciwgaW5kZXgsIGluZGV4ICsgY2VsbFNpemUpKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHJldFxufSIsIm1vZHVsZS5leHBvcnRzID0gYXZlcmFnZUNvbG91clxuXG4vKipcbiAqIEdpdmVuIGFuIGFycmF5IG9mIGNhbnZhcyBwaXhlbCBkYXRhLCBnaXZlIHVzIHRoZSBhdmVyYWdlIGNvbG91ciBhcyBhbiBbciwgZywgYl1cbiAqL1xuZnVuY3Rpb24gYXZlcmFnZUNvbG91ciAocGl4ZWxzKSB7XG4gICAgdmFyIHJlZCA9IDBcbiAgICB2YXIgZ3JlZW4gPSAwXG4gICAgdmFyIGJsdWUgPSAwXG5cbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBpeGVscy5sZW5ndGg7IGkgKz0gNCkge1xuICAgICAgICByZWQgKz0gcGl4ZWxzW2ldXG4gICAgICAgIGdyZWVuICs9IHBpeGVsc1tpICsgMV1cbiAgICAgICAgYmx1ZSArPSBwaXhlbHNbaSArIDJdXG4gICAgfVxuXG4gICAgcmV0dXJuIFtcbiAgICAgICAgTWF0aC5yb3VuZChyZWQgLyAoaSAvIDQpKVxuICAgICAgLCBNYXRoLnJvdW5kKGdyZWVuIC8gKGkgLyA0KSlcbiAgICAgICwgTWF0aC5yb3VuZChibHVlIC8gKGkgLyA0KSlcbiAgICBdXG59IiwibW9kdWxlLmV4cG9ydHMgPSBGaWxlRHJhZ2dlclxuXG52YXIgRXZlbnRFbWl0dGVyID0gcmVxdWlyZSgnZXZlbnRzJykuRXZlbnRFbWl0dGVyXG5cbi8qKlxuICogUmV0dXJucyBhbmQgZXZlbnQgZW1pdHRlciB0aGF0IGVtaXRzIGAnZmlsZSdgIGV2ZW50cyB3aGVuZXZlciBmaWxlcyBhcmVcbiAqIGRyb3BwZWQgaW50byB0aGUgd2luZG93LlxuICpcbiAqIEZvciB0aGUgcHVycG9zZXMgb2YgdGhpcyBjb2RlYmFzZSBpdCBvbmx5IGVtaXRzIHRoZSBmaWxlIGF0IHBvc2l0aW9uIFswXVxuICogc28gbXV0bGkgZmlsZSBkcm9wcyB3b24ndCBlbWl0IGZvciBlYWNoIGZpbGUsIGJ1dCB0aGF0IHNob3VsZCBpZGVhbGx5IGJlXG4gKiByZW1vdmVkLlxuICpcbiAqIGBlbWl0dGVyLmNsZWFudXBgIHdpbGwgcmVsZWFzZSBhbGwgZXZlbnQgaGFuZGxlcnMuXG4gKi9cbmZ1bmN0aW9uIEZpbGVEcmFnZ2VyICgpIHtcbiAgICB2YXIgZW1pdHRlciA9IG5ldyBFdmVudEVtaXR0ZXJcblxuICAgIC8vIGRyYWdvdmVyIGFuZCBkcmFnZW50ZXIgbWFrZSB0aGUgZWxlbWVudCBhIGRyYWcgdGFyZ2V0LCB3aXRob3V0IHdoaWNoXG4gICAgLy8gZHJvcCB3b24ndCBmaXJlIGFuZCB0aGUgcGFnZSB3aWxsIHJlZGlyZWN0IHRvIHRoZSBkcm9wcGVkIGZpbGVcbiAgICB3aW5kb3cuYWRkRXZlbnRMaXN0ZW5lcignZHJhZ292ZXInLCBjYW5jZWwsIGZhbHNlKVxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdkcmFnZW50ZXInLCBjYW5jZWwsIGZhbHNlKVxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdkcm9wJywgZHJvcCwgZmFsc2UpXG5cbiAgICBlbWl0dGVyLmNsZWFudXAgPSBjbGVhbnVwXG5cbiAgICByZXR1cm4gZW1pdHRlclxuXG4gICAgZnVuY3Rpb24gZHJvcCAoZSkge1xuICAgICAgICBjYW5jZWwoZSlcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGUuZGF0YVRyYW5zZmVyLmZpbGVzLmxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBlbWl0dGVyLmVtaXQoJ2ZpbGUnLCBlLmRhdGFUcmFuc2Zlci5maWxlc1tpXSlcbiAgICAgICAgfVxuICAgIH1cblxuICAgIC8qKlxuICAgICAqIFByZXZlbnQgdGhlIGJyb3dzZXIgZnJvbSByZWRpcmVjdGluZyB0byB0aGUgZmlsZSBkcm9wcGVkIGluLlxuICAgICAqL1xuICAgIGZ1bmN0aW9uIGNhbmNlbCAoZSkge1xuICAgICAgICBlLnByZXZlbnREZWZhdWx0KClcbiAgICAgICAgZS5zdG9wUHJvcGFnYXRpb24oKVxuICAgIH1cblxuICAgIGZ1bmN0aW9uIGNsZWFudXAgKCkge1xuICAgICAgICB3aW5kb3cucmVtb3ZlRXZlbnRMaXN0ZW5lcignZHJhZ292ZXInLCBjYW5jZWwpXG4gICAgICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdkcmFnZW50ZXInLCBjYW5jZWwpXG4gICAgICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdkcm9wJywgZHJvcClcbiAgICB9XG59IiwibW9kdWxlLmV4cG9ydHMgPSBncmlkXG5cbi8qKlxuICogR2l2ZW4gYSBkaW1lbnNpb25zIG9iamVjdCAobnVtYmVyIG9mIGByb3dzYCBhbmQgbnVtYmVyIG9mIGBjb2x1bW5zYCkgY3JlYXRlXG4gKiBhbiBhcnJheSBvZiBjZWxsIG9iamVjdHMsIChgeGAgYW5kIGB5YCBwcm9wZXJ0aWVzYCkgMSBmb3IgZWFjaCBjZWxsXG4gKiBpbiB0aGUgZ3JpZC5cbiAqL1xuZnVuY3Rpb24gZ3JpZCAoZGltZW5zaW9ucykge1xuICAgIHZhciByZXQgPSBbXVxuXG4gICAgZm9yICh2YXIgeSA9IDA7IHkgPCBkaW1lbnNpb25zLnJvd3M7IHkrKykge1xuICAgICAgICBmb3IgKHZhciB4ID0gMDsgeCA8IGRpbWVuc2lvbnMuY29sdW1uczsgeCsrKSB7XG4gICAgICAgICAgICByZXQucHVzaCh7IHg6IHgsIHk6IHkgfSlcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByZXRcbn0iLCJtb2R1bGUuZXhwb3J0cyA9IGltYWdlVG9DYW52YXNcblxudmFyIG1ha2VDYW52YXMgPSByZXF1aXJlKCcuL21ha2UtY2FudmFzJylcbnZhciBsb2FkSW1hZ2UgPSByZXF1aXJlKCcuL2xvYWQtaW1hZ2UnKVxuXG4vKipcbiAqIFRha2VzIGEgYnJvd3NlciBmaWxlIG9iamVjdCBhbmQgYSBjYWxsYmFjay4gQ2FsbHMgYmFjayB3aXRoIGFuIGVycm9yIGlmIGl0XG4gKiBvY2N1cnJlZCAoYXQgdGhlIG1vbWVudCB3ZSdyZSBub3QgbG9va2luZyBmb3Igb25lIHRvIHNlbmQpIGFuZCBhIGRldGFjaGVkXG4gKiBjYW52YXMgZWxlbWVudCBtYXRjaGluZyB0aGUgaW1hZ2UncyBkaW1lbnNpb25zIHdpdGggdGhlIGltYWdlIGJsaXR0ZWQgdG8gaXQuXG4gKi9cbmZ1bmN0aW9uIGltYWdlVG9DYW52YXMgKGZpbGUsIGNhbGxiYWNrKSB7XG4gICAgdmFyIHVybCA9IFVSTC5jcmVhdGVPYmplY3RVUkwoZmlsZSlcbiAgICBsb2FkSW1hZ2UodXJsKS50aGVuKGZ1bmN0aW9uIChpbWcpIHtcbiAgICAgICAgdmFyIGNhbnZhcyA9IG1ha2VDYW52YXMoaW1nLndpZHRoLCBpbWcuaGVpZ2h0KVxuICAgICAgICB2YXIgY3R4ID0gY2FudmFzLmdldENvbnRleHQoJzJkJylcbiAgICAgICAgY3R4LmRyYXdJbWFnZShpbWcsIDAsIDApXG4gICAgICAgIC8vIE5lZWQgdG8gZG8gdGhpcyBiZWNhdXNlIG9mIHRoZSB3YXkgYnJvd3NlcidzIGdjIHRoZXNlIE9iamVjdFVybFxuICAgICAgICAvLyB2YXJpYWJsZXMuIFNlZTpcbiAgICAgICAgLy8gaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZW4tVVMvZG9jcy9XZWIvQVBJL1VSTC9jcmVhdGVPYmplY3RVUkxcbiAgICAgICAgVVJMLnJldm9rZU9iamVjdFVSTCh1cmwpXG4gICAgICAgIGNhbGxiYWNrKG51bGwsIGNhbnZhcylcbiAgICB9KVxufSIsInZhciBtZW1vaXplID0gcmVxdWlyZSgnbG9kYXNoL2Z1bmN0aW9uL21lbW9pemUnKVxuXG5tb2R1bGUuZXhwb3J0cyA9IG1lbW9pemUobG9hZEltYWdlKVxuXG4vKipcbiAqIFRha2VzIGEgdXJsIGFuZCByZXR1cm5zIGEgcHJvbWlzZSB0aGF0IHJlc29sdmVzIHRvIGEgbG9hZGVkIEltYWdlIG9iamVjdC5cbiAqL1xuZnVuY3Rpb24gbG9hZEltYWdlKHVybCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIHZhciBpbWcgPSBuZXcgSW1hZ2UoKVxuICAgICAgICBpbWcub25sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmVzb2x2ZShpbWcpXG4gICAgICAgIH1cbiAgICAgICAgaW1nLnNyYyA9IHVybFxuICAgIH0pXG59IiwibW9kdWxlLmV4cG9ydHMgPSBtYWtlQ2FudmFzXG5cbi8qKlxuICogSGVscGVyIGZ1bmN0aW9uIGZvciBjcmVhdGluZyBhIGNhbnZhcyB3aXRoIGEgZ2l2ZW4gd2lkdGggYW5kIGhlaWdodCBhcyB3ZVxuICogbmVlZCBpdCBpbiBhIGZldyBwbGFjZXMuXG4gKi9cbmZ1bmN0aW9uIG1ha2VDYW52YXMgKHdpZHRoLCBoZWlnaHQpIHtcbiAgICB2YXIgY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJylcbiAgICBjYW52YXMud2lkdGggPSB3aWR0aFxuICAgIGNhbnZhcy5oZWlnaHQgPSBoZWlnaHRcbiAgICByZXR1cm4gY2FudmFzXG59IiwibW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gbW9zYWljXG5leHBvcnRzLnRpbGVUYXNrRmFjdG9yeSA9IHRpbGVUYXNrRmFjdG9yeVxuZXhwb3J0cy5leGVjdXRlU3RyYXRlZ3kgPSBleGVjdXRlU3RyYXRlZ3lcblxudmFyIGltYWdlVG9DYW52YXMgPSByZXF1aXJlKCcuL2ltYWdlLXRvLWNhbnZhcycpXG52YXIgbWFrZUNhbnZhcyA9IHJlcXVpcmUoJy4vbWFrZS1jYW52YXMnKVxudmFyIG1ha2VHcmlkID0gcmVxdWlyZSgnLi9ncmlkJylcbnZhciBhdmVyYWdlQ29sb3VyID0gcmVxdWlyZSgnLi9hdmVyYWdlLWNvbG91cicpXG52YXIgcmdiMkhleCA9IHJlcXVpcmUoJy4vcmdiLXRvLWhleCcpXG52YXIgbG9hZEltYWdlID0gcmVxdWlyZSgnLi9sb2FkLWltYWdlJylcbnZhciBhcnJheVN1YnNldCA9IHJlcXVpcmUoJy4vYXJyYXktZ3JpZC1zdWJzZXQnKVxuXG4vKipcbiAqIFJlbmRlcnMgYW4gaW1hZ2UgdG8gYSBjYW52YXMgaW4gYSB0YXJnZXQgZWxlbWVudCBhcyBhIHNlcmllcyBvZiB0aWxlc1xuICogcmVwcmVzZW50aW5nIGF2ZXJhZ2UgY29sb3VycyBvZiB0aGUgYXJlYXMgdGhleSBjb3Zlci5cbiAqXG4gKiBUYWtlcyBhIHRhcmdldCBlbGVtZW50IHRvIHB1dCB0aGUgY2FudmFzIGludG8sIGEgZmlsZSBvYmplY3QgcmVwcmVzZW50aW5nXG4gKiB0aGUgZmlsZSBmcm9tIGEgZmlsZSBpbnB1dCBvciBkcmFnIGFuZCBkcm9wIGV2ZW50IGFuZCBhIHNldHRpbmdzIG9iamVjdFxuICogY29udGFpbmluZyB0aWxlIHdpZHRoLCB0aWxlIGhlaWdodCBhbmQgYSBiYXNlIHVybCBmb3Igd2hlcmUgdG8gbG9hZCB0aGUgdGlsZXNcbiAqIGZyb20uXG4gKlxuICogQHBhcmFtICB7SFRNTEVsZW1lbnR9IHRhcmdldCAgIFdoZXJlIGluIHRoZSBET00gdG8gYXBwZW5kIHRoZSBtb3NhaWMgdG9cbiAqIEBwYXJhbSAge0ZpbGV9IGZpbGUgICAgICAgICAgICBGaWxlIG9iamVjdCByZXByZXNlbnRpbmcgdGhlIGltYWdlIHRvIHJlbmRlclxuICogQHBhcmFtICB7T2JqZWN0fSBzZXR0aW5ncyAgICAgIFNldHRpbmdzIGZvciB0aGUgbW9zYWljIGNhbGwuXG4gKiAgICAgICAgICAgICAgICAgIHNldHRpbmdzLlRJTEVfV0lEVEggVGhlIHdpZHRoIG9mIHRpbGVzIGluIHRoaXMgbW9zYWljXG4gKiAgICAgICAgICAgICAgICAgIHNldHRpbmdzLlRJTEVfSEVJR0hUIHRoZSBoZWlnaHQgb2YgdGlsZXMgaW4gdGhpcyBtb3NhaWNcbiAqICAgICAgICAgICAgICAgICAgc2V0dGluZ3MuQkFTRV9VUkwgVGhlIGJhc2UgdXJsIGZvciB0aWxlIGltYWdlIHJlcXVlc3RzXG4gKi9cbmZ1bmN0aW9uIG1vc2FpYyAodGFyZ2V0LCBmaWxlLCBzZXR0aW5ncykge1xuICAgIHZhciBleGVjdXRlID0gc2V0dGluZ3MuZXhlY3V0ZVN0cmF0ZWd5IHx8IGV4ZWN1dGVTdHJhdGVneVxuXG4gICAgLy8gRHJhdyB0aGUgaW1hZ2UgaW50byBhbiBvZmZzY3JlZW4gY2FudmFzXG4gICAgaW1hZ2VUb0NhbnZhcyhmaWxlLCBmdW5jdGlvbiAoZXJyLCBzb3VyY2UpIHtcbiAgICAgICAgLy8gTmVlZCB0aGlzIGluZm8gaW4gYSBjb3VwbGUgb2YgcGxhY2VzXG4gICAgICAgIHZhciBkaW1lbnNpb25zID0ge1xuICAgICAgICAgICAgcm93czogTWF0aC5jZWlsKHNvdXJjZS5oZWlnaHQgLyBzZXR0aW5ncy5USUxFX0hFSUdIVClcbiAgICAgICAgICAsIGNvbHVtbnM6IE1hdGguY2VpbChzb3VyY2Uud2lkdGggLyBzZXR0aW5ncy5USUxFX1dJRFRIKVxuICAgICAgICB9XG5cbiAgICAgICAgLy8gQnJlYWsgaXQgaW50byBhIGdyaWRcbiAgICAgICAgdmFyIGdyaWQgPSBtYWtlR3JpZChkaW1lbnNpb25zKVxuXG4gICAgICAgIC8vIE1hcCBncmlkIHRvIHNlcnZlciBmZXRjaCB0YXNrc1xuICAgICAgICB2YXIgdGFza1NldHRpbmdzID0ge1xuICAgICAgICAgICAgdGlsZVdpZHRoOiBzZXR0aW5ncy5USUxFX1dJRFRIXG4gICAgICAgICAgLCB0aWxlSGVpZ2h0OiBzZXR0aW5ncy5USUxFX0hFSUdIVFxuICAgICAgICAgICwgd2lkdGg6IHNvdXJjZS53aWR0aFxuICAgICAgICAgICwgaGVpZ2h0OiBzb3VyY2UuaGVpZ2h0XG4gICAgICAgIH1cbiAgICAgICAgdmFyIHRhc2tzID0gZ3JpZC5tYXAodGlsZVRhc2tGYWN0b3J5KFxuICAgICAgICAgICAgc291cmNlLmdldENvbnRleHQoJzJkJylcbiAgICAgICAgICAsIHRhc2tTZXR0aW5nc1xuICAgICAgICApKVxuXG4gICAgICAgIC8vIEFkZCB0aGUgY2FudmFzIHRvIHRoZSBkb20gc28gdXNlcnMgY2FuIHNlZSByb3ctYnktcm93XG4gICAgICAgIHZhciBkZXN0ID0gbWFrZUNhbnZhcyhzb3VyY2Uud2lkdGgsIHNvdXJjZS5oZWlnaHQpXG4gICAgICAgIHZhciBjdHggPSBkZXN0LmdldENvbnRleHQoJzJkJylcbiAgICAgICAgdmFyIHdyYXBwZXIgPSBtYWtlV3JhcHBlcihzb3VyY2Uud2lkdGgsIHNvdXJjZS5oZWlnaHQpXG4gICAgICAgIHdyYXBwZXIuYXBwZW5kQ2hpbGQoZGVzdClcbiAgICAgICAgdGFyZ2V0LmFwcGVuZENoaWxkKHdyYXBwZXIpXG5cbiAgICAgICAgdmFyIGV4ZWN1dGVTZXR0aW5ncyA9IHtcbiAgICAgICAgICAgIHJvd3M6IGRpbWVuc2lvbnMucm93c1xuICAgICAgICAgICwgY29sdW1uczogZGltZW5zaW9ucy5jb2x1bW5zXG4gICAgICAgICAgLCB0aWxlV2lkdGg6IHNldHRpbmdzLlRJTEVfV0lEVEhcbiAgICAgICAgICAsIHRpbGVIZWlnaHQ6IHNldHRpbmdzLlRJTEVfSEVJR0hUXG4gICAgICAgICAgLCBiYXNlVXJsOiBzZXR0aW5ncy5CQVNFX1VSTFxuICAgICAgICB9XG4gICAgICAgIGV4ZWN1dGUodGFza3MsIGV4ZWN1dGVTZXR0aW5ncywgZnVuY3Rpb24gKHJvdywgaSkge1xuICAgICAgICAgICAgY3R4LmRyYXdJbWFnZShyb3csIDAsIGkgKiBzZXR0aW5ncy5USUxFX0hFSUdIVClcbiAgICAgICAgfSlcbiAgICB9KVxufVxuXG4vLyBFeGVjdXRlIHRoZSB0YXNrcyBpbiBhIHdheSB3ZSBjYW4gY2FsbCBuIHRpbWVzLCB3aGVyZSBuIGlzIHRoZSBudW1iZXIgb2Ygcm93c1xuLy8gYW5kIHRoZSBvcmRlciBvZiB0aGUgY2FsbHMgbWF0Y2hlcyB0aGUgb3JkZXIgb2YgdGhlIHJvd3MuXG5mdW5jdGlvbiBleGVjdXRlU3RyYXRlZ3kgKHRhc2tzLCBzZXR0aW5ncywgcm93Q2FsbGJhY2spIHtcbiAgICAvLyBSZWR1Y2UgdG8gcm93c1xuICAgIHZhciByb3dzID0gdGFza3MucmVkdWNlKGZ1bmN0aW9uIChwcmV2aW91cywgY3VycmVudCkge1xuICAgICAgICBwcmV2aW91c1tjdXJyZW50LnldID0gcHJldmlvdXNbY3VycmVudC55XSB8fCBbXVxuICAgICAgICBwcmV2aW91c1tjdXJyZW50LnldW2N1cnJlbnQueF0gPSBjdXJyZW50XG4gICAgICAgIHJldHVybiBwcmV2aW91c1xuICAgIH0sIFtdKVxuXG4gICAgLy8gRHJhdyBjZWxscyBpbiBlYWNoIHJvdyB0byBlYWNoIGNvbnRleHRcbiAgICB2YXIgcXVldWVTdGFydCA9IDBcbiAgICB2YXIgcXVldWUgPSByb3dzLm1hcChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgIH0pXG4gICAgcm93cy5mb3JFYWNoKGZ1bmN0aW9uIChjZWxscywgaSkge1xuICAgICAgICB2YXIgcm93Q2FudmFzID0gbWFrZUNhbnZhcyhcbiAgICAgICAgICAgIHNldHRpbmdzLmNvbHVtbnMgKiBzZXR0aW5ncy50aWxlV2lkdGhcbiAgICAgICAgICAsIHNldHRpbmdzLnRpbGVIZWlnaHRcbiAgICAgICAgKVxuICAgICAgICB2YXIgcm93Q3R4ID0gcm93Q2FudmFzLmdldENvbnRleHQoJzJkJylcblxuICAgICAgICAvLyBBcyB0aGV5IGFyZSBmZXRjaGVkLCByZW5kZXIgdG8gYW4gb2Zmc2NyZWVuIGNvbnRleHQgc28gd2UgY2FuIHJlbmRlclxuICAgICAgICAvLyB0aGUgd2hvbGUgcm93IGF0IG9uY2UgdG8gdGhlIHVzZXJcbiAgICAgICAgUHJvbWlzZS5hbGwoY2VsbHMubWFwKGZ1bmN0aW9uIChjZWxsKSB7XG4gICAgICAgICAgICB2YXIgeCA9IGNlbGwueCAqIHNldHRpbmdzLnRpbGVXaWR0aFxuICAgICAgICAgICAgdmFyIHVybCA9IHNldHRpbmdzLmJhc2VVcmwgKyAnY29sb3IvJyArIGNlbGwuaGV4XG5cbiAgICAgICAgICAgIHJldHVybiBsb2FkSW1hZ2UodXJsKS50aGVuKGZ1bmN0aW9uIChpbWcpIHtcbiAgICAgICAgICAgICAgICByb3dDdHguZHJhd0ltYWdlKGltZywgeCwgMClcbiAgICAgICAgICAgIH0pXG4gICAgICAgIH0pKS50aGVuKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgICAgIC8vIFF1ZXVlIGZvciBjYWxsYmFjayBiZWNhdXNlIHdlIGhhdmUgdG8gcmVuZGVyIHJvd3MgaW4gb3JkZXJcbiAgICAgICAgICAgIC8vIGFuZCB3ZSBjYW4ndCBndWFyYW50ZWUgdGhhdCByaWdodCBub3cgd2l0aCB0aGlzIGZldGNoaW5nIG1ldGhvZFxuICAgICAgICAgICAgcXVldWVbaV0gPSByb3dDYW52YXNcblxuICAgICAgICAgICAgZm9yICh2YXIgaiA9IHF1ZXVlU3RhcnQ7IGogPCBxdWV1ZS5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgIGlmICghcXVldWVbal0pIGJyZWFrO1xuICAgICAgICAgICAgICAgIHJvd0NhbGxiYWNrKHF1ZXVlW2pdLCBqKVxuICAgICAgICAgICAgICAgIHF1ZXVlU3RhcnQgPSBqICsgMVxuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuICAgIH0pXG59XG5cbi8vIENsb3N1cmUgc28gdGhlIHRpbGVUYXNrIGZ1bmN0aW9uIGhhcyB3aGF0IGl0IG5lZWRzXG5mdW5jdGlvbiB0aWxlVGFza0ZhY3RvcnkgKGN0eCwgc2V0dGluZ3MpIHtcbiAgICB2YXIgaW1hZ2VEYXRhID0gY3R4LmdldEltYWdlRGF0YSgwLCAwLCBzZXR0aW5ncy53aWR0aCwgc2V0dGluZ3MuaGVpZ2h0KS5kYXRhXG4gICAgLy8gVGFrZSBhIGNlbGwgZGVmaW5pdGlvbiAoYW4gb2JqZWN0IHdpdGggeCBhbmQgeSBwcm9wZXJ0aWVzKSBhbmQgcmV0dXJuIGFcbiAgICAvLyB0YXNrIG9iamVjdC4gQSB0YXNrIG9iamVjdCBoYXMgeCwgeSBhbmQgaGV4IHZhbHVlIHByb3BlcnRpZXMuXG4gICAgcmV0dXJuIGZ1bmN0aW9uIChjZWxsKSB7XG4gICAgICAgIHZhciBwaXhlbHMgPSBhcnJheVN1YnNldChpbWFnZURhdGEsIHtcbiAgICAgICAgICAgIHdpZHRoOiBzZXR0aW5ncy53aWR0aFxuICAgICAgICAgICwgaGVpZ2h0OiBzZXR0aW5ncy5oZWlnaHRcbiAgICAgICAgICAgIC8vIGVhY2ggcGl4ZWwgaXMgYWN0dWFsbHkgNCBhcnJheSBjZWxsc1xuICAgICAgICAgICwgY2VsbFNpemU6IDRcbiAgICAgICAgfSwge1xuICAgICAgICAgICAgeDogY2VsbC54ICogc2V0dGluZ3MudGlsZVdpZHRoXG4gICAgICAgICAgLCB5OiBjZWxsLnkgKiBzZXR0aW5ncy50aWxlSGVpZ2h0XG4gICAgICAgICAgLy8gQmluZCB0aGVzZSB0byB0aGUgZGltZW5zaW9ucyBvZiB0aGUgaW1hZ2VcbiAgICAgICAgICAsIHdpZHRoOiBNYXRoLm1pbihzZXR0aW5ncy50aWxlV2lkdGgsIHNldHRpbmdzLndpZHRoIC0gY2VsbC54ICogc2V0dGluZ3MudGlsZVdpZHRoKVxuICAgICAgICAgICwgaGVpZ2h0OiBNYXRoLm1pbihzZXR0aW5ncy50aWxlSGVpZ2h0LCBzZXR0aW5ncy5oZWlnaHQgLSBjZWxsLnkgKiBzZXR0aW5ncy50aWxlSGVpZ2h0KVxuICAgICAgICB9KVxuXG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB4OiBjZWxsLnhcbiAgICAgICAgICAsIHk6IGNlbGwueVxuICAgICAgICAgICwgaGV4OiByZ2IySGV4LmFwcGx5KG51bGwsIGF2ZXJhZ2VDb2xvdXIocGl4ZWxzKSlcbiAgICAgICAgfVxuICAgIH1cbn1cblxuLyoqXG4gKiBDcmVhdGUgYSBkaXYgd2l0aCB0aGUgd3JhcHBlciBzdHlsZSwgb2YgdGhlIGhlaWdodCBhbmQgd2lkdGggb2YgdGhlIHRvLWJlXG4gKiBjYW52YXMgdG8gYmV0dGVyIHNob3cgdGhlIHVzZXIgd2hhdCdzIGhhcHBlbmluZy5cbiAqXG4gKiBEb24ndCB3YW50IERPTSBvcGVyYXRpb25zIGNsdXR0ZXJpbmcgdXAgbXkgbG9naWMgc28gY2h1Y2tpbmcgdGhpcyBpbiBhIGhlbHBlclxuICovXG5mdW5jdGlvbiBtYWtlV3JhcHBlciAod2lkdGgsIGhlaWdodCkge1xuICAgIHZhciByZXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdkaXYnKVxuICAgIHJldC5jbGFzc0xpc3QuYWRkKCdtb3NhaWMtd3JhcHBlcicpXG4gICAgLy8gK3BhZGRpbmcgK2JvcmRlciBiZWNhdXNlIG9mIGJveC1zaXppbmc6IGJvcmRlci1ib3g7XG4gICAgcmV0LnN0eWxlLndpZHRoID0gKHdpZHRoICsgNDIpICsgJ3B4J1xuICAgIHJldC5zdHlsZS5oZWlnaHQgPSAoaGVpZ2h0ICsgNDIpICsgJ3B4J1xuICAgIHJldHVybiByZXRcbn0iLCJtb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSByZ2IySGV4XG5leHBvcnRzLnBhZCA9IHBhZFxuXG4vKipcbiAqIENvbnZlcnQgYHJgLCBgZ2AgYW5kIGBiYCB2YWx1ZXMgdG8gYSBzaW5nbGUgaGV4IHN0cmluZy4gRS5nLjpcbiAqXG4gKiAgICAgcmdiMkhleCgwLCAwLCAwKSAvLyAwMDAwMDBcbiAqICAgICByZ2IySGV4KDI1NSwgMjU1LCAyNTUpIC8vIGZmZmZmZlxuICovXG5mdW5jdGlvbiByZ2IySGV4IChyLCBnLCBiKSB7XG4gICAgLy8gUGFkIGJlY2F1c2UgMC50b1N0cmluZygxNikgaXMgMCBub3QgMDAgYW5kIHRoZSBzZXJ2ZXIgZXhwZWN0cyA2IGNoYXJhY3RlclxuICAgIC8vIGhleCBzdHJpbmdzLlxuICAgIHJldHVybiBwYWQoci50b1N0cmluZygxNikpICsgcGFkKGcudG9TdHJpbmcoMTYpKSArIHBhZChiLnRvU3RyaW5nKDE2KSlcbn1cblxuZnVuY3Rpb24gcGFkIChzdHIpIHtcbiAgICBpZiAoc3RyLmxlbmd0aCA9PT0gMSkgcmV0dXJuICcwJyArIHN0clxuICAgIHJldHVybiBzdHJcbn0iLCIvLyBDb25zdGFudHMgc2hhcmVkIGJldHdlZW4gY2xpZW50IGFuZCBzZXJ2ZXIuXG5cbnZhciBUSUxFX1dJRFRIID0gMTY7XG52YXIgVElMRV9IRUlHSFQgPSAxNjtcblxudmFyIGV4cG9ydHMgPSBleHBvcnRzIHx8IG51bGw7XG5pZiAoZXhwb3J0cykge1xuICBleHBvcnRzLlRJTEVfV0lEVEggPSBUSUxFX1dJRFRIO1xuICBleHBvcnRzLlRJTEVfSEVJR0hUID0gVElMRV9IRUlHSFQ7XG59XG5cbiIsInZhciBNYXBDYWNoZSA9IHJlcXVpcmUoJy4uL2ludGVybmFsL01hcENhY2hlJyk7XG5cbi8qKiBVc2VkIGFzIHRoZSBgVHlwZUVycm9yYCBtZXNzYWdlIGZvciBcIkZ1bmN0aW9uc1wiIG1ldGhvZHMuICovXG52YXIgRlVOQ19FUlJPUl9URVhUID0gJ0V4cGVjdGVkIGEgZnVuY3Rpb24nO1xuXG4vKipcbiAqIENyZWF0ZXMgYSBmdW5jdGlvbiB0aGF0IG1lbW9pemVzIHRoZSByZXN1bHQgb2YgYGZ1bmNgLiBJZiBgcmVzb2x2ZXJgIGlzXG4gKiBwcm92aWRlZCBpdCBkZXRlcm1pbmVzIHRoZSBjYWNoZSBrZXkgZm9yIHN0b3JpbmcgdGhlIHJlc3VsdCBiYXNlZCBvbiB0aGVcbiAqIGFyZ3VtZW50cyBwcm92aWRlZCB0byB0aGUgbWVtb2l6ZWQgZnVuY3Rpb24uIEJ5IGRlZmF1bHQsIHRoZSBmaXJzdCBhcmd1bWVudFxuICogcHJvdmlkZWQgdG8gdGhlIG1lbW9pemVkIGZ1bmN0aW9uIGlzIGNvZXJjZWQgdG8gYSBzdHJpbmcgYW5kIHVzZWQgYXMgdGhlXG4gKiBjYWNoZSBrZXkuIFRoZSBgZnVuY2AgaXMgaW52b2tlZCB3aXRoIHRoZSBgdGhpc2AgYmluZGluZyBvZiB0aGUgbWVtb2l6ZWRcbiAqIGZ1bmN0aW9uLlxuICpcbiAqICoqTm90ZToqKiBUaGUgY2FjaGUgaXMgZXhwb3NlZCBhcyB0aGUgYGNhY2hlYCBwcm9wZXJ0eSBvbiB0aGUgbWVtb2l6ZWRcbiAqIGZ1bmN0aW9uLiBJdHMgY3JlYXRpb24gbWF5IGJlIGN1c3RvbWl6ZWQgYnkgcmVwbGFjaW5nIHRoZSBgXy5tZW1vaXplLkNhY2hlYFxuICogY29uc3RydWN0b3Igd2l0aCBvbmUgd2hvc2UgaW5zdGFuY2VzIGltcGxlbWVudCB0aGUgW2BNYXBgXShodHRwOi8vZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi82LjAvI3NlYy1wcm9wZXJ0aWVzLW9mLXRoZS1tYXAtcHJvdG90eXBlLW9iamVjdClcbiAqIG1ldGhvZCBpbnRlcmZhY2Ugb2YgYGdldGAsIGBoYXNgLCBhbmQgYHNldGAuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBjYXRlZ29yeSBGdW5jdGlvblxuICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBUaGUgZnVuY3Rpb24gdG8gaGF2ZSBpdHMgb3V0cHV0IG1lbW9pemVkLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW3Jlc29sdmVyXSBUaGUgZnVuY3Rpb24gdG8gcmVzb2x2ZSB0aGUgY2FjaGUga2V5LlxuICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgbWVtb2l6aW5nIGZ1bmN0aW9uLlxuICogQGV4YW1wbGVcbiAqXG4gKiB2YXIgdXBwZXJDYXNlID0gXy5tZW1vaXplKGZ1bmN0aW9uKHN0cmluZykge1xuICogICByZXR1cm4gc3RyaW5nLnRvVXBwZXJDYXNlKCk7XG4gKiB9KTtcbiAqXG4gKiB1cHBlckNhc2UoJ2ZyZWQnKTtcbiAqIC8vID0+ICdGUkVEJ1xuICpcbiAqIC8vIG1vZGlmeWluZyB0aGUgcmVzdWx0IGNhY2hlXG4gKiB1cHBlckNhc2UuY2FjaGUuc2V0KCdmcmVkJywgJ0JBUk5FWScpO1xuICogdXBwZXJDYXNlKCdmcmVkJyk7XG4gKiAvLyA9PiAnQkFSTkVZJ1xuICpcbiAqIC8vIHJlcGxhY2luZyBgXy5tZW1vaXplLkNhY2hlYFxuICogdmFyIG9iamVjdCA9IHsgJ3VzZXInOiAnZnJlZCcgfTtcbiAqIHZhciBvdGhlciA9IHsgJ3VzZXInOiAnYmFybmV5JyB9O1xuICogdmFyIGlkZW50aXR5ID0gXy5tZW1vaXplKF8uaWRlbnRpdHkpO1xuICpcbiAqIGlkZW50aXR5KG9iamVjdCk7XG4gKiAvLyA9PiB7ICd1c2VyJzogJ2ZyZWQnIH1cbiAqIGlkZW50aXR5KG90aGVyKTtcbiAqIC8vID0+IHsgJ3VzZXInOiAnZnJlZCcgfVxuICpcbiAqIF8ubWVtb2l6ZS5DYWNoZSA9IFdlYWtNYXA7XG4gKiB2YXIgaWRlbnRpdHkgPSBfLm1lbW9pemUoXy5pZGVudGl0eSk7XG4gKlxuICogaWRlbnRpdHkob2JqZWN0KTtcbiAqIC8vID0+IHsgJ3VzZXInOiAnZnJlZCcgfVxuICogaWRlbnRpdHkob3RoZXIpO1xuICogLy8gPT4geyAndXNlcic6ICdiYXJuZXknIH1cbiAqL1xuZnVuY3Rpb24gbWVtb2l6ZShmdW5jLCByZXNvbHZlcikge1xuICBpZiAodHlwZW9mIGZ1bmMgIT0gJ2Z1bmN0aW9uJyB8fCAocmVzb2x2ZXIgJiYgdHlwZW9mIHJlc29sdmVyICE9ICdmdW5jdGlvbicpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihGVU5DX0VSUk9SX1RFWFQpO1xuICB9XG4gIHZhciBtZW1vaXplZCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBhcmdzID0gYXJndW1lbnRzLFxuICAgICAgICBrZXkgPSByZXNvbHZlciA/IHJlc29sdmVyLmFwcGx5KHRoaXMsIGFyZ3MpIDogYXJnc1swXSxcbiAgICAgICAgY2FjaGUgPSBtZW1vaXplZC5jYWNoZTtcblxuICAgIGlmIChjYWNoZS5oYXMoa2V5KSkge1xuICAgICAgcmV0dXJuIGNhY2hlLmdldChrZXkpO1xuICAgIH1cbiAgICB2YXIgcmVzdWx0ID0gZnVuYy5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICBtZW1vaXplZC5jYWNoZSA9IGNhY2hlLnNldChrZXksIHJlc3VsdCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcbiAgbWVtb2l6ZWQuY2FjaGUgPSBuZXcgbWVtb2l6ZS5DYWNoZTtcbiAgcmV0dXJuIG1lbW9pemVkO1xufVxuXG4vLyBBc3NpZ24gY2FjaGUgdG8gYF8ubWVtb2l6ZWAuXG5tZW1vaXplLkNhY2hlID0gTWFwQ2FjaGU7XG5cbm1vZHVsZS5leHBvcnRzID0gbWVtb2l6ZTtcbiIsInZhciBtYXBEZWxldGUgPSByZXF1aXJlKCcuL21hcERlbGV0ZScpLFxuICAgIG1hcEdldCA9IHJlcXVpcmUoJy4vbWFwR2V0JyksXG4gICAgbWFwSGFzID0gcmVxdWlyZSgnLi9tYXBIYXMnKSxcbiAgICBtYXBTZXQgPSByZXF1aXJlKCcuL21hcFNldCcpO1xuXG4vKipcbiAqIENyZWF0ZXMgYSBjYWNoZSBvYmplY3QgdG8gc3RvcmUga2V5L3ZhbHVlIHBhaXJzLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAc3RhdGljXG4gKiBAbmFtZSBDYWNoZVxuICogQG1lbWJlck9mIF8ubWVtb2l6ZVxuICovXG5mdW5jdGlvbiBNYXBDYWNoZSgpIHtcbiAgdGhpcy5fX2RhdGFfXyA9IHt9O1xufVxuXG4vLyBBZGQgZnVuY3Rpb25zIHRvIHRoZSBgTWFwYCBjYWNoZS5cbk1hcENhY2hlLnByb3RvdHlwZVsnZGVsZXRlJ10gPSBtYXBEZWxldGU7XG5NYXBDYWNoZS5wcm90b3R5cGUuZ2V0ID0gbWFwR2V0O1xuTWFwQ2FjaGUucHJvdG90eXBlLmhhcyA9IG1hcEhhcztcbk1hcENhY2hlLnByb3RvdHlwZS5zZXQgPSBtYXBTZXQ7XG5cbm1vZHVsZS5leHBvcnRzID0gTWFwQ2FjaGU7XG4iLCIvKipcbiAqIFJlbW92ZXMgYGtleWAgYW5kIGl0cyB2YWx1ZSBmcm9tIHRoZSBjYWNoZS5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQG5hbWUgZGVsZXRlXG4gKiBAbWVtYmVyT2YgXy5tZW1vaXplLkNhY2hlXG4gKiBAcGFyYW0ge3N0cmluZ30ga2V5IFRoZSBrZXkgb2YgdGhlIHZhbHVlIHRvIHJlbW92ZS5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiB0aGUgZW50cnkgd2FzIHJlbW92ZWQgc3VjY2Vzc2Z1bGx5LCBlbHNlIGBmYWxzZWAuXG4gKi9cbmZ1bmN0aW9uIG1hcERlbGV0ZShrZXkpIHtcbiAgcmV0dXJuIHRoaXMuaGFzKGtleSkgJiYgZGVsZXRlIHRoaXMuX19kYXRhX19ba2V5XTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBtYXBEZWxldGU7XG4iLCIvKipcbiAqIEdldHMgdGhlIGNhY2hlZCB2YWx1ZSBmb3IgYGtleWAuXG4gKlxuICogQHByaXZhdGVcbiAqIEBuYW1lIGdldFxuICogQG1lbWJlck9mIF8ubWVtb2l6ZS5DYWNoZVxuICogQHBhcmFtIHtzdHJpbmd9IGtleSBUaGUga2V5IG9mIHRoZSB2YWx1ZSB0byBnZXQuXG4gKiBAcmV0dXJucyB7Kn0gUmV0dXJucyB0aGUgY2FjaGVkIHZhbHVlLlxuICovXG5mdW5jdGlvbiBtYXBHZXQoa2V5KSB7XG4gIHJldHVybiBrZXkgPT0gJ19fcHJvdG9fXycgPyB1bmRlZmluZWQgOiB0aGlzLl9fZGF0YV9fW2tleV07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gbWFwR2V0O1xuIiwiLyoqIFVzZWQgZm9yIG5hdGl2ZSBtZXRob2QgcmVmZXJlbmNlcy4gKi9cbnZhciBvYmplY3RQcm90byA9IE9iamVjdC5wcm90b3R5cGU7XG5cbi8qKiBVc2VkIHRvIGNoZWNrIG9iamVjdHMgZm9yIG93biBwcm9wZXJ0aWVzLiAqL1xudmFyIGhhc093blByb3BlcnR5ID0gb2JqZWN0UHJvdG8uaGFzT3duUHJvcGVydHk7XG5cbi8qKlxuICogQ2hlY2tzIGlmIGEgY2FjaGVkIHZhbHVlIGZvciBga2V5YCBleGlzdHMuXG4gKlxuICogQHByaXZhdGVcbiAqIEBuYW1lIGhhc1xuICogQG1lbWJlck9mIF8ubWVtb2l6ZS5DYWNoZVxuICogQHBhcmFtIHtzdHJpbmd9IGtleSBUaGUga2V5IG9mIHRoZSBlbnRyeSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBhbiBlbnRyeSBmb3IgYGtleWAgZXhpc3RzLCBlbHNlIGBmYWxzZWAuXG4gKi9cbmZ1bmN0aW9uIG1hcEhhcyhrZXkpIHtcbiAgcmV0dXJuIGtleSAhPSAnX19wcm90b19fJyAmJiBoYXNPd25Qcm9wZXJ0eS5jYWxsKHRoaXMuX19kYXRhX18sIGtleSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gbWFwSGFzO1xuIiwiLyoqXG4gKiBTZXRzIGB2YWx1ZWAgdG8gYGtleWAgb2YgdGhlIGNhY2hlLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAbmFtZSBzZXRcbiAqIEBtZW1iZXJPZiBfLm1lbW9pemUuQ2FjaGVcbiAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgVGhlIGtleSBvZiB0aGUgdmFsdWUgdG8gY2FjaGUuXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjYWNoZS5cbiAqIEByZXR1cm5zIHtPYmplY3R9IFJldHVybnMgdGhlIGNhY2hlIG9iamVjdC5cbiAqL1xuZnVuY3Rpb24gbWFwU2V0KGtleSwgdmFsdWUpIHtcbiAgaWYgKGtleSAhPSAnX19wcm90b19fJykge1xuICAgIHRoaXMuX19kYXRhX19ba2V5XSA9IHZhbHVlO1xuICB9XG4gIHJldHVybiB0aGlzO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IG1hcFNldDtcbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7XG4gIHRoaXMuX2V2ZW50cyA9IHRoaXMuX2V2ZW50cyB8fCB7fTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gdGhpcy5fbWF4TGlzdGVuZXJzIHx8IHVuZGVmaW5lZDtcbn1cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xuXG4vLyBCYWNrd2FyZHMtY29tcGF0IHdpdGggbm9kZSAwLjEwLnhcbkV2ZW50RW1pdHRlci5FdmVudEVtaXR0ZXIgPSBFdmVudEVtaXR0ZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX2V2ZW50cyA9IHVuZGVmaW5lZDtcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX21heExpc3RlbmVycyA9IHVuZGVmaW5lZDtcblxuLy8gQnkgZGVmYXVsdCBFdmVudEVtaXR0ZXJzIHdpbGwgcHJpbnQgYSB3YXJuaW5nIGlmIG1vcmUgdGhhbiAxMCBsaXN0ZW5lcnMgYXJlXG4vLyBhZGRlZCB0byBpdC4gVGhpcyBpcyBhIHVzZWZ1bCBkZWZhdWx0IHdoaWNoIGhlbHBzIGZpbmRpbmcgbWVtb3J5IGxlYWtzLlxuRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnMgPSAxMDtcblxuLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4vLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24obikge1xuICBpZiAoIWlzTnVtYmVyKG4pIHx8IG4gPCAwIHx8IGlzTmFOKG4pKVxuICAgIHRocm93IFR5cGVFcnJvcignbiBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJyk7XG4gIHRoaXMuX21heExpc3RlbmVycyA9IG47XG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgZXIsIGhhbmRsZXIsIGxlbiwgYXJncywgaSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIElmIHRoZXJlIGlzIG5vICdlcnJvcicgZXZlbnQgbGlzdGVuZXIgdGhlbiB0aHJvdy5cbiAgaWYgKHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICBpZiAoIXRoaXMuX2V2ZW50cy5lcnJvciB8fFxuICAgICAgICAoaXNPYmplY3QodGhpcy5fZXZlbnRzLmVycm9yKSAmJiAhdGhpcy5fZXZlbnRzLmVycm9yLmxlbmd0aCkpIHtcbiAgICAgIGVyID0gYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKGVyIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgZXI7IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgICB9XG4gICAgICB0aHJvdyBUeXBlRXJyb3IoJ1VuY2F1Z2h0LCB1bnNwZWNpZmllZCBcImVycm9yXCIgZXZlbnQuJyk7XG4gICAgfVxuICB9XG5cbiAgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNVbmRlZmluZWQoaGFuZGxlcikpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGhhbmRsZXIpKSB7XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAvLyBmYXN0IGNhc2VzXG4gICAgICBjYXNlIDE6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICAvLyBzbG93ZXJcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoaXNPYmplY3QoaGFuZGxlcikpIHtcbiAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG5cbiAgICBsaXN0ZW5lcnMgPSBoYW5kbGVyLnNsaWNlKCk7XG4gICAgbGVuID0gbGlzdGVuZXJzLmxlbmd0aDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspXG4gICAgICBsaXN0ZW5lcnNbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gVG8gYXZvaWQgcmVjdXJzaW9uIGluIHRoZSBjYXNlIHRoYXQgdHlwZSA9PT0gXCJuZXdMaXN0ZW5lclwiISBCZWZvcmVcbiAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lclwiLlxuICBpZiAodGhpcy5fZXZlbnRzLm5ld0xpc3RlbmVyKVxuICAgIHRoaXMuZW1pdCgnbmV3TGlzdGVuZXInLCB0eXBlLFxuICAgICAgICAgICAgICBpc0Z1bmN0aW9uKGxpc3RlbmVyLmxpc3RlbmVyKSA/XG4gICAgICAgICAgICAgIGxpc3RlbmVyLmxpc3RlbmVyIDogbGlzdGVuZXIpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIC8vIE9wdGltaXplIHRoZSBjYXNlIG9mIG9uZSBsaXN0ZW5lci4gRG9uJ3QgbmVlZCB0aGUgZXh0cmEgYXJyYXkgb2JqZWN0LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xuICBlbHNlIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgZ290IGFuIGFycmF5LCBqdXN0IGFwcGVuZC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0ucHVzaChsaXN0ZW5lcik7XG4gIGVsc2VcbiAgICAvLyBBZGRpbmcgdGhlIHNlY29uZCBlbGVtZW50LCBuZWVkIHRvIGNoYW5nZSB0byBhcnJheS5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdLCBsaXN0ZW5lcl07XG5cbiAgLy8gQ2hlY2sgZm9yIGxpc3RlbmVyIGxlYWtcbiAgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkgJiYgIXRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQpIHtcbiAgICB2YXIgbTtcbiAgICBpZiAoIWlzVW5kZWZpbmVkKHRoaXMuX21heExpc3RlbmVycykpIHtcbiAgICAgIG0gPSB0aGlzLl9tYXhMaXN0ZW5lcnM7XG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSBFdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycztcbiAgICB9XG5cbiAgICBpZiAobSAmJiBtID4gMCAmJiB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoID4gbSkge1xuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCA9IHRydWU7XG4gICAgICBjb25zb2xlLmVycm9yKCcobm9kZSkgd2FybmluZzogcG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSAnICtcbiAgICAgICAgICAgICAgICAgICAgJ2xlYWsgZGV0ZWN0ZWQuICVkIGxpc3RlbmVycyBhZGRlZC4gJyArXG4gICAgICAgICAgICAgICAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoKTtcbiAgICAgIGlmICh0eXBlb2YgY29uc29sZS50cmFjZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAvLyBub3Qgc3VwcG9ydGVkIGluIElFIDEwXG4gICAgICAgIGNvbnNvbGUudHJhY2UoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgdmFyIGZpcmVkID0gZmFsc2U7XG5cbiAgZnVuY3Rpb24gZygpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGcpO1xuXG4gICAgaWYgKCFmaXJlZCkge1xuICAgICAgZmlyZWQgPSB0cnVlO1xuICAgICAgbGlzdGVuZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gIH1cblxuICBnLmxpc3RlbmVyID0gbGlzdGVuZXI7XG4gIHRoaXMub24odHlwZSwgZyk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBlbWl0cyBhICdyZW1vdmVMaXN0ZW5lcicgZXZlbnQgaWZmIHRoZSBsaXN0ZW5lciB3YXMgcmVtb3ZlZFxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBsaXN0LCBwb3NpdGlvbiwgbGVuZ3RoLCBpO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIGxpc3QgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gIGxlbmd0aCA9IGxpc3QubGVuZ3RoO1xuICBwb3NpdGlvbiA9IC0xO1xuXG4gIGlmIChsaXN0ID09PSBsaXN0ZW5lciB8fFxuICAgICAgKGlzRnVuY3Rpb24obGlzdC5saXN0ZW5lcikgJiYgbGlzdC5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcblxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGxpc3QpKSB7XG4gICAgZm9yIChpID0gbGVuZ3RoOyBpLS0gPiAwOykge1xuICAgICAgaWYgKGxpc3RbaV0gPT09IGxpc3RlbmVyIHx8XG4gICAgICAgICAgKGxpc3RbaV0ubGlzdGVuZXIgJiYgbGlzdFtpXS5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgICAgIHBvc2l0aW9uID0gaTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHBvc2l0aW9uIDwgMClcbiAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgaWYgKGxpc3QubGVuZ3RoID09PSAxKSB7XG4gICAgICBsaXN0Lmxlbmd0aCA9IDA7XG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIH0gZWxzZSB7XG4gICAgICBsaXN0LnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIga2V5LCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgLy8gbm90IGxpc3RlbmluZyBmb3IgcmVtb3ZlTGlzdGVuZXIsIG5vIG5lZWQgdG8gZW1pdFxuICBpZiAoIXRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKVxuICAgICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgZWxzZSBpZiAodGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIGVtaXQgcmVtb3ZlTGlzdGVuZXIgZm9yIGFsbCBsaXN0ZW5lcnMgb24gYWxsIGV2ZW50c1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIGZvciAoa2V5IGluIHRoaXMuX2V2ZW50cykge1xuICAgICAgaWYgKGtleSA9PT0gJ3JlbW92ZUxpc3RlbmVyJykgY29udGludWU7XG4gICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycyhrZXkpO1xuICAgIH1cbiAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycygncmVtb3ZlTGlzdGVuZXInKTtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNGdW5jdGlvbihsaXN0ZW5lcnMpKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnMpO1xuICB9IGVsc2Uge1xuICAgIC8vIExJRk8gb3JkZXJcbiAgICB3aGlsZSAobGlzdGVuZXJzLmxlbmd0aClcbiAgICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzW2xpc3RlbmVycy5sZW5ndGggLSAxXSk7XG4gIH1cbiAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IFtdO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gW3RoaXMuX2V2ZW50c1t0eXBlXV07XG4gIGVsc2VcbiAgICByZXQgPSB0aGlzLl9ldmVudHNbdHlwZV0uc2xpY2UoKTtcbiAgcmV0dXJuIHJldDtcbn07XG5cbkV2ZW50RW1pdHRlci5saXN0ZW5lckNvdW50ID0gZnVuY3Rpb24oZW1pdHRlciwgdHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIWVtaXR0ZXIuX2V2ZW50cyB8fCAhZW1pdHRlci5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IDA7XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24oZW1pdHRlci5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSAxO1xuICBlbHNlXG4gICAgcmV0ID0gZW1pdHRlci5fZXZlbnRzW3R5cGVdLmxlbmd0aDtcbiAgcmV0dXJuIHJldDtcbn07XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbiJdfQ==
