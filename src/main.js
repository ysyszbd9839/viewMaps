// The Vue build version to load with the `import` command
// (runtime-only or standalone) has been set in webpack.base.conf with an alias.
import Vue from 'vue'
import App from './App'
import router from './router'

import Common from '@/utils/common.js'
Vue.prototype.Common=Common;

import './mixins'

//loadsh库相关文件
import isNaN from 'lodash/isNaN'
Vue.prototype.isNaN = isNaN

//viewUI相关数据
import 'view-design/dist/styles/iview.css';
import {Spin,Modal,Message,Button,Form,FormItem,Input,CheckboxGroup,Checkbox,Drawer,Poptip,Icon,Card} from 'view-design'
Vue.component('Spin',Spin);
Vue.prototype.$Spin = Spin
Vue.component('Modal',Modal);
Vue.prototype.$Modal = Modal
Vue.prototype.$Message = Message;
Vue.component('Button', Button);
Vue.component('Form',Form);
Vue.component('FormItem',FormItem);
Vue.component('Input',Input);
Vue.component('CheckboxGroup',CheckboxGroup);
Vue.component('Checkbox',Checkbox);
Vue.component('Drawer', Drawer);
Vue.component('Poptip',Poptip);
Vue.component('Icon', Icon);
Vue.component('Card',Card)

Vue.config.productionTip = false

Vue.prototype.$bus = new Vue(); // 设置 挂载至 vue 的原型上

/* eslint-disable no-new */
new Vue({
  el: '#app',
  router,
  components: { App },
  template: '<App/>'
})
