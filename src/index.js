/**
 * AMap component extension
 */

import { version, name } from '../package.json';

import * as echarts from 'echarts';
import AMapCoordSys from './AMapCoordSys';

import './AMapModel';
import './AMapView';

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

export { version, name };
