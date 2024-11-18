<!--
 * @LastEditTime: 2024-10-23 10:09:53
 * @Description: 
-->
<template>
  <div class="rang-box">
    <!-- <Button class="drawer-button" @click="change">测距</Button> -->
    <Button icon="ios-git-merge" type="info" @click="handleRang">测距</Button>
  </div>
</template>
<script>
// import { Viewer } from "cesium";
// import { DistanceMeasure } from "@cesium-extends/measure";

export default {
  props: {
    rangChecked: {
      default: "null"
    }
  },
  data() {
    return {};
  },
  mounted() {},
  methods: {
    handleRang() {
      this.$bus.$emit("rangFun", {
        rangChecked: "ready"
      });
    }
  }
};
</script>
<style>
.rang-box {
  width: 50px;
  height: 40px;
}
</style>
