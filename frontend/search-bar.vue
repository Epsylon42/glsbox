<template>
<div class="field has-addons">
  <div class="control">
    <input
      v-model="searchString"
      class="input"
      type="text"
      placeholder="Search"
      @keydown="searchIfEnter"
      >
  </div>
  
  <div class="select">
    <select v-model="time">
      <option value="" disabled>Time Interval</option>
      <option v-for="t in timeVariants" :value="t">{{ t }}</option>
    </select>
  </div>
  
  <button class="button is-info" @click="search" :disabled="!buttonActive">
    Search
  </button>
</div>
</template>

<script lang="ts">
  
import { Vue, Component, Prop, Emit } from 'vue-property-decorator';

export type SearchParams = {
    time: string,
    search: string,
};

@Component
export default class SearchBar extends Vue {
    @Prop({ type: Boolean, required: true }) buttonActive: boolean;
    private searchString: string = "";

    private timeVariants = [
        "day",
        "week",
        "month",
        "year",
        "all"
    ];
    private time = "all";

    private search() {
        this.$emit("search", {
            time: this.time,
            search: this.searchString,
        });
    }

    private searchIfEnter(event) {
        if (event.key === "Enter") {
            this.search();
        }
    }
}
</script>
