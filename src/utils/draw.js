/*
 * @LastEditTime: 2024-10-24 15:04:43
 * @Description:
 */
/*
 * @LastEditTime: 2024-10-23 13:37:20
 * @Description:
 */
import * as Cesium from "Cesium";

function drawMap(el) {
  Cesium.Ion.defaultAccessToken =
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJqdGkiOiI4OGE0NzAzNi02ZjczLTQ4Y2MtYjQ1MC1mYmJlYzNjOGE3ODUiLCJpZCI6NTk4NDMsImlhdCI6MTYyNzU0MzM0MX0.4NK7Pnl_Qd7JvYjOc9GWET_g7otJRkJ8kAmXmt3bw-g";

  //声明cesium实例
  let viewer = new Cesium.Viewer(el, {
    terrainProvider: Cesium.createWorldTerrain(),

    baseLayerPicker: false, //选择图层
    sceneModePicker: false, //选择模式
    geocoder: false, //搜索
    homeButton: false, //复位
    navigationHelpButton: false, //导航帮助
    timeline: false, //时间线
    // animation: false, //动画
    infoBox: false, //信息框
    selectionIndicator: false, // 绿色的定位框
    // 添加基础地图
    // imageryProvider: undefined
    imageryProvider: new Cesium.UrlTemplateImageryProvider({
      url:
        "http://webst01.is.autonavi.com/appmaptile?style=6&x={x}&y={y}&z={z}", //高德地图(卫片)
      minimumLevel: 1,
      maximumLevel: 18
    })
  });
  // 在基础地图上添加地图
  let imaglyser = new Cesium.ImageryLayer(
    new Cesium.UrlTemplateImageryProvider({
      url:
        "https://wprd01.is.autonavi.com/appmaptile?x={x}&y={y}&z={z}&lang=zh_cn&size=1&scl=1&style=8&ltype=4", // 纯地标图(地名)
      minimumLevel: 1,
      maximumLevel: 18
    })
  );
  viewer.imageryLayers.add(imaglyser);

  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(
      116.4817202209751,
      40.00445836036185,
      10000
    )
  });

  return viewer;
}

//添加primitive
function addPrimitive(instances, color, type) {
  let material = new Cesium.Material({
    fabric: {
      type: type,
      uniforms: {
        color: color
      }
    }
  });
  const primitive = new Cesium.Primitive({
    geometryInstances: instances,
    appearance: new Cesium.PolylineMaterialAppearance({
      material: material
    })
  });
  return primitive;
}

//添加instances
function addInstance(id, wgs84Line, width) {
  let instance = new Cesium.GeometryInstance({
    id: id,
    geometry: new Cesium.PolylineGeometry({
      positions: Cesium.Cartesian3.fromDegreesArray(wgs84Line.flat()),
      width: width,
      vertexFormat: Cesium.PolylineMaterialAppearance.VERTEX_FORMAT
    }),
    attributes: {
      show: new Cesium.ShowGeometryInstanceAttribute(true) //显示或者隐藏
    }
  });
  return instance;
}

export default {
  drawMap,
  addPrimitive,
  addInstance
};
