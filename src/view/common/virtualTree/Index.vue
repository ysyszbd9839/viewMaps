<template>
  <div>
    <span class="ivu-tree-arrow">
      <Icon @click="handleExpand" :type="arrowType"></Icon>
    </span>
    <Checkbox :indeterminate="!checkAll&&checkSome"
              v-model="checkAll"
              @click.prevent.native="handleCheckAll"></Checkbox>
    <span class="ivu-tree-title" :style="{color:dataSources.color}">{{dataSources.title}}</span>
    <virtual-list ref="listscroll" v-if="dataSources.expand"
                  class="check-virtual-list"
                  :keeps="100"
                  :data-key="'title'"
                  :data-sources="dataSources.children"
                  :data-component="dataComponent"
    />
  </div>
</template>

<script>
  import VirtualList from "vue-virtual-scroll-list";
  import ListItem from "./ListItem.vue";

  export default {
    name: "virtualTree",
    components: {
      "virtual-list": VirtualList,
    },
    props: {
      dataSources: {
        type: Object,
        default() {
          return {};
        },
      },
    },
    data() {
      return {
        dataComponent: ListItem,
      };
    },
    computed: {
      arrowType() {
        let type = 'ios-arrow-forward';
        if (this.dataSources.expand) {
          type = 'ios-arrow-down'
        } else {
          type = 'ios-arrow-forward'
        }
        return type;
      },

      checkAll() {
        let isSelect = false;
        if (this.dataSources.children.length > 0) {
          isSelect = this.dataSources.children.every(function (item) {
            return item.checked;
          });
        }
        return isSelect;
      },

      checkSome() {
        let isSelect = false;
        if (this.dataSources.children.length > 0) {
          isSelect = this.dataSources.children.some(function (item) {
            return item.checked;
          });
        }
        return isSelect;
      }
    },

    mounted() {
      // 订阅勾选事件
      this.$on("virtual-check-change", (item, state) => {
        this.$emit("on-check-change", item, state, this.dataSources.title);
      });

      this.$on("node-click-change", (val) => {
        this.dataSources.isSelect = true
        for (let i = 0, len = this.dataSources.children.length; i < len; i++) {
          if (this.dataSources.children[i].title == val.title) {
            this.$set(this.dataSources.children[i], "selected", !this.dataSources.children[i].selected);
          } else {
            this.$set(this.dataSources.children[i], "selected", false);
          }
        }
        this.$emit("on-select-change", val, this.dataSources.title);
      });

      this.$on('contextmenu', (val)=>{
        for (let i = 0, len = this.dataSources.children.length; i < len; i++) {
          if (this.dataSources.children[i].title == val.title) {
            this.$set(this.dataSources.children[i], "selected", true);
          } else {
            this.$set(this.dataSources.children[i], "selected", false);
          }
        }
        this.$emit('on-contextmenu', val,this.dataSources.title);
      });
    },
    watch: {
      'dataSources': {
        handler(newVal, oldVal) {
          if (newVal.expand) {
            for (let i = 0, len = newVal.children.length; i < len; i++) {
              if (newVal.children[i].selected) {
                if(this.dataSources.isSelect ==false){
                  setTimeout(()=>{
                    this.$refs.listscroll.scrollToIndex(i-10); //跳转到大概中间位置，便于查看前驱后继的节点
                  },0)
                }
              }
            }
          }
        },
        deep: true,
        immediate: true
      }
    },
    methods: {
      handleCheckAll() {
        if (this.checkSome == true) {
          for (let i = 0, len = this.dataSources.children.length; i < len; i++) {
            this.$set(this.dataSources.children[i], "checked", false);
          }
        } else {
          for (let i = 0, len = this.dataSources.children.length; i < len; i++) {
            this.$set(this.dataSources.children[i], "checked", !this.dataSources.children[i].checked);
          }
        }
        this.$emit("on-check-change", this.dataSources.index, this.checkAll,this.dataSources.title);
      },

      handleExpand() {
        this.dataSources.expand = !this.dataSources.expand;
      }
    },
  };
</script>

<style>
  .check-virtual-list {
    max-height: 755px;
    overflow: auto;
    padding: 0 10px;
  }
</style>
                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                
