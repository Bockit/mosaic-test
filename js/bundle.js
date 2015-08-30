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
},{"./lib/file-dragger":3,"./lib/mosaic":8,"./mosaic":10}],2:[function(require,module,exports){
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
},{"events":17}],4:[function(require,module,exports){
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
},{"./load-image":6,"./make-canvas":7}],6:[function(require,module,exports){
var memoize = require('lodash/function/memoize')

module.exports = memoize(loadImage)

/**
 * Takes a url and returns a promise that resolves to a loaded img object.
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
},{"lodash/function/memoize":11}],7:[function(require,module,exports){
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
},{}],8:[function(require,module,exports){
module.exports = exports = mosaic
exports.tileTaskFactory = tileTaskFactory
exports.execute = execute

var imageToCanvas = require('./image-to-canvas')
var makeCanvas = require('./make-canvas')
var makeGrid = require('./grid')
var averageColour = require('./average-colour')
var rgb2Hex = require('./rgb-to-hex')
var loadImage = require('./load-image')

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
},{"./average-colour":2,"./grid":4,"./image-to-canvas":5,"./load-image":6,"./make-canvas":7,"./rgb-to-hex":9}],9:[function(require,module,exports){
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
},{}],10:[function(require,module,exports){
// Constants shared between client and server.

var TILE_WIDTH = 16;
var TILE_HEIGHT = 16;

var exports = exports || null;
if (exports) {
  exports.TILE_WIDTH = TILE_WIDTH;
  exports.TILE_HEIGHT = TILE_HEIGHT;
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
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy93YXRjaGlmeS9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwianMvY2xpZW50LmpzIiwianMvbGliL2F2ZXJhZ2UtY29sb3VyLmpzIiwianMvbGliL2ZpbGUtZHJhZ2dlci5qcyIsImpzL2xpYi9ncmlkLmpzIiwianMvbGliL2ltYWdlLXRvLWNhbnZhcy5qcyIsImpzL2xpYi9sb2FkLWltYWdlLmpzIiwianMvbGliL21ha2UtY2FudmFzLmpzIiwianMvbGliL21vc2FpYy5qcyIsImpzL2xpYi9yZ2ItdG8taGV4LmpzIiwianMvbW9zYWljLmpzIiwibm9kZV9tb2R1bGVzL2xvZGFzaC9mdW5jdGlvbi9tZW1vaXplLmpzIiwibm9kZV9tb2R1bGVzL2xvZGFzaC9pbnRlcm5hbC9NYXBDYWNoZS5qcyIsIm5vZGVfbW9kdWxlcy9sb2Rhc2gvaW50ZXJuYWwvbWFwRGVsZXRlLmpzIiwibm9kZV9tb2R1bGVzL2xvZGFzaC9pbnRlcm5hbC9tYXBHZXQuanMiLCJub2RlX21vZHVsZXMvbG9kYXNoL2ludGVybmFsL21hcEhhcy5qcyIsIm5vZGVfbW9kdWxlcy9sb2Rhc2gvaW50ZXJuYWwvbWFwU2V0LmpzIiwibm9kZV9tb2R1bGVzL3dhdGNoaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9ldmVudHMvZXZlbnRzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNmQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUpBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDWEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hGQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNkQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDcEJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsInZhciBzZXR0aW5ncyA9IHJlcXVpcmUoJy4vbW9zYWljJylcbnZhciBGaWxlRHJhZ2dlciA9IHJlcXVpcmUoJy4vbGliL2ZpbGUtZHJhZ2dlcicpXG52YXIgbW9zYWljID0gcmVxdWlyZSgnLi9saWIvbW9zYWljJylcblxuc2V0dGluZ3MuQUxMT1dFRF9UWVBFUyA9IFsgJ2ltYWdlL3BuZycsICdpbWFnZS9qcGVnJyBdO1xuc2V0dGluZ3MuQkFTRV9VUkwgPSAnLydcblxudmFyIGRyYWdnZXIgPSBGaWxlRHJhZ2dlcigpXG5kcmFnZ2VyLm9uKCdmaWxlJywgZnVuY3Rpb24gKGZpbGUpIHtcbiAgICBpZiAoc2V0dGluZ3MuQUxMT1dFRF9UWVBFUy5pbmRleE9mKGZpbGUudHlwZSkgPT09IC0xKSByZXR1cm5cbiAgICBtb3NhaWMoZG9jdW1lbnQucXVlcnlTZWxlY3RvcignLm91dHB1dCcpLCBmaWxlLCBzZXR0aW5ncylcbn0pIiwibW9kdWxlLmV4cG9ydHMgPSBhdmVyYWdlQ29sb3VyXG5cbi8qKlxuICogR2l2ZW4gYW4gYXJyYXkgb2YgY2FudmFzIHBpeGVsIGRhdGEsIGdpdmUgdXMgdGhlIGF2ZXJhZ2UgY29sb3VyIGFzIGFuIFtyLCBnLCBiXVxuICovXG5mdW5jdGlvbiBhdmVyYWdlQ29sb3VyIChwaXhlbHMpIHtcbiAgICB2YXIgcmVkID0gMFxuICAgIHZhciBncmVlbiA9IDBcbiAgICB2YXIgYmx1ZSA9IDBcblxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGl4ZWxzLmxlbmd0aDsgaSArPSA0KSB7XG4gICAgICAgIHJlZCArPSBwaXhlbHNbaV1cbiAgICAgICAgZ3JlZW4gKz0gcGl4ZWxzW2kgKyAxXVxuICAgICAgICBibHVlICs9IHBpeGVsc1tpICsgMl1cbiAgICB9XG5cbiAgICByZXR1cm4gW1xuICAgICAgICBNYXRoLnJvdW5kKHJlZCAvIChpIC8gNCkpXG4gICAgICAsIE1hdGgucm91bmQoZ3JlZW4gLyAoaSAvIDQpKVxuICAgICAgLCBNYXRoLnJvdW5kKGJsdWUgLyAoaSAvIDQpKVxuICAgIF1cbn0iLCJtb2R1bGUuZXhwb3J0cyA9IEZpbGVEcmFnZ2VyXG5cbnZhciBFdmVudEVtaXR0ZXIgPSByZXF1aXJlKCdldmVudHMnKS5FdmVudEVtaXR0ZXJcblxuLyoqXG4gKiBSZXR1cm5zIGFuZCBldmVudCBlbWl0dGVyIHRoYXQgZW1pdHMgYCdmaWxlJ2AgZXZlbnRzIHdoZW5ldmVyIGZpbGVzIGFyZVxuICogZHJvcHBlZCBpbnRvIHRoZSB3aW5kb3cuXG4gKlxuICogRm9yIHRoZSBwdXJwb3NlcyBvZiB0aGlzIGNvZGViYXNlIGl0IG9ubHkgZW1pdHMgdGhlIGZpbGUgYXQgcG9zaXRpb24gWzBdXG4gKiBzbyBtdXRsaSBmaWxlIGRyb3BzIHdvbid0IGVtaXQgZm9yIGVhY2ggZmlsZSwgYnV0IHRoYXQgc2hvdWxkIGlkZWFsbHkgYmVcbiAqIHJlbW92ZWQuXG4gKlxuICogYGVtaXR0ZXIuY2xlYW51cGAgd2lsbCByZWxlYXNlIGFsbCBldmVudCBoYW5kbGVycy5cbiAqL1xuZnVuY3Rpb24gRmlsZURyYWdnZXIgKCkge1xuICAgIHZhciBlbWl0dGVyID0gbmV3IEV2ZW50RW1pdHRlclxuXG4gICAgLy8gZHJhZ292ZXIgYW5kIGRyYWdlbnRlciBtYWtlIHRoZSBlbGVtZW50IGEgZHJhZyB0YXJnZXQsIHdpdGhvdXQgd2hpY2hcbiAgICAvLyBkcm9wIHdvbid0IGZpcmUgYW5kIHRoZSBwYWdlIHdpbGwgcmVkaXJlY3QgdG8gdGhlIGRyb3BwZWQgZmlsZVxuICAgIHdpbmRvdy5hZGRFdmVudExpc3RlbmVyKCdkcmFnb3ZlcicsIGNhbmNlbCwgZmFsc2UpXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2RyYWdlbnRlcicsIGNhbmNlbCwgZmFsc2UpXG4gICAgd2luZG93LmFkZEV2ZW50TGlzdGVuZXIoJ2Ryb3AnLCBkcm9wLCBmYWxzZSlcblxuICAgIGVtaXR0ZXIuY2xlYW51cCA9IGNsZWFudXBcblxuICAgIHJldHVybiBlbWl0dGVyXG5cbiAgICBmdW5jdGlvbiBkcm9wIChlKSB7XG4gICAgICAgIGNhbmNlbChlKVxuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZS5kYXRhVHJhbnNmZXIuZmlsZXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIGVtaXR0ZXIuZW1pdCgnZmlsZScsIGUuZGF0YVRyYW5zZmVyLmZpbGVzW2ldKVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgLyoqXG4gICAgICogUHJldmVudCB0aGUgYnJvd3NlciBmcm9tIHJlZGlyZWN0aW5nIHRvIHRoZSBmaWxlIGRyb3BwZWQgaW4uXG4gICAgICovXG4gICAgZnVuY3Rpb24gY2FuY2VsIChlKSB7XG4gICAgICAgIGUucHJldmVudERlZmF1bHQoKVxuICAgICAgICBlLnN0b3BQcm9wYWdhdGlvbigpXG4gICAgfVxuXG4gICAgZnVuY3Rpb24gY2xlYW51cCAoKSB7XG4gICAgICAgIHdpbmRvdy5yZW1vdmVFdmVudExpc3RlbmVyKCdkcmFnb3ZlcicsIGNhbmNlbClcbiAgICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2RyYWdlbnRlcicsIGNhbmNlbClcbiAgICAgICAgd2luZG93LnJlbW92ZUV2ZW50TGlzdGVuZXIoJ2Ryb3AnLCBkcm9wKVxuICAgIH1cbn0iLCJtb2R1bGUuZXhwb3J0cyA9IGdyaWRcblxuLyoqXG4gKiBHaXZlbiBhIGRpbWVuc2lvbnMgb2JqZWN0IChudW1iZXIgb2YgYHJvd3NgIGFuZCBudW1iZXIgb2YgYGNvbHVtbnNgKSBjcmVhdGVcbiAqIGFuIGFycmF5IG9mIGNlbGwgb2JqZWN0cywgKGB4YCBhbmQgYHlgIHByb3BlcnRpZXNgKSAxIGZvciBlYWNoIGNlbGxcbiAqIGluIHRoZSBncmlkLlxuICovXG5mdW5jdGlvbiBncmlkIChkaW1lbnNpb25zKSB7XG4gICAgdmFyIHJldCA9IFtdXG5cbiAgICBmb3IgKHZhciB5ID0gMDsgeSA8IGRpbWVuc2lvbnMucm93czsgeSsrKSB7XG4gICAgICAgIGZvciAodmFyIHggPSAwOyB4IDwgZGltZW5zaW9ucy5jb2x1bW5zOyB4KyspIHtcbiAgICAgICAgICAgIHJldC5wdXNoKHsgeDogeCwgeTogeSB9KVxuICAgICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHJldFxufSIsIm1vZHVsZS5leHBvcnRzID0gaW1hZ2VUb0NhbnZhc1xuXG52YXIgbWFrZUNhbnZhcyA9IHJlcXVpcmUoJy4vbWFrZS1jYW52YXMnKVxudmFyIGxvYWRJbWFnZSA9IHJlcXVpcmUoJy4vbG9hZC1pbWFnZScpXG5cbi8qKlxuICogVGFrZXMgYSBicm93c2VyIGZpbGUgb2JqZWN0IGFuZCBhIGNhbGxiYWNrLiBDYWxscyBiYWNrIHdpdGggYW4gZXJyb3IgaWYgaXRcbiAqIG9jY3VycmVkIChhdCB0aGUgbW9tZW50IHdlJ3JlIG5vdCBsb29raW5nIGZvciBvbmUgdG8gc2VuZCkgYW5kIGEgZGV0YWNoZWRcbiAqIGNhbnZhcyBlbGVtZW50IG1hdGNoaW5nIHRoZSBpbWFnZSdzIGRpbWVuc2lvbnMgd2l0aCB0aGUgaW1hZ2UgYmxpdHRlZCB0byBpdC5cbiAqL1xuZnVuY3Rpb24gaW1hZ2VUb0NhbnZhcyAoZmlsZSwgY2FsbGJhY2spIHtcbiAgICB2YXIgdXJsID0gVVJMLmNyZWF0ZU9iamVjdFVSTChmaWxlKVxuICAgIGxvYWRJbWFnZSh1cmwpLnRoZW4oZnVuY3Rpb24gKGltZykge1xuICAgICAgICB2YXIgY2FudmFzID0gbWFrZUNhbnZhcyhpbWcud2lkdGgsIGltZy5oZWlnaHQpXG4gICAgICAgIHZhciBjdHggPSBjYW52YXMuZ2V0Q29udGV4dCgnMmQnKVxuICAgICAgICBjdHguZHJhd0ltYWdlKGltZywgMCwgMClcbiAgICAgICAgLy8gTmVlZCB0byBkbyB0aGlzIGJlY2F1c2Ugb2YgdGhlIHdheSBicm93c2VyJ3MgZ2MgdGhlc2UgT2JqZWN0VXJsXG4gICAgICAgIC8vIHZhcmlhYmxlcy4gU2VlOlxuICAgICAgICAvLyBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9BUEkvVVJML2NyZWF0ZU9iamVjdFVSTFxuICAgICAgICBVUkwucmV2b2tlT2JqZWN0VVJMKHVybClcbiAgICAgICAgY2FsbGJhY2sobnVsbCwgY2FudmFzKVxuICAgIH0pXG59IiwidmFyIG1lbW9pemUgPSByZXF1aXJlKCdsb2Rhc2gvZnVuY3Rpb24vbWVtb2l6ZScpXG5cbm1vZHVsZS5leHBvcnRzID0gbWVtb2l6ZShsb2FkSW1hZ2UpXG5cbi8qKlxuICogVGFrZXMgYSB1cmwgYW5kIHJldHVybnMgYSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgdG8gYSBsb2FkZWQgaW1nIG9iamVjdC5cbiAqL1xuZnVuY3Rpb24gbG9hZEltYWdlKHVybCkge1xuICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XG4gICAgICAgIHZhciBpbWcgPSBuZXcgSW1hZ2UoKVxuICAgICAgICBpbWcub25sb2FkID0gZnVuY3Rpb24gKCkge1xuICAgICAgICAgICAgcmVzb2x2ZShpbWcpXG4gICAgICAgIH1cbiAgICAgICAgaW1nLnNyYyA9IHVybFxuICAgIH0pXG59IiwibW9kdWxlLmV4cG9ydHMgPSBtYWtlQ2FudmFzXG5cbi8qKlxuICogSGVscGVyIGZ1bmN0aW9uIGZvciBjcmVhdGluZyBhIGNhbnZhcyB3aXRoIGEgZ2l2ZW4gd2lkdGggYW5kIGhlaWdodCBhcyB3ZVxuICogbmVlZCBpdCBpbiBhIGZldyBwbGFjZXMuXG4gKi9cbmZ1bmN0aW9uIG1ha2VDYW52YXMgKHdpZHRoLCBoZWlnaHQpIHtcbiAgICB2YXIgY2FudmFzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudCgnY2FudmFzJylcbiAgICBjYW52YXMud2lkdGggPSB3aWR0aFxuICAgIGNhbnZhcy5oZWlnaHQgPSBoZWlnaHRcbiAgICByZXR1cm4gY2FudmFzXG59IiwibW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gbW9zYWljXG5leHBvcnRzLnRpbGVUYXNrRmFjdG9yeSA9IHRpbGVUYXNrRmFjdG9yeVxuZXhwb3J0cy5leGVjdXRlID0gZXhlY3V0ZVxuXG52YXIgaW1hZ2VUb0NhbnZhcyA9IHJlcXVpcmUoJy4vaW1hZ2UtdG8tY2FudmFzJylcbnZhciBtYWtlQ2FudmFzID0gcmVxdWlyZSgnLi9tYWtlLWNhbnZhcycpXG52YXIgbWFrZUdyaWQgPSByZXF1aXJlKCcuL2dyaWQnKVxudmFyIGF2ZXJhZ2VDb2xvdXIgPSByZXF1aXJlKCcuL2F2ZXJhZ2UtY29sb3VyJylcbnZhciByZ2IySGV4ID0gcmVxdWlyZSgnLi9yZ2ItdG8taGV4JylcbnZhciBsb2FkSW1hZ2UgPSByZXF1aXJlKCcuL2xvYWQtaW1hZ2UnKVxuXG4vKipcbiAqIFJlbmRlcnMgYW4gaW1hZ2UgdG8gYSBjYW52YXMgaW4gYSB0YXJnZXQgZWxlbWVudCBhcyBhIHNlcmllcyBvZiB0aWxlc1xuICogcmVwcmVzZW50aW5nIGF2ZXJhZ2UgY29sb3VycyBvZiB0aGUgYXJlYXMgdGhleSBjb3Zlci5cbiAqXG4gKiBUYWtlcyBhIHRhcmdldCBlbGVtZW50IHRvIHB1dCB0aGUgY2FudmFzIGludG8sIGEgZmlsZSBvYmplY3QgcmVwcmVzZW50aW5nXG4gKiB0aGUgZmlsZSBmcm9tIGEgZmlsZSBpbnB1dCBvciBkcmFnIGFuZCBkcm9wIGV2ZW50IGFuZCBhIHNldHRpbmdzIG9iamVjdFxuICogY29udGFpbmluZyB0aWxlIHdpZHRoLCB0aWxlIGhlaWdodCBhbmQgYSBiYXNlIHVybCBmb3Igd2hlcmUgdG8gbG9hZCB0aGUgdGlsZXNcbiAqIGZyb20uXG4gKlxuICogQHBhcmFtICB7SFRNTEVsZW1lbnR9IHRhcmdldCAgIFdoZXJlIGluIHRoZSBET00gdG8gYXBwZW5kIHRoZSBtb3NhaWMgdG9cbiAqIEBwYXJhbSAge0ZpbGV9IGZpbGUgICAgICAgICAgICBGaWxlIG9iamVjdCByZXByZXNlbnRpbmcgdGhlIGltYWdlIHRvIHJlbmRlclxuICogQHBhcmFtICB7T2JqZWN0fSBzZXR0aW5ncyAgICAgIFNldHRpbmdzIGZvciB0aGUgbW9zYWljIGNhbGwuXG4gKiAgICAgICAgICAgICAgICAgIHNldHRpbmdzLlRJTEVfV0lEVEggVGhlIHdpZHRoIG9mIHRpbGVzIGluIHRoaXMgbW9zYWljXG4gKiAgICAgICAgICAgICAgICAgIHNldHRpbmdzLlRJTEVfSEVJR0hUIHRoZSBoZWlnaHQgb2YgdGlsZXMgaW4gdGhpcyBtb3NhaWNcbiAqICAgICAgICAgICAgICAgICAgc2V0dGluZ3MuQkFTRV9VUkwgVGhlIGJhc2UgdXJsIGZvciB0aWxlIGltYWdlIHJlcXVlc3RzXG4gKi9cbmZ1bmN0aW9uIG1vc2FpYyAodGFyZ2V0LCBmaWxlLCBzZXR0aW5ncykge1xuICAgIC8vIERyYXcgdGhlIGltYWdlIGludG8gYW4gb2Zmc2NyZWVuIGNhbnZhc1xuICAgIGltYWdlVG9DYW52YXMoZmlsZSwgZnVuY3Rpb24gKGVyciwgc291cmNlKSB7XG4gICAgICAgIC8vIE5lZWQgdGhpcyBpbmZvIGluIGEgY291cGxlIG9mIHBsYWNlc1xuICAgICAgICB2YXIgZGltZW5zaW9ucyA9IHtcbiAgICAgICAgICAgIHJvd3M6IE1hdGguY2VpbChzb3VyY2UuaGVpZ2h0IC8gc2V0dGluZ3MuVElMRV9IRUlHSFQpXG4gICAgICAgICAgLCBjb2x1bW5zOiBNYXRoLmNlaWwoc291cmNlLndpZHRoIC8gc2V0dGluZ3MuVElMRV9XSURUSClcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEJyZWFrIGl0IGludG8gYSBncmlkXG4gICAgICAgIHZhciBncmlkID0gbWFrZUdyaWQoZGltZW5zaW9ucylcblxuICAgICAgICAvLyBNYXAgZ3JpZCB0byBzZXJ2ZXIgZmV0Y2ggdGFza3NcbiAgICAgICAgdmFyIHRhc2tTZXR0aW5ncyA9IHtcbiAgICAgICAgICAgIHRpbGVXaWR0aDogc2V0dGluZ3MuVElMRV9XSURUSFxuICAgICAgICAgICwgdGlsZUhlaWdodDogc2V0dGluZ3MuVElMRV9IRUlHSFRcbiAgICAgICAgICAsIHdpZHRoOiBzb3VyY2Uud2lkdGhcbiAgICAgICAgICAsIGhlaWdodDogc291cmNlLmhlaWdodFxuICAgICAgICB9XG4gICAgICAgIHZhciB0YXNrcyA9IGdyaWQubWFwKHRpbGVUYXNrRmFjdG9yeShcbiAgICAgICAgICAgIHNvdXJjZS5nZXRDb250ZXh0KCcyZCcpXG4gICAgICAgICAgLCB0YXNrU2V0dGluZ3NcbiAgICAgICAgKSlcblxuICAgICAgICAvLyBBZGQgdGhlIGNhbnZhcyB0byB0aGUgZG9tIHNvIHVzZXJzIGNhbiBzZWUgcm93LWJ5LXJvd1xuICAgICAgICB2YXIgZGVzdCA9IG1ha2VDYW52YXMoc291cmNlLndpZHRoLCBzb3VyY2UuaGVpZ2h0KVxuICAgICAgICB2YXIgY3R4ID0gZGVzdC5nZXRDb250ZXh0KCcyZCcpXG4gICAgICAgIHZhciB3cmFwcGVyID0gbWFrZVdyYXBwZXIoc291cmNlLndpZHRoLCBzb3VyY2UuaGVpZ2h0KVxuICAgICAgICB3cmFwcGVyLmFwcGVuZENoaWxkKGRlc3QpXG4gICAgICAgIHRhcmdldC5hcHBlbmRDaGlsZCh3cmFwcGVyKVxuXG4gICAgICAgIHZhciBleGVjdXRlU2V0dGluZ3MgPSB7XG4gICAgICAgICAgICByb3dzOiBkaW1lbnNpb25zLnJvd3NcbiAgICAgICAgICAsIGNvbHVtbnM6IGRpbWVuc2lvbnMuY29sdW1uc1xuICAgICAgICAgICwgdGlsZVdpZHRoOiBzZXR0aW5ncy5USUxFX1dJRFRIXG4gICAgICAgICAgLCB0aWxlSGVpZ2h0OiBzZXR0aW5ncy5USUxFX0hFSUdIVFxuICAgICAgICAgICwgYmFzZVVybDogc2V0dGluZ3MuQkFTRV9VUkxcbiAgICAgICAgfVxuICAgICAgICBleGVjdXRlKHRhc2tzLCBleGVjdXRlU2V0dGluZ3MsIGZ1bmN0aW9uIChyb3csIGkpIHtcbiAgICAgICAgICAgIGN0eC5kcmF3SW1hZ2Uocm93LCAwLCBpICogc2V0dGluZ3MuVElMRV9IRUlHSFQpXG4gICAgICAgIH0pXG4gICAgfSlcbn1cblxuLy8gQ2xvc3VyZSBzbyB0aGUgdGlsZVRhc2sgZnVuY3Rpb24gaGFzIHdoYXQgaXQgbmVlZHNcbmZ1bmN0aW9uIHRpbGVUYXNrRmFjdG9yeSAoY3R4LCBzZXR0aW5ncykge1xuICAgIC8vIFRha2UgYSBjZWxsIGRlZmluaXRpb24gKGFuIG9iamVjdCB3aXRoIHggYW5kIHkgcHJvcGVydGllcykgYW5kIHJldHVybiBhXG4gICAgLy8gdGFzayBvYmplY3QuIEEgdGFzayBvYmplY3QgaGFzIHgsIHkgYW5kIGhleCB2YWx1ZSBwcm9wZXJ0aWVzLlxuICAgIHJldHVybiBmdW5jdGlvbiAoY2VsbCkge1xuICAgICAgICB2YXIgcGl4ZWxzID0gY3R4LmdldEltYWdlRGF0YShcbiAgICAgICAgICAgIGNlbGwueCAqIHNldHRpbmdzLnRpbGVXaWR0aFxuICAgICAgICAgICwgY2VsbC55ICogc2V0dGluZ3MudGlsZUhlaWdodFxuICAgICAgICAgIC8vIEJpbmQgdGhlc2UgdG8gdGhlIGRpbWVuc2lvbnMgb2YgdGhlIGltYWdlLCB3aGVuIGl0IGdvZXMgb3ZlclxuICAgICAgICAgIC8vIGl0J3MgYWZmZWN0aW5nIHRoZSBhdmVyYWdlIHZhbHVlcyB0byBtYWtlIHRoZW0gZGFya2VyLiBJIHN1c3BlY3RcbiAgICAgICAgICAvLyBpdCBnaXZlcyAwIHZhbHVlcyAoYmxhY2spIGZvciBwaXhlbHMgb3V0c2lkZSB0aGUgYm91bmRzLiBJJ21cbiAgICAgICAgICAvLyBwcmV0dHkgc3VyZSBJIHJlbWVtYmVyIGZpcmVmb3ggd291bGQgZXJyb3Igb3V0IGFueXdheS5cbiAgICAgICAgICAsIE1hdGgubWluKHNldHRpbmdzLnRpbGVXaWR0aCwgc2V0dGluZ3Mud2lkdGggLSBjZWxsLnggKiBzZXR0aW5ncy50aWxlV2lkdGgpXG4gICAgICAgICAgLCBNYXRoLm1pbihzZXR0aW5ncy50aWxlSGVpZ2h0LCBzZXR0aW5ncy5oZWlnaHQgLSBjZWxsLnkgKiBzZXR0aW5ncy50aWxlSGVpZ2h0KVxuICAgICAgICApLmRhdGFcblxuICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgeDogY2VsbC54XG4gICAgICAgICAgLCB5OiBjZWxsLnlcbiAgICAgICAgICAsIGhleDogcmdiMkhleC5hcHBseShudWxsLCBhdmVyYWdlQ29sb3VyKHBpeGVscykpXG4gICAgICAgIH1cbiAgICB9XG59XG5cbi8vIEV4ZWN1dGUgdGhlIHRhc2tzIGluIGEgd2F5IHdlIGNhbiBjYWxsIG4gdGltZXMsIHdoZXJlIG4gaXMgdGhlIG51bWJlciBvZiByb3dzXG4vLyBhbmQgdGhlIG9yZGVyIG9mIHRoZSBjYWxscyBtYXRjaGVzIHRoZSBvcmRlciBvZiB0aGUgcm93cy5cbmZ1bmN0aW9uIGV4ZWN1dGUgKHRhc2tzLCBzZXR0aW5ncywgcm93Q2FsbGJhY2spIHtcbiAgICAvLyBSZWR1Y2UgdG8gcm93c1xuICAgIHZhciByb3dzID0gdGFza3MucmVkdWNlKGZ1bmN0aW9uIChwcmV2aW91cywgY3VycmVudCkge1xuICAgICAgICBwcmV2aW91c1tjdXJyZW50LnldID0gcHJldmlvdXNbY3VycmVudC55XSB8fCBbXVxuICAgICAgICBwcmV2aW91c1tjdXJyZW50LnldW2N1cnJlbnQueF0gPSBjdXJyZW50XG4gICAgICAgIHJldHVybiBwcmV2aW91c1xuICAgIH0sIFtdKVxuXG4gICAgLy8gRHJhdyBjZWxscyBpbiBlYWNoIHJvdyB0byBlYWNoIGNvbnRleHRcbiAgICB2YXIgcXVldWVTdGFydCA9IDBcbiAgICB2YXIgcXVldWUgPSByb3dzLm1hcChmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBmYWxzZVxuICAgIH0pXG4gICAgcm93cy5mb3JFYWNoKGZ1bmN0aW9uIChjZWxscywgaSkge1xuICAgICAgICB2YXIgcm93Q2FudmFzID0gbWFrZUNhbnZhcyhcbiAgICAgICAgICAgIHNldHRpbmdzLmNvbHVtbnMgKiBzZXR0aW5ncy50aWxlV2lkdGhcbiAgICAgICAgICAsIHNldHRpbmdzLnRpbGVIZWlnaHRcbiAgICAgICAgKVxuICAgICAgICB2YXIgcm93Q3R4ID0gcm93Q2FudmFzLmdldENvbnRleHQoJzJkJylcblxuICAgICAgICAvLyBBcyB0aGV5IGFyZSBmZXRjaGVkLCByZW5kZXIgdG8gYW4gb2Zmc2NyZWVuIGNvbnRleHQgc28gd2UgY2FuIHJlbmRlclxuICAgICAgICAvLyB0aGUgd2hvbGUgcm93IGF0IG9uY2UgdG8gdGhlIHVzZXJcbiAgICAgICAgLy9cbiAgICAgICAgLy8gVXNlIGEgcHJvbWlzZSBoZXJlIGJlY2F1c2UgSSBkb24ndCB3YW50IHRvIGluY2x1ZGUgdGhlIGFzeW5jIHBhY2thZ2VcbiAgICAgICAgLy8ganVzdCBmb3IgdGhpcyBiaXQuXG4gICAgICAgIFByb21pc2UuYWxsKGNlbGxzLm1hcChmdW5jdGlvbiAoY2VsbCkge1xuICAgICAgICAgICAgdmFyIHggPSBjZWxsLnggKiBzZXR0aW5ncy50aWxlV2lkdGhcbiAgICAgICAgICAgIHZhciB1cmwgPSBzZXR0aW5ncy5iYXNlVXJsICsgJ2NvbG9yLycgKyBjZWxsLmhleFxuXG4gICAgICAgICAgICByZXR1cm4gbG9hZEltYWdlKHVybCkudGhlbihmdW5jdGlvbiAoaW1nKSB7XG4gICAgICAgICAgICAgICAgcm93Q3R4LmRyYXdJbWFnZShpbWcsIHgsIDApXG4gICAgICAgICAgICB9KVxuICAgICAgICB9KSkudGhlbihmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgICAvLyBRdWV1ZSBmb3IgY2FsbGJhY2sgYmVjYXVzZSB3ZSBoYXZlIHRvIHJlbmRlciByb3dzIGluIG9yZGVyXG4gICAgICAgICAgICAvLyBhbmQgd2UgY2FuJ3QgZ3VhcmFudGVlIHRoYXQgcmlnaHQgbm93IHdpdGggdGhpcyBmZXRjaGluZyBtZXRob2RcbiAgICAgICAgICAgIHF1ZXVlW2ldID0gcm93Q2FudmFzXG5cbiAgICAgICAgICAgIGZvciAodmFyIGogPSBxdWV1ZVN0YXJ0OyBqIDwgcXVldWUubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICBpZiAoIXF1ZXVlW2pdKSBicmVhaztcbiAgICAgICAgICAgICAgICByb3dDYWxsYmFjayhxdWV1ZVtqXSwgailcbiAgICAgICAgICAgICAgICBxdWV1ZVN0YXJ0ID0gaiArIDFcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSlcbiAgICB9KVxufVxuXG4vKipcbiAqIENyZWF0ZSBhIGRpdiB3aXRoIHRoZSB3cmFwcGVyIHN0eWxlLCBvZiB0aGUgaGVpZ2h0IGFuZCB3aWR0aCBvZiB0aGUgdG8tYmVcbiAqIGNhbnZhcyB0byBiZXR0ZXIgc2hvdyB0aGUgdXNlciB3aGF0J3MgaGFwcGVuaW5nLlxuICpcbiAqIERvbid0IHdhbnQgRE9NIG9wZXJhdGlvbnMgY2x1dHRlcmluZyB1cCBteSBsb2dpYyBzbyBjaHVja2luZyB0aGlzIGluIGEgaGVscGVyXG4gKi9cbmZ1bmN0aW9uIG1ha2VXcmFwcGVyICh3aWR0aCwgaGVpZ2h0KSB7XG4gICAgdmFyIHJldCA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoJ2RpdicpXG4gICAgcmV0LmNsYXNzTGlzdC5hZGQoJ21vc2FpYy13cmFwcGVyJylcbiAgICAvLyArcGFkZGluZyArYm9yZGVyIGJlY2F1c2UgYm9yZGVyLWJveFxuICAgIHJldC5zdHlsZS53aWR0aCA9ICh3aWR0aCArIDQyKSArICdweCdcbiAgICByZXQuc3R5bGUuaGVpZ2h0ID0gKGhlaWdodCArIDQyKSArICdweCdcbiAgICByZXR1cm4gcmV0XG59IiwibW9kdWxlLmV4cG9ydHMgPSBleHBvcnRzID0gcmdiMkhleFxuZXhwb3J0cy5wYWQgPSBwYWRcblxuLyoqXG4gKiBDb252ZXJ0IGByYCwgYGdgIGFuZCBgYmAgdmFsdWVzIHRvIGEgc2luZ2xlIGhleCBzdHJpbmcuIEUuZy46XG4gKlxuICogICAgIHJnYjJIZXgoMCwgMCwgMCkgLy8gMDAwMDAwXG4gKiAgICAgcmdiMkhleCgyNTUsIDI1NSwgMjU1KSAvLyBmZmZmZmZcbiAqL1xuZnVuY3Rpb24gcmdiMkhleCAociwgZywgYikge1xuICAgIC8vIFBhZCBiZWNhdXNlIDAudG9TdHJpbmcoMTYpIGlzIDAgbm90IDAwIGFuZCB0aGUgc2VydmVyIGV4cGVjdHMgNiBjaGFyYWN0ZXJcbiAgICAvLyBoZXggc3RyaW5ncy5cbiAgICByZXR1cm4gcGFkKHIudG9TdHJpbmcoMTYpKSArIHBhZChnLnRvU3RyaW5nKDE2KSkgKyBwYWQoYi50b1N0cmluZygxNikpXG59XG5cbmZ1bmN0aW9uIHBhZCAoc3RyKSB7XG4gICAgaWYgKHN0ci5sZW5ndGggPT09IDEpIHJldHVybiAnMCcgKyBzdHJcbiAgICByZXR1cm4gc3RyXG59IiwiLy8gQ29uc3RhbnRzIHNoYXJlZCBiZXR3ZWVuIGNsaWVudCBhbmQgc2VydmVyLlxuXG52YXIgVElMRV9XSURUSCA9IDE2O1xudmFyIFRJTEVfSEVJR0hUID0gMTY7XG5cbnZhciBleHBvcnRzID0gZXhwb3J0cyB8fCBudWxsO1xuaWYgKGV4cG9ydHMpIHtcbiAgZXhwb3J0cy5USUxFX1dJRFRIID0gVElMRV9XSURUSDtcbiAgZXhwb3J0cy5USUxFX0hFSUdIVCA9IFRJTEVfSEVJR0hUO1xufVxuXG4iLCJ2YXIgTWFwQ2FjaGUgPSByZXF1aXJlKCcuLi9pbnRlcm5hbC9NYXBDYWNoZScpO1xuXG4vKiogVXNlZCBhcyB0aGUgYFR5cGVFcnJvcmAgbWVzc2FnZSBmb3IgXCJGdW5jdGlvbnNcIiBtZXRob2RzLiAqL1xudmFyIEZVTkNfRVJST1JfVEVYVCA9ICdFeHBlY3RlZCBhIGZ1bmN0aW9uJztcblxuLyoqXG4gKiBDcmVhdGVzIGEgZnVuY3Rpb24gdGhhdCBtZW1vaXplcyB0aGUgcmVzdWx0IG9mIGBmdW5jYC4gSWYgYHJlc29sdmVyYCBpc1xuICogcHJvdmlkZWQgaXQgZGV0ZXJtaW5lcyB0aGUgY2FjaGUga2V5IGZvciBzdG9yaW5nIHRoZSByZXN1bHQgYmFzZWQgb24gdGhlXG4gKiBhcmd1bWVudHMgcHJvdmlkZWQgdG8gdGhlIG1lbW9pemVkIGZ1bmN0aW9uLiBCeSBkZWZhdWx0LCB0aGUgZmlyc3QgYXJndW1lbnRcbiAqIHByb3ZpZGVkIHRvIHRoZSBtZW1vaXplZCBmdW5jdGlvbiBpcyBjb2VyY2VkIHRvIGEgc3RyaW5nIGFuZCB1c2VkIGFzIHRoZVxuICogY2FjaGUga2V5LiBUaGUgYGZ1bmNgIGlzIGludm9rZWQgd2l0aCB0aGUgYHRoaXNgIGJpbmRpbmcgb2YgdGhlIG1lbW9pemVkXG4gKiBmdW5jdGlvbi5cbiAqXG4gKiAqKk5vdGU6KiogVGhlIGNhY2hlIGlzIGV4cG9zZWQgYXMgdGhlIGBjYWNoZWAgcHJvcGVydHkgb24gdGhlIG1lbW9pemVkXG4gKiBmdW5jdGlvbi4gSXRzIGNyZWF0aW9uIG1heSBiZSBjdXN0b21pemVkIGJ5IHJlcGxhY2luZyB0aGUgYF8ubWVtb2l6ZS5DYWNoZWBcbiAqIGNvbnN0cnVjdG9yIHdpdGggb25lIHdob3NlIGluc3RhbmNlcyBpbXBsZW1lbnQgdGhlIFtgTWFwYF0oaHR0cDovL2VjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvNi4wLyNzZWMtcHJvcGVydGllcy1vZi10aGUtbWFwLXByb3RvdHlwZS1vYmplY3QpXG4gKiBtZXRob2QgaW50ZXJmYWNlIG9mIGBnZXRgLCBgaGFzYCwgYW5kIGBzZXRgLlxuICpcbiAqIEBzdGF0aWNcbiAqIEBtZW1iZXJPZiBfXG4gKiBAY2F0ZWdvcnkgRnVuY3Rpb25cbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZ1bmMgVGhlIGZ1bmN0aW9uIHRvIGhhdmUgaXRzIG91dHB1dCBtZW1vaXplZC5cbiAqIEBwYXJhbSB7RnVuY3Rpb259IFtyZXNvbHZlcl0gVGhlIGZ1bmN0aW9uIHRvIHJlc29sdmUgdGhlIGNhY2hlIGtleS5cbiAqIEByZXR1cm5zIHtGdW5jdGlvbn0gUmV0dXJucyB0aGUgbmV3IG1lbW9pemluZyBmdW5jdGlvbi5cbiAqIEBleGFtcGxlXG4gKlxuICogdmFyIHVwcGVyQ2FzZSA9IF8ubWVtb2l6ZShmdW5jdGlvbihzdHJpbmcpIHtcbiAqICAgcmV0dXJuIHN0cmluZy50b1VwcGVyQ2FzZSgpO1xuICogfSk7XG4gKlxuICogdXBwZXJDYXNlKCdmcmVkJyk7XG4gKiAvLyA9PiAnRlJFRCdcbiAqXG4gKiAvLyBtb2RpZnlpbmcgdGhlIHJlc3VsdCBjYWNoZVxuICogdXBwZXJDYXNlLmNhY2hlLnNldCgnZnJlZCcsICdCQVJORVknKTtcbiAqIHVwcGVyQ2FzZSgnZnJlZCcpO1xuICogLy8gPT4gJ0JBUk5FWSdcbiAqXG4gKiAvLyByZXBsYWNpbmcgYF8ubWVtb2l6ZS5DYWNoZWBcbiAqIHZhciBvYmplY3QgPSB7ICd1c2VyJzogJ2ZyZWQnIH07XG4gKiB2YXIgb3RoZXIgPSB7ICd1c2VyJzogJ2Jhcm5leScgfTtcbiAqIHZhciBpZGVudGl0eSA9IF8ubWVtb2l6ZShfLmlkZW50aXR5KTtcbiAqXG4gKiBpZGVudGl0eShvYmplY3QpO1xuICogLy8gPT4geyAndXNlcic6ICdmcmVkJyB9XG4gKiBpZGVudGl0eShvdGhlcik7XG4gKiAvLyA9PiB7ICd1c2VyJzogJ2ZyZWQnIH1cbiAqXG4gKiBfLm1lbW9pemUuQ2FjaGUgPSBXZWFrTWFwO1xuICogdmFyIGlkZW50aXR5ID0gXy5tZW1vaXplKF8uaWRlbnRpdHkpO1xuICpcbiAqIGlkZW50aXR5KG9iamVjdCk7XG4gKiAvLyA9PiB7ICd1c2VyJzogJ2ZyZWQnIH1cbiAqIGlkZW50aXR5KG90aGVyKTtcbiAqIC8vID0+IHsgJ3VzZXInOiAnYmFybmV5JyB9XG4gKi9cbmZ1bmN0aW9uIG1lbW9pemUoZnVuYywgcmVzb2x2ZXIpIHtcbiAgaWYgKHR5cGVvZiBmdW5jICE9ICdmdW5jdGlvbicgfHwgKHJlc29sdmVyICYmIHR5cGVvZiByZXNvbHZlciAhPSAnZnVuY3Rpb24nKSkge1xuICAgIHRocm93IG5ldyBUeXBlRXJyb3IoRlVOQ19FUlJPUl9URVhUKTtcbiAgfVxuICB2YXIgbWVtb2l6ZWQgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgYXJncyA9IGFyZ3VtZW50cyxcbiAgICAgICAga2V5ID0gcmVzb2x2ZXIgPyByZXNvbHZlci5hcHBseSh0aGlzLCBhcmdzKSA6IGFyZ3NbMF0sXG4gICAgICAgIGNhY2hlID0gbWVtb2l6ZWQuY2FjaGU7XG5cbiAgICBpZiAoY2FjaGUuaGFzKGtleSkpIHtcbiAgICAgIHJldHVybiBjYWNoZS5nZXQoa2V5KTtcbiAgICB9XG4gICAgdmFyIHJlc3VsdCA9IGZ1bmMuYXBwbHkodGhpcywgYXJncyk7XG4gICAgbWVtb2l6ZWQuY2FjaGUgPSBjYWNoZS5zZXQoa2V5LCByZXN1bHQpO1xuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG4gIG1lbW9pemVkLmNhY2hlID0gbmV3IG1lbW9pemUuQ2FjaGU7XG4gIHJldHVybiBtZW1vaXplZDtcbn1cblxuLy8gQXNzaWduIGNhY2hlIHRvIGBfLm1lbW9pemVgLlxubWVtb2l6ZS5DYWNoZSA9IE1hcENhY2hlO1xuXG5tb2R1bGUuZXhwb3J0cyA9IG1lbW9pemU7XG4iLCJ2YXIgbWFwRGVsZXRlID0gcmVxdWlyZSgnLi9tYXBEZWxldGUnKSxcbiAgICBtYXBHZXQgPSByZXF1aXJlKCcuL21hcEdldCcpLFxuICAgIG1hcEhhcyA9IHJlcXVpcmUoJy4vbWFwSGFzJyksXG4gICAgbWFwU2V0ID0gcmVxdWlyZSgnLi9tYXBTZXQnKTtcblxuLyoqXG4gKiBDcmVhdGVzIGEgY2FjaGUgb2JqZWN0IHRvIHN0b3JlIGtleS92YWx1ZSBwYWlycy5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQHN0YXRpY1xuICogQG5hbWUgQ2FjaGVcbiAqIEBtZW1iZXJPZiBfLm1lbW9pemVcbiAqL1xuZnVuY3Rpb24gTWFwQ2FjaGUoKSB7XG4gIHRoaXMuX19kYXRhX18gPSB7fTtcbn1cblxuLy8gQWRkIGZ1bmN0aW9ucyB0byB0aGUgYE1hcGAgY2FjaGUuXG5NYXBDYWNoZS5wcm90b3R5cGVbJ2RlbGV0ZSddID0gbWFwRGVsZXRlO1xuTWFwQ2FjaGUucHJvdG90eXBlLmdldCA9IG1hcEdldDtcbk1hcENhY2hlLnByb3RvdHlwZS5oYXMgPSBtYXBIYXM7XG5NYXBDYWNoZS5wcm90b3R5cGUuc2V0ID0gbWFwU2V0O1xuXG5tb2R1bGUuZXhwb3J0cyA9IE1hcENhY2hlO1xuIiwiLyoqXG4gKiBSZW1vdmVzIGBrZXlgIGFuZCBpdHMgdmFsdWUgZnJvbSB0aGUgY2FjaGUuXG4gKlxuICogQHByaXZhdGVcbiAqIEBuYW1lIGRlbGV0ZVxuICogQG1lbWJlck9mIF8ubWVtb2l6ZS5DYWNoZVxuICogQHBhcmFtIHtzdHJpbmd9IGtleSBUaGUga2V5IG9mIHRoZSB2YWx1ZSB0byByZW1vdmUuXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgdGhlIGVudHJ5IHdhcyByZW1vdmVkIHN1Y2Nlc3NmdWxseSwgZWxzZSBgZmFsc2VgLlxuICovXG5mdW5jdGlvbiBtYXBEZWxldGUoa2V5KSB7XG4gIHJldHVybiB0aGlzLmhhcyhrZXkpICYmIGRlbGV0ZSB0aGlzLl9fZGF0YV9fW2tleV07XG59XG5cbm1vZHVsZS5leHBvcnRzID0gbWFwRGVsZXRlO1xuIiwiLyoqXG4gKiBHZXRzIHRoZSBjYWNoZWQgdmFsdWUgZm9yIGBrZXlgLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAbmFtZSBnZXRcbiAqIEBtZW1iZXJPZiBfLm1lbW9pemUuQ2FjaGVcbiAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgVGhlIGtleSBvZiB0aGUgdmFsdWUgdG8gZ2V0LlxuICogQHJldHVybnMgeyp9IFJldHVybnMgdGhlIGNhY2hlZCB2YWx1ZS5cbiAqL1xuZnVuY3Rpb24gbWFwR2V0KGtleSkge1xuICByZXR1cm4ga2V5ID09ICdfX3Byb3RvX18nID8gdW5kZWZpbmVkIDogdGhpcy5fX2RhdGFfX1trZXldO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IG1hcEdldDtcbiIsIi8qKiBVc2VkIGZvciBuYXRpdmUgbWV0aG9kIHJlZmVyZW5jZXMuICovXG52YXIgb2JqZWN0UHJvdG8gPSBPYmplY3QucHJvdG90eXBlO1xuXG4vKiogVXNlZCB0byBjaGVjayBvYmplY3RzIGZvciBvd24gcHJvcGVydGllcy4gKi9cbnZhciBoYXNPd25Qcm9wZXJ0eSA9IG9iamVjdFByb3RvLmhhc093blByb3BlcnR5O1xuXG4vKipcbiAqIENoZWNrcyBpZiBhIGNhY2hlZCB2YWx1ZSBmb3IgYGtleWAgZXhpc3RzLlxuICpcbiAqIEBwcml2YXRlXG4gKiBAbmFtZSBoYXNcbiAqIEBtZW1iZXJPZiBfLm1lbW9pemUuQ2FjaGVcbiAqIEBwYXJhbSB7c3RyaW5nfSBrZXkgVGhlIGtleSBvZiB0aGUgZW50cnkgdG8gY2hlY2suXG4gKiBAcmV0dXJucyB7Ym9vbGVhbn0gUmV0dXJucyBgdHJ1ZWAgaWYgYW4gZW50cnkgZm9yIGBrZXlgIGV4aXN0cywgZWxzZSBgZmFsc2VgLlxuICovXG5mdW5jdGlvbiBtYXBIYXMoa2V5KSB7XG4gIHJldHVybiBrZXkgIT0gJ19fcHJvdG9fXycgJiYgaGFzT3duUHJvcGVydHkuY2FsbCh0aGlzLl9fZGF0YV9fLCBrZXkpO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IG1hcEhhcztcbiIsIi8qKlxuICogU2V0cyBgdmFsdWVgIHRvIGBrZXlgIG9mIHRoZSBjYWNoZS5cbiAqXG4gKiBAcHJpdmF0ZVxuICogQG5hbWUgc2V0XG4gKiBAbWVtYmVyT2YgXy5tZW1vaXplLkNhY2hlXG4gKiBAcGFyYW0ge3N0cmluZ30ga2V5IFRoZSBrZXkgb2YgdGhlIHZhbHVlIHRvIGNhY2hlLlxuICogQHBhcmFtIHsqfSB2YWx1ZSBUaGUgdmFsdWUgdG8gY2FjaGUuXG4gKiBAcmV0dXJucyB7T2JqZWN0fSBSZXR1cm5zIHRoZSBjYWNoZSBvYmplY3QuXG4gKi9cbmZ1bmN0aW9uIG1hcFNldChrZXksIHZhbHVlKSB7XG4gIGlmIChrZXkgIT0gJ19fcHJvdG9fXycpIHtcbiAgICB0aGlzLl9fZGF0YV9fW2tleV0gPSB2YWx1ZTtcbiAgfVxuICByZXR1cm4gdGhpcztcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBtYXBTZXQ7XG4iLCIvLyBDb3B5cmlnaHQgSm95ZW50LCBJbmMuIGFuZCBvdGhlciBOb2RlIGNvbnRyaWJ1dG9ycy5cbi8vXG4vLyBQZXJtaXNzaW9uIGlzIGhlcmVieSBncmFudGVkLCBmcmVlIG9mIGNoYXJnZSwgdG8gYW55IHBlcnNvbiBvYnRhaW5pbmcgYVxuLy8gY29weSBvZiB0aGlzIHNvZnR3YXJlIGFuZCBhc3NvY2lhdGVkIGRvY3VtZW50YXRpb24gZmlsZXMgKHRoZVxuLy8gXCJTb2Z0d2FyZVwiKSwgdG8gZGVhbCBpbiB0aGUgU29mdHdhcmUgd2l0aG91dCByZXN0cmljdGlvbiwgaW5jbHVkaW5nXG4vLyB3aXRob3V0IGxpbWl0YXRpb24gdGhlIHJpZ2h0cyB0byB1c2UsIGNvcHksIG1vZGlmeSwgbWVyZ2UsIHB1Ymxpc2gsXG4vLyBkaXN0cmlidXRlLCBzdWJsaWNlbnNlLCBhbmQvb3Igc2VsbCBjb3BpZXMgb2YgdGhlIFNvZnR3YXJlLCBhbmQgdG8gcGVybWl0XG4vLyBwZXJzb25zIHRvIHdob20gdGhlIFNvZnR3YXJlIGlzIGZ1cm5pc2hlZCB0byBkbyBzbywgc3ViamVjdCB0byB0aGVcbi8vIGZvbGxvd2luZyBjb25kaXRpb25zOlxuLy9cbi8vIFRoZSBhYm92ZSBjb3B5cmlnaHQgbm90aWNlIGFuZCB0aGlzIHBlcm1pc3Npb24gbm90aWNlIHNoYWxsIGJlIGluY2x1ZGVkXG4vLyBpbiBhbGwgY29waWVzIG9yIHN1YnN0YW50aWFsIHBvcnRpb25zIG9mIHRoZSBTb2Z0d2FyZS5cbi8vXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTXG4vLyBPUiBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GXG4vLyBNRVJDSEFOVEFCSUxJVFksIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOXG4vLyBOTyBFVkVOVCBTSEFMTCBUSEUgQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSxcbi8vIERBTUFHRVMgT1IgT1RIRVIgTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUlxuLy8gT1RIRVJXSVNFLCBBUklTSU5HIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRVxuLy8gVVNFIE9SIE9USEVSIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cblxuZnVuY3Rpb24gRXZlbnRFbWl0dGVyKCkge1xuICB0aGlzLl9ldmVudHMgPSB0aGlzLl9ldmVudHMgfHwge307XG4gIHRoaXMuX21heExpc3RlbmVycyA9IHRoaXMuX21heExpc3RlbmVycyB8fCB1bmRlZmluZWQ7XG59XG5tb2R1bGUuZXhwb3J0cyA9IEV2ZW50RW1pdHRlcjtcblxuLy8gQmFja3dhcmRzLWNvbXBhdCB3aXRoIG5vZGUgMC4xMC54XG5FdmVudEVtaXR0ZXIuRXZlbnRFbWl0dGVyID0gRXZlbnRFbWl0dGVyO1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9ldmVudHMgPSB1bmRlZmluZWQ7XG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLl9tYXhMaXN0ZW5lcnMgPSB1bmRlZmluZWQ7XG5cbi8vIEJ5IGRlZmF1bHQgRXZlbnRFbWl0dGVycyB3aWxsIHByaW50IGEgd2FybmluZyBpZiBtb3JlIHRoYW4gMTAgbGlzdGVuZXJzIGFyZVxuLy8gYWRkZWQgdG8gaXQuIFRoaXMgaXMgYSB1c2VmdWwgZGVmYXVsdCB3aGljaCBoZWxwcyBmaW5kaW5nIG1lbW9yeSBsZWFrcy5cbkV2ZW50RW1pdHRlci5kZWZhdWx0TWF4TGlzdGVuZXJzID0gMTA7XG5cbi8vIE9idmlvdXNseSBub3QgYWxsIEVtaXR0ZXJzIHNob3VsZCBiZSBsaW1pdGVkIHRvIDEwLiBUaGlzIGZ1bmN0aW9uIGFsbG93c1xuLy8gdGhhdCB0byBiZSBpbmNyZWFzZWQuIFNldCB0byB6ZXJvIGZvciB1bmxpbWl0ZWQuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnNldE1heExpc3RlbmVycyA9IGZ1bmN0aW9uKG4pIHtcbiAgaWYgKCFpc051bWJlcihuKSB8fCBuIDwgMCB8fCBpc05hTihuKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ24gbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlcicpO1xuICB0aGlzLl9tYXhMaXN0ZW5lcnMgPSBuO1xuICByZXR1cm4gdGhpcztcbn07XG5cbkV2ZW50RW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGVyLCBoYW5kbGVyLCBsZW4sIGFyZ3MsIGksIGxpc3RlbmVycztcblxuICBpZiAoIXRoaXMuX2V2ZW50cylcbiAgICB0aGlzLl9ldmVudHMgPSB7fTtcblxuICAvLyBJZiB0aGVyZSBpcyBubyAnZXJyb3InIGV2ZW50IGxpc3RlbmVyIHRoZW4gdGhyb3cuXG4gIGlmICh0eXBlID09PSAnZXJyb3InKSB7XG4gICAgaWYgKCF0aGlzLl9ldmVudHMuZXJyb3IgfHxcbiAgICAgICAgKGlzT2JqZWN0KHRoaXMuX2V2ZW50cy5lcnJvcikgJiYgIXRoaXMuX2V2ZW50cy5lcnJvci5sZW5ndGgpKSB7XG4gICAgICBlciA9IGFyZ3VtZW50c1sxXTtcbiAgICAgIGlmIChlciBpbnN0YW5jZW9mIEVycm9yKSB7XG4gICAgICAgIHRocm93IGVyOyAvLyBVbmhhbmRsZWQgJ2Vycm9yJyBldmVudFxuICAgICAgfVxuICAgICAgdGhyb3cgVHlwZUVycm9yKCdVbmNhdWdodCwgdW5zcGVjaWZpZWQgXCJlcnJvclwiIGV2ZW50LicpO1xuICAgIH1cbiAgfVxuXG4gIGhhbmRsZXIgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzVW5kZWZpbmVkKGhhbmRsZXIpKVxuICAgIHJldHVybiBmYWxzZTtcblxuICBpZiAoaXNGdW5jdGlvbihoYW5kbGVyKSkge1xuICAgIHN3aXRjaCAoYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgLy8gZmFzdCBjYXNlc1xuICAgICAgY2FzZSAxOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcyk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgY2FzZSAyOlxuICAgICAgICBoYW5kbGVyLmNhbGwodGhpcywgYXJndW1lbnRzWzFdKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICBjYXNlIDM6XG4gICAgICAgIGhhbmRsZXIuY2FsbCh0aGlzLCBhcmd1bWVudHNbMV0sIGFyZ3VtZW50c1syXSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgLy8gc2xvd2VyXG4gICAgICBkZWZhdWx0OlxuICAgICAgICBsZW4gPSBhcmd1bWVudHMubGVuZ3RoO1xuICAgICAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgICAgICBmb3IgKGkgPSAxOyBpIDwgbGVuOyBpKyspXG4gICAgICAgICAgYXJnc1tpIC0gMV0gPSBhcmd1bWVudHNbaV07XG4gICAgICAgIGhhbmRsZXIuYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICB9IGVsc2UgaWYgKGlzT2JqZWN0KGhhbmRsZXIpKSB7XG4gICAgbGVuID0gYXJndW1lbnRzLmxlbmd0aDtcbiAgICBhcmdzID0gbmV3IEFycmF5KGxlbiAtIDEpO1xuICAgIGZvciAoaSA9IDE7IGkgPCBsZW47IGkrKylcbiAgICAgIGFyZ3NbaSAtIDFdID0gYXJndW1lbnRzW2ldO1xuXG4gICAgbGlzdGVuZXJzID0gaGFuZGxlci5zbGljZSgpO1xuICAgIGxlbiA9IGxpc3RlbmVycy5sZW5ndGg7XG4gICAgZm9yIChpID0gMDsgaSA8IGxlbjsgaSsrKVxuICAgICAgbGlzdGVuZXJzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICB9XG5cbiAgcmV0dXJuIHRydWU7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmFkZExpc3RlbmVyID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgdmFyIG07XG5cbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuXG4gIC8vIFRvIGF2b2lkIHJlY3Vyc2lvbiBpbiB0aGUgY2FzZSB0aGF0IHR5cGUgPT09IFwibmV3TGlzdGVuZXJcIiEgQmVmb3JlXG4gIC8vIGFkZGluZyBpdCB0byB0aGUgbGlzdGVuZXJzLCBmaXJzdCBlbWl0IFwibmV3TGlzdGVuZXJcIi5cbiAgaWYgKHRoaXMuX2V2ZW50cy5uZXdMaXN0ZW5lcilcbiAgICB0aGlzLmVtaXQoJ25ld0xpc3RlbmVyJywgdHlwZSxcbiAgICAgICAgICAgICAgaXNGdW5jdGlvbihsaXN0ZW5lci5saXN0ZW5lcikgP1xuICAgICAgICAgICAgICBsaXN0ZW5lci5saXN0ZW5lciA6IGxpc3RlbmVyKTtcblxuICBpZiAoIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAvLyBPcHRpbWl6ZSB0aGUgY2FzZSBvZiBvbmUgbGlzdGVuZXIuIERvbid0IG5lZWQgdGhlIGV4dHJhIGFycmF5IG9iamVjdC5cbiAgICB0aGlzLl9ldmVudHNbdHlwZV0gPSBsaXN0ZW5lcjtcbiAgZWxzZSBpZiAoaXNPYmplY3QodGhpcy5fZXZlbnRzW3R5cGVdKSlcbiAgICAvLyBJZiB3ZSd2ZSBhbHJlYWR5IGdvdCBhbiBhcnJheSwganVzdCBhcHBlbmQuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdLnB1c2gobGlzdGVuZXIpO1xuICBlbHNlXG4gICAgLy8gQWRkaW5nIHRoZSBzZWNvbmQgZWxlbWVudCwgbmVlZCB0byBjaGFuZ2UgdG8gYXJyYXkuXG4gICAgdGhpcy5fZXZlbnRzW3R5cGVdID0gW3RoaXMuX2V2ZW50c1t0eXBlXSwgbGlzdGVuZXJdO1xuXG4gIC8vIENoZWNrIGZvciBsaXN0ZW5lciBsZWFrXG4gIGlmIChpc09iamVjdCh0aGlzLl9ldmVudHNbdHlwZV0pICYmICF0aGlzLl9ldmVudHNbdHlwZV0ud2FybmVkKSB7XG4gICAgdmFyIG07XG4gICAgaWYgKCFpc1VuZGVmaW5lZCh0aGlzLl9tYXhMaXN0ZW5lcnMpKSB7XG4gICAgICBtID0gdGhpcy5fbWF4TGlzdGVuZXJzO1xuICAgIH0gZWxzZSB7XG4gICAgICBtID0gRXZlbnRFbWl0dGVyLmRlZmF1bHRNYXhMaXN0ZW5lcnM7XG4gICAgfVxuXG4gICAgaWYgKG0gJiYgbSA+IDAgJiYgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCA+IG0pIHtcbiAgICAgIHRoaXMuX2V2ZW50c1t0eXBlXS53YXJuZWQgPSB0cnVlO1xuICAgICAgY29uc29sZS5lcnJvcignKG5vZGUpIHdhcm5pbmc6IHBvc3NpYmxlIEV2ZW50RW1pdHRlciBtZW1vcnkgJyArXG4gICAgICAgICAgICAgICAgICAgICdsZWFrIGRldGVjdGVkLiAlZCBsaXN0ZW5lcnMgYWRkZWQuICcgK1xuICAgICAgICAgICAgICAgICAgICAnVXNlIGVtaXR0ZXIuc2V0TWF4TGlzdGVuZXJzKCkgdG8gaW5jcmVhc2UgbGltaXQuJyxcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5fZXZlbnRzW3R5cGVdLmxlbmd0aCk7XG4gICAgICBpZiAodHlwZW9mIGNvbnNvbGUudHJhY2UgPT09ICdmdW5jdGlvbicpIHtcbiAgICAgICAgLy8gbm90IHN1cHBvcnRlZCBpbiBJRSAxMFxuICAgICAgICBjb25zb2xlLnRyYWNlKCk7XG4gICAgICB9XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLm9uID0gRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5hZGRMaXN0ZW5lcjtcblxuRXZlbnRFbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24odHlwZSwgbGlzdGVuZXIpIHtcbiAgaWYgKCFpc0Z1bmN0aW9uKGxpc3RlbmVyKSlcbiAgICB0aHJvdyBUeXBlRXJyb3IoJ2xpc3RlbmVyIG11c3QgYmUgYSBmdW5jdGlvbicpO1xuXG4gIHZhciBmaXJlZCA9IGZhbHNlO1xuXG4gIGZ1bmN0aW9uIGcoKSB7XG4gICAgdGhpcy5yZW1vdmVMaXN0ZW5lcih0eXBlLCBnKTtcblxuICAgIGlmICghZmlyZWQpIHtcbiAgICAgIGZpcmVkID0gdHJ1ZTtcbiAgICAgIGxpc3RlbmVyLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfVxuICB9XG5cbiAgZy5saXN0ZW5lciA9IGxpc3RlbmVyO1xuICB0aGlzLm9uKHR5cGUsIGcpO1xuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLy8gZW1pdHMgYSAncmVtb3ZlTGlzdGVuZXInIGV2ZW50IGlmZiB0aGUgbGlzdGVuZXIgd2FzIHJlbW92ZWRcbkV2ZW50RW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPSBmdW5jdGlvbih0eXBlLCBsaXN0ZW5lcikge1xuICB2YXIgbGlzdCwgcG9zaXRpb24sIGxlbmd0aCwgaTtcblxuICBpZiAoIWlzRnVuY3Rpb24obGlzdGVuZXIpKVxuICAgIHRocm93IFR5cGVFcnJvcignbGlzdGVuZXIgbXVzdCBiZSBhIGZ1bmN0aW9uJyk7XG5cbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXR1cm4gdGhpcztcblxuICBsaXN0ID0gdGhpcy5fZXZlbnRzW3R5cGVdO1xuICBsZW5ndGggPSBsaXN0Lmxlbmd0aDtcbiAgcG9zaXRpb24gPSAtMTtcblxuICBpZiAobGlzdCA9PT0gbGlzdGVuZXIgfHxcbiAgICAgIChpc0Z1bmN0aW9uKGxpc3QubGlzdGVuZXIpICYmIGxpc3QubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgaWYgKHRoaXMuX2V2ZW50cy5yZW1vdmVMaXN0ZW5lcilcbiAgICAgIHRoaXMuZW1pdCgncmVtb3ZlTGlzdGVuZXInLCB0eXBlLCBsaXN0ZW5lcik7XG5cbiAgfSBlbHNlIGlmIChpc09iamVjdChsaXN0KSkge1xuICAgIGZvciAoaSA9IGxlbmd0aDsgaS0tID4gMDspIHtcbiAgICAgIGlmIChsaXN0W2ldID09PSBsaXN0ZW5lciB8fFxuICAgICAgICAgIChsaXN0W2ldLmxpc3RlbmVyICYmIGxpc3RbaV0ubGlzdGVuZXIgPT09IGxpc3RlbmVyKSkge1xuICAgICAgICBwb3NpdGlvbiA9IGk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cblxuICAgIGlmIChwb3NpdGlvbiA8IDApXG4gICAgICByZXR1cm4gdGhpcztcblxuICAgIGlmIChsaXN0Lmxlbmd0aCA9PT0gMSkge1xuICAgICAgbGlzdC5sZW5ndGggPSAwO1xuICAgICAgZGVsZXRlIHRoaXMuX2V2ZW50c1t0eXBlXTtcbiAgICB9IGVsc2Uge1xuICAgICAgbGlzdC5zcGxpY2UocG9zaXRpb24sIDEpO1xuICAgIH1cblxuICAgIGlmICh0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpXG4gICAgICB0aGlzLmVtaXQoJ3JlbW92ZUxpc3RlbmVyJywgdHlwZSwgbGlzdGVuZXIpO1xuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIGtleSwgbGlzdGVuZXJzO1xuXG4gIGlmICghdGhpcy5fZXZlbnRzKVxuICAgIHJldHVybiB0aGlzO1xuXG4gIC8vIG5vdCBsaXN0ZW5pbmcgZm9yIHJlbW92ZUxpc3RlbmVyLCBubyBuZWVkIHRvIGVtaXRcbiAgaWYgKCF0aGlzLl9ldmVudHMucmVtb3ZlTGlzdGVuZXIpIHtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA9PT0gMClcbiAgICAgIHRoaXMuX2V2ZW50cyA9IHt9O1xuICAgIGVsc2UgaWYgKHRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICAgIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICAvLyBlbWl0IHJlbW92ZUxpc3RlbmVyIGZvciBhbGwgbGlzdGVuZXJzIG9uIGFsbCBldmVudHNcbiAgaWYgKGFyZ3VtZW50cy5sZW5ndGggPT09IDApIHtcbiAgICBmb3IgKGtleSBpbiB0aGlzLl9ldmVudHMpIHtcbiAgICAgIGlmIChrZXkgPT09ICdyZW1vdmVMaXN0ZW5lcicpIGNvbnRpbnVlO1xuICAgICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoa2V5KTtcbiAgICB9XG4gICAgdGhpcy5yZW1vdmVBbGxMaXN0ZW5lcnMoJ3JlbW92ZUxpc3RlbmVyJyk7XG4gICAgdGhpcy5fZXZlbnRzID0ge307XG4gICAgcmV0dXJuIHRoaXM7XG4gIH1cblxuICBsaXN0ZW5lcnMgPSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgaWYgKGlzRnVuY3Rpb24obGlzdGVuZXJzKSkge1xuICAgIHRoaXMucmVtb3ZlTGlzdGVuZXIodHlwZSwgbGlzdGVuZXJzKTtcbiAgfSBlbHNlIHtcbiAgICAvLyBMSUZPIG9yZGVyXG4gICAgd2hpbGUgKGxpc3RlbmVycy5sZW5ndGgpXG4gICAgICB0aGlzLnJlbW92ZUxpc3RlbmVyKHR5cGUsIGxpc3RlbmVyc1tsaXN0ZW5lcnMubGVuZ3RoIC0gMV0pO1xuICB9XG4gIGRlbGV0ZSB0aGlzLl9ldmVudHNbdHlwZV07XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG5FdmVudEVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCF0aGlzLl9ldmVudHMgfHwgIXRoaXMuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSBbXTtcbiAgZWxzZSBpZiAoaXNGdW5jdGlvbih0aGlzLl9ldmVudHNbdHlwZV0pKVxuICAgIHJldCA9IFt0aGlzLl9ldmVudHNbdHlwZV1dO1xuICBlbHNlXG4gICAgcmV0ID0gdGhpcy5fZXZlbnRzW3R5cGVdLnNsaWNlKCk7XG4gIHJldHVybiByZXQ7XG59O1xuXG5FdmVudEVtaXR0ZXIubGlzdGVuZXJDb3VudCA9IGZ1bmN0aW9uKGVtaXR0ZXIsIHR5cGUpIHtcbiAgdmFyIHJldDtcbiAgaWYgKCFlbWl0dGVyLl9ldmVudHMgfHwgIWVtaXR0ZXIuX2V2ZW50c1t0eXBlXSlcbiAgICByZXQgPSAwO1xuICBlbHNlIGlmIChpc0Z1bmN0aW9uKGVtaXR0ZXIuX2V2ZW50c1t0eXBlXSkpXG4gICAgcmV0ID0gMTtcbiAgZWxzZVxuICAgIHJldCA9IGVtaXR0ZXIuX2V2ZW50c1t0eXBlXS5sZW5ndGg7XG4gIHJldHVybiByZXQ7XG59O1xuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKGFyZykge1xuICByZXR1cm4gdHlwZW9mIGFyZyA9PT0gJ2Z1bmN0aW9uJztcbn1cblxuZnVuY3Rpb24gaXNOdW1iZXIoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnbnVtYmVyJztcbn1cblxuZnVuY3Rpb24gaXNPYmplY3QoYXJnKSB7XG4gIHJldHVybiB0eXBlb2YgYXJnID09PSAnb2JqZWN0JyAmJiBhcmcgIT09IG51bGw7XG59XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKGFyZykge1xuICByZXR1cm4gYXJnID09PSB2b2lkIDA7XG59XG4iXX0=
