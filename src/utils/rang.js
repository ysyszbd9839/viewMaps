import * as Cesium from "Cesium";

// 结束测距：应修改刚才测距数据的最后一个图标
function endRang(entity, num) {
  entity.label.text = `总长：${num.toFixed(4)}米`;
  entity.billboard.image = "static/map.end.png";
  return entity;
}
// 绘制文本
export function drawTextRang(point, text = "") {
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
// 绘制线
export function drawLine(id, points, lineIndex) {
  return {
    id: id,
    lineIndex: lineIndex,
    polyline: {
      positions: new Cesium.CallbackProperty(() => {
        return points;
      }, false),
      material: Cesium.Color.RED,
      width: 2
    }
  };
}
function drawMapIcon(
  id,
  point,
  lineIndex,
  pointIndex,
  icon = "static/map_start.png"
) {
  return {
    id: id,
    lineIndex: lineIndex,
    pointIndex: pointIndex,
    typeName: "yh_rang_map_icon",
    position: point,
    billboard: {
      image: icon, // 图片路径
      width: 40, // 宽度
      height: 40, // 高度
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
      pixelOffset: new Cesium.Cartesian2(-20, -3),
      showBackground: true,
      backgroundColor: Cesium.Color.FLORALWHITE
    }
  };
}
function drawDelIcon(
  id,
  point,
  lineIndex,
  pointIndex,
  icon = "static/close.png"
) {
  return {
    id: id,
    lineIndex: lineIndex,
    pointIndex: pointIndex,
    typeName: "yh_rang_del_icon",
    position: point,
    billboard: {
      image: icon, // 图片路径
      width: 15, // 宽度
      height: 15, // 高度
      verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
      horizontalOrigin: Cesium.HorizontalOrigin.LEFT,
      pixelOffset: new Cesium.Cartesian2(20, -12),
      showBackground: true,
      backgroundColor: Cesium.Color.FLORALWHITE
    }
  };
}
// 绘制点
export function drawPointRang(id, point, text, lineIndex, pointIndex) {
  return {
    id: id,
    lineIndex: lineIndex,
    pointIndex: pointIndex,
    typeName: "yh_rang_circle_icon",
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
      pixelOffset: new Cesium.Cartesian2(35, -8),
      showBackground: true,
      backgroundColor: Cesium.Color.FLORALWHITE
    }
  };
}
function getTextW(labelText) {
  let tempCanvas = document.createElement("canvas");
  let tempContext = tempCanvas.getContext("2d");
  tempContext.font = "normal 26px SimHei"; // 与将要使用的字体一致
  return tempContext.measureText(labelText).width;
}
function drawMapImg(id, labelText) {
  // 创建一个临时的 Canvas 元素来测量文字宽度
  let canvas = document.createElement("canvas");
  canvas.id = id; // 添加 ID 属性
  let context = canvas.getContext("2d");
  console.log(getTextW(labelText), "textWidth");

  canvas.width = getTextW(labelText) + 20; // 添加一些边距
  canvas.height = 28;
  context.font = "normal 26px SimHei"; // 与 label 中的字体一致
  context.fillStyle = "rgba(255, 255, 255, 0.8)";
  context.fillRect(0, 0, canvas.width, canvas.height);
  // 绘制边框
  // context.strokeStyle = "black";
  // context.strokeRect(0, 0, canvas.width, canvas.height);
  // 绘制文字
  context.fillStyle = "black";
  context.font = "normal 26px SimHei";
  context.fillText(labelText, 10, 24); // 绘制文字
  return canvas;
}
export function updatePoints(points) {
  return new Cesium.CallbackProperty(() => {
    return points;
  }, false); // 更新线条的位置
}
// 测距
export function handleLineNum(curPoint, prePoint) {
  return Cesium.Cartesian3.distance(prePoint, curPoint);
}

export default {
  drawTextRang,
  drawLine,
  drawPointRang,
  updatePoints,
  handleLineNum,
  endRang,
  drawMapIcon,
  drawMapImg,
  drawDelIcon
};
