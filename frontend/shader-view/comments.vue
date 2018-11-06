<template>
  <div class="comments">
    <p>Comments go here</p>
  </div>
</template>

<script lang="ts">

import { Vue, Component } from 'vue-property-decorator';

@Component
export default class Comments extends Vue {}
</script>

<style scoped>

.comments {
    border: 2px dotted red;
}
</style>
