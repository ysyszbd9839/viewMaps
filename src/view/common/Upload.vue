<!--
 * @LastEditTime: 2024-10-21 18:05:28
 * @Description: 
-->
<template>
  <div class="file-box">
    <div v-if="fileName" class="file-name">
      <!-- <img src="@/assets/close.svg" alt="" class="file-close" @click="closeFile"> -->
      {{ fileName }}
    </div>
    <Button class="upload-button" icon="ios-cloud-upload-outline">
      <span>上传{{ fileType }}导航文件</span>
      <input
        ref="file"
        class="input-file"
        type="file"
        :accept="uploadName"
        title=""
        @change="onChange"
      />
    </Button>
  </div>
</template>
<script>
export default {
  props: {
    fileType: {
      default: ""
    },
    enter: {
      default: "Main"
    }
  },
  data() {
    return {
      fileName: "",
      uploadName: "",
      uploadData: [],
      color: ["orange", "green"]
    };
  },
  mounted() {
    this.uploadName = "application/json";
  },
  methods: {
    closeFile() {
      console.log(this.fileType, 'close---');
      
      this.$bus.$emit("clearFile", {
        key: this.fileType,
        fileName: this.fileName
      });
    },
    onChange() {
      const file = this.$refs.file.files[0];
      //解决上传同名文件不触发的问题
      this.$refs.file.value = "";
      if (!file) return;

      if (file.name.includes(this.fileType)) {
        this.fileName = file.name;
        this.$Spin.show();
        let that = this;
        let fr = new FileReader();
        fr.readAsDataURL(file);
        fr.onloadend = function(e) {
          let path = e.target.result;
          var xmlHttp = new window.XMLHttpRequest();
          xmlHttp.open("GET", path, false);
          xmlHttp.send(null);
          try {
            let xmlDoc = JSON.parse(xmlHttp.responseText);
            that.uploadData = xmlDoc.result;
            console.log(that.uploadData, 'that.uploadData');
            
            let datas = {
              code: 200,
              data: xmlDoc,
              msg: "success",
              fileName: file.name
            };
            that.$bus.$emit("JSONData", datas);
          } catch (e) {
            that.$Spin.hide();
            that.$Message.warning("JSON文件格式不正确！");
          }
        };
      } else {
        this.$Message.warning("请上传相关的导航文件！");
      }
    }
  }
};
</script>
<style>
.file-box {
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-button {
  position: relative;
}

.input-file {
  position: absolute;
  width: 150px;
  height: 32px;
  opacity: 0;
  cursor: pointer;
  left: 0px;
}

.file-name {
  height: 100%;
  display: flex;
  align-items: center;
  background: rgba(28, 12, 241, 0.6);
  color: #ffffff;
  padding: 0 5px;
  border-radius: 4px;
  margin: 0 4px;
  line-height: 32px;
}
.file-close {
  width: 20px;
  height: 20px;
  margin-right: 2px;
}
</style>
