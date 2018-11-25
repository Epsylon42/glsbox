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
      <option value="" disabled>Interval</option>
      <option v-for="t in timeVariants" :value="t">{{ t }}</option>
    </select>
  </div>

  <div class="select">
    <select v-model="sort">
      <option value="" disabled>Sort</option>
      <option v-for="s in sortVariants" :value="s">{{ s }}</option>
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
    sort: string,
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

    private sortVariants = [
        "new",
        "old",
        "upvoted",
    ]
    private sort = "upvoted";

    private search() {
        const search: SearchParams = {
            time: this.time,
            sort: this.sort,
            search: this.searchString,
        };

        this.$emit("search", search);
    }

    private searchIfEnter(event) {
        if (event.key === "Enter") {
            this.search();
        }
    }
}
</script>
