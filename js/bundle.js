(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
},{"./lib/file-dragger":4,"./lib/mosaic":9}],2:[function(require,module,exports){
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

    // Each pixel is actually 4 cells in the array
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
},{"events":17}],5:[function(require,module,exports){
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
},{"lodash/function/memoize":11}],8:[function(require,module,exports){
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

},{"../internal/MapCache":12}],12:[function(require,module,exports){
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

},{"./mapDelete":13,"./mapGet":14,"./mapHas":15,"./mapSet":16}],13:[function(require,module,exports){
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

},{}],14:[function(require,module,exports){
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

},{}],15:[function(require,module,exports){
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

},{}],16:[function(require,module,exports){
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

},{}],17:[function(require,module,exports){
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwianMvY2xpZW50LmpzIiwianMvbGliL2FycmF5LWdyaWQtc3Vic2V0LmpzIiwianMvbGliL2F2ZXJhZ2UtY29sb3VyLmpzIiwianMvbGliL2ZpbGUtZHJhZ2dlci5qcyIsImpzL2xpYi9ncmlkLmpzIiwianMvbGliL2ltYWdlLXRvLWNhbnZhcy5qcyIsImpzL2xpYi9sb2FkLWltYWdlLmpzIiwianMvbGliL21ha2UtY2FudmFzLmpzIiwianMvbGliL21vc2FpYy5qcyIsImpzL2xpYi9yZ2ItdG8taGV4LmpzIiwibm9kZV9tb2R1bGVzL2xvZGFzaC9mdW5jdGlvbi9tZW1vaXplLmpzIiwibm9kZV9tb2R1bGVzL2xvZGFzaC9pbnRlcm5hbC9NYXBDYWNoZS5qcyIsIm5vZGVfbW9kdWxlcy9sb2Rhc2gvaW50ZXJuYWwvbWFwRGVsZXRlLmpzIiwibm9kZV9tb2R1bGVzL2xvZGFzaC9pbnRlcm5hbC9tYXBHZXQuanMiLCJub2RlX21vZHVsZXMvbG9kYXNoL2ludGVybmFsL21hcEhhcy5qcyIsIm5vZGVfbW9kdWxlcy9sb2Rhc2gvaW50ZXJuYWwvbWFwU2V0LmpzIiwibm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9ldmVudHMvZXZlbnRzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDakJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2ZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMvSkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDZEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3BCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgRmlsZURyYWdnZXIgPSByZXF1aXJlKCcuL2xpYi9maWxlLWRyYWdnZXInKVxudmFyIG1vc2FpYyA9IHJlcXVpcmUoJy4vbGliL21vc2FpYycpXG5cbnZhciBzZXR0aW5ncyA9IHtcbiAgICBBTExPV0VEX1RZUEVTOiBbICdpbWFnZS9wbmcnLCAnaW1hZ2UvanBlZycgXVxuICAsIEJBU0VfVVJMOiAnLydcbiAgLCBUSUxFX0hFSUdIVDogVElMRV9IRUlHSFRcbiAgLCBUSUxFX1dJRFRIOiBUSUxFX1dJRFRIXG59XG5cbnZhciBkcmFnZ2VyID0gRmlsZURyYWdnZXIoKVxuZHJhZ2dlci5vbignZmlsZScsIGZ1bmN0aW9uIChmaWxlKSB7XG4gICAgaWYgKHNldHRpbmdzLkFMTE9XRURfVFlQRVMuaW5kZXhPZihmaWxlLnR5cGUpID09PSAtMSkgcmV0dXJuXG4gICAgbW9zYWljKGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy5vdXRwdXQnKSwgZmlsZSwgc2V0dGluZ3MpXG59KSIsIm1vZHVsZS5leHBvcnRzID0gc3Vic2V0XG5cbi8qKlxuICogR2l2ZW4gYW4gYXJyYXkgKG9yIGFuIGFycmF5LWxpa2UpLCByZXR1cm4gYW4gYXJyYXkgcmVwcmVzZW50aW5nIGEgdmlldyBpbnRvIGFcbiAqIHN1YnNldCBvZiB0aGF0IGFycmF5LiBUaGUgdmVpdyBpcyBjYWxjdWxhdGVkIGJ5IHRyZWF0aW5nIHRoZSBhcnJheSBhcyBhIGdyaWRcbiAqIGFuZCBwYXNzaW5nIHRoZSBncmlkIGNvb3JkaW50ZXMgb2YgdGhlIGRlc2lyZWQgdmlldyBhcyBhbiBhcmd1bWVudC5cbiAqXG4gKiBAcGFyYW0gIHtBcnJheX0gYXJyICAgICAgICAgICAgIFRoZSBhcnJheS9hcnJheS1saWtlIHRvIHZpZXdcbiAqXG4gKiBAcGFyYW0gIHtPYmplY3R9IGRpbWVuc2lvbnMgICAgIFRoZSBncmlkIGRpbWVuc2lvbnMgb2YgdGhlIGFycmF5XG4gKiAgICAgICAgICAgICAgICAgIGRpbWVuc2lvbnMud2lkdGggSG93IG1hbnkgY2VsbHMgd2lkZSBpcyB0aGUgZ3JpZFxuICogICAgICAgICAgICAgICAgICBkaW1lbnNpb25zLmhlaWdodCBIb3cgbWFueSBjZWxscyBoaWdoIGlzIHRoZSBncmlkXG4gKiAgICAgICAgICAgICAgICAgIGRpbWVuc2lvbnMuY2VsbFNpemUgSG93IG1hbnkgY2VsbHMgaW4gdGhlIGFyciByZXByZXNlbnQgMVxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGNlbGwgaW4gdGhlIGdyaWQgd2UncmUgdHJlYXRpbmcgaXQgYXMuXG4gKiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgRS5nLiwgd2l0aCBwaXhlbCBkYXRhIDQgdmFsdWVzIG1ha2VzIG9uZVxuICogICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBpeGVsIChyLCBnLCBiLCBhKVxuICpcbiAqIEBwYXJhbSAge09iamVjdH0gdmlld0RpbWVuc2lvbnMgVGhlIGRpbWVuc2lvbnMgb2YgdGhlIHZpZXcgd2UncmUgbG9va2luZyBmb3JcbiAqICAgICAgICAgICAgICAgICAgdmlld0RpbWVuc2lvbnMueCBYIGNvb3JkaW5hdGUgb2YgdGhlIHZpZXcgaW4gdGhlIGdyaWRcbiAqICAgICAgICAgICAgICAgICAgdmlld0RpbWVuc2lvbnMueSBZIGNvb3JkaW5hdGUgb2YgdGhlIHZpZXcgaW4gdGhlIGdyaWRcbiAqICAgICAgICAgICAgICAgICAgdmlld0RpbWVuc2lvbnMud2lkdGggV2lkdGggb2YgdGhlIHZpZXcgaW4gdGhlIGdyaWRcbiAqICAgICAgICAgICAgICAgICAgdmlld0RpbWVuc2lvbnMuaGVpZ2h0IEhlaWdodCBvZiB0aGUgdmlldyBpbiB0aGUgZ3JpZFxuICpcbiAqIEByZXR1cm4ge0FycmF5fSAgICAgICAgICAgICAgICAgVGhlIGFycmF5IHJlcHJlc2VudGluZyB0aGUgdmlldyBhc2tlZCBmb3IuXG4gKi9cbmZ1bmN0aW9uIHN1YnNldCAoYXJyLCBkaW1lbnNpb25zLCB2aWV3RGltZW5zaW9ucykge1xuICAgIHZhciByZXQgPSBbXVxuXG4gICAgdmFyIHZkID0gdmlld0RpbWVuc2lvbnNcbiAgICB2YXIgZCA9IGRpbWVuc2lvbnNcbiAgICB2YXIgY2VsbFNpemUgPSBkLmNlbGxTaXplID09IG51bGwgPyAxIDogZC5jZWxsU2l6ZVxuXG4gICAgZm9yICh2YXIgeCA9IHZkLng7IHggPCB2ZC54ICsgdmQud2lkdGg7IHggKz0gMSkge1xuICAgICAgICBmb3IgKHZhciB5ID0gdmQueTsgeSA8IHZkLnkgKyB2ZC5oZWlnaHQ7IHkgKz0gMSkge1xuICAgICAgICAgICAgdmFyIGluZGV4ID0gKHkgKiBjZWxsU2l6ZSkgKiBkLndpZHRoICsgKHggKiBjZWxsU2l6ZSlcbiAgICAgICAgICAgIHJldC5wdXNoLmFwcGx5KHJldCwgW10uc2xpY2UuY2FsbChhcnIsIGluZGV4LCBpbmRleCArIGNlbGxTaXplKSlcbiAgICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiByZXRcbn0iLCJtb2R1bGUuZXhwb3J0cyA9IGF2ZXJhZ2VDb2xvdXJcblxuLyoqXG4gKiBHaXZlbiBhbiBhcnJheSBvZiBjYW52YXMgcGl4ZWwgZGF0YSwgZ2l2ZSB1cyB0aGUgYXZlcmFnZSBjb2xvdXIgYXMgYW4gW3IsIGcsIGJdXG4gKi9cbmZ1bmN0aW9uIGF2ZXJhZ2VDb2xvdXIgKHBpeGVscykge1xuICAgIHZhciByZWQgPSAwXG4gICAgdmFyIGdyZWVuID0gMFxuICAgIHZhciBibHVlID0gMFxuXG4gICAgLy8gRWFjaCBwaXhlbCBpcyBhY3R1YWxseSA0IGNlbGxzIGluIHRoZSBhcnJheVxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGl4ZWxzLmxlbmd0aDsgaSArPSA0KSB7XG4gICAgICAgIHJlZCArPSBwaXhlbHNbaV1cbiAgICAgICAgZ3JlZW4gKz0gcGl4ZWxzW2kgKyAxXVxuICAgICAgICBibHVlICs9IHBpeGVsc1tpICsgMl1cbiAgICB9XG5cbiAgICByZXR1cm4gW1xuICAgICAgICBNYXRoLnJvdW5kKHJlZCAvIChpIC8gNCkpXG4gICAgICAsIE1hdGgucm91bmQoZ3JlZW4gLyAoaSAvIDQpKVxuICAgICAgLCBNYXRoLnJvdW5kKGJsdWUgLyAoaSAvIDQpKVxuICAgIF1cbn0iLCJtb2R1bGUuZXhwb3J0cyA9IEZpbGVEcmFnZ2VyXG5cbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXJcblxuLyoqXG4gKiBSZXR1cm5zIGFuZCBldmVudCBlbWl0dGVyIHRoYXQgZW1pdHMgYCdmaWxlJ2AgZXZlbnRzIHdoZW5ldmVyIGZpbGVzIGFyZVxuICogZHJvcHBlZCBpbnRvIHRoZSB3aW5kb3cuXG4gKlxuICogRm9yIHRoZSBwdXJwb3NlcyBvZiB0aGlzIGNvZGViYXNlIGl0IG9ubHkgZW1pdHMgdGhlIGZpbGUgYXQgcG9zaXRpb24gWzBdXG4gKiBzbyBtdXRsaSBmaWxlIGRyb3BzIHdvbid0IGVtaXQgZm9yIGVhY2ggZmlsZSwgYnV0IHRoYXQgc2hvdWxkIGlkZWFsbHkgYmVcbiAqIHJlbW92ZWQuXG4gKlxuICogYGVtaXR0ZXIuY2xlYW51cGAgd2lsbCByZWxlYXNlIGFsbCBldmVudCBoYW5kbGVycy5cbiAqL1xuZnVuY3Rpb24gRmlsZURyYWdnZXIgKCkge1xuICAgIHZhciBlbWl0dGVyID0gbmV3IEV2ZW50RW1pdHRlclxuXG4gICAgLy8gZHJhZ292ZXIgYW5kIGRyYWdlbnRlciBtYWtlIHRoZSBlbGVtZW50IGEgZHJhZyB0YXJnZXQsIHdpdGhvdXQgd2hpY2hcbiAgICAvLyBkcm9wIHdvbid0IGZpcmUgYW5kIHRoZSBwYWdlIHdpbGwgcmVkaXJlY3QgdG8gdGhlIGRyb3BwZWQgZmlsZVxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdkcmFnb3ZlcicsIGNhbmNlbCwgZmFsc2UpXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2RyYWdlbnRlcicsIGNhbmNlbCwgZmFsc2UpXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2Ryb3AnLCBkcm9wLCBmYWxzZSlcblxuICAgIGVtaXR0ZXIuY2xlYW51cCA9IGNsZWFudXBcblxuICAgIHJldHVybiBlbWl0dGVyXG5cbiAgICBmdW5jdGlvbiBkcm9wIChlKSB7XG4gICAgICAgIGNhbmNlbChlKVxuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZS5kYXRhVHJhbnNmZXIuZmlsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGVtaXR0ZXIuZW1pdCgnZmlsZScsIGUuZGF0YVRyYW5zZmVyLmZpbGVzW2ldKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUHJldmVudCB0aGUgYnJvd3NlciBmcm9tIHJlZGlyZWN0aW5nIHRvIHRoZSBmaWxlIGRyb3BwZWQgaW4uXG4gICAgICovXG4gICAgZnVuY3Rpb24gY2FuY2VsIChlKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2xlYW51cCAoKSB7XG4gICAgICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdkcmFnb3ZlcicsIGNhbmNlbClcbiAgICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2RyYWdlbnRlcicsIGNhbmNlbClcbiAgICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Ryb3AnLCBkcm9wKVxuICAgIH1cbn0iLCJtb2R1bGUuZXhwb3J0cyA9IGdyaWRcblxuLyoqXG4gKiBHaXZlbiBhIGRpbWVuc2lvbnMgb2JqZWN0IChudW1iZXIgb2YgYHJvd3NgIGFuZCBudW1iZXIgb2YgYGNvbHVtbnNgKSBjcmVhdGVcbiAqIGFuIGFycmF5IG9mIGNlbGwgb2JqZWN0cywgKGB4YCBhbmQgYHlgIHByb3BlcnRpZXNgKSAxIGZvciBlYWNoIGNlbGxcbiAqIGluIHRoZSBncmlkLlxuICovXG5mdW5jdGlvbiBncmlkIChkaW1lbnNpb25zKSB7XG4gICAgdmFyIHJldCA9IFtdXG5cbiAgICBmb3IgKHZhciB5ID0gMDsgeSA8IGRpbWVuc2lvbnMucm93czsgeSsrKSB7XG4gICAgICAgIGZvciAodmFyIHggPSAwOyB4IDwgZGltZW5zaW9ucy5jb2x1bW5zOyB4KyspIHtcbiAgICAgICAgICAgIHJldC5wdXNoKHsgeDogeCwgeTogeSB9KVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHJldFxufSIsIm1vZHVsZS5leHBvcnRzID0gaW1hZ2VUb0NhbnZhc1xuXG52YXIgbWFrZUNhbnZhcyA9IHJlcXVpcmUoJy4vbWFrZS1jYW52YXMnKVxudmFyIGxvYWRJbWFnZSA9IHJlcXVpcmUoJy4vbG9hZC1pbWFnZScpXG5cbi8qKlxuICogVGFrZXMgYSBicm93c2VyIGZpbGUgb2JqZWN0IGFuZCBhIGNhbGxiYWNrLiBDYWxscyBiYWNrIHdpdGggYW4gZXJyb3IgaWYgaXRcbiAqIG9jY3VycmVkIChhdCB0aGUgbW9tZW50IHdlJ3JlIG5vdCBsb29raW5nIGZvciBvbmUgdG8gc2VuZCkgYW5kIGEgZGV0YWNoZWRcbiAqIGNhbnZhcyBlbGVtZW50IG1hdGNoaW5nIHRoZSBpbWFnZSdzIGRpbWVuc2lvbnMgd2l0aCB0aGUgaW1hZ2UgYmxpdHRlZCB0byBpdC5cbiAqL1xuZnVuY3Rpb24gaW1hZ2VUb0NhbnZhcyAoZmlsZSwgY2FsbGJhY2spIHtcbiAgICB2YXIgdXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTChmaWxlKVxuICAgIGxvYWRJbWFnZSh1cmwpLnRoZW4oZnVuY3Rpb24gKGltZykge1xuICAgICAgICB2YXIgY2FudmFzID0gbWFrZUNhbnZhcyhpbWcud2lkdGgsIGltZy5oZWlnaHQpXG4gICAgICAgIHZhciBjdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKVxuICAgICAgICBjdHguZHJhd0ltYWdlKGltZywgMCwgMClcbiAgICAgICAgLy8gTmVlZCB0byBkbyB0aGlzIGJlY2F1c2Ugb2YgdGhlIHdheSBicm93c2VyJ3MgZ2MgdGhlc2UgT2JqZWN0VXJsXG4gICAgICAgIC8vIHZhcmlhYmxlcy4gU2VlOlxuICAgICAgICAvLyBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvVVJML2NyZWF0ZU9iamVjdFVSTFxuICAgICAgICBVUkwucmV2b2tlT2JqZWN0VVJMKHVybClcbiAgICAgICAgY2FsbGJhY2sobnVsbCwgY2FudmFzKVxuICAgIH0pXG59IiwidmFyIG1lbW9pemUgPSByZXF1aXJlKCdsb2Rhc2gvZnVuY3Rpb24vbWVtb2l6ZScpXG5cbm1vZHVsZS5leHBvcnRzID0gbWVtb2l6ZShsb2FkSW1hZ2UpXG5cbi8qKlxuICogVGFrZXMgYSB1cmwgYW5kIHJldHVybnMgYSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgdG8gYSBsb2FkZWQgSW1hZ2Ugb2JqZWN0LlxuICovXG5mdW5jdGlvbiBsb2FkSW1hZ2UodXJsKSB7XG4gICAgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcbiAgICAgICAgdmFyIGltZyA9IG5ldyBJbWFnZSgpXG4gICAgICAgIGltZy5vbmxvYWQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICByZXNvbHZlKGltZylcbiAgICAgICAgfVxuICAgICAgICBpbWcuc3JjID0gdXJsXG4gICAgfSlcbn0iLCJtb2R1bGUuZXhwb3J0cyA9IG1ha2VDYW52YXNcblxuLyoqXG4gKiBIZWxwZXIgZnVuY3Rpb24gZm9yIGNyZWF0aW5nIGEgY2FudmFzIHdpdGggYSBnaXZlbiB3aWR0aCBhbmQgaGVpZ2h0IGFzIHdlXG4gKiBuZWVkIGl0IGluIGEgZmV3IHBsYWNlcy5cbiAqL1xuZnVuY3Rpb24gbWFrZUNhbnZhcyAod2lkdGgsIGhlaWdodCkge1xuICAgIHZhciBjYW52YXMgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KCdjYW52YXMnKVxuICAgIGNhbnZhcy53aWR0aCA9IHdpZHRoXG4gICAgY2FudmFzLmhlaWdodCA9IGhlaWdodFxuICAgIHJldHVybiBjYW52YXNcbn0iLCJtb2R1bGUuZXhwb3J0cyA9IGV4cG9ydHMgPSBtb3NhaWNcbmV4cG9ydHMudGlsZVRhc2tGYWN0b3J5ID0gdGlsZVRhc2tGYWN0b3J5XG5leHBvcnRzLmV4ZWN1dGVTdHJhdGVneSA9IGV4ZWN1dGVTdHJhdGVneVxuXG52YXIgaW1hZ2VUb0NhbnZhcyA9IHJlcXVpcmUoJy4vaW1hZ2UtdG8tY2FudmFzJylcbnZhciBtYWtlQ2FudmFzID0gcmVxdWlyZSgnLi9tYWtlLWNhbnZhcycpXG52YXIgbWFrZUdyaWQgPSByZXF1aXJlKCcuL2dyaWQnKVxudmFyIGF2ZXJhZ2VDb2xvdXIgPSByZXF1aXJlKCcuL2F2ZXJhZ2UtY29sb3VyJylcbnZhciByZ2IySGV4ID0gcmVxdWlyZSgnLi9yZ2ItdG8taGV4JylcbnZhciBsb2FkSW1hZ2UgPSByZXF1aXJlKCcuL2xvYWQtaW1hZ2UnKVxudmFyIGFycmF5U3Vic2V0ID0gcmVxdWlyZSgnLi9hcnJheS1ncmlkLXN1YnNldCcpXG5cbi8qKlxuICogUmVuZGVycyBhbiBpbWFnZSB0byBhIGNhbnZhcyBpbiBhIHRhcmdldCBlbGVtZW50IGFzIGEgc2VyaWVzIG9mIHRpbGVzXG4gKiByZXByZXNlbnRpbmcgYXZlcmFnZSBjb2xvdXJzIG9mIHRoZSBhcmVhcyB0aGV5IGNvdmVyLlxuICpcbiAqIFRha2VzIGEgdGFyZ2V0IGVsZW1lbnQgdG8gcHV0IHRoZSBjYW52YXMgaW50bywgYSBmaWxlIG9iamVjdCByZXByZXNlbnRpbmdcbiAqIHRoZSBmaWxlIGZyb20gYSBmaWxlIGlucHV0IG9yIGRyYWcgYW5kIGRyb3AgZXZlbnQgYW5kIGEgc2V0dGluZ3Mgb2JqZWN0XG4gKiBjb250YWluaW5nIHRpbGUgd2lkdGgsIHRpbGUgaGVpZ2h0IGFuZCBhIGJhc2UgdXJsIGZvciB3aGVyZSB0byBsb2FkIHRoZSB0aWxlc1xuICogZnJvbS5cbiAqXG4gKiBAcGFyYW0gIHtIVE1MRWxlbWVudH0gdGFyZ2V0ICAgV2hlcmUgaW4gdGhlIERPTSB0byBhcHBlbmQgdGhlIG1vc2FpYyB0b1xuICogQHBhcmFtICB7RmlsZX0gZmlsZSAgICAgICAgICAgIEZpbGUgb2JqZWN0IHJlcHJlc2VudGluZyB0aGUgaW1hZ2UgdG8gcmVuZGVyXG4gKiBAcGFyYW0gIHtPYmplY3R9IHNldHRpbmdzICAgICAgU2V0dGluZ3MgZm9yIHRoZSBtb3NhaWMgY2FsbC5cbiAqICAgICAgICAgICAgICAgICAgc2V0dGluZ3MuVElMRV9XSURUSCBUaGUgd2lkdGggb2YgdGlsZXMgaW4gdGhpcyBtb3NhaWNcbiAqICAgICAgICAgICAgICAgICAgc2V0dGluZ3MuVElMRV9IRUlHSFQgdGhlIGhlaWdodCBvZiB0aWxlcyBpbiB0aGlzIG1vc2FpY1xuICogICAgICAgICAgICAgICAgICBzZXR0aW5ncy5CQVNFX1VSTCBUaGUgYmFzZSB1cmwgZm9yIHRpbGUgaW1hZ2UgcmVxdWVzdHNcbiAqL1xuZnVuY3Rpb24gbW9zYWljICh0YXJnZXQsIGZpbGUsIHNldHRpbmdzKSB7XG4gICAgdmFyIGV4ZWN1dGUgPSBzZXR0aW5ncy5leGVjdXRlU3RyYXRlZ3kgfHwgZXhlY3V0ZVN0cmF0ZWd5XG5cbiAgICAvLyBEcmF3IHRoZSBpbWFnZSBpbnRvIGFuIG9mZnNjcmVlbiBjYW52YXNcbiAgICBpbWFnZVRvQ2FudmFzKGZpbGUsIGZ1bmN0aW9uIChlcnIsIHNvdXJjZSkge1xuICAgICAgICAvLyBOZWVkIHRoaXMgaW5mbyBpbiBhIGNvdXBsZSBvZiBwbGFjZXNcbiAgICAgICAgdmFyIGRpbWVuc2lvbnMgPSB7XG4gICAgICAgICAgICByb3dzOiBNYXRoLmNlaWwoc291cmNlLmhlaWdodCAvIHNldHRpbmdzLlRJTEVfSEVJR0hUKVxuICAgICAgICAgICwgY29sdW1uczogTWF0aC5jZWlsKHNvdXJjZS53aWR0aCAvIHNldHRpbmdzLlRJTEVfV0lEVEgpXG4gICAgICAgIH1cblxuICAgICAgICAvLyBCcmVhayBpdCBpbnRvIGEgZ3JpZFxuICAgICAgICB2YXIgZ3JpZCA9IG1ha2VHcmlkKGRpbWVuc2lvbnMpXG5cbiAgICAgICAgLy8gTWFwIGdyaWQgdG8gc2VydmVyIGZldGNoIHRhc2tzXG4gICAgICAgIHZhciB0YXNrU2V0dGluZ3MgPSB7XG4gICAgICAgICAgICB0aWxlV2lkdGg6IHNldHRpbmdzLlRJTEVfV0lEVEhcbiAgICAgICAgICAsIHRpbGVIZWlnaHQ6IHNldHRpbmdzLlRJTEVfSEVJR0hUXG4gICAgICAgICAgLCB3aWR0aDogc291cmNlLndpZHRoXG4gICAgICAgICAgLCBoZWlnaHQ6IHNvdXJjZS5oZWlnaHRcbiAgICAgICAgfVxuICAgICAgICB2YXIgdGFza3MgPSBncmlkLm1hcCh0aWxlVGFza0ZhY3RvcnkoXG4gICAgICAgICAgICBzb3VyY2UuZ2V0Q29udGV4dCgnMmQnKVxuICAgICAgICAgICwgdGFza1NldHRpbmdzXG4gICAgICAgICkpXG5cbiAgICAgICAgLy8gQWRkIHRoZSBjYW52YXMgdG8gdGhlIGRvbSBzbyB1c2VycyBjYW4gc2VlIHJvdy1ieS1yb3dcbiAgICAgICAgdmFyIGRlc3QgPSBtYWtlQ2FudmFzKHNvdXJjZS53aWR0aCwgc291cmNlLmhlaWdodClcbiAgICAgICAgdmFyIGN0eCA9IGRlc3QuZ2V0Q29udGV4dCgnMmQnKVxuICAgICAgICB2YXIgd3JhcHBlciA9IG1ha2VXcmFwcGVyKHNvdXJjZS53aWR0aCwgc291cmNlLmhlaWdodClcbiAgICAgICAgd3JhcHBlci5hcHBlbmRDaGlsZChkZXN0KVxuICAgICAgICB0YXJnZXQuYXBwZW5kQ2hpbGQod3JhcHBlcilcblxuICAgICAgICB2YXIgZXhlY3V0ZVNldHRpbmdzID0ge1xuICAgICAgICAgICAgcm93czogZGltZW5zaW9ucy5yb3dzXG4gICAgICAgICAgLCBjb2x1bW5zOiBkaW1lbnNpb25zLmNvbHVtbnNcbiAgICAgICAgICAsIHRpbGVXaWR0aDogc2V0dGluZ3MuVElMRV9XSURUSFxuICAgICAgICAgICwgdGlsZUhlaWdodDogc2V0dGluZ3MuVElMRV9IRUlHSFRcbiAgICAgICAgICAsIGJhc2VVcmw6IHNldHRpbmdzLkJBU0VfVVJMXG4gICAgICAgIH1cbiAgICAgICAgZXhlY3V0ZSh0YXNrcywgZXhlY3V0ZVNldHRpbmdzLCBmdW5jdGlvbiAocm93LCBpKSB7XG4gICAgICAgICAgICBjdHguZHJhd0ltYWdlKHJvdywgMCwgaSAqIHNldHRpbmdzLlRJTEVfSEVJR0hUKVxuICAgICAgICB9KVxuICAgIH0pXG59XG5cbi8vIEV4ZWN1dGUgdGhlIHRhc2tzIGluIGEgd2F5IHdlIGNhbiBjYWxsIG4gdGltZXMsIHdoZXJlIG4gaXMgdGhlIG51bWJlciBvZiByb3dzXG4vLyBhbmQgdGhlIG9yZGVyIG9mIHRoZSBjYWxscyBtYXRjaGVzIHRoZSBvcmRlciBvZiB0aGUgcm93cy5cbmZ1bmN0aW9uIGV4ZWN1dGVTdHJhdGVneSAodGFza3MsIHNldHRpbmdzLCByb3dDYWxsYmFjaykge1xuICAgIC8vIFJlZHVjZSB0byByb3dzXG4gICAgdmFyIHJvd3MgPSB0YXNrcy5yZWR1Y2UoZnVuY3Rpb24gKHByZXZpb3VzLCBjdXJyZW50KSB7XG4gICAgICAgIHByZXZpb3VzW2N1cnJlbnQueV0gPSBwcmV2aW91c1tjdXJyZW50LnldIHx8IFtdXG4gICAgICAgIHByZXZpb3VzW2N1cnJlbnQueV1bY3VycmVudC54XSA9IGN1cnJlbnRcbiAgICAgICAgcmV0dXJuIHByZXZpb3VzXG4gICAgfSwgW10pXG5cbiAgICAvLyBEcmF3IGNlbGxzIGluIGVhY2ggcm93IHRvIGVhY2ggY29udGV4dFxuICAgIHZhciBxdWV1ZVN0YXJ0ID0gMFxuICAgIHZhciBxdWV1ZSA9IHJvd3MubWFwKGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGZhbHNlXG4gICAgfSlcbiAgICByb3dzLmZvckVhY2goZnVuY3Rpb24gKGNlbGxzLCBpKSB7XG4gICAgICAgIHZhciByb3dDYW52YXMgPSBtYWtlQ2FudmFzKFxuICAgICAgICAgICAgc2V0dGluZ3MuY29sdW1ucyAqIHNldHRpbmdzLnRpbGVXaWR0aFxuICAgICAgICAgICwgc2V0dGluZ3MudGlsZUhlaWdodFxuICAgICAgICApXG4gICAgICAgIHZhciByb3dDdHggPSByb3dDYW52YXMuZ2V0Q29udGV4dCgnMmQnKVxuXG4gICAgICAgIC8vIEFzIHRoZXkgYXJlIGZldGNoZWQsIHJlbmRlciB0byBhbiBvZmZzY3JlZW4gY29udGV4dCBzbyB3ZSBjYW4gcmVuZGVyXG4gICAgICAgIC8vIHRoZSB3aG9sZSByb3cgYXQgb25jZSB0byB0aGUgdXNlclxuICAgICAgICBQcm9taXNlLmFsbChjZWxscy5tYXAoZnVuY3Rpb24gKGNlbGwpIHtcbiAgICAgICAgICAgIHZhciB4ID0gY2VsbC54ICogc2V0dGluZ3MudGlsZVdpZHRoXG4gICAgICAgICAgICB2YXIgdXJsID0gc2V0dGluZ3MuYmFzZVVybCArICdjb2xvci8nICsgY2VsbC5oZXhcblxuICAgICAgICAgICAgcmV0dXJuIGxvYWRJbWFnZSh1cmwpLnRoZW4oZnVuY3Rpb24gKGltZykge1xuICAgICAgICAgICAgICAgIHJvd0N0eC5kcmF3SW1hZ2UoaW1nLCB4LCAwKVxuICAgICAgICAgICAgfSlcbiAgICAgICAgfSkpLnRoZW4oZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgLy8gUXVldWUgZm9yIGNhbGxiYWNrIGJlY2F1c2Ugd2UgaGF2ZSB0byByZW5kZXIgcm93cyBpbiBvcmRlclxuICAgICAgICAgICAgLy8gYW5kIHdlIGNhbid0IGd1YXJhbnRlZSB0aGF0IHJpZ2h0IG5vdyB3aXRoIHRoaXMgZmV0Y2hpbmcgbWV0aG9kXG4gICAgICAgICAgICBxdWV1ZVtpXSA9IHJvd0NhbnZhc1xuXG4gICAgICAgICAgICBmb3IgKHZhciBqID0gcXVldWVTdGFydDsgaiA8IHF1ZXVlLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgaWYgKCFxdWV1ZVtqXSkgYnJlYWs7XG4gICAgICAgICAgICAgICAgcm93Q2FsbGJhY2socXVldWVbal0sIGopXG4gICAgICAgICAgICAgICAgcXVldWVTdGFydCA9IGogKyAxXG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgfSlcbn1cblxuLy8gQ2xvc3VyZSBzbyB0aGUgdGlsZVRhc2sgZnVuY3Rpb24gaGFzIHdoYXQgaXQgbmVlZHNcbmZ1bmN0aW9uIHRpbGVUYXNrRmFjdG9yeSAoY3R4LCBzZXR0aW5ncykge1xuICAgIHZhciBpbWFnZURhdGEgPSBjdHguZ2V0SW1hZ2VEYXRhKDAsIDAsIHNldHRpbmdzLndpZHRoLCBzZXR0aW5ncy5oZWlnaHQpLmRhdGFcbiAgICAvLyBUYWtlIGEgY2VsbCBkZWZpbml0aW9uIChhbiBvYmplY3Qgd2l0aCB4IGFuZCB5IHByb3BlcnRpZXMpIGFuZCByZXR1cm4gYVxuICAgIC8vIHRhc2sgb2JqZWN0LiBBIHRhc2sgb2JqZWN0IGhhcyB4LCB5IGFuZCBoZXggdmFsdWUgcHJvcGVydGllcy5cbiAgICByZXR1cm4gZnVuY3Rpb24gKGNlbGwpIHtcbiAgICAgICAgdmFyIHBpeGVscyA9IGFycmF5U3Vic2V0KGltYWdlRGF0YSwge1xuICAgICAgICAgICAgd2lkdGg6IHNldHRpbmdzLndpZHRoXG4gICAgICAgICAgLCBoZWlnaHQ6IHNldHRpbmdzLmhlaWdodFxuICAgICAgICAgICAgLy8gZWFjaCBwaXhlbCBpcyBhY3R1YWxseSA0IGFycmF5IGNlbGxzXG4gICAgICAgICAgLCBjZWxsU2l6ZTogNFxuICAgICAgICB9LCB7XG4gICAgICAgICAgICB4OiBjZWxsLnggKiBzZXR0aW5ncy50aWxlV2lkdGhcbiAgICAgICAgICAsIHk6IGNlbGwueSAqIHNldHRpbmdzLnRpbGVIZWlnaHRcbiAgICAgICAgICAvLyBCaW5kIHRoZXNlIHRvIHRoZSBkaW1lbnNpb25zIG9mIHRoZSBpbWFnZVxuICAgICAgICAgICwgd2lkdGg6IE1hdGgubWluKHNldHRpbmdzLnRpbGVXaWR0aCwgc2V0dGluZ3Mud2lkdGggLSBjZWxsLnggKiBzZXR0aW5ncy50aWxlV2lkdGgpXG4gICAgICAgICAgLCBoZWlnaHQ6IE1hdGgubWluKHNldHRpbmdzLnRpbGVIZWlnaHQsIHNldHRpbmdzLmhlaWdodCAtIGNlbGwueSAqIHNldHRpbmdzLnRpbGVIZWlnaHQpXG4gICAgICAgIH0pXG5cbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHg6IGNlbGwueFxuICAgICAgICAgICwgeTogY2VsbC55XG4gICAgICAgICAgLCBoZXg6IHJnYjJIZXguYXBwbHkobnVsbCwgYXZlcmFnZUNvbG91cihwaXhlbHMpKVxuICAgICAgICB9XG4gICAgfVxufVxuXG4vKipcbiAqIENyZWF0ZSBhIGRpdiB3aXRoIHRoZSB3cmFwcGVyIHN0eWxlLCBvZiB0aGUgaGVpZ2h0IGFuZCB3aWR0aCBvZiB0aGUgdG8tYmVcbiAqIGNhbnZhcyB0byBiZXR0ZXIgc2hvdyB0aGUgdXNlciB3aGF0J3MgaGFwcGVuaW5nLlxuICpcbiAqIERvbid0IHdhbnQgRE9NIG9wZXJhdGlvbnMgY2x1dHRlcmluZyB1cCBteSBsb2dpYyBzbyBjaHVja2luZyB0aGlzIGluIGEgaGVscGVyXG4gKi9cbmZ1bmN0aW9uIG1ha2VXcmFwcGVyICh3aWR0aCwgaGVpZ2h0KSB7XG4gICAgdmFyIHJldCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG4gICAgcmV0LmNsYXNzTGlzdC5hZGQoJ21vc2FpYy13cmFwcGVyJylcbiAgICAvLyArcGFkZGluZyArYm9yZGVyIGJlY2F1c2Ugb2YgYm94LXNpemluZzogYm9yZGVyLWJveDtcbiAgICByZXQuc3R5bGUud2lkdGggPSAod2lkdGggKyA0MikgKyAncHgnXG4gICAgcmV0LnN0eWxlLmhlaWdodCA9IChoZWlnaHQgKyA0MikgKyAncHgnXG4gICAgcmV0dXJuIHJldFxufSIsIm1vZHVsZS5leHBvcnRzID0gZXhwb3J0cyA9IHJnYjJIZXhcbmV4cG9ydHMucGFkID0gcGFkXG5cbi8qKlxuICogQ29udmVydCBgcmAsIGBnYCBhbmQgYGJgIHZhbHVlcyB0byBhIHNpbmdsZSBoZXggc3RyaW5nLiBFLmcuOlxuICpcbiAqICAgICByZ2IySGV4KDAsIDAsIDApIC8vIDAwMDAwMFxuICogICAgIHJnYjJIZXgoMjU1LCAyNTUsIDI1NSkgLy8gZmZmZmZmXG4gKi9cbmZ1bmN0aW9uIHJnYjJIZXggKHIsIGcsIGIpIHtcbiAgICAvLyBQYWQgYmVjYXVzZSAwLnRvU3RyaW5nKDE2KSBpcyAwIG5vdCAwMCBhbmQgdGhlIHNlcnZlciBleHBlY3RzIDYgY2hhcmFjdGVyXG4gICAgLy8gaGV4IHN0cmluZ3MuXG4gICAgcmV0dXJuIHBhZChyLnRvU3RyaW5nKDE2KSkgKyBwYWQoZy50b1N0cmluZygxNikpICsgcGFkKGIudG9TdHJpbmcoMTYpKVxufVxuXG5mdW5jdGlvbiBwYWQgKHN0cikge1xuICAgIGlmIChzdHIubGVuZ3RoID09PSAxKSByZXR1cm4gJzAnICsgc3RyXG4gICAgcmV0dXJuIHN0clxufSIsInZhciBNYXBDYWNoZSA9IHJlcXVpcmUoJy4uL2ludGVybmFsL01hcENhY2hlJyk7XG5cbi8qKiBVc2VkIGFzIHRoZSBgVHlwZUVycm9yYCBtZXNzYWdlIGZvciBcIkZ1bmN0aW9uc1wiIG1ldGhvZHMuICovXG52YXIgRlVOQ19FUlJPUl9URVhUID0gJ0V4cGVjdGVkIGEgZnVuY3Rpb24nO1xuXG4vKipcbiAqIENyZWF0ZXMgYSBmdW5jdGlvbiB0aGF0IG1lbW9pemVzIHRoZSByZXN1bHQgb2YgYGZ1bmNgLiBJZiBgcmVzb2x2ZXJgIGlzXG4gKiBwcm92aWRlZCBpdCBkZXRlcm1pbmVzIHRoZSBjYWNoZSBrZXkgZm9yIHN0b3JpbmcgdGhlIHJlc3VsdCBiYXNlZCBvbiB0aGVcbiAqIGFyZ3VtZW50cyBwcm92aWRlZCB0byB0aGUgbWVtb2l6ZWQgZnVuY3Rpb24uIEJ5IGRlZmF1bHQsIHRoZSBmaXJzdCBhcmd1bWVudFxuICogcHJvdmlkZWQgdG8gdGhlIG1lbW9pemVkIGZ1bmN0aW9uIGlzIGNvZXJjZWQgdG8gYSBzdHJpbmcgYW5kIHVzZWQgYXMgdGhlXG4gKiBjYWNoZSBrZXkuIFRoZSBgZnVuY2AgaXMgaW52b2tlZCB3aXRoIHRoZSBgdGhpc2AgYmluZGluZyBvZiB0aGUgbWVtb2l6ZWRcbiAqIGZ1bmN0aW9uLlxuICpcbiAqICoqTm90ZToqKiBUaGUgY2FjaGUgaXMgZXhwb3NlZCBhcyB0aGUgYGNhY2hlYCBwcm9wZXJ0eSBvbiB0aGUgbWVtb2l6ZWRcbiAqIGZ1bmN0aW9uLiBJdHMgY3JlYXRpb24gbWF5IGJlIGN1c3RvbWl6ZWQgYnkgcmVwbGFjaW5nIHRoZSBgXy5tZW1vaXplLkNhY2hlYFxuICogY29uc3RydWN0b3Igd2l0aCBvbmUgd2hvc2UgaW5zdGFuY2VzIGltcGxlbWVudCB0aGUgW2BNYXBgXShodHRwOi8vZWNtYS1pbnRlcm5hdGlvbmFsLm9yZy9lY21hLTI2Mi82LjAvI3NlYy1wcm9wZXJ0aWVzLW9mLXRoZS1tYXAtcHJvdG90eXBlLW9iamVjdClcbiAqIG1ldGhvZCBpbnRlcmZhY2Ugb2YgYGdldGAsIGBoYXNgLCBhbmQgYHNldGAuXG4gKlxuICogQHN0YXRpY1xuICogQG1lbWJlck9mIF9cbiAqIEBjYXRlZ29yeSBGdW5jdGlvblxuICogQHBhcmFtIHtGdW5jdGlvbn0gZnVuYyBUaGUgZnVuY3Rpb24gdG8gaGF2ZSBpdHMgb3V0cHV0IG1lbW9pemVkLlxuICogQHBhcmFtIHtGdW5jdGlvbn0gW3Jlc29sdmVyXSBUaGUgZnVuY3Rpb24gdG8gcmVzb2x2ZSB0aGUgY2FjaGUga2V5LlxuICogQHJldHVybnMge0Z1bmN0aW9ufSBSZXR1cm5zIHRoZSBuZXcgbWVtb2l6aW5nIGZ1bmN0aW9uLlxuICogQGV4YW1wbGVcbiAqXG4gKiB2YXIgdXBwZXJDYXNlID0gXy5tZW1vaXplKGZ1bmN0aW9uKHN0cmluZykge1xuICogICByZXR1cm4gc3RyaW5nLnRvVXBwZXJDYXNlKCk7XG4gKiB9KTtcbiAqXG4gKiB1cHBlckNhc2UoJ2ZyZWQnKTtcbiAqIC8vID0+ICdGUkVEJ1xuICpcbiAqIC8vIG1vZGlmeWluZyB0aGUgcmVzdWx0IGNhY2hlXG4gKiB1cHBlckNhc2UuY2FjaGUuc2V0KCdmcmVkJywgJ0JBUk5FWScpO1xuICogdXBwZXJDYXNlKCdmcmVkJyk7XG4gKiAvLyA9PiAnQkFSTkVZJ1xuICpcbiAqIC8vIHJlcGxhY2luZyBgXy5tZW1vaXplLkNhY2hlYFxuICogdmFyIG9iamVjdCA9IHsgJ3VzZXInOiAnZnJlZCcgfTtcbiAqIHZhciBvdGhlciA9IHsgJ3VzZXInOiAnYmFybmV5JyB9O1xuICogdmFyIGlkZW50aXR5ID0gXy5tZW1vaXplKF8uaWRlbnRpdHkpO1xuICpcbiAqIGlkZW50aXR5KG9iamVjdCk7XG4gKiAvLyA9PiB7ICd1c2VyJzogJ2ZyZWQnIH1cbiAqIGlkZW50aXR5KG90aGVyKTtcbiAqIC8vID0+IHsgJ3VzZXInOiAnZnJlZCcgfVxuICpcbiAqIF8ubWVtb2l6ZS5DYWNoZSA9IFdlYWtNYXA7XG4gKiB2YXIgaWRlbnRpdHkgPSBfLm1lbW9pemUoXy5pZGVudGl0eSk7XG4gKlxuICogaWRlbnRpdHkob2JqZWN0KTtcbiAqIC8vID0+IHsgJ3VzZXInOiAnZnJlZCcgfVxuICogaWRlbnRpdHkob3RoZXIpO1xuICogLy8gPT4geyAndXNlcic6ICdiYXJuZXknIH1cbiAqL1xuZnVuY3Rpb24gbWVtb2l6ZShmdW5jLCByZXNvbHZlcikge1xuICBpZiAodHlwZW9mIGZ1bmMgIT0gJ2Z1bmN0aW9uJyB8fCAocmVzb2x2ZXIgJiYgdHlwZW9mIHJlc29sdmVyICE9ICdmdW5jdGlvbicpKSB7XG4gICAgdGhyb3cgbmV3IFR5cGVFcnJvcihGVU5DX0VSUk9SX1RFWFQpO1xuICB9XG4gIHZhciBtZW1vaXplZCA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBhcmdzID0gYXJndW1lbnRzLFxuICAgICAgICBrZXkgPSByZXNvbHZlciA/IHJlc29sdmVyLmFwcGx5KHRoaXMsIGFyZ3MpIDogYXJnc1swXSxcbiAgICAgICAgY2FjaGUgPSBtZW1vaXplZC5jYWNoZTtcblxuICAgIGlmIChjYWNoZS5oYXMoa2V5KSkge1xuICAgICAgcmV0dXJuIGNhY2hlLmdldChrZXkpO1xuICAgIH1cbiAgICB2YXIgcmVzdWx0ID0gZnVuYy5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICBtZW1vaXplZC5jYWNoZSA9IGNhY2hlLnNldChrZXksIHJlc3VsdCk7XG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcbiAgbWVtb2l6ZWQuY2FjaGUgPSBuZXcgbWVtb2l6ZS5DYWNoZTtcbiAgcmV0dXJuIG1lbW9pemVkO1xufVxuXG4vLyBBc3NpZ24gY2FjaGUgdG8gYF8ubWVtb2l6ZWAuXG5tZW1vaXplLkNhY2hlID0gTWFwQ2FjaGU7XG5cbm1vZHVsZS5leHBvcnRzID0gbWVtb2l6ZTtcbiIsInZhciBtYXBEZWxldGUgPSByZXF1aXJlKCcuL21hcERlbGV0ZScpLFxuICAgIG1hcEdldCA9IHJlcXVpcmUoJy4vbWFwR2V0JyksXG4gICAgbWFwSGFzID0gcmVxdWlyZSgnLi9tYXBIYXMnKSxcbiAgICBtYXBTZXQgPSByZXF1aXJlKCcuL21hcFNldCcpO1xuXG4vKipcbiAqIENyZWF0ZXMgYSBjYWNoZSBvYmplY3QgdG8gc3RvcmUga2V5L3ZhbHVlIHBhaXJzLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAc3RhdGljXG4gKiBAbmFtZSBDYWNoZVxuICogQG1lbWJlck9mIF8ubWVtb2l6ZVxuICovXG5mdW5jdGlvbiBNYXBDYWNoZSgpIHtcbiAgdGhpcy5fX2RhdGFfXyA9IHt9O1xufVxuXG4vLyBBZGQgZnVuY3Rpb25zIHRvIHRoZSBgTWFwYCBjYWNoZS5cbk1hcENhY2hlLnByb3RvdHlwZVsnZGVsZXRlJ10gPSBtYXBEZWxldGU7XG5NYXBDYWNoZS5wcm90b3R5cGUuZ2V0ID0gbWFwR2V0O1xuTWFwQ2FjaGUucHJvdG90eXBlLmhhcyA9IG1hcEhhcztcbk1hcENhY2hlLnByb3RvdHlwZS5zZXQgPSBtYXBTZXQ7XG5cbm1vZHVsZS5leHBvcnRzID0gTWFwQ2FjaGU7XG4iLCIvKipcbiAqIFJlbW92ZXMgYGtleWAgYW5kIGl0cyB2YWx1ZSBmcm9tIHRoZSBjYWNoZS5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQG5hbWUgZGVsZXRlXG4gKiBAbWVtYmVyT2YgXy5tZW1vaXplLkNhY2hlXG4gKiBAcGFyYW0ge3N0cmluZ30ga2V5IFRoZSBrZXkgb2YgdGhlIHZhbHVlIHRvIHJlbW92ZS5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiB0aGUgZW50cnkgd2FzIHJlbW92ZWQgc3VjY2Vzc2Z1bGx5LCBlbHNlIGBmYWxzZWAuXG4gKi9cbmZ1bmN0aW9uIG1hcERlbGV0ZShrZXkpIHtcbiAgcmV0dXJuIHRoaXMuaGFzKGtleSkgJiYgZGVsZXRlIHRoaXMuX19kYXRhX19ba2V5XTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBtYXBEZWxldGU7XG4iLCIvKipcbiAqIEdldHMgdGhlIGNhY2hlZCB2YWx1ZSBmb3IgYGtleWAuXG4gKlxuICogQHByaXZhdGVcbiAqIEBuYW1lIGdldFxuICogQG1lbWJlck9mIF8ubWVtb2l6ZS5DYWNoZVxuICogQHBhcmFtIHtzdHJpbmd9IGtleSBUaGUga2V5IG9mIHRoZSB2YWx1ZSB0byBnZXQuXG4gKiBAcmV0dXJucyB7Kn0gUmV0dXJucyB0aGUgY2FjaGVkIHZhbHVlLlxuICovXG5mdW5jdGlvbiBtYXBHZXQoa2V5KSB7XG4gIHJldHVybiBrZXkgPT0gJ19fcHJvdG9fXycgPyB1bmRlZmluZWQgOiB0aGlzLl9fZGF0YV9fW2tleV07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gbWFwR2V0O1xuIiwiLyoqIFVzZWQgZm9yIG5hdGl2ZSBtZXRob2QgcmVmZXJlbmNlcy4gKi9cbnZhciBvYmplY3RQcm90byA9IE9iamVjdC5wcm90b3R5cGU7XG5cbi8qKiBVc2VkIHRvIGNoZWNrIG9iamVjdHMgZm9yIG93biBwcm9wZXJ0aWVzLiAqL1xudmFyIGhhc093blByb3BlcnR5ID0gb2JqZWN0UHJvdG8uaGFzT3duUHJvcGVydHk7XG5cbi8qKlxuICogQ2hlY2tzIGlmIGEgY2FjaGVkIHZhbHVlIGZvciBga2V5YCBleGlzdHMuXG4gKlxuICogQHByaXZhdGVcbiAqIEBuYW1lIGhhc1xuICogQG1lbWJlck9mIF8ubWVtb2l6ZS5DYWNoZVxuICogQHBhcmFtIHtzdHJpbmd9IGtleSBUaGUga2V5IG9mIHRoZSBlbnRyeSB0byBjaGVjay5cbiAqIEByZXR1cm5zIHtib29sZWFufSBSZXR1cm5zIGB0cnVlYCBpZiBhbiBlbnRyeSBmb3IgYGtleWAgZXhpc3RzLCBlbHNlIGBmYWxzZWAuXG4gKi9cbmZ1bmN0aW9uIG1hcEhhcyhrZXkpIHtcbiAgcmV0dXJuIGtleSAhPSAnX19wcm90b19fJyAmJiBoYXNPd25Qcm9wZXJ0eS5jYWxsKHRoaXMuX19kYXRhX18sIGtleSk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gbWFwSGFzO1xuIiwiLyoqXG4gKiBTZXRzIGB2YWx1ZWAgdG8gYGtleWAgb2YgdGhlIGNhY2hlLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAbmFtZSBzZXRcbiAqIEBtZW1iZXJPZiBfLm1lbW9pemUuQ2FjaGVcbiAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgVGhlIGtleSBvZiB0aGUgdmFsdWUgdG8gY2FjaGUuXG4gKiBAcGFyYW0geyp9IHZhbHVlIFRoZSB2YWx1ZSB0byBjYWNoZS5cbiAqIEByZXR1cm5zIHtPYmplY3R9IFJldHVybnMgdGhlIGNhY2hlIG9iamVjdC5cbiAqL1xuZnVuY3Rpb24gbWFwU2V0KGtleSwgdmFsdWUpIHtcbiAgaWYgKGtleSAhPSAnX19wcm90b19fJykge1xuICAgIHRoaXMuX19kYXRhX19ba2V5XSA9IHZhbHVlO1xuICB9XG4gIHJldHVybiB0aGlzO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IG1hcFNldDtcbiIsIi8vIENvcHlyaWdodCBKb3llbnQsIEluYy4gYW5kIG90aGVyIE5vZGUgY29udHJpYnV0b3JzLlxuLy9cbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhXG4vLyBjb3B5IG9mIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlXG4vLyBcIlNvZnR3YXJlXCIpLCB0byBkZWFsIGluIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmdcbi8vIHdpdGhvdXQgbGltaXRhdGlvbiB0aGUgcmlnaHRzIHRvIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCxcbi8vIGRpc3RyaWJ1dGUsIHN1YmxpY2Vuc2UsIGFuZC9vciBzZWxsIGNvcGllcyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXRcbi8vIHBlcnNvbnMgdG8gd2hvbSB0aGUgU29mdHdhcmUgaXMgZnVybmlzaGVkIHRvIGRvIHNvLCBzdWJqZWN0IHRvIHRoZVxuLy8gZm9sbG93aW5nIGNvbmRpdGlvbnM6XG4vL1xuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWRcbi8vIGluIGFsbCBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy9cbi8vIFRIRSBTT0ZUV0FSRSBJUyBQUk9WSURFRCBcIkFTIElTXCIsIFdJVEhPVVQgV0FSUkFOVFkgT0YgQU5ZIEtJTkQsIEVYUFJFU1Ncbi8vIE9SIElNUExJRUQsIElOQ0xVRElORyBCVVQgTk9UIExJTUlURUQgVE8gVEhFIFdBUlJBTlRJRVMgT0Zcbi8vIE1FUkNIQU5UQUJJTElUWSwgRklUTkVTUyBGT1IgQSBQQVJUSUNVTEFSIFBVUlBPU0UgQU5EIE5PTklORlJJTkdFTUVOVC4gSU5cbi8vIE5PIEVWRU5UIFNIQUxMIFRIRSBBVVRIT1JTIE9SIENPUFlSSUdIVCBIT0xERVJTIEJFIExJQUJMRSBGT1IgQU5ZIENMQUlNLFxuLy8gREFNQUdFUyBPUiBPVEhFUiBMSUFCSUxJVFksIFdIRVRIRVIgSU4gQU4gQUNUSU9OIE9GIENPTlRSQUNULCBUT1JUIE9SXG4vLyBPVEhFUldJU0UsIEFSSVNJTkcgRlJPTSwgT1VUIE9GIE9SIElOIENPTk5FQ1RJT04gV0lUSCBUSEUgU09GVFdBUkUgT1IgVEhFXG4vLyBVU0UgT1IgT1RIRVIgREVBTElOR1MgSU4gVEhFIFNPRlRXQVJFLlxuXG5mdW5jdGlvbiBFdmVudEVtaXR0ZXIoKSB7XG4gIHRoaXMuX2V2ZW50cyA9IHRoaXMuX2V2ZW50cyB8fCB7fTtcbiAgdGhpcy5fbWF4TGlzdGVuZXJzID0gdGhpcy5fbWF4TGlzdGVuZXJzIHx8IHVuZGVmaW5lZDtcbn1cbm1vZHVsZS5leHBvcnRzID0gRXZlbnRFbWl0dGVyO1xuXG4vLyBCYWNrd2FyZHMtY29tcGF0IHdpdGggbm9kZSAwLjEwLnhcbkV2ZW50RW1pdHRlci5FdmVudEVtaXR0ZXIgPSBFdmVudEVtaXR0ZXI7XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX2V2ZW50cyA9IHVuZGVmaW5lZDtcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuX21heExpc3RlbmVycyA9IHVuZGVmaW5lZDtcblxuLy8gQnkgZGVmYXVsdCBFdmVudEVtaXR0ZXJzIHdpbGwgcHJpbnQgYSB3YXJuaW5nIGlmIG1vcmUgdGhhbiAxMCBsaXN0ZW5lcnMgYXJlXG4vLyBhZGRlZCB0byBpdC4gVGhpcyBpcyBhIHVzZWZ1bCBkZWZhdWx0IHdoaWNoIGhlbHBzIGZpbmRpbmcgbWVtb3J5IGxlYWtzLlxuRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnMgPSAxMDtcblxuLy8gT2J2aW91c2x5IG5vdCBhbGwgRW1pdHRlcnMgc2hvdWxkIGJlIGxpbWl0ZWQgdG8gMTAuIFRoaXMgZnVuY3Rpb24gYWxsb3dzXG4vLyB0aGF0IHRvIGJlIGluY3JlYXNlZC4gU2V0IHRvIHplcm8gZm9yIHVubGltaXRlZC5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuc2V0TWF4TGlzdGVuZXJzID0gZnVuY3Rpb24obikge1xuICBpZiAoIWlzTnVtYmVyKG4pIHx8IG4gPCAwIHx8IGlzTmFOKG4pKVxuICAgIHRocm93IFR5cGVFcnJvcignbiBtdXN0IGJlIGEgcG9zaXRpdmUgbnVtYmVyJyk7XG4gIHRoaXMuX21heExpc3RlbmVycyA9IG47XG4gIHJldHVybiB0aGlzO1xufTtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgZXIsIGhhbmRsZXIsIGxlbiwgYXJncywgaSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIElmIHRoZXJlIGlzIG5vICdlcnJvcicgZXZlbnQgbGlzdGVuZXIgdGhlbiB0aHJvdy5cbiAgaWYgKHR5cGUgPT09ICdlcnJvcicpIHtcbiAgICBpZiAoIXRoaXMuX2V2ZW50cy5lcnJvciB8fFxuICAgICAgICAoaXNPYmplY3QodGhpcy5fZXZlbnRzLmVycm9yKSAmJiAhdGhpcy5fZXZlbnRzLmVycm9yLmxlbmd0aCkpIHtcbiAgICAgIGVyID0gYXJndW1lbnRzWzFdO1xuICAgICAgaWYgKGVyIGluc3RhbmNlb2YgRXJyb3IpIHtcbiAgICAgICAgdGhyb3cgZXI7IC8vIFVuaGFuZGxlZCAnZXJyb3InIGV2ZW50XG4gICAgICB9XG4gICAgICB0aHJvdyBUeXBlRXJyb3IoJ1VuY2F1Z2h0LCB1bnNwZWNpZmllZCBcImVycm9yXCIgZXZlbnQuJyk7XG4gICAgfVxuICB9XG5cbiAgaGFuZGxlciA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNVbmRlZmluZWQoaGFuZGxlcikpXG4gICAgcmV0dXJuIGZhbHNlO1xuXG4gIGlmIChpc0Z1bmN0aW9uKGhhbmRsZXIpKSB7XG4gICAgc3dpdGNoIChhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICAvLyBmYXN0IGNhc2VzXG4gICAgICBjYXNlIDE6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDI6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0pO1xuICAgICAgICBicmVhaztcbiAgICAgIGNhc2UgMzpcbiAgICAgICAgaGFuZGxlci5jYWxsKHRoaXMsIGFyZ3VtZW50c1sxXSwgYXJndW1lbnRzWzJdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICAvLyBzbG93ZXJcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIGxlbiA9IGFyZ3VtZW50cy5sZW5ndGg7XG4gICAgICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgICAgICBhcmdzW2kgLSAxXSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgaGFuZGxlci5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gIH0gZWxzZSBpZiAoaXNPYmplY3QoaGFuZGxlcikpIHtcbiAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgIGFyZ3MgPSBuZXcgQXJyYXkobGVuIC0gMSk7XG4gICAgZm9yIChpID0gMTsgaSA8IGxlbjsgaSsrKVxuICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG5cbiAgICBsaXN0ZW5lcnMgPSBoYW5kbGVyLnNsaWNlKCk7XG4gICAgbGVuID0gbGlzdGVuZXJzLmxlbmd0aDtcbiAgICBmb3IgKGkgPSAwOyBpIDwgbGVuOyBpKyspXG4gICAgICBsaXN0ZW5lcnNbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gIH1cblxuICByZXR1cm4gdHJ1ZTtcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuYWRkTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgdGhpcy5fZXZlbnRzID0ge307XG5cbiAgLy8gVG8gYXZvaWQgcmVjdXJzaW9uIGluIHRoZSBjYXNlIHRoYXQgdHlwZSA9PT0gXCJuZXdMaXN0ZW5lclwiISBCZWZvcmVcbiAgLy8gYWRkaW5nIGl0IHRvIHRoZSBsaXN0ZW5lcnMsIGZpcnN0IGVtaXQgXCJuZXdMaXN0ZW5lclwiLlxuICBpZiAodGhpcy5fZXZlbnRzLm5ld0xpc3RlbmVyKVxuICAgIHRoaXMuZW1pdCgnbmV3TGlzdGVuZXInLCB0eXBlLFxuICAgICAgICAgICAgICBpc0Z1bmN0aW9uKGxpc3RlbmVyLmxpc3RlbmVyKSA/XG4gICAgICAgICAgICAgIGxpc3RlbmVyLmxpc3RlbmVyIDogbGlzdGVuZXIpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIC8vIE9wdGltaXplIHRoZSBjYXNlIG9mIG9uZSBsaXN0ZW5lci4gRG9uJ3QgbmVlZCB0aGUgZXh0cmEgYXJyYXkgb2JqZWN0LlxuICAgIHRoaXMuX2V2ZW50c1t0eXBlXSA9IGxpc3RlbmVyO1xuICBlbHNlIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIC8vIElmIHdlJ3ZlIGFscmVhZHkgZ290IGFuIGFycmF5LCBqdXN0IGFwcGVuZC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0ucHVzaChsaXN0ZW5lcik7XG4gIGVsc2VcbiAgICAvLyBBZGRpbmcgdGhlIHNlY29uZCBlbGVtZW50LCBuZWVkIHRvIGNoYW5nZSB0byBhcnJheS5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBbdGhpcy5fZXZlbnRzW3R5cGVdLCBsaXN0ZW5lcl07XG5cbiAgLy8gQ2hlY2sgZm9yIGxpc3RlbmVyIGxlYWtcbiAgaWYgKGlzT2JqZWN0KHRoaXMuX2V2ZW50c1t0eXBlXSkgJiYgIXRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQpIHtcbiAgICB2YXIgbTtcbiAgICBpZiAoIWlzVW5kZWZpbmVkKHRoaXMuX21heExpc3RlbmVycykpIHtcbiAgICAgIG0gPSB0aGlzLl9tYXhMaXN0ZW5lcnM7XG4gICAgfSBlbHNlIHtcbiAgICAgIG0gPSBFdmVudEVtaXR0ZXIuZGVmYXVsdE1heExpc3RlbmVycztcbiAgICB9XG5cbiAgICBpZiAobSAmJiBtID4gMCAmJiB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoID4gbSkge1xuICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLndhcm5lZCA9IHRydWU7XG4gICAgICBjb25zb2xlLmVycm9yKCcobm9kZSkgd2FybmluZzogcG9zc2libGUgRXZlbnRFbWl0dGVyIG1lbW9yeSAnICtcbiAgICAgICAgICAgICAgICAgICAgJ2xlYWsgZGV0ZWN0ZWQuICVkIGxpc3RlbmVycyBhZGRlZC4gJyArXG4gICAgICAgICAgICAgICAgICAgICdVc2UgZW1pdHRlci5zZXRNYXhMaXN0ZW5lcnMoKSB0byBpbmNyZWFzZSBsaW1pdC4nLFxuICAgICAgICAgICAgICAgICAgICB0aGlzLl9ldmVudHNbdHlwZV0ubGVuZ3RoKTtcbiAgICAgIGlmICh0eXBlb2YgY29uc29sZS50cmFjZSA9PT0gJ2Z1bmN0aW9uJykge1xuICAgICAgICAvLyBub3Qgc3VwcG9ydGVkIGluIElFIDEwXG4gICAgICAgIGNvbnNvbGUudHJhY2UoKTtcbiAgICAgIH1cbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUub24gPSBFdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgdmFyIGZpcmVkID0gZmFsc2U7XG5cbiAgZnVuY3Rpb24gZygpIHtcbiAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGcpO1xuXG4gICAgaWYgKCFmaXJlZCkge1xuICAgICAgZmlyZWQgPSB0cnVlO1xuICAgICAgbGlzdGVuZXIuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgICB9XG4gIH1cblxuICBnLmxpc3RlbmVyID0gbGlzdGVuZXI7XG4gIHRoaXMub24odHlwZSwgZyk7XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vLyBlbWl0cyBhICdyZW1vdmVMaXN0ZW5lcicgZXZlbnQgaWZmIHRoZSBsaXN0ZW5lciB3YXMgcmVtb3ZlZFxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9IGZ1bmN0aW9uKHR5cGUsIGxpc3RlbmVyKSB7XG4gIHZhciBsaXN0LCBwb3NpdGlvbiwgbGVuZ3RoLCBpO1xuXG4gIGlmICghaXNGdW5jdGlvbihsaXN0ZW5lcikpXG4gICAgdGhyb3cgVHlwZUVycm9yKCdsaXN0ZW5lciBtdXN0IGJlIGEgZnVuY3Rpb24nKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIGxpc3QgPSB0aGlzLl9ldmVudHNbdHlwZV07XG4gIGxlbmd0aCA9IGxpc3QubGVuZ3RoO1xuICBwb3NpdGlvbiA9IC0xO1xuXG4gIGlmIChsaXN0ID09PSBsaXN0ZW5lciB8fFxuICAgICAgKGlzRnVuY3Rpb24obGlzdC5saXN0ZW5lcikgJiYgbGlzdC5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICBpZiAodGhpcy5fZXZlbnRzLnJlbW92ZUxpc3RlbmVyKVxuICAgICAgdGhpcy5lbWl0KCdyZW1vdmVMaXN0ZW5lcicsIHR5cGUsIGxpc3RlbmVyKTtcblxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGxpc3QpKSB7XG4gICAgZm9yIChpID0gbGVuZ3RoOyBpLS0gPiAwOykge1xuICAgICAgaWYgKGxpc3RbaV0gPT09IGxpc3RlbmVyIHx8XG4gICAgICAgICAgKGxpc3RbaV0ubGlzdGVuZXIgJiYgbGlzdFtpXS5saXN0ZW5lciA9PT0gbGlzdGVuZXIpKSB7XG4gICAgICAgIHBvc2l0aW9uID0gaTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKHBvc2l0aW9uIDwgMClcbiAgICAgIHJldHVybiB0aGlzO1xuXG4gICAgaWYgKGxpc3QubGVuZ3RoID09PSAxKSB7XG4gICAgICBsaXN0Lmxlbmd0aCA9IDA7XG4gICAgICBkZWxldGUgdGhpcy5fZXZlbnRzW3R5cGVdO1xuICAgIH0gZWxzZSB7XG4gICAgICBsaXN0LnNwbGljZShwb3NpdGlvbiwgMSk7XG4gICAgfVxuXG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIga2V5LCBsaXN0ZW5lcnM7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMpXG4gICAgcmV0dXJuIHRoaXM7XG5cbiAgLy8gbm90IGxpc3RlbmluZyBmb3IgcmVtb3ZlTGlzdGVuZXIsIG5vIG5lZWQgdG8gZW1pdFxuICBpZiAoIXRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcikge1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoID09PSAwKVxuICAgICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgZWxzZSBpZiAodGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIC8vIGVtaXQgcmVtb3ZlTGlzdGVuZXIgZm9yIGFsbCBsaXN0ZW5lcnMgb24gYWxsIGV2ZW50c1xuICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMCkge1xuICAgIGZvciAoa2V5IGluIHRoaXMuX2V2ZW50cykge1xuICAgICAgaWYgKGtleSA9PT0gJ3JlbW92ZUxpc3RlbmVyJykgY29udGludWU7XG4gICAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycyhrZXkpO1xuICAgIH1cbiAgICB0aGlzLnJlbW92ZUFsbExpc3RlbmVycygncmVtb3ZlTGlzdGVuZXInKTtcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcbiAgICByZXR1cm4gdGhpcztcbiAgfVxuXG4gIGxpc3RlbmVycyA9IHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICBpZiAoaXNGdW5jdGlvbihsaXN0ZW5lcnMpKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBsaXN0ZW5lcnMpO1xuICB9IGVsc2Uge1xuICAgIC8vIExJRk8gb3JkZXJcbiAgICB3aGlsZSAobGlzdGVuZXJzLmxlbmd0aClcbiAgICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzW2xpc3RlbmVycy5sZW5ndGggLSAxXSk7XG4gIH1cbiAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcblxuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24odHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIXRoaXMuX2V2ZW50cyB8fCAhdGhpcy5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IFtdO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKHRoaXMuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gW3RoaXMuX2V2ZW50c1t0eXBlXV07XG4gIGVsc2VcbiAgICByZXQgPSB0aGlzLl9ldmVudHNbdHlwZV0uc2xpY2UoKTtcbiAgcmV0dXJuIHJldDtcbn07XG5cbkV2ZW50RW1pdHRlci5saXN0ZW5lckNvdW50ID0gZnVuY3Rpb24oZW1pdHRlciwgdHlwZSkge1xuICB2YXIgcmV0O1xuICBpZiAoIWVtaXR0ZXIuX2V2ZW50cyB8fCAhZW1pdHRlci5fZXZlbnRzW3R5cGVdKVxuICAgIHJldCA9IDA7XG4gIGVsc2UgaWYgKGlzRnVuY3Rpb24oZW1pdHRlci5fZXZlbnRzW3R5cGVdKSlcbiAgICByZXQgPSAxO1xuICBlbHNlXG4gICAgcmV0ID0gZW1pdHRlci5fZXZlbnRzW3R5cGVdLmxlbmd0aDtcbiAgcmV0dXJuIHJldDtcbn07XG5cbmZ1bmN0aW9uIGlzRnVuY3Rpb24oYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnZnVuY3Rpb24nO1xufVxuXG5mdW5jdGlvbiBpc051bWJlcihhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdudW1iZXInO1xufVxuXG5mdW5jdGlvbiBpc09iamVjdChhcmcpIHtcbiAgcmV0dXJuIHR5cGVvZiBhcmcgPT09ICdvYmplY3QnICYmIGFyZyAhPT0gbnVsbDtcbn1cblxuZnVuY3Rpb24gaXNVbmRlZmluZWQoYXJnKSB7XG4gIHJldHVybiBhcmcgPT09IHZvaWQgMDtcbn1cbiJdfQ==
