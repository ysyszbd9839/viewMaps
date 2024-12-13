<template>
  <div style="height: 100%">
    <InitAMap
      ref="map"
      @viewCard="viewCard"
      :longitude="longitude"
      :latitude="latitude"
    ></InitAMap>
    <Button class="drawer-button" @click="viewNode">查看节点数据</Button>
    <NodeLayer
      :viewNode="isViewNode"
      @closeDrawer="closeView"
      @viewTree="viewNode"
    ></NodeLayer>
    <p class="tips">
      tips：鼠标右击线段可以查看该段的详细信息,鼠标左击线段可以查看前驱和后继（红色表示选择的当前segm，绿色表示选中segm的inLinks,
      黄色表示选中segm的outLinks）
    </p>
    <SearchPosition></SearchPosition>
    <InfoModal></InfoModal>
    <div class="operate-area">
      <Upload :fileType="'SD'"></Upload>
      <Upload :fileType="'yh'" style="margin-left: 10px"></Upload>
    </div>
    <div class="select-data bg">
      <p>用于当前数据的展示与隐藏</p>
      <CheckboxGroup v-model="viewList" @on-change="viewData">
        <Checkbox label="all_boundarylines"></Checkbox>
        <Checkbox label="lane_center"></Checkbox>
        <Checkbox label="road"></Checkbox>
      </CheckboxGroup>
    </div>
    <div class="tools-box">
      <Rang :rangChecked="rangChecked"></Rang>
    </div>
    <Card dis-hover class="card-list" v-show="isViewCard">
      <p slot="title">给经纬度添加偏移值</p>
      <div>
        <span>经度：</span><Input v-model="longitude" style="width:150px" />
      </div>
      <div style="margin-top: 10px">
        纬度：<Input v-model="latitude" style="width:150px" />
      </div>
      <Button style="margin-top: 10px" type="primary" @click="modifyPosition"
        >确定</Button
      >
    </Card>
  </div>
</template>

<script>
import InitAMap from "../view/main/AMapContainer.vue";
import Upload from "../view/common/Upload.vue";
import InfoModal from "../view/common/InfoModal";
import NodeLayer from "../view/common/NodeLayer.vue";
import SearchPosition from "../view/common/SearchPosition.vue";
import Rang from "../view/common/rang.vue";
export default {
  name: "Main",
  components: {
    InitAMap,
    Upload,
    InfoModal,
    NodeLayer,
    SearchPosition,
    Rang
  },
  data() {
    return {
      viewList: ["road"],
      isViewNode: false,
      isViewCard: false,
      longitude: "",
      latitude: "",
      rangChecked: "null"
    };
  },

  mounted() {
    //阻止页面上的右击默认事件
    window.oncontextmenu = function(e) {
      e.preventDefault();
    };
  },

  methods: {
    viewCard(point) {
      this.isViewCard = true;
      this.longitude = point[0] + "";
      this.latitude = point[1] + "";
    },

    viewData(data) {
      this.$bus.$emit("viewList", data);
    },

    viewNode() {
      this.isViewNode = true;
    },

    closeView() {
      this.isViewNode = false;
    },

    modifyPosition() {
      this.$refs.map.updatePosition();
    }
  }
};
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style>
.drawer-button {
  position: absolute;
  left: 15px;
  top: 15px;
  z-index: 10;
}

.operate-area {
  position: fixed;
  top: 15px;
  right: 20px;
  display: flex;
}

.tools-box {
  position: fixed;
  top: 126px;
  right: 15px;
  display: flex;
}

.select-data {
  position: fixed;
  top: 60px;
  right: 15px;
}

.card-list {
  position: fixed !important;
  top: 165px;
  right: 15px;
}

.bg {
  background: #fff;
  border-radius: 5px;
  padding: 5px;
}

.tips {
  position: absolute;
  top: 50px;
  left: 15px;
  color: red;
  padding: 5px;
  border-radius: 5px;
  background: #fff;
  width: 240px;
}
</style>
