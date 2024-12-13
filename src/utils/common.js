import proj4 from 'proj4'
function getAngle(lng_a, lat_a, lng_b, lat_b) {
  let a = (90 - lat_b) * Math.PI / 180;
  let b = (90 - lat_a) * Math.PI / 180;
  let AOC_BOC = (lng_b - lng_a) * Math.PI / 180;
  let cosc = Math.cos(a) * Math.cos(b) + Math.sin(a) * Math.sin(b) * Math.cos(AOC_BOC);
  let sinc = Math.sqrt(1 - cosc * cosc);
  let sinA = Math.sin(a) * Math.sin(AOC_BOC) / sinc;
  let A = Math.asin(sinA) * 180 / Math.PI;
  let res = 0;
  if (lng_b > lng_a && lat_b > lat_a) res = A;
  else if (lng_b > lng_a && lat_b < lat_a) res = 180 - A;
  else if (lng_b < lng_a && lat_b < lat_a) res = 180 - A;
  else if (lng_b < lng_a && lat_b > lat_a) res = 360 + A;
  else if (lng_b > lng_a && lat_b == lat_a) res = 90;
  else if (lng_b < lng_a && lat_b == lat_a) res = 270;
  else if (lng_b == lng_a && lat_b > lat_a) res = 0;
  else if (lng_b == lng_a && lat_b < lat_a) res = 180;
  return res + 90;
}

function getMidPoint(lng_a, lat_a, lng_b, lat_b) {
  const lngca = (parseFloat(lng_a) - parseFloat(lng_b)) / 2;
  const latca = (parseFloat(lat_a) - parseFloat(lat_b)) / 2;
  const lngcenter = parseFloat(lng_b) + lngca;
  const latcenter = parseFloat(lat_b) + latca;
  const pointcenter = [lngcenter, latcenter];
  return pointcenter;
}

// gps 转平面坐标
function wgs84Totmerc(arr) {
  // 初始化UTM投影，这里的"utm"是UTM投影的名称，"zone"是UTM区域的号码，"south"表示南半球
  proj4.defs("UTM","+proj=utm +ellps=WGS84 +datum=WGS84 +units=m +zone=50 +no_defs");
// 定义源和目标坐标系统
  var source = new proj4.Proj('UTM');
  var destination = new proj4.Proj('+proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees');
  let tmerc = proj4.transform(source, destination, arr);
  return tmerc
}

export default {
  getAngle,
  getMidPoint,
  wgs84Totmerc
}
