<!--
 * @LastEditTime: 2024-10-28 10:00:08
 * @Description: 
-->
<template>
  <div id="cesiumContainer"></div>
</template>

<script>
import Draw from "@/utils/draw.js";
import Rang from "@/utils/rang.js";
import reductionBias from "@/utils/reductionBias.js";
import common from "@/utils/common.js";
import * as Cesium from "Cesium";
import axios from "axios";
import BigNumber from "bignumber.js";

let viewer = null,
  selectRoad = null,
  pointsDataSource = null,
  lanePrimitive = null,
  markingPrimitive = null,
  stopLinePrimitive = null,
  zebracrossingsPrimitive = null;
let origin_utm_x = 0,
  origin_utm_y = 0,
  segmentList = [],
  treeList = [];
let mapPrimitives = [],
  SDPrimitives = [],
  SDList = [];
export default {
  name: "AMapContainer",
  props: {
    longitude: {
      type: String,
      default: ""
    },
    latitude: {
      type: String,
      default: ""
    }
  },
  data() {
    return {
      viewList: ["road"], //用于展示车道显示情况的数组
      cameraHeight: 1000,
      linkRoadList: [], //暂时没有用到
      selectId: "",
      selectProperty: null,
      selectPointIndex: -1,
      dragFlag: false,
      lon: "",
      lat: "",
      isMovePosition: false,
      rangChecked: "null",
      rangData: {
        lineEntityArrs: [],
        lineEntity: null,
        circleEntityArrs: [],
        circleEntityArr: [],
        mapIconArrs: [],
        mapIconArr: [],
        delIconArrs: [],
        delIconArr: [],
        pointsDataArrs: [],
        pointsDataArr: [],
        lineMovingData: [],
        lineMovingEntity: null,
        textMovingEntity: null,
        rangNum: 0,
        currentNum: -1
      },
      routeData: {
        // 路线规划
        checked: "null"
      },
      stopInstances: [],
      zabraInstances: []
    };
  },

  mounted() {
    this.initMap();
    // 测距
    this.$bus.$on("rangFun", value => {
      this.rangChecked = value.rangChecked;
    });
    // 路线规划
    this.$bus.$on("handleRoute", value => {
      this.routeData.checked = value.routeChecked;
    });
    this.$bus.$on("clearFile", value => {
      console.log(value, "value---接收文件情理信号");
    });
    this.$bus.$on("JSONData", value => {
      if (value.fileName.includes("SD")) {
        //这是SD导航数据
        SDList = value.data.result;
        console.log("SD数据", SDList);
        let color = null,
          width = 0,
          colorValue = "";
        SDList.forEach((item, index) => {
          item.niId = new BigNumber(item.niId);
          let pathInfo = {
            title: "导航" + Number(index + 1) + "info",
            expand: false,
            color: colorValue,
            index: index,
            children: this.setTreeData(item, index),
            yhType: "SD"
          };
          let idx = treeList.findIndex(obj => obj.title === pathInfo.title);
          // 如果对象不存在，则将其添加到数组中
          if (idx === -1) {
            console.log(pathInfo, "pathInfo");

            treeList.push(pathInfo);
            switch (index) {
              case 0:
                color = Cesium.Color.ORANGE.withAlpha(1);
                width = 15;
                colorValue = "orange";
                break;
              case 1:
                color = Cesium.Color.GREEN.withAlpha(1);
                width = 20;
                colorValue = "green";
            }
            this.drawSDPolyline(item, index, color, width);
          }
        });
        this.$bus.$emit("treeList", treeList);
      } else {
        // 清除掉上一个文件绘制的停止线和斑马线
        if (this.stopInstances.length > 0) {
          this.stopInstances.forEach(item => {
            viewer.scene.primitives.remove(item);
          });
          this.stopInstances = [];
          viewer.scene.primitives.remove(stopLinePrimitive);
          stopLinePrimitive = null;
        }
        if (this.zabraInstances.length > 0) {
          this.zabraInstances.forEach(item => {
            viewer.scene.primitives.remove(item);
          });
          this.zabraInstances = [];
          viewer.scene.primitives.remove(zebracrossingsPrimitive);
          zebracrossingsPrimitive = null;
        }
        origin_utm_x = value.data.origin_utm_x;
        origin_utm_y = value.data.origin_utm_y;
        segmentList = value.data.segments;

        if (lanePrimitive) {
          viewer.scene.primitives.remove(lanePrimitive);
        }
        if (markingPrimitive) {
          viewer.scene.primitives.remove(markingPrimitive);
        }
        this.drawYhLine(
          "yhLaneinfo",
          "YHlane",
          Cesium.Color.WHITE.withAlpha(0.8)
        );
        this.drawYhLine(
          "yhMarkinginfo",
          "YHMarking",
          Cesium.Color.YELLOW.withAlpha(0.8)
        );
        treeList.push(this.handleYhSegm());
        this.$bus.$emit("treeList", treeList);

        //绘制停止线
        let stoplines = value.data.stoplines;
        for (let i = 0; i < stoplines.length; i++) {
          let line = stoplines[i].geometry;
          let wgs84Line = this.updateYHPoint(line);
          if (wgs84Line.length == 0) {
            return;
          }
          let property = {
            typeName: "stoplines",
            point: wgs84Line,
            niId: stoplines[i].id,
            segmentId: stoplines[i].associated_segmentId.join(",")
          };
          let instance = Draw.addInstance(
            JSON.stringify(property),
            property.point,
            5
          );
          this.stopInstances.push(instance);
        }
        stopLinePrimitive = Draw.addPrimitive(
          this.stopInstances,
          Cesium.Color.MAGENTA.withAlpha(1),
          "PolylineOutline"
        );
        viewer.scene.primitives.add(stopLinePrimitive);

        //绘制斑马线
        let zebracrossings = value.data.zebracrossings;
        for (let i = 0; i < zebracrossings.length; i++) {
          let line = zebracrossings[i].geometry;
          let wgs84Line = this.updateYHPoint(line);
          if (wgs84Line.length == 0) {
            return;
          }
          let property = {
            typeName: "stoplines",
            point: wgs84Line,
            niId: zebracrossings[i].id,
            segmentId: zebracrossings[i].associated_segmentId.join(",")
          };
          let instance = Draw.addInstance(
            JSON.stringify(property),
            property.point,
            5
          );
          this.zabraInstances.push(instance);
        }
        zebracrossingsPrimitive = Draw.addPrimitive(
          this.zabraInstances,
          Cesium.Color.TURQUOISE.withAlpha(1),
          "PolylineOutline"
        );
        viewer.scene.primitives.add(zebracrossingsPrimitive);
      }
      this.$Spin.hide();
    });

    //通过多选框查看地图数据
    this.$bus.$on("viewList", value => {
      mapPrimitives.forEach(item => {
        item.primitive.show = false;
      });
      value.forEach(item => {
        let selectData = mapPrimitives.find(elem => {
          return elem.type == item;
        });
        selectData.primitive.show = true;
      });
    });

    //选中某个节点
    this.$bus.$on("selectData", value => {
      this.setSelectData(value);
    });

    //选中某个节点前面的多选框
    this.$bus.$on("checkedData", value => {
      this.setCheckedData(value);
    });

    //根据segm的id来定位到对应的位置
    this.$bus.$on("searchId", value => {
      try {
        // console.log(value, 'value--------------------根据segm的id来定位到对应的位置');

        if (SDList.length == 0 && segmentList.length == 0) {
          this.$Message.warning("请先加载地图文件再进行搜索！");
        } else {
          if (value.includes("-")) {
            //查找的lane的值
            for (let i = 0; i < segmentList.length; i++) {
              let lanes = segmentList[i].lanes;
              let searchData = lanes.find(item => {
                return item.id == value;
              });
              if (searchData) {
                let property = this.setYHProperty(
                  searchData,
                  "YHlane",
                  segmentList[i].segmentId,
                  segmentList[i].predecessor_segment_ids,
                  segmentList[i].successor_segment_ids,
                  segmentList[i].associated_stoplineId,
                  segmentList[i].crossing,
                  segmentList[i].quality_score,
                  segmentList[i].length
                );
                console.log(property, "property");

                if (property) {
                  property.type = "yhLaneinfo";
                  let wgs84Line = property.point;
                  this.setPolyLineStyle(property, false);
                  this.$bus.$emit("polyData", property);
                  viewer.camera.flyTo({
                    destination: Cesium.Cartesian3.fromDegrees(
                      wgs84Line[Math.round(wgs84Line.length / 2)][0],
                      wgs84Line[Math.round(wgs84Line.length / 2)][1],
                      this.cameraHeight
                    )
                  });
                }
              }
            }
          } else if (value.includes("_")) {
            //查找的marking的值
            for (let i = 0; i < segmentList.length; i++) {
              let marking = segmentList[i].marking_list;
              let searchData = marking.find(item => {
                return (
                  segmentList[i].segmentId + "_" + item.marking_id == value
                );
              });
              if (searchData) {
                let property = this.setYHProperty(
                  searchData,
                  "YHMarking",
                  segmentList[i].segmentId,
                  segmentList[i].predecessor_segment_ids,
                  segmentList[i].successor_segment_ids,
                  segmentList[i].associated_stoplineId
                );
                if (property) {
                  property.type = "yhMarkinginfo";
                  let wgs84Line = property.point;
                  this.setPolyLineStyle(property, false);
                  this.$bus.$emit("polyData", property);
                  viewer.camera.flyTo({
                    destination: Cesium.Cartesian3.fromDegrees(
                      wgs84Line[Math.round(wgs84Line.length / 2)][0],
                      wgs84Line[Math.round(wgs84Line.length / 2)][1],
                      this.cameraHeight
                    )
                  });
                }
              }
            }
          } else {
            // 如果只有yh文件情况下，直接搜索只有数字的id，搜索的是yh的segmentId
            if (SDList.length == 0 && segmentList.length != 0) {
              segmentList.forEach(item => {
                if (item.segmentId == value && item.lanes.length) {
                  let searchData = item.lanes[0];
                  let property = this.setYHProperty(
                    searchData,
                    "YHlane",
                    item.segmentId,
                    item.predecessor_segment_ids,
                    item.successor_segment_ids,
                    item.associated_stoplineId,
                    item.crossing,
                    item.quality_score,
                    item.length
                  );
                  if (property) {
                    property.type = "yhLaneinfo";
                    let wgs84Line = property.point;
                    this.setPolyLineStyle(property, false);
                    this.$bus.$emit("polyData", property);
                    viewer.camera.flyTo({
                      destination: Cesium.Cartesian3.fromDegrees(
                        wgs84Line[Math.round(wgs84Line.length / 2)][0],
                        wgs84Line[Math.round(wgs84Line.length / 2)][1],
                        this.cameraHeight
                      )
                    });
                  }
                }
              });
            } else {
              let searchData = SDList[0].route.segm.find(item => {
                return item.niId == value;
              });
              if (searchData) {
                let pointList = this.updatePoint(searchData, "searchId--");
                let property = this.getProperty(searchData, 0);
                this.setPolyLineStyle(property, false);
                this.$bus.$emit("polyData", property);
                viewer.camera.flyTo({
                  destination: Cesium.Cartesian3.fromDegrees(
                    pointList[Math.round(pointList.length / 2)][0],
                    pointList[Math.round(pointList.length / 2)][1],
                    this.cameraHeight
                  )
                });
              }
            }
          }
        }
      } catch (err) {
        console.log(err, "err");
      }
    });
  },

  methods: {
    // 路线规划
    handleRoute() {},
    // 测距用来获取坐标
    getPosition(position) {
      return viewer.camera.pickEllipsoid(
        position,
        viewer.scene.globe.ellipsoid
      );
    },
    overRang() {
      if (this.rangData.pointsDataArr.length > 1) {
        this.rangData.circleEntityArr[
          this.rangData.circleEntityArr.length - 1
        ].label.text = `总长：${this.rangData.rangNum.toFixed(4)}米`;
        this.rangData.mapIconArr[
          this.rangData.mapIconArr.length - 1
        ].billboard.image = "static/map_end.png";
        this.rangData.delIconArr[
          this.rangData.delIconArr.length - 1
        ].billboard.image = "static/clear.png";
        this.rangData.pointsDataArrs.push(this.rangData.pointsDataArr);
        this.rangData.lineEntityArrs.push(this.rangData.lineEntity);
        this.rangData.circleEntityArrs.push(this.rangData.circleEntityArr);
        this.rangData.mapIconArrs.push(this.rangData.mapIconArr);
        this.rangData.delIconArrs.push(this.rangData.delIconArr);
      } else {
        this.rangData.circleEntityArr.forEach(item => {
          viewer.entities.remove(item);
        });
        this.rangData.mapIconArr.forEach(item => {
          viewer.entities.remove(item);
        });
        this.rangData.delIconArr.forEach(item => {
          viewer.entities.remove(item);
        });
      }

      viewer.entities.remove(this.rangData.lineMovingEntity);
      viewer.entities.remove(this.rangData.textMovingEntity);
      this.rangData.mapIconArr = [];
      this.rangData.delIconArr = [];
      this.rangData.textMovingEntity = null;
      this.rangData.lineMovingEntity = null;
      this.rangData.circleEntityArr = [];
      this.rangData.lineMovingData = [];
      this.rangData.pointsDataArr = [];
      this.rangData.rangNum = 0;
      this.rangData.lineEntity = null;
    },
    delRang() {},

    initMap() {
      viewer = Draw.drawMap("cesiumContainer");
      window.viewer = viewer;
      pointsDataSource = viewer.scene.primitives.add(
        new Cesium.PointPrimitiveCollection()
      );
      this.getData();
      this.addClickEvent();
    },

    getData() {
      //车道线
      axios.get("../../../static/data/all_boundarylines.json").then(res => {
        let features = res.data.features;
        let color = Cesium.Color.CYAN.withAlpha(0.8);
        let primitive = this.drawPolyline(
          features,
          10,
          "PolylineArrow",
          color,
          "boundary"
        );
        primitive.show = false;
        viewer.scene.primitives.add(primitive);
        let data = {
          type: "all_boundarylines",
          primitive: primitive
        };
        mapPrimitives.push(data);
      });

      //车道中心线
      axios.get("../../../static/data/lane_center.json").then(res => {
        let features = res.data.features;
        let color = Cesium.Color.RED.withAlpha(0.8);
        let primitive = this.drawPolyline(
          features,
          10,
          "PolylineArrow",
          color,
          "lane"
        );
        primitive.show = false;
        viewer.scene.primitives.add(primitive);
        let data = {
          type: "lane_center",
          primitive: primitive
        };
        mapPrimitives.push(data);
      });

      //道路
      axios.get("../../../static/data/road.json").then(res => {
        let features = res.data.features;
        // console.log("road数据",features);
        let color = Cesium.Color.BLUE.withAlpha(0.8);
        let primitive = this.drawPolyline(
          features,
          10,
          "PolylineGlow",
          color,
          "road"
        );
        viewer.scene.primitives.add(primitive);
        let data = {
          type: "road",
          primitive: primitive
        };
        mapPrimitives.push(data);
      });
    },

    drawPolyline(features, width, materialtype, color, type) {
      let instances = [];
      for (let i = 0; i < features.length; i++) {
        let line = features[i].geometry.coordinates;
        let wgs84Line = line.map(item => {
          return reductionBias.wgs84togcj02(item[0], item[1]);
        });
        let property = {
          typeName: type,
          point: wgs84Line,
          niId:
            features[i].id ||
            features[i].marking_id ||
            features[i].properties.uid
        };
        let instance = Draw.addInstance(
          JSON.stringify(property),
          wgs84Line,
          width
        );
        instances.push(instance);
      }
      const primitive = Draw.addPrimitive(instances, color, materialtype);
      return primitive;
    },
    handleYhSegm() {
      let arr = [];
      segmentList.forEach((item, index) => {
        if (item.quality_score > 0 && item.lanes.length) {
          let property = this.setYHProperty(
            item.lanes[0],
            "YHlane",
            item.segmentId,
            item.predecessor_segment_ids,
            item.successor_segment_ids,
            item.associated_stoplineId,
            item.crossing,
            item.quality_score,
            item.length
          );

          arr.push({
            title: item.segmentId,
            checked: true,
            selected: false,
            polyInfo: property,
            key: `${item.title}-${index}`
          });
        }
      });

      return {
        title: "yhSegm",
        expand: false,
        children: arr,
        yhType: "yh"
      };
    },
    drawYhLine(title, type, color) {
      let laneInstances = [],
        laneTree = [];
      let laneInfo = {
        title: title,
        expand: false,
        children: laneTree,
        yhType: "yh"
      };
      // console.log(laneTree, 'laneTree');

      let idx = treeList.findIndex(obj => obj.title === laneInfo.title);
      // 如果对象不存在，则将其添加到数组中
      if (idx === -1) {
        treeList.push(laneInfo);
      }
      for (let i = 0; i < segmentList.length; i++) {
        let lanes = [];
        if (type == "YHlane") {
          lanes = segmentList[i].lanes;
        } else {
          lanes = segmentList[i].marking_list;
        }
        this.drawYHData(
          lanes,
          type,
          laneInstances,
          segmentList[i].segmentId,
          segmentList[i].predecessor_segment_ids,
          segmentList[i].successor_segment_ids,
          laneTree,
          segmentList[i].associated_stoplineId,
          segmentList[i].crossing,
          segmentList[i].quality_score,
          segmentList[i].distance
        );
      }
      if (type == "YHlane") {
        lanePrimitive = Draw.addPrimitive(
          laneInstances,
          color,
          "PolylineOutline"
        );
        viewer.scene.primitives.add(lanePrimitive);
      } else {
        markingPrimitive = Draw.addPrimitive(
          laneInstances,
          color,
          "PolylineOutline"
        );
        viewer.scene.primitives.add(markingPrimitive);
      }
    },

    drawYHData(
      datalist,
      type,
      instances,
      segmentId,
      predecessorSegmentIds,
      successorSegmentIds,
      treeList,
      stoplineId,
      segmCrossing = "",
      segmScore = "",
      distance = ""
    ) {
      for (let i = 0; i < datalist.length; i++) {
        let property = this.setYHProperty(
          datalist[i],
          type,
          segmentId,
          predecessorSegmentIds,
          successorSegmentIds,
          stoplineId,
          segmCrossing,
          segmScore,
          distance
        );
        if (property) {
          let instance = Draw.addInstance(
            JSON.stringify(property),
            property.point,
            5
          );
          instances.push(instance);

          let linkChildren = {
            title: datalist[i].id || segmentId + "_" + datalist[i].marking_id,
            checked: true,
            selected: false,
            polyInfo: property
          };
          treeList.push(linkChildren);
        }
      }
    },

    //设置建图的属性值
    setYHProperty(
      item,
      type,
      segmentId,
      predecessorSegmentIds,
      successorSegmentIds,
      stoplineId,
      segmCrossing = "",
      segmScore = "",
      distance = ""
    ) {
      let line = item.points;
      let wgs84Line = this.updateYHPoint(line);
      if (wgs84Line.length == 0) {
        return;
      }
      let property = {
        typeName: type,
        point: wgs84Line,
        niId: item.id || segmentId + "_" + item.marking_id,
        segmentId: segmentId,
        associated_stoplineId: stoplineId,
        is_on_route: item.is_on_route + "",
        predecessor_segment_ids: predecessorSegmentIds,
        successor_segment_ids: successorSegmentIds,
        predecessor_lane_ids: item.predecessor_lane_ids || [],
        successor_lane_ids: item.successor_lane_ids || [],
        segment_distance: distance
      };
      if (type == "YHlane") {
        property = {
          ...property,
          quality_score: item.quality_score,
          segment_crossing: segmCrossing,
          segment_score: segmScore,
          length: item.length
        };
      }

      return property;
    },

    drawSDPolyline(data, index, color, width) {
      let segm = data.route.segm;
      let segminstances = [],
        linkinstances = [],
        posInfoinstances = [];
      for (let i = 0; i < segm.length; i++) {
        let pointList = this.updatePoint(segm[i], "drawSDPolyline--");
        // console.log(pointList, "segm--drawSDPolyline-pointList");
        let instance = Draw.addInstance(
          JSON.stringify(this.getProperty(segm[i], index)),
          pointList,
          width
        );
        segminstances.push(instance);

        let inLinkInfos = segm[i].inLinkInfos;
        if (inLinkInfos) {
          inLinkInfos = inLinkInfos.filter(
            itemA => !segm.find(itemB => itemA.linkAttr.niId == itemB.niId)
          );
          // console.error(inLinkInfos, "inLinkInfos======", inLinkInfos.length);

          this.addLinkPolyline(
            inLinkInfos,
            linkinstances,
            posInfoinstances,
            segm[i].niId,
            segm
          );
        }
        let outLinkInfos = segm[i].outLinkInfos;
        if (outLinkInfos) {
          outLinkInfos = outLinkInfos.filter(
            itemA => !segm.find(itemB => itemA.linkAttr.niId == itemB.niId)
          ); //过滤掉和segm上面一样的id，避免重复显示
          // console.error(
          //   outLinkInfos,
          //   "outLinkInfos======",
          //   outLinkInfos.length
          // );
          this.addLinkPolyline(
            outLinkInfos,
            linkinstances,
            posInfoinstances,
            segm[i].niId,
            segm
          );
        }
      }

      let linkPrimitive = Draw.addPrimitive(
        linkinstances,
        Cesium.Color.WHITE.withAlpha(1),
        "PolylineArrow"
      );
      let posInfoPrimitive = Draw.addPrimitive(
        posInfoinstances,
        Cesium.Color.BLUE.withAlpha(1),
        "PolylineArrow"
      );
      let segPrimitive = Draw.addPrimitive(
        segminstances,
        color,
        "PolylineArrow"
      );
      viewer.scene.primitives.add(linkPrimitive);
      viewer.scene.primitives.add(posInfoPrimitive);
      viewer.scene.primitives.add(segPrimitive);
      viewer.scene.primitives.raiseToTop(segPrimitive);

      if (index != 0) {
        segPrimitive.show = false;
        linkPrimitive.show = false;
        posInfoPrimitive.show = false;
      }
      SDPrimitives.push([segPrimitive, linkPrimitive, posInfoPrimitive]);
    },

    addLinkPolyline(inLinkInfos, instances, posInfoinstances, id, segm) {
      if (inLinkInfos.length > 0) {
        for (let j = 0; j < inLinkInfos.length; j++) {
          let linkAttr = inLinkInfos[j].linkAttr;
          if (linkAttr && linkAttr.shPos && linkAttr.shPos.length) {
            let inLinkPoint = this.updatePoint(linkAttr, "addLinkPolyline--1");
            let property = {
              typeName: "link",
              point: inLinkPoint,
              niId: inLinkInfos[j].linkAttr.niId,
              segmentId: id
            };
            let instance = new Cesium.GeometryInstance({
              id: JSON.stringify(property),
              geometry: new Cesium.PolylineGeometry({
                positions: Cesium.Cartesian3.fromDegreesArray(
                  inLinkPoint.flat()
                ),
                width: 10,
                vertexFormat: Cesium.PolylineMaterialAppearance.VERTEX_FORMAT
              })
            });
            instances.push(instance);
          }

          let psInfos = inLinkInfos[j].psInfos;
          if (psInfos) {
            psInfos = psInfos.filter(
              itemA => !segm.find(itemB => itemA.niId == itemB.niId)
            );
            for (let i = 0; i < psInfos.length; i++) {
              let inLinkPoint = this.updatePoint(
                psInfos[i],
                "addLinkPolyline--2"
              );
              let property = {
                typeName: "psInfo",
                point: inLinkPoint,
                niId: inLinkInfos[j].psInfos[i].niId,
                segmentId: id
              };
              let instance = new Cesium.GeometryInstance({
                id: JSON.stringify(property),
                geometry: new Cesium.PolylineGeometry({
                  positions: Cesium.Cartesian3.fromDegreesArray(
                    inLinkPoint.flat()
                  ),
                  width: 10,
                  vertexFormat: Cesium.PolylineMaterialAppearance.VERTEX_FORMAT
                })
              });
              posInfoinstances.push(instance);
            }
          }
        }
      }
    },

    setTreeData(data, index) {
      let pathTree = [];
      let checked = true;
      if (index > 0) {
        checked = false;
      }
      data.route.segm.forEach(item => {
        let linkChildren = {
          title: new BigNumber(item.niId),
          checked: checked,
          selected: false,
          polyInfo: this.getProperty(item, index)
        };
        pathTree.push(linkChildren);
      });
      return pathTree;
    },

    //获取property的值
    getProperty(item, index) {
      // console.log(item, "item");

      let property = {
        typeName: "segm",
        point: this.updatePoint(item, "getProperty--"),
        niId: new BigNumber(item.niId),
        type: "导航" + Number(index + 1) + "info",
        fLaneNum: this.setfLaneNum(item),
        processor_ids: this.setCessorIds(item).processor_ids,
        successor_ids: this.setCessorIds(item).successor_ids,
        inLinkInfos: item.inLinkInfos,
        outLinkInfos: item.outLinkInfos,
        usage: item.usage,
        spl: item.spl,
        dis: item.dis
      };
      return property;
    },

    //更新点的坐标
    updatePoint(item, type) {
      try {
        // console.log(item, "item", type);
        let pointList = [];
        item.shPos.forEach(pos => {
          let point = pos.split(",");
          pointList.push([Number(point[0]), Number(point[1])]);
        });
        return pointList;
      } catch (err) {
        console.log(err, "err-------updatePoint");
      }
    },

    //更新视觉地图的坐标
    updateYHPoint(line) {
      let wgs84Line = line.map(item => {
        if (typeof item == "string") {
          let x = parseFloat(item.split(",")[0]) + origin_utm_x;
          let y = parseFloat(item.split(",")[1]) + origin_utm_y;
          let position = common.wgs84Totmerc([Number(x), Number(y)]);
          return reductionBias.wgs84togcj02(position.x, position.y);
        } else {
          return item;
        }
      });
      return wgs84Line;
    },

    //设置fLaneNum的值
    setfLaneNum(item) {
      let fLaneNum = 0;
      if (!item.fLaneNum) {
        if (item.inLinkInfos) {
          let inLinkInfos = item.inLinkInfos;
          for (let i = 0; i < inLinkInfos.length; i++) {
            if (inLinkInfos[i].linkAttr.niId == item.beforeId) {
              fLaneNum = inLinkInfos[i].linkAttr.fLaneNum;
            }
          }
        }
      } else {
        fLaneNum = item.fLaneNum;
      }
      return fLaneNum;
    },

    //设置前驱后继的值
    setCessorIds(item) {
      let processor_ids = [],
        successor_ids = [];
      if (item.inLinkInfos) {
        processor_ids = item.inLinkInfos.map(item => {
          return item.linkAttr.niId;
        });
      }
      if (item.outLinkInfos) {
        successor_ids = item.outLinkInfos.map(item => {
          return item.linkAttr.niId;
        });
      }
      return { processor_ids, successor_ids };
    },

    updatePosition() {
      for (let i = 0; i < this.selectProperty.point.length; i++) {
        if (i == this.selectPointIndex) {
          this.selectProperty.point[i][0] = Number(this.lon);
          this.selectProperty.point[i][1] = Number(this.lat);
        }
      }
      for (let i = 0; i < segmentList.length; i++) {
        if (this.selectProperty.segmentId == segmentList[i].segmentId) {
          let lanes = segmentList[i].lanes;
          let markingList = segmentList[i].marking_list;
          if (this.selectProperty.typeName == "YHlane") {
            for (let j = 0; j < lanes.length; j++) {
              if (this.selectProperty.niId == lanes[j].id) {
                lanes[j].points = this.selectProperty.point;
              }
            }
          } else if (this.selectProperty.typeName == "YHMarking") {
            for (let j = 0; j < markingList.length; j++) {
              if (
                this.selectProperty.niId ==
                this.selectProperty.segmentId + "_" + markingList[j].marking_id
              ) {
                markingList[j].points = this.selectProperty.point;
              }
            }
          }
        }
      }

      if (this.selectProperty.typeName == "YHlane") {
        viewer.scene.primitives.remove(lanePrimitive);
        this.drawYhLine(
          "yhLaneinfo",
          "YHlane",
          Cesium.Color.WHITE.withAlpha(1)
        );
      } else if (this.selectProperty.typeName == "YHMarking") {
        viewer.scene.primitives.remove(markingPrimitive);
        this.drawYhLine(
          "yhMarkinginfo",
          "YHMarking",
          Cesium.Color.YELLOW.withAlpha(1)
        );
      }
      this.setPolyLineStyle(this.selectProperty, true);
      this.drawPoint(this.selectProperty);
    },

    addClickEvent() {
      let handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
      //鼠标左击事件
      let that = this;
      handler.setInputAction(function(event) {
        try {
          if (that.rangChecked != "null") {
            if (that.rangChecked != "start") {
              that.rangChecked = "start";
              that.rangData.currentNum++;
            }
            const position = that.getPosition(event.position);
            if (
              position &&
              that.rangChecked == "start" &&
              that.rangData.currentNum >= 0
            ) {
              that.rangData.pointsDataArr.push(position);
              that.rangData.lineMovingData = [position, position];
              if (!that.rangData.textMovingEntity) {
                that.rangData.textMovingEntity = viewer.entities.add(
                  Rang.drawTextRang(position)
                );
                that.rangData.lineMovingEntity = viewer.entities.add(
                  Rang.drawLine(
                    `yh_rang_line_moving`,
                    that.rangData.lineMovingArr
                  )
                );
              }
              // 超过两个点可以开始计算距离了
              if (that.rangData.pointsDataArr.length > 1) {
                const prePoint =
                  that.rangData.pointsDataArr[
                    that.rangData.pointsDataArr.length - 2
                  ];
                const curPoint =
                  that.rangData.pointsDataArr[
                    that.rangData.pointsDataArr.length - 1
                  ];
                that.rangData.rangNum += Rang.handleLineNum(curPoint, prePoint);
              }
              that.rangData.circleEntityArr.push(
                viewer.entities.add(
                  Rang.drawPointRang(
                    `yh_rang_point_${that.rangData.currentNum}_${that.rangData.circleEntityArr.length}`,
                    position,
                    that.rangData.pointsDataArr.length - 1 == 0
                      ? "起点"
                      : that.rangData.rangNum.toFixed(4) + "米",
                    that.rangData.currentNum,
                    that.rangData.pointsDataArr.length - 1
                  )
                )
              );
              if (that.rangData.lineEntity) {
                that.rangData.lineEntity.positions = Rang.updatePoints(
                  that.rangData.pointsDataArr
                ); // 更新线条的位置
              } else {
                that.rangData.lineEntity = viewer.entities.add(
                  Rang.drawLine(
                    `yh_rang_line${that.rangData.currentNum}`,
                    that.rangData.pointsDataArr,
                    that.rangData.currentNum
                  )
                );
              }
              that.rangData.mapIconArr.push(
                viewer.entities.add(
                  Rang.drawMapIcon(
                    `yh_rang_map_${that.rangData.currentNum}_${that.rangData.circleEntityArr.length}`,
                    position,
                    that.rangData.currentNum,
                    that.rangData.pointsDataArr.length - 1,
                    that.rangData.pointsDataArr.length - 1 == 0
                      ? "static/map_start.png"
                      : "static/map_center.png"
                  )
                )
              );

              that.rangData.delIconArr.push(
                viewer.entities.add(
                  Rang.drawDelIcon(
                    `yh_rang_del_${that.rangData.currentNum}_${that.rangData.circleEntityArr.length}`,
                    position,
                    that.rangData.currentNum,
                    that.rangData.pointsDataArr.length - 1
                  )
                )
              );
            }
            return;
          }

          that.dragFlag = false;
          let pickedFeature = viewer.scene.pick(event.position);
          if (!Cesium.defined(pickedFeature)) return;
          if (
            that.rangChecked == "null" &&
            pickedFeature.id.typeName &&
            pickedFeature.id.typeName.includes("yh_")
          ) {
            if (pickedFeature.id.typeName == "yh_rang_del_icon") {
              let lineIndex = pickedFeature.id.lineIndex,
                pointIndex = pickedFeature.id.pointIndex;

              if (
                pointIndex == 0 ||
                pointIndex == that.rangData.pointsDataArrs[lineIndex].length - 1
              ) {
                that.rangData.pointsDataArrs[lineIndex] = [];
                viewer.entities.remove(that.rangData.lineEntityArrs[lineIndex]);
                that.rangData.lineEntityArrs[lineIndex] = null;
                that.rangData.delIconArrs[lineIndex].forEach(item => {
                  viewer.entities.remove(item);
                });
                that.rangData.delIconArrs[lineIndex] = [];
                that.rangData.mapIconArrs[lineIndex].forEach(item => {
                  viewer.entities.remove(item);
                });
                that.rangData.mapIconArrs[lineIndex] = [];
                that.rangData.circleEntityArrs[lineIndex].forEach(item => {
                  viewer.entities.remove(item);
                });
                that.rangData.circleEntityArrs[lineIndex] = [];
                console.log(that.rangData, "that.rangData");
              } else {
                viewer.entities.remove(
                  that.rangData.delIconArrs[lineIndex][pointIndex]
                );
                that.rangData.delIconArrs[lineIndex].splice(pointIndex, 1);
                viewer.entities.remove(
                  that.rangData.mapIconArrs[lineIndex][pointIndex]
                );
                that.rangData.mapIconArrs[lineIndex].splice(pointIndex, 1);
                viewer.entities.remove(
                  that.rangData.circleEntityArrs[lineIndex][pointIndex]
                );
                that.rangData.circleEntityArrs[lineIndex].splice(pointIndex, 1);
                that.rangData.pointsDataArrs[lineIndex].splice(pointIndex, 1);
                let num = 0,
                  arr = that.rangData.pointsDataArrs[lineIndex];
                for (let i = 1; i < arr.length; i++) {
                  num += Rang.handleLineNum(arr[i - 1], arr[i]);
                  if (i >= pointIndex) {
                    if (i < arr.length - 1) {
                      that.rangData.circleEntityArrs[lineIndex][
                        i
                      ].label.text = `${num.toFixed(4)}米`;
                    } else {
                      that.rangData.circleEntityArrs[lineIndex][
                        i
                      ].label.text = `总长：${num.toFixed(4)}米`;
                    }
                    that.rangData.circleEntityArrs[lineIndex][i].pointIndex = i;
                    that.rangData.mapIconArrs[lineIndex][i].pointIndex = i;
                    that.rangData.delIconArrs[lineIndex][i].pointIndex = i;
                  }
                }
                that.rangData.lineEntityArrs[
                  lineIndex
                ].positions = Rang.updatePoints(
                  that.rangData.pointsDataArrs[lineIndex]
                );
              }
            }
            if (
              pickedFeature.id.typeName == "yh_rang_map_icon" ||
              pickedFeature.id.typeName == "yh_rang_circle_icon"
            ) {
              return;
            }
          }

          let property;
          if (pickedFeature.id.typeName == "selectData") {
            property = pickedFeature.id.info;
            that.setPolyLineStyle(property, false);
          } else {
            property = JSON.parse(pickedFeature.id);
            if (property.typeName == "point") {
              //点击的是点
              that.updatePointColor(property.index);
              that.$emit("viewCard", property.point);
            } else if (property.typeName == "segm") {
              that.$bus.$emit("polyData", property);
              that.setPolyLineStyle(property, false);
            } else {
              that.selectProperty = property;
              that.setPolyLineStyle(property, false);
            }
          }
          if (property && property.typeName.includes("YH")) {
            that.drawPoint(property);
          }
        } catch (err) {
          console.log(err, "err--鼠标左击事件");
        }
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
      //鼠标按下事件
      handler.setInputAction(function(event) {
        try {
          if (that.rangChecked != "null") return;
          let pickedFeature = viewer.scene.pick(event.position);
          if (!Cesium.defined(pickedFeature)) return;
          if (
            that.rangChecked == "null" &&
            pickedFeature.id &&
            (pickedFeature.id.typeName == "yh_rang_map_icon" ||
              pickedFeature.id.typeName == "yh_rang_circle_icon" ||
              pickedFeature.id.typeName == "yh_rang_del_icon")
          ) {
            return;
          }
          if (pickedFeature.id.typeName == "selectData") {
            return;
          }
          let property = JSON.parse(pickedFeature.id);
          if (property.typeName == "point") {
            //点击的是点
            that.updatePointColor(property.index);

            let cartesian = viewer.scene.pickPosition(event.position);
            let cartographic = Cesium.Cartographic.fromCartesian(cartesian);
            that.lon = Number(
              Cesium.Math.toDegrees(cartographic.longitude).toFixed(7)
            );
            that.lat = Number(
              Cesium.Math.toDegrees(cartographic.latitude).toFixed(7)
            );
            that.dragFlag = true;
            viewer.scene.screenSpaceCameraController.enableRotate = false; //锁定相机
          }
        } catch (err) {
          console.log(err, "err--鼠标按下事件");
        }
      }, Cesium.ScreenSpaceEventType.LEFT_DOWN);
      //鼠标滑轮事件
      handler.setInputAction(function(event) {
        let cameraHeight = viewer.camera.positionCartographic.height;
        if (cameraHeight > 1000) {
          that.cameraHeight = 1000;
        } else {
          that.cameraHeight = cameraHeight;
        }
      }, Cesium.ScreenSpaceEventType.WHEEL);
      //鼠标右击事件
      handler.setInputAction(function(event) {
        if (that.rangChecked != "null") {
          that.rangChecked = "null";
          that.overRang();
          return;
        }
        let pickedFeature = viewer.scene.pick(event.position);
        if (!Cesium.defined(pickedFeature)) return;
        let property;
        if (pickedFeature.id.typeName == "selectData") {
          property = pickedFeature.id.info;
        } else {
          property = JSON.parse(pickedFeature.id);
          if (property.typeName == "point") {
            property = property.polyInfo;
          }
        }
        // console.log(property, "property");

        that.$bus.$emit("isViewInfo", property);
      }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
      //鼠标移动事件
      handler.setInputAction(function(event) {
        try {
          if (that.rangChecked != "null") {
            const position = that.getPosition(event.endPosition);
            if (position && that.rangData.lineMovingEntity) {
              that.rangData.lineMovingData = [
                that.rangData.lineMovingData[0],
                position
              ];
              that.rangData.lineMovingEntity.polyline.positions = Rang.updatePoints(
                that.rangData.lineMovingData
              );

              that.rangData.textMovingEntity.label.text = `距离上一个点${Rang.handleLineNum(
                that.rangData.lineMovingData[0],
                position
              ).toFixed(4)}米`;
              that.rangData.textMovingEntity.position = Rang.updatePoints(
                position
              );
            }
            return;
          }
          let pickedObject = viewer.scene.pick(event.endPosition);

          if (!Cesium.defined(pickedObject)) {
            viewer._container.style.cursor = "default";
            return;
          } else {
            viewer._container.style.cursor = "pointer";
          }
          if (pickedObject.id && pickedObject.id.lineIndex > -1) {
            return;
          }
          if (pickedObject.id.typeName == "selectData") {
          } else {
            let property = JSON.parse(pickedObject.id);
            if (that.dragFlag && property.typeName == "point") {
              that.isMovePosition = true;
              let cartesian = viewer.scene.pickPosition(event.endPosition);
              let cartographic = Cesium.Cartographic.fromCartesian(cartesian);
              that.lon = Number(
                Cesium.Math.toDegrees(cartographic.longitude).toFixed(7)
              );
              that.lat = Number(
                Cesium.Math.toDegrees(cartographic.latitude).toFixed(7)
              );
              let selectPoint = pointsDataSource.get(that.selectPointIndex);
              selectPoint.position = Cesium.Cartesian3.fromDegrees(
                that.lon,
                that.lat,
                0.1
              );
              that.$emit("viewCard", [that.lon, that.lat]);
            }
          }
        } catch (err) {
          console.log(err, "err-------鼠标移动事件");
        }
      }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);
      //鼠标抬起事件
      handler.setInputAction(function(event) {
        if (that.dragFlag) {
          that.dragFlag = false;
          viewer.scene.screenSpaceCameraController.enableRotate = true; //恢复相机
          if (that.isMovePosition) {
            that.updatePosition();
            that.isMovePosition = false;
          }
        }
      }, Cesium.ScreenSpaceEventType.LEFT_UP);
    },

    //更新点的颜色
    updatePointColor(index) {
      this.selectPointIndex = index;
      for (let i = 0; i < pointsDataSource.length; ++i) {
        let p = pointsDataSource.get(i);
        p.color = Cesium.Color.GREEN;
      }
      let selectPoint = pointsDataSource.get(index);
      selectPoint.color = Cesium.Color.BLUE;
    },

    //绘制选中的点
    drawPoint(property) {
      console.log(property, "property---drawPoint");

      // 销毁点
      if (pointsDataSource) {
        pointsDataSource.removeAll();
      }
      //绘制点
      property.point.forEach((item, index) => {
        let property = {
          typeName: "point",
          point: item,
          index: index,
          polyInfo: property
        };
        pointsDataSource.add({
          pixelSize: 10,
          color: Cesium.Color.GREEN,
          position: Cesium.Cartesian3.fromDegrees(item[0], item[1], 0.1),
          id: JSON.stringify(property)
        });
      });
    },

    //设置点击的线段的样式
    setPolyLineStyle(property, isUpdatePosition) {
      let point = property.point.map(item => {
        return [item[0], item[1], 0.08];
      });

      if (selectRoad) {
        viewer.entities.remove(selectRoad);
        selectRoad = null;
      }
      // this.linkRoadList.forEach((item)=>{
      //   viewer.entities.remove(item);
      // })
      // this.linkRoadList = [];

      if (!isUpdatePosition) {
        if (!this.selectId) {
          this.selectId = property.niId;
        } else {
          //点击的是同一根
          if (this.selectId == property.niId) {
            this.selectId = "";
            return;
          } else {
            this.selectId = property.niId;
          }
        }
      }

      selectRoad = viewer.entities.add({
        polyline: {
          positions: Cesium.Cartesian3.fromDegreesArrayHeights(point.flat()),
          width: 5,
          material: Cesium.Color.RED
        }
      });
      selectRoad.typeName = "selectData";
      selectRoad.info = property;

      //选中这条线的前驱
      // if(property.inLinkInfos){
      //   this.addSelectRoad(property.inLinkInfos,Cesium.Color.GREEN);
      // }
      // if(property.outLinkInfos){
      //   this.addSelectRoad(property.outLinkInfos,Cesium.Color.YELLOW);
      // }
    },

    addSelectRoad(linkInfos, color) {
      for (let i = 0; i < linkInfos.length; i++) {
        let linkAttr = linkInfos[i].linkAttr;
        if (linkAttr) {
          let pointList = this.updatePoint(linkAttr);
          let point = pointList.map(item => {
            return [item[0], item[1], 0];
          });
          let road = viewer.entities.add({
            polyline: {
              positions: Cesium.Cartesian3.fromDegreesArrayHeights(
                point.flat()
              ),
              width: 5,
              material: color
            }
          });
          this.linkRoadList.push(road);
        }
        let psInfos = linkInfos[i].psInfos;
        if (psInfos) {
          for (let j = 0; j < psInfos.length; j++) {
            let point = psInfos[j].shPos.map(item => {
              return [item[0], item[1], 0];
            });
            let psRoad = viewer.entities.add({
              polyline: {
                positions: Cesium.Cartesian3.fromDegreesArrayHeights(
                  point.flat()
                ),
                width: 5,
                material: Cesium.Color.BLACK
              }
            });
            this.linkRoadList.push(psRoad);
          }
        }
      }
    },

    setSelectData(value) {
      if (value.currentData.selected) {
        let pointList = value.currentData.polyInfo.point;
        this.setPolyLineStyle(value.currentData.polyInfo, false);
        viewer.camera.flyTo({
          destination: Cesium.Cartesian3.fromDegrees(
            pointList[Math.round(pointList.length / 2)][0],
            pointList[Math.round(pointList.length / 2)][1],
            parseInt(this.cameraHeight)
          )
        });
      } else {
        if (selectRoad) {
          viewer.entities.remove(selectRoad);
          selectRoad = null;
        }
        this.linkRoadList.forEach(item => {
          viewer.entities.remove(item);
        });
        this.linkRoadList = [];
        this.selectId = "";
      }
    },

    setCheckedData(value) {
      if (value.index <= 1) {
        SDPrimitives[value.index].forEach(item => {
          item.show = value.state;
        });
      } else if (value.title == "yhLaneinfo") {
        if (value.index) {
          this.setPolyLineVisible(value, lanePrimitive);
        } else {
          lanePrimitive.show = value.state;
        }
      } else if (value.title == "yhMarkinginfo") {
        if (value.index) {
          this.setPolyLineVisible(value, markingPrimitive);
        } else {
          markingPrimitive.show = value.state;
        }
      } else {
        //点击的是每个单独的子元素
        this.setPolyLineVisible(value, SDPrimitives[0][0]);
      }
    },

    setPolyLineVisible(value, primitive) {
      let pointList = value.index.polyInfo.point;
      viewer.camera.flyTo({
        destination: Cesium.Cartesian3.fromDegrees(
          pointList[Math.round(pointList.length / 2)][0],
          pointList[Math.round(pointList.length / 2)][1],
          parseInt(this.cameraHeight)
        )
      });
      let attributes = primitive.getGeometryInstanceAttributes(
        JSON.stringify(value.index.polyInfo)
      );
      attributes.show = Cesium.ShowGeometryInstanceAttribute.toValue(
        value.state
      );

      if (selectRoad) {
        if (selectRoad.info.niId == value.index.polyInfo.niId) {
          viewer.entities.remove(selectRoad);
          selectRoad = null;
        }
      }
    }
  },

  watch: {
    longitude: {
      handler(newVal, oldVal) {
        this.lon = newVal;
      },
      immediate: true,
      deep: true
    },
    latitude: {
      handler(newVal, oldVal) {
        this.lat = newVal;
      },
      immediate: true,
      deep: true
    }
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
#cesiumContainer {
  width: 100%;
  height: 100%;
  position: fixed;
}
</style>
