/* global AMap */

import * as echarts from 'echarts';
import debounce from 'lodash.debounce';

export default echarts.extendComponentView({
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
        ? (moveHandler = debounce(moveHandler, 0))
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
