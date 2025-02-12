/*!
 * echarts-extension-amap 
 * @version 1.7.0
 * @author plainheart
 * 
 * MIT License
 * 
 * Copyright (c) 2019-2020 Zhongxiang.Wang
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 * 
 */
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports, require('echarts')) :
  typeof define === 'function' && define.amd ? define(['exports', 'echarts'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory((global.echarts = global.echarts || {}, global.echarts.amap = {}), global.echarts));
}(this, (function (exports, echarts) { 'use strict';

  var name = "echarts-extension-amap";
  var version = "1.7.0";

  /* global AMap */

  function AMapCoordSys(amap, api) {
    this._amap = amap;
    this.dimensions = ['lng', 'lat'];
    this._mapOffset = [0, 0];
    this._api = api;
  }

  var AMapCoordSysProto = AMapCoordSys.prototype;

  // exclude private and unsupported options
  var excludedOptions = [
    'echartsLayerZIndex',
    'renderOnMoving',
    'layers'
    //'hideOnZooming'
    //'trackPitchAndRotation'
  ];

  AMapCoordSysProto.dimensions = ['lng', 'lat'];

  AMapCoordSysProto.setZoom = function(zoom) {
    this._zoom = zoom;
  };

  AMapCoordSysProto.setCenter = function(center) {
    var lnglat = new AMap.LngLat(center[0], center[1]);
    this._center = this._amap.lngLatToContainer(lnglat);
  };

  AMapCoordSysProto.setMapOffset = function(mapOffset) {
    this._mapOffset = mapOffset;
  };

  AMapCoordSysProto.setAMap = function(amap) {
    this._amap = amap;
  };

  AMapCoordSysProto.getAMap = function() {
    return this._amap;
  };

  AMapCoordSysProto.dataToPoint = function(data) {
    var lnglat = new AMap.LngLat(data[0], data[1]);
    var px = this._amap.lngLatToContainer(lnglat);
    var mapOffset = this._mapOffset;
    return [px.x - mapOffset[0], px.y - mapOffset[1]];
  };

  AMapCoordSysProto.pointToData = function(pt) {
    var mapOffset = this._mapOffset;
    var lnglat = this._amap.containerToLngLat(
      new AMap.Pixel(pt[0] + mapOffset[0], pt[1] + mapOffset[1])
    );
    return [lnglat.lng, lnglat.lat];
  };

  AMapCoordSysProto.getViewRect = function() {
    var api = this._api;
    return new echarts.graphic.BoundingRect(0, 0, api.getWidth(), api.getHeight());
  };

  AMapCoordSysProto.getRoamTransform = function() {
    return echarts.matrix.create();
  };

  AMapCoordSysProto.prepareCustoms = function(data) {
    var rect = this.getViewRect();
    return {
      coordSys: {
        // The name exposed to user is always 'cartesian2d' but not 'grid'.
        type: 'amap',
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height
      },
      api: {
        coord: echarts.util.bind(this.dataToPoint, this),
        size: echarts.util.bind(dataToCoordSize, this)
      }
    };
  };

  function dataToCoordSize(dataSize, dataItem) {
    dataItem = dataItem || [0, 0];
    return echarts.util.map(
      [0, 1],
      function(dimIdx) {
        var val = dataItem[dimIdx];
        var halfSize = dataSize[dimIdx] / 2;
        var p1 = [];
        var p2 = [];
        p1[dimIdx] = val - halfSize;
        p2[dimIdx] = val + halfSize;
        p1[1 - dimIdx] = p2[1 - dimIdx] = dataItem[1 - dimIdx];
        return Math.abs(
          this.dataToPoint(p1)[dimIdx] - this.dataToPoint(p2)[dimIdx]
        );
      },
      this
    );
  }

  function addCssRule(selector, rules, index) {
    // 2.0
    var is2X = AMap.version >= 2;
    var sheet = is2X
      ? document.getElementById('AMap_Dynamic_style').sheet
      : document.getElementsByClassName('AMap.style')[0].sheet;
    index = index || 0;
    if (sheet.insertRule) {
      sheet.insertRule(selector + '{' + rules + '}', index);
    }
    else if (sheet.addRule) {
      sheet.addRule(selector, rules, index);
    }
  }

  // For deciding which dimensions to use when creating list data
  AMapCoordSys.dimensions = AMapCoordSysProto.dimensions;

  // var nativeRotation = AMap.Map.prototype.setRotation;
  // var nativePitch = AMap.Map.prototype.setPitch;

  // function setRotation(rotation) {
  //   var amap = this.getAMap();
  //   // for 2.x which has animation for rotation
  //   nativeRotation.apply(amap, [rotation, true]);

  //   var rotateEnable = amap.getStatus().rotateEnable;
  //   if (rotateEnable) {
  //     var amapCoordSys = this.coordinateSystem;
  //     var newRotation = amap.getRotation();
  //     // emit amaprender event
  //     newRotation !== amapCoordSys._rotation && amap.emit('amaprender', {
  //       type: 'rotation',
  //       oldRotation: amapCoordSys._rotation,
  //       newRotation: newRotation
  //     });
  //     amapCoordSys._rotation = newRotation;
  //   }
  // }

  // function setPitch(pitch) {
  //   var amap = this.getAMap();
  //   // for 2.x which has animation for pitch
  //   nativePitch.apply(amap, [pitch, true]);

  //   var pitchEnable = amap.getStatus().pitchEnable;
  //   if (pitchEnable) {
  //     var amapCoordSys = this.coordinateSystem;
  //     var newPitch = amap.getPitch();
  //     // emit amaprender event
  //     newPitch !== amapCoordSys._pitch && amap.emit('amaprender', {
  //       type: 'pitch',
  //       oldPitch: amapCoordSys._pitch,
  //       newPitch: newPitch
  //     });
  //     amapCoordSys._pitch = newPitch;
  //   }
  // }

  AMapCoordSys.create = function(ecModel, api) {
    var amapCoordSys;
    var root = api.getDom();

    // FIXME: a hack for AMap 2.0
    // if (AMap.version >= 2) {
    //   if(root.style.overflow !== 'auto') {
    //     root.style.overflow = 'auto';
    //     console.warn('[hack hint] Currently in AMap API 2.0, the overflow of echarts container must be `auto`.');
    //   }
    // }

    ecModel.eachComponent('amap', function(amapModel) {
      var painter = api.getZr().painter;
      var viewportRoot = painter.getViewportRoot();
      if (typeof AMap === 'undefined') {
        throw new Error('AMap api is not loaded');
      }
      if (amapCoordSys) {
        throw new Error('Only one amap component can exist');
      }
      var amap = amapModel.getAMap();
      if (!amap) {
        // Not support IE8
        var amapRoot = root.querySelector('.ec-extension-amap');
        if (amapRoot) {
          // Reset viewport left and top, which will be changed
          // in moving handler in AMapView
          viewportRoot.style.left = '0px';
          viewportRoot.style.top = '0px';
          root.removeChild(amapRoot);
        }
        amapRoot = document.createElement('div');
        amapRoot.className = 'ec-extension-amap';
        amapRoot.style.cssText = 'position:absolute;width:100%;height:100%';
        root.appendChild(amapRoot);

        var options = echarts.util.clone(amapModel.get());
        var echartsLayerZIndex = options.echartsLayerZIndex;
        // delete excluded options
        echarts.util.each(excludedOptions, function(key) {
          delete options[key];
        });

        amap = new AMap.Map(amapRoot, options);
        amapModel.setAMap(amap);

        var echartsLayer = new AMap.CustomLayer(viewportRoot, {
          zIndex: echartsLayerZIndex
        });
        amapModel.setEChartsLayer(echartsLayer);
        amap.add(echartsLayer);

        addCssRule('.ec-amap-not-zoom', 'left:0!important;top:0!important', Infinity);

        // Override
        painter.getViewportRootOffset = function() {
          return { offsetLeft: 0, offsetTop: 0 };
        };
      }

      // track pitch and rotation
      //var trackPitchAndRotation = amapModel.get('trackPitchAndRotation');
      //AMap.Map.prototype.setRotation = trackPitchAndRotation ? setRotation.bind(amapModel) : nativeRotation;
      //AMap.Map.prototype.setPitch = trackPitchAndRotation ? setPitch.bind(amapModel) : nativePitch;

      var center = amapModel.get('center');
      var zoom = amapModel.get('zoom');
      if (center && zoom) {
        var amapCenter = amap.getCenter();
        var amapZoom = amap.getZoom();
        var centerOrZoomChanged = amapModel.centerOrZoomChanged([amapCenter.lng, amapCenter.lat], amapZoom);
        if (centerOrZoomChanged) {
          var pt = new AMap.LngLat(center[0], center[1]);
          amap.setZoomAndCenter(zoom, pt);
        }
      }

      // update map style(#13)
      var originalMapStyle = amapModel.__mapStyle;
      var newMapStyle = amapModel.get('mapStyle');
      if (originalMapStyle !== newMapStyle) {
        amap.setMapStyle(newMapStyle);
        amapModel.__mapStyle = newMapStyle;
      }

      amapCoordSys = new AMapCoordSys(amap, api);
      amapCoordSys.setMapOffset(amapModel.__mapOffset || [0, 0]);
      amapCoordSys.setZoom(zoom);
      amapCoordSys.setCenter(center);

      amapModel.coordinateSystem = amapCoordSys;
    });

    ecModel.eachSeries(function(seriesModel) {
      if (seriesModel.get('coordinateSystem') === 'amap') {
        seriesModel.coordinateSystem = amapCoordSys;
      }
    });
  };

  function v2Equal(a, b) {
    return a && b && a[0] === b[0] && a[1] === b[1];
  }

  echarts.extendComponentModel({
    type: 'amap',

    setAMap: function(amap) {
      this.__amap = amap;
    },

    getAMap: function() {
      return this.__amap;
    },

    setEChartsLayer: function(layer) {
      this.__echartsLayer = layer;
    },

    getEChartsLayer: function() {
      return this.__echartsLayer;
    },

    setCenterAndZoom: function(center, zoom) {
      this.option.center = center;
      this.option.zoom = zoom;
    },

    centerOrZoomChanged: function(center, zoom) {
      var option = this.option;
      return !(v2Equal(center, option.center) && zoom === option.zoom);
    },

    defaultOption: {
      center: [116.397428, 39.90923],
      zoom: 5,
      isHotspot: false,
      resizeEnable: true,

      // extension options
      echartsLayerZIndex: 2000,
      renderOnMoving: true
      //hideOnZooming: true,
      //trackPitchAndRotation: false
    }
  });

  var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

  /**
   * lodash (Custom Build) <https://lodash.com/>
   * Build: `lodash modularize exports="npm" -o ./`
   * Copyright jQuery Foundation and other contributors <https://jquery.org/>
   * Released under MIT license <https://lodash.com/license>
   * Based on Underscore.js 1.8.3 <http://underscorejs.org/LICENSE>
   * Copyright Jeremy Ashkenas, DocumentCloud and Investigative Reporters & Editors
   */

  /** Used as the `TypeError` message for "Functions" methods. */
  var FUNC_ERROR_TEXT = 'Expected a function';

  /** Used as references for various `Number` constants. */
  var NAN = 0 / 0;

  /** `Object#toString` result references. */
  var symbolTag = '[object Symbol]';

  /** Used to match leading and trailing whitespace. */
  var reTrim = /^\s+|\s+$/g;

  /** Used to detect bad signed hexadecimal string values. */
  var reIsBadHex = /^[-+]0x[0-9a-f]+$/i;

  /** Used to detect binary string values. */
  var reIsBinary = /^0b[01]+$/i;

  /** Used to detect octal string values. */
  var reIsOctal = /^0o[0-7]+$/i;

  /** Built-in method references without a dependency on `root`. */
  var freeParseInt = parseInt;

  /** Detect free variable `global` from Node.js. */
  var freeGlobal = typeof commonjsGlobal == 'object' && commonjsGlobal && commonjsGlobal.Object === Object && commonjsGlobal;

  /** Detect free variable `self`. */
  var freeSelf = typeof self == 'object' && self && self.Object === Object && self;

  /** Used as a reference to the global object. */
  var root = freeGlobal || freeSelf || Function('return this')();

  /** Used for built-in method references. */
  var objectProto = Object.prototype;

  /**
   * Used to resolve the
   * [`toStringTag`](http://ecma-international.org/ecma-262/7.0/#sec-object.prototype.tostring)
   * of values.
   */
  var objectToString = objectProto.toString;

  /* Built-in method references for those with the same name as other `lodash` methods. */
  var nativeMax = Math.max,
      nativeMin = Math.min;

  /**
   * Gets the timestamp of the number of milliseconds that have elapsed since
   * the Unix epoch (1 January 1970 00:00:00 UTC).
   *
   * @static
   * @memberOf _
   * @since 2.4.0
   * @category Date
   * @returns {number} Returns the timestamp.
   * @example
   *
   * _.defer(function(stamp) {
   *   console.log(_.now() - stamp);
   * }, _.now());
   * // => Logs the number of milliseconds it took for the deferred invocation.
   */
  var now = function() {
    return root.Date.now();
  };

  /**
   * Creates a debounced function that delays invoking `func` until after `wait`
   * milliseconds have elapsed since the last time the debounced function was
   * invoked. The debounced function comes with a `cancel` method to cancel
   * delayed `func` invocations and a `flush` method to immediately invoke them.
   * Provide `options` to indicate whether `func` should be invoked on the
   * leading and/or trailing edge of the `wait` timeout. The `func` is invoked
   * with the last arguments provided to the debounced function. Subsequent
   * calls to the debounced function return the result of the last `func`
   * invocation.
   *
   * **Note:** If `leading` and `trailing` options are `true`, `func` is
   * invoked on the trailing edge of the timeout only if the debounced function
   * is invoked more than once during the `wait` timeout.
   *
   * If `wait` is `0` and `leading` is `false`, `func` invocation is deferred
   * until to the next tick, similar to `setTimeout` with a timeout of `0`.
   *
   * See [David Corbacho's article](https://css-tricks.com/debouncing-throttling-explained-examples/)
   * for details over the differences between `_.debounce` and `_.throttle`.
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Function
   * @param {Function} func The function to debounce.
   * @param {number} [wait=0] The number of milliseconds to delay.
   * @param {Object} [options={}] The options object.
   * @param {boolean} [options.leading=false]
   *  Specify invoking on the leading edge of the timeout.
   * @param {number} [options.maxWait]
   *  The maximum time `func` is allowed to be delayed before it's invoked.
   * @param {boolean} [options.trailing=true]
   *  Specify invoking on the trailing edge of the timeout.
   * @returns {Function} Returns the new debounced function.
   * @example
   *
   * // Avoid costly calculations while the window size is in flux.
   * jQuery(window).on('resize', _.debounce(calculateLayout, 150));
   *
   * // Invoke `sendMail` when clicked, debouncing subsequent calls.
   * jQuery(element).on('click', _.debounce(sendMail, 300, {
   *   'leading': true,
   *   'trailing': false
   * }));
   *
   * // Ensure `batchLog` is invoked once after 1 second of debounced calls.
   * var debounced = _.debounce(batchLog, 250, { 'maxWait': 1000 });
   * var source = new EventSource('/stream');
   * jQuery(source).on('message', debounced);
   *
   * // Cancel the trailing debounced invocation.
   * jQuery(window).on('popstate', debounced.cancel);
   */
  function debounce(func, wait, options) {
    var lastArgs,
        lastThis,
        maxWait,
        result,
        timerId,
        lastCallTime,
        lastInvokeTime = 0,
        leading = false,
        maxing = false,
        trailing = true;

    if (typeof func != 'function') {
      throw new TypeError(FUNC_ERROR_TEXT);
    }
    wait = toNumber(wait) || 0;
    if (isObject(options)) {
      leading = !!options.leading;
      maxing = 'maxWait' in options;
      maxWait = maxing ? nativeMax(toNumber(options.maxWait) || 0, wait) : maxWait;
      trailing = 'trailing' in options ? !!options.trailing : trailing;
    }

    function invokeFunc(time) {
      var args = lastArgs,
          thisArg = lastThis;

      lastArgs = lastThis = undefined;
      lastInvokeTime = time;
      result = func.apply(thisArg, args);
      return result;
    }

    function leadingEdge(time) {
      // Reset any `maxWait` timer.
      lastInvokeTime = time;
      // Start the timer for the trailing edge.
      timerId = setTimeout(timerExpired, wait);
      // Invoke the leading edge.
      return leading ? invokeFunc(time) : result;
    }

    function remainingWait(time) {
      var timeSinceLastCall = time - lastCallTime,
          timeSinceLastInvoke = time - lastInvokeTime,
          result = wait - timeSinceLastCall;

      return maxing ? nativeMin(result, maxWait - timeSinceLastInvoke) : result;
    }

    function shouldInvoke(time) {
      var timeSinceLastCall = time - lastCallTime,
          timeSinceLastInvoke = time - lastInvokeTime;

      // Either this is the first call, activity has stopped and we're at the
      // trailing edge, the system time has gone backwards and we're treating
      // it as the trailing edge, or we've hit the `maxWait` limit.
      return (lastCallTime === undefined || (timeSinceLastCall >= wait) ||
        (timeSinceLastCall < 0) || (maxing && timeSinceLastInvoke >= maxWait));
    }

    function timerExpired() {
      var time = now();
      if (shouldInvoke(time)) {
        return trailingEdge(time);
      }
      // Restart the timer.
      timerId = setTimeout(timerExpired, remainingWait(time));
    }

    function trailingEdge(time) {
      timerId = undefined;

      // Only invoke if we have `lastArgs` which means `func` has been
      // debounced at least once.
      if (trailing && lastArgs) {
        return invokeFunc(time);
      }
      lastArgs = lastThis = undefined;
      return result;
    }

    function cancel() {
      if (timerId !== undefined) {
        clearTimeout(timerId);
      }
      lastInvokeTime = 0;
      lastArgs = lastCallTime = lastThis = timerId = undefined;
    }

    function flush() {
      return timerId === undefined ? result : trailingEdge(now());
    }

    function debounced() {
      var time = now(),
          isInvoking = shouldInvoke(time);

      lastArgs = arguments;
      lastThis = this;
      lastCallTime = time;

      if (isInvoking) {
        if (timerId === undefined) {
          return leadingEdge(lastCallTime);
        }
        if (maxing) {
          // Handle invocations in a tight loop.
          timerId = setTimeout(timerExpired, wait);
          return invokeFunc(lastCallTime);
        }
      }
      if (timerId === undefined) {
        timerId = setTimeout(timerExpired, wait);
      }
      return result;
    }
    debounced.cancel = cancel;
    debounced.flush = flush;
    return debounced;
  }

  /**
   * Checks if `value` is the
   * [language type](http://www.ecma-international.org/ecma-262/7.0/#sec-ecmascript-language-types)
   * of `Object`. (e.g. arrays, functions, objects, regexes, `new Number(0)`, and `new String('')`)
   *
   * @static
   * @memberOf _
   * @since 0.1.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is an object, else `false`.
   * @example
   *
   * _.isObject({});
   * // => true
   *
   * _.isObject([1, 2, 3]);
   * // => true
   *
   * _.isObject(_.noop);
   * // => true
   *
   * _.isObject(null);
   * // => false
   */
  function isObject(value) {
    var type = typeof value;
    return !!value && (type == 'object' || type == 'function');
  }

  /**
   * Checks if `value` is object-like. A value is object-like if it's not `null`
   * and has a `typeof` result of "object".
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is object-like, else `false`.
   * @example
   *
   * _.isObjectLike({});
   * // => true
   *
   * _.isObjectLike([1, 2, 3]);
   * // => true
   *
   * _.isObjectLike(_.noop);
   * // => false
   *
   * _.isObjectLike(null);
   * // => false
   */
  function isObjectLike(value) {
    return !!value && typeof value == 'object';
  }

  /**
   * Checks if `value` is classified as a `Symbol` primitive or object.
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to check.
   * @returns {boolean} Returns `true` if `value` is a symbol, else `false`.
   * @example
   *
   * _.isSymbol(Symbol.iterator);
   * // => true
   *
   * _.isSymbol('abc');
   * // => false
   */
  function isSymbol(value) {
    return typeof value == 'symbol' ||
      (isObjectLike(value) && objectToString.call(value) == symbolTag);
  }

  /**
   * Converts `value` to a number.
   *
   * @static
   * @memberOf _
   * @since 4.0.0
   * @category Lang
   * @param {*} value The value to process.
   * @returns {number} Returns the number.
   * @example
   *
   * _.toNumber(3.2);
   * // => 3.2
   *
   * _.toNumber(Number.MIN_VALUE);
   * // => 5e-324
   *
   * _.toNumber(Infinity);
   * // => Infinity
   *
   * _.toNumber('3.2');
   * // => 3.2
   */
  function toNumber(value) {
    if (typeof value == 'number') {
      return value;
    }
    if (isSymbol(value)) {
      return NAN;
    }
    if (isObject(value)) {
      var other = typeof value.valueOf == 'function' ? value.valueOf() : value;
      value = isObject(other) ? (other + '') : other;
    }
    if (typeof value != 'string') {
      return value === 0 ? value : +value;
    }
    value = value.replace(reTrim, '');
    var isBinary = reIsBinary.test(value);
    return (isBinary || reIsOctal.test(value))
      ? freeParseInt(value.slice(2), isBinary ? 2 : 8)
      : (reIsBadHex.test(value) ? NAN : +value);
  }

  var lodash_debounce = debounce;

  /* global AMap */

  echarts.extendComponentView({
    type: 'amap',

    render: function(amapModel, ecModel, api) {
      var rendering = true;

      var amap = amapModel.getAMap();
      var viewportRoot = api.getZr().painter.getViewportRoot();
      var offsetEl = amap.getContainer();
      //var amape = offsetEl.querySelector('.amap-e');
      var amape = viewportRoot.parentNode;
      var coordSys = amapModel.coordinateSystem;
      var echartsLayer = amapModel.getEChartsLayer();

      var renderOnMoving = amapModel.get('renderOnMoving');
      //var hideOnZooming = amapModel.get('hideOnZooming');
      var resizeEnable = amapModel.get('resizeEnable');

      var is2X = AMap.version >= 2;
      var is3DMode = amap.getViewMode_() === '3D';
      var not2X3D = !is2X && !is3DMode;

      amape && amape.classList.add('ec-amap-not-zoom');

      var moveHandler = function(e) {
        if (rendering) {
          return;
        }

        var mapOffset = [
          -parseInt(offsetEl.style.left, 10) || 0,
          -parseInt(offsetEl.style.top, 10) || 0
        ];
        // only update style when map offset changed
        const viewportRootStyle = viewportRoot.style;
        const offsetLeft = mapOffset[0] + 'px';
        const offsetTop = mapOffset[1] + 'px';
        if (viewportRootStyle.left !== offsetLeft) {
          viewportRootStyle.left = offsetLeft;
        }
        if (viewportRootStyle.top !== offsetTop) {
          viewportRootStyle.top = offsetTop;
        }

        coordSys.setMapOffset(mapOffset);
        amapModel.__mapOffset = mapOffset;

        api.dispatchAction({
          type: 'amapRoam',
          animation: {
            // compatible with ECharts 5.x
            // no delay for rendering but remain animation of elements
            duration: 0
          }
        });
      };

      var zoomStartHandler = function(e) {
        if (rendering) {
          return;
        }

        // fix flicker in 3D mode for 1.x when zoom is over min or max value
        if (!is2X && is3DMode) {
          return;
        }

        /*hideOnZooming && */echartsLayer.setOpacity(not2X3D ? 0 : 0.01);
      };

      var zoomEndHandler = function(e) {
        if (rendering) {
          return;
        }

        not2X3D || echartsLayer.setOpacity(1);

        api.dispatchAction({
          type: 'amapRoam',
          animation: {
            duration: 0
          }
        });

        if (not2X3D) {
          clearTimeout(this._layerOpacityTimeout);

          this._layerOpacityTimeout = setTimeout(function() {
            echartsLayer.setOpacity(1);
          }, 0);
        }
      };

      var resizeHandler;

      //amap.off('mapmove', this._oldMoveHandler);
      // 1.x amap.getCameraState();
      // 2.x amap.getView().getStatus();
      amap.off('mapmove', this._oldMoveHandler);
      amap.off('moveend', this._oldMoveHandler);
      amap.off('viewchange', this._oldMoveHandler);
      amap.off('camerachange', this._oldMoveHandler);
      //amap.off('amaprender', this._oldMoveHandler);
      amap.off('zoomstart', this._oldZoomStartHandler);
      amap.off('zoomend', this._oldZoomEndHandler);
      amap.off('resize', this._oldResizeHandler);

      amap.on(renderOnMoving
        ? (is2X ? 'viewchange' : is3DMode ? 'camerachange' : 'mapmove')
        : 'moveend',
        // FIXME: event `camerachange` won't be triggered
        // if 3D mode is not enabled for AMap 1.x.
        // if animation is disabled,
        // there will be a bad experience in zooming and dragging operations.
        not2X3D
          ? (moveHandler = lodash_debounce(moveHandler, 0))
          : moveHandler
      );
      //amap.on('amaprender', moveHandler);
      amap.on('zoomstart', zoomStartHandler);
      amap.on('zoomend', zoomEndHandler = echarts.util.bind(zoomEndHandler, this));

      if (resizeEnable) {
        resizeHandler = function(e) {
          clearTimeout(this._resizeDelay);

          this._resizeDelay = setTimeout(function() {
            echarts.getInstanceByDom(api.getDom()).resize();
          }, 100);
        };

        resizeHandler = echarts.util.bind(resizeHandler, this);
        amap.on('resize', resizeHandler);
      }

      this._oldMoveHandler = moveHandler;
      this._oldZoomStartHandler = zoomStartHandler;
      this._oldZoomEndHandler = zoomEndHandler;

      resizeEnable && (this._oldResizeHandler = resizeHandler);

      rendering = false;
    },

    dispose: function(ecModel, api) {
      clearTimeout(this._layerOpacityTimeout);
      clearTimeout(this._resizeDelay);

      var component = ecModel.getComponent('amap');
      if (component) {
        component.getAMap().destroy();
        component.setAMap(null);
        component.setEChartsLayer(null);
        if (component.coordinateSystem) {
          component.coordinateSystem.setAMap(null);
          component.coordinateSystem = null;
        }
      }
    }
  });

  /**
   * AMap component extension
   */

  echarts.registerCoordinateSystem('amap', AMapCoordSys);

  // Action
  echarts.registerAction(
    {
      type: 'amapRoam',
      event: 'amapRoam',
      update: 'updateLayout'
    },
    function(payload, ecModel) {
      ecModel.eachComponent('amap', function(amapModel) {
        var amap = amapModel.getAMap();
        var center = amap.getCenter();
        amapModel.setCenterAndZoom([center.lng, center.lat], amap.getZoom());
      });
    }
  );

  exports.name = name;
  exports.version = version;

  Object.defineProperty(exports, '__esModule', { value: true });

})));
//# sourceMappingURL=echarts-extension-amap.js.map
