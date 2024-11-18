<!--
 * @LastEditTime: 2024-10-22 14:02:08
 * @Description: 
-->
<template>
  <Modal v-model="viewInfo" width="600" draggable>
    <p slot="header" style="text-align:center">
      <span>查看详细信息</span>
    </p>
    <Form :label-width="180">
      <FormItem v-for="(value, key) in formItem" :label="key" :key="key">
        <Input v-model="formItem[key]" readonly></Input>
      </FormItem>
      <FormItem label="points">
        <Input v-model="points" readonly type="textarea" :rows="5"></Input>
      </FormItem>
    </Form>
  </Modal>
</template>

<script>
export default {
  data() {
    return {
      viewInfo: false,
      formItem: {},
      points: ""
    };
  },

  mounted() {
    // 接收 事件
    this.$bus.$on("isViewInfo", value => {
      this.viewInfo = true;
      this.setModalData(value);
    });
  },

  methods: {
    setModalData(value) {
      try {
        console.log("value--------", value);
        let points = value.point;
        let pointsStr = points.join(",\n");
        this.points = pointsStr;
        if (value.typeName == "segm") {
          this.formItem = {
            niId: value.niId,
            type: value.typeName,
            fLaneNum: value.fLaneNum,
            processor_ids: value.processor_ids.join(","),
            successor_ids: value.successor_ids.join(",")
          };
        } else if (value.typeName == "YHlane") {
          this.formItem = {
            niId: value.niId,
            type: value.typeName,
            segmentId: value.segmentId,
            associated_stoplineId: value.associated_stoplineId,
            is_on_route: value.is_on_route,
            quality_score: value.quality_score,
            segment_crossing: value.segment_crossing,
            segment_score: value.segment_score,
            predecessor_segment_ids: value.predecessor_segment_ids.join(","),
            successor_segment_ids: value.successor_segment_ids.join(","),
            predecessor_lane_ids: value.predecessor_lane_ids.join(","),
            successor_lane_ids: value.successor_lane_ids.join(",")
          };
        } else if (value.typeName == "YHMarking") {
          this.formItem = {
            niId: value.niId,
            type: value.typeName,
            segmentId: value.segmentId,
            associated_stoplineId: value.associated_stoplineId,
            predecessor_segment_ids: value.predecessor_segment_ids.join(","),
            successor_segment_ids: value.successor_segment_ids.join(",")
          };
        } else {
          this.formItem = {
            niId: value.niId,
            type: value.typeName,
            segmentId: value.segmentId
          };
        }
      } catch (err) {
        console.log(err, "err---setModalData");
      }
    }
  }
};
</script>

<style></style>
