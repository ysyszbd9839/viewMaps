<!--
 * @LastEditTime: 2024-10-24 19:54:52
 * @Description: 
-->
<template>
  <div id="cesiumContainer"></div>
</template>

<script>
import Draw from "@/utils/draw.js";
import reductionBias from "@/utils/reductionBias.js";
import common from "@/utils/common.js";
import * as Cesium from "Cesium";
import axios from "axios";
import Rang from "@/utils/rang.js";

let viewer = null,
  selectRoad = null,
  pointsDataSource = null,
  rangLineEntity = null,
  rangLineMoveEntity = null,
  lanePrimitive = null,
  lanePrimitiveRang = null,
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
      distanceMeasure: null,
      rangChecked: "null",
      Rang: null,
      rangPoints: [],
      rangMovePoints: [],
      lineRang: [],
      rangNum: 0,
      circleRang: null,
      circleRangArr: []
    };
  },

  mounted() {
    this.initMap();

    this.$bus.$on("rangFun", value => {
      console.log("rangFun--", value);
      this.rangChecked = value.rangChecked;
    });
    this.$bus.$on("clearFile", value => {
      console.log(value, "value---接收文件情理信号");
    });
    this.$bus.$on("JSONData", value => {
      console.log("SD数据", value);
      if (value.fileName.includes("SD")) {
        //这是SD导航数据
        SDList = value.data.result;
        let color = null,
          width = 0,
          colorValue = "";
        SDList.forEach((item, index) => {
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
        let stopInstances = [];
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
          stopInstances.push(instance);
        }
        stopLinePrimitive = Draw.addPrimitive(
          stopInstances,
          Cesium.Color.MAGENTA.withAlpha(1),
          "PolylineOutline"
        );
        viewer.scene.primitives.add(stopLinePrimitive);

        //绘制斑马线
        let zebracrossings = value.data.zebracrossings;
        let zabraInstances = [];
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
          zabraInstances.push(instance);
        }
        zebracrossingsPrimitive = Draw.addPrimitive(
          zabraInstances,
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
                  segmentList[i].quality_score
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
                    item.quality_score
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
                let pointList = this.updatePoint(searchData);
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
    initMap() {
      viewer = Draw.drawMap("cesiumContainer");
      window.viewer = viewer;
      // 启用倾斜功能
      viewer.scene.screenSpaceCameraController.enableTilt = true;
      viewer.scene.camera.moveEnd.addEventListener(function() {
        const pitch = viewer.camera.pitch; // 获取当前俯仰角
        console.log("Current Pitch:", pitch);
      });

      pointsDataSource = viewer.scene.primitives.add(
        new Cesium.PointPrimitiveCollection()
      );
      viewer.scene.globe.depthTestAgainstTerrain = false;
      this.getData();
      this.addClickEvent();
      this.Rang = new Rang(viewer);
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
      segmentList.forEach(item => {
        if (item.quality_score > 0 && item.lanes.length) {
          let property = this.setYHProperty(
            item.lanes[0],
            "YHlane",
            item.segmentId,
            item.predecessor_segment_ids,
            item.successor_segment_ids,
            item.associated_stoplineId,
            item.crossing,
            item.quality_score
          );

          arr.push({
            title: item.segmentId,
            checked: true,
            selected: false,
            polyInfo: property
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
          segmentList[i].quality_score
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
      segmScore = ""
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
          segmScore
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
      segmScore = ""
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
        successor_lane_ids: item.successor_lane_ids || []
      };
      if (type == "YHlane") {
        property = {
          ...property,
          quality_score: item.quality_score,
          segment_crossing: segmCrossing,
          segment_score: segmScore
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
        let pointList = this.updatePoint(segm[i]);
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
          if (linkAttr) {
            let inLinkPoint = this.updatePoint(linkAttr);
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
              let inLinkPoint = this.updatePoint(psInfos[i]);
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
          title: item.niId,
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
      let property = {
        typeName: "segm",
        point: this.updatePoint(item),
        niId: item.niId,
        type: "导航" + Number(index + 1) + "info",
        fLaneNum: this.setfLaneNum(item),
        processor_ids: this.setCessorIds(item).processor_ids,
        successor_ids: this.setCessorIds(item).successor_ids,
        inLinkInfos: item.inLinkInfos,
        outLinkInfos: item.outLinkInfos
      };
      return property;
    },

    //更新点的坐标
    updatePoint(item) {
      let pointList = [];
      item.shPos.forEach(pos => {
        let point = pos.split(",");
        pointList.push([Number(point[0]), Number(point[1])]);
      });
      return pointList;
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
    addRangCircle(point, text, id) {
      viewer.entities.add({
        name: "_range",
        id: "range_" + id,
        position: point,
        point: {
          pixelSize: 0,
          disableDepthTestDistance: 500
        },
        label: {
          text: text,
          font: "normal 18px SimHei",
          fillColor: Cesium.Color.ORANGE, // 文本颜色
          outlineWidth: 0, // 轮廓宽度
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM, // 圆点位置
          horizontalOrigin: Cesium.HorizontalOrigin.LEFT, // 文本的位置
          pixelOffset: new Cesium.Cartesian2(0, -10) // 文本偏移量，Cartesian2
        }
      });
    },
    addClickEvent() {
      let handler = new Cesium.ScreenSpaceEventHandler(viewer.scene.canvas);
      //鼠标左击事件
      let that = this;
      handler.setInputAction(function(event) {
        if (that.rangChecked != "null") {
          const position = viewer.camera.pickEllipsoid(
            event.position,
            viewer.scene.globe.ellipsoid
          );
          if (that.rangChecked != "start") {
            that.rangChecked = "start";
            console.log(Rang, "rang=======");

            Rang.startRang();
          }
          if (position) {
            Rang.handleCurPoint(position);
            // that.rangPoints.push(position);
            if (that.rangChecked == "start") {
              Rang.handleMovingPoint(position);
              // that.rangMovePoints = [position, position];
              if (!Rang.textMovingEntity) {
                Rang.textMovingEntity = viewer.entities.add(
                  Rang.drawTextRang(position, "")
                );
              }
              // if (!that.circleRang) {
              //   that.circleRang = viewer.entities.add(
              //     that.drawTextRang(position, "")
              //   );
              // }
            }
            let num = 0;
            // 超过两个点可以开始计算距离了
            if (Rang.pointsDataArr.length > 1) {
              const prePoint =
                Rang.pointsDataArr[Rang.pointsDataArr.length - 2];
              const curPoint =
                Rang.pointsDataArr[Rang.pointsDataArr.length - 1];
              num = Rang.handleLineNum(curPoint, prePoint);
            }
            // if (that.rangPoints.length > 1) {
            //   const prePoint = that.rangPoints[that.rangPoints.length - 2];
            //   const curPoint = that.rangPoints[that.rangPoints.length - 1];
            //   num = that.handleLineNum(curPoint, prePoint);
            // }
            if (Rang.lineEntityArrs.length == Rang.currentNum) {
              Rang.lineEntity = Rang.updatePoints(); // 更新线条的位置
            } else {
              Rang.lineMovingEntity = viewer.entities.add(
                Rang.drawLine(`yh_rang_line_moving`, Rang.lineMovingArr)
              );
              Rang.lineEntity = viewer.entities.add(
                Rang.drawLine(`yh_rang_line${Rang.currentNum}`, Rang.pointsArr)
              );
              Rang.lineEntityArrs.push(Rang.lineEntity);
            }

            // if (rangLineEntity) {
            //   rangLineEntity.polyline.positions = new Cesium.CallbackProperty(
            //     () => {
            //       return that.rangPoints;
            //     },
            //     false
            //   ); // 更新线条的位置
            // } else {
            //   rangLineEntity = viewer.entities.add(
            //     that.drawLine(`yh_rang_line`, that.rangPoints, Cesium.Color.RED)
            //   );
            //   rangLineMoveEntity = viewer.entities.add(
            //     that.drawLine(
            //       `yh_rang_line_moving`,
            //       that.rangMovePoints,
            //       Cesium.Color.RED
            //     )
            //   );
            // }
            Rang.circleEntityArr.push(
              viewer.entities.add(
                Rang.drawPointRang(
                  `yh_rang${Rang.currentNum}_point${Rang.circleEntityArr
                    .length - 1}`,
                  position,
                  Rang.pointsDataArr.length - 1 == 0
                    ? ""
                    : num.toFixed(4) + "米",
                  Rang.pointsDataArr.length - 1 == 0
                    ? "static/map_start.png"
                    : "static/map_center.png"
                )
              )
            );
            // that.circleRangArr.push(
            //   viewer.entities.add(
            //     that.drawPointRang(
            //       `yh_rang_point${that.rangPoints.length - 1}`,
            //       position,
            //       that.rangPoints.length - 1 == 0 ? "" : num.toFixed(4) + "米",
            //       that.rangPoints.length - 1 == 0
            //         ? "static/map_start.png"
            //         : "static/map_center.png"
            //     )
            //   )
            // );
          }
          return;
        }
        that.dragFlag = false;
        let pickedFeature = viewer.scene.pick(event.position);
        if (!Cesium.defined(pickedFeature)) return;
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
      }, Cesium.ScreenSpaceEventType.LEFT_CLICK);
      //鼠标按下事件
      handler.setInputAction(function(event) {
        if (that.rangChecked != "null") return;
        let pickedFeature = viewer.scene.pick(event.position);
        if (!Cesium.defined(pickedFeature)) return;
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
      }, Cesium.ScreenSpaceEventType.LEFT_DOWN);
      //鼠标滑轮事件
      handler.setInputAction(function(event) {
        let cameraHeight = viewer.camera.positionCartographic.height;
        console.log(cameraHeight, "cameraHeight");

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
          Rang.endRang();
          // viewer.scene.primitives.remove(rangLineMoveEntity);
          // viewer.entities.remove(that.circleRang);
          // that.circleRang = null;
          // that.rangMovePoints = [];
          return;
        }
        let pickedFeature = viewer.scene.pick(event.position);
        // console.log(pickedFeature, 'pickedFeature');
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
        that.$bus.$emit("isViewInfo", property);
      }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
      //鼠标移动事件
      handler.setInputAction(function(event) {
        try {
          if (that.rangChecked != "null") {
            const position = viewer.camera.pickEllipsoid(
              event.endPosition,
              viewer.scene.globe.ellipsoid
            );
            if (position && Rang.lineMovingEntity) {
              Rang.lineMovingData = [Rang.lineMovingData[0], position];
              Rang.lineMovingEntity.polyline.positions = new Cesium.CallbackProperty(
                () => {
                  return Rang.lineMovingData;
                },
                false
              );
              Rang.textMovingEntity.label.text = `距离上一个点${Rang.handleLineNum(
                Rang.lineMovingData[0],
                position,
                "moving"
              ).toFixed(4)}米`;
              Rang.textMovingEntity.position = new Cesium.CallbackProperty(
                () => {
                  return position;
                },
                false
              );
            }

            // if (position && rangLineMoveEntity) {
            //   that.rangMovePoints = [that.rangMovePoints[0], position];
            //   rangLineMoveEntity.polyline.positions = new Cesium.CallbackProperty(
            //     () => {
            //       return that.rangMovePoints;
            //     },
            //     false
            //   );
            //   that.circleRang.label.text = `距离上一个点${that
            //     .handleLineNum(that.rangMovePoints[0], position, "moving")
            //     .toFixed(4)}米`;
            //   that.circleRang.position = new Cesium.CallbackProperty(() => {
            //     return position;
            //   }, false);
            // }
            return;
          }
          let pickedObject = viewer.scene.pick(event.endPosition);
          if (!Cesium.defined(pickedObject)) {
            viewer._container.style.cursor = "default";
            return;
          } else {
            viewer._container.style.cursor = "pointer";
            // 判断鼠标是否在测距线和点上，如果在则return出去，以免报错
            if (
              pickedObject.id._id &&
              (pickedObject.id._id.includes("yh_rang_point") ||
                pickedObject.id._id.includes("yh_rang_line"))
            )
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
          console.log(err, "err---鼠标移动事件");
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
    // 测距
    handleLineNum(curPoint, prePoint, sign = "stop") {
      const distance = Cesium.Cartesian3.distance(prePoint, curPoint);
      // 如果在移动过程中返回当前的距离
      if (sign == "moving") {
        return distance;
      } else {
        this.rangNum += distance;
        return this.rangNum;
      }
    },
    // 绘制线
    drawLine(id, points, color) {
      return {
        id: id,
        polyline: {
          positions: new Cesium.CallbackProperty(() => {
            return points;
          }, false),
          material: color,
          width: 2
        }
      };
    },
    // 绘制点
    drawPointRang(id, point, text, icon = "static/close.png") {
      return {
        id: id,
        position: point,
        point: {
          pixelSize: 0,
          color: Cesium.Color.YELLOW
        },
        label: {
          text: text,
          font: "normal 18px SimHei",
          fillColor: Cesium.Color.DODGERBLUE,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
          pixelOffset: new Cesium.Cartesian2(26, -8),
          showBackground: true,
          backgroundColor: Cesium.Color.FLORALWHITE,
          backgroundRadius: 0
        },
        billboard: {
          image: icon, // 图标的路径
          width: 30,
          height: 30,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
          pixelOffset: new Cesium.Cartesian2(-12, -6),
          showBackground: true,
          backgroundColor: Cesium.Color.FLORALWHITE
        }
      };
    },
    drawTextRang(point, text) {
      return {
        id: "yh_rang_moving_text",
        position: point,
        label: {
          text: text,
          font: "14px Helvetica",
          fillColor: Cesium.Color.BLACK,
          outlineColor: Cesium.Color.BLACK,
          outlineWidth: 2,
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
          pixelOffset: new Cesium.Cartesian2(0, -10),
          showBackground: true,
          backgroundColor: Cesium.Color.FLORALWHITE
        }
      };
    },
    // 删除测距数据
    delRang() {},

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
