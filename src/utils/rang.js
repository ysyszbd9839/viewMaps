import * as Cesium from "Cesium";
let viewer = null;
export default class Rang {
  constructor(viewer_) {
    viewer = viewer_;
    this.lineEntityArrs = []; // 存放所有的测距线
    this.lineEntity = null;
    this.circleEntityArrs = []; // 存放所有测距线的点数组的集合
    this.circleEntityArr = []; // 当前操作的测距点数组
    this.pointsDataArrs = []; // 当前操作的测距点坐标数组的集合
    this.pointsDataArr = []; // 当前操作的测距点坐标数组
    this.lineMovingData = []; // 移动中的线的坐标数据
    this.lineMovingEntity = null; // 移动辅助线实体
    this.textMovingEntity = null;
    this.rangNumDataArr = [];
    this.rangNum = 0;
    this.currentNum = -1;
  }
  startRang() {
    this.currentNum++;
    console.log(this, "this");
  }
  // 给当前测距线数组添加数据
  handleCurPoint(position) {
    this.pointsDataArr.push(position);
  }
  // 创建移动中的线条数组数据，并创建移动中的线条
  handleMovingPoint(position) {
    this.lineMovingData = [position, position];
    this.textMovingEntity = viewer.entities.add(this.drawTextRang(position));
  }
  updatePoints() {
    return new Cesium.CallbackProperty(() => {
      return this.pointsDataArr;
    }, false); // 更新线条的位置
  }
  endRang() {
    viewer.scene.primitives.remove(this.lineMovingEntity);
    viewer.entities.remove(this.textMovingEntity);
    this.textMovingEntity = null;
    this.lineMovingEntity = null;
    this.lineMovingData = [];
  }
  // 测距
  handleLineNum(curPoint, prePoint, sign = "static") {
    const distance = Cesium.Cartesian3.distance(prePoint, curPoint);
    // 如果在移动过程中返回当前的距离
    if (sign == "moving") {
      return distance;
    } else {
      this.rangNum += distance;
      return this.rangNum;
    }
  }
  // 绘制线
  drawLine(id, points) {
    return {
      id: id,
      polyline: {
        positions: new Cesium.CallbackProperty(() => {
          return points;
        }, false),
        material: Cesium.Color.RED,
        width: 2
      }
    };
  }
  // 绘制文本
  drawTextRang(point, text = "") {
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
  }
}
