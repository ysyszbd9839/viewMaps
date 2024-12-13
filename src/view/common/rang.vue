<!--
 * @LastEditTime: 2024-10-28 10:12:10
 * @Description: 
-->
<template>
  <div class="rang-box">
    <Button icon="ios-git-merge" type="info" @click="handleRoute"
      >路线规划</Button
    >
    <Poptip width="170" placement="bottom-end">
      <Button icon="ios-git-merge" type="info" @click="handleRang">测距</Button>
      <div class="api" slot="content">
        <div class="rang-tip">
          使用提示：<span class="rang-tip-text">右键结束</span>
        </div>
      </div>
    </Poptip>
  </div>
</template>
<script>
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
    },
    handleRoute() {
      this.$bus.$emit("handleRoute", {
        routeChecked: "ready"
      });
    }
  }
};
</script>
<style>
.rang-box {
  width: 200px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.rang-tip {
  width: 100%;
  color: red;
}
.rang-tip-text {
  font-weight: bold;
}
</style>
