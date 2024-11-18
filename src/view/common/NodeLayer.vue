<template>
  <Drawer placement="left" :mask-closable="false" :mask="false" :closable="false" v-model="viewNode">
    <p slot="header">
      <span>展示节点信息</span>
      <Poptip word-wrap width="240">
        <Button type="info" style="margin-left: 35px;margin-top: 10px;">点击查看操作说明</Button>
        <div slot="content">
           <span style="font-size: 14px;color: red">tips:鼠标左击节点可以定位到对应的线,鼠标右击节点可以查看节点详细信息</span>
        </div>
      </Poptip>
      <Icon type="ios-close" size="30" class="close-button" @click="closeDrawer"/>
    </p>
    <virtualTree ref="virtualTree" v-for="item in treeData" :key="item.title" :dataSources="item"
                 @on-check-change="checkTree" @on-select-change="selectTreeData" @on-contextmenu="viewInfo"/>
  </Drawer>
</template>
<script>
  import virtualTree from "@/view/common/virtualTree";

  export default {
    components: {
      virtualTree,
    },
    props: {
      viewNode: {
        default: false
      },
    },
    data() {
      return {
        treeData: []
      }
    },
    mounted() {
      // 接收 事件
      this.$bus.$on('treeList', (value) => {
        this.treeData = JSON.parse(JSON.stringify(value));
        console.log("树形数据",this.treeData)
      })
      

      //选择折线以后的接收事件
      this.$bus.$on('polyData', (value) => {
        this.$emit('viewTree', true);
        this.setTreeData(value);
      })
    },
    methods: {
      closeDrawer() {
        this.$emit("closeDrawer");
      },

      setTreeData(value) {
        this.treeData.forEach((item) => {
          item.isSelect = false
          if (item.title == value.type) {
            this.$set(item, "expand", true);
            for (let i = 0, len = item.children.length; i < len; i++) {
              if (item.children[i].title == value.niId) {
                this.$set(item.children[i], "selected", true);
              } else {
                this.$set(item.children[i], "selected", false);
              }
            }
          } else {
            this.$set(item, "expand", false);
            for (let i = 0, len = item.children.length; i < len; i++) {
              this.$set(item.children[i], "selected", false);
            }
          }
        })
      },

      selectTreeData(currentData, group) {
        this.treeData.forEach((item) => {
          if (item.title != group) {
            for (let i = 0, len = item.children.length; i < len; i++) {
              if (item.children[i].selected == true) {
                this.$set(item.children[i], "selected", false);
              }
            }
          }
        })
        this.$bus.$emit('selectData', {currentData, group});
      },

      checkTree(index, state,title) {
        this.$bus.$emit('checkedData', {index, state,title});
      },

      viewInfo(currentData, group) {
        this.$bus.$emit('selectData', {currentData, group});
        this.$bus.$emit('isViewInfo', currentData.polyInfo);
      }
    },
    beforeDestroy() {
      this.$bus.$off('treeList');
      this.$bus.$off('polyData');
    }
  }
</script>
<style scoped>
  .close-button {
    z-index: 1;
    position: absolute;
    right: 8px;
    top: 8px;
    overflow: hidden;
    cursor: pointer;
  }

  /deep/ .ivu-drawer-body {
    height: calc(100% - 120px);
    padding-right: 0px !important;
  }

  /deep/ .ivu-poptip-inner{
    background: #f7f7f7;
  }
</style>
