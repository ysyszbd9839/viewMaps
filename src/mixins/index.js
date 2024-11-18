import Vue from 'vue'

Vue.mixin({
  data() {
    return {}
  },
  methods: {
    // 组件事件传递
    dispatch(componentName, eventName, ...rest) {
      let parent = this.$parent || this.$root
      let name = parent.$options.name

      while (parent && (!name || name !== componentName)) {
        parent = parent.$parent
        if (parent) {
          name = parent.$options.name
        }
      }

      if (parent) {
        parent.$emit.apply(parent, [eventName].concat(rest))
      }
    }
  }
})
