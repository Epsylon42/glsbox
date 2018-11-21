<template>
<div class="shaders">
  <div class="search-bar">
    <SearchBar :buttonActive="!isLoading" @search="search"></SearchBar>
  </div>

  <div v-if="firstLoading" class="loading-panel" />
  
  <template v-else>
    <div v-for="shader in shaders" class="media shader box">
      <div class="media-left preview">
        <a :href="shader.url">
          <img v-if="shader.preview" :src="shader.preview.url">
          <div v-else class="placeholder" />
        </a>
      </div>
      
      <div class="media-content">
        <p>
          <strong><a :href="shader.url">{{ shader.name }}</a></strong>
          <span class="has-text-grey">{{ shader.published }}</span>
        </p>
        <hr>
        <div class="content" v-html="shader.descriptionHTML" />
      </div>
    </div>
    
    <button
      v-if="canLoadMore"
      class="button is-primary"
      :class="{ 'is-loading': isLoading }"
      :disabled="isLoading"
      @click="loadMore"
      >
      Load More
    </button>
  </template>
  
  <div v-if="loadingError" class="modal is-active">
    <div class="modal-background" @click="loadingError = null" />
    <div class="modal-content message is-danger">
      <div class="message-header">
        <p>Error</p>
      </div>
      
      <div class="message-body">
        <div class="content">
          <p>{{ loadingError }}</p>
        </div>
        <button class="button is-danger is-outlined" @click="loadingError = null">Close</button>
      </div>
    </div>
  </div>
</div>
</template>

<script lang="ts">

import { Vue, Component } from 'vue-property-decorator';

import { store, Mutations, Actions } from './store.ts';

import { RecvShaderData } from '../backend.ts';

import { MDConverter } from '../converter.ts';

import SearchBar, { SearchParams } from '../search-bar.vue';

@Component({
    components: {
        SearchBar
    }
})
export default class Shaders extends Vue {
    private loadingError?: string = null;

    private searchParams: SearchParams | {} = {};

    private get shaders(): any[] {
        return store.state.shaders.shown.map(shader => {
            const obj = {
                ...shader
            };

            Object.defineProperty(obj, "url", {
                get: () => `/view/${shader.id}`
            });
            Object.defineProperty(obj, "descriptionHTML", {
                get: () => MDConverter.makeHtml(shader.description)
            });
            Object.defineProperty(obj, "published", {
                get: () => shader.publishingDate ? `published ${shader.publishingDate.toLocaleString()}` : "",
            });

            return obj;
        });
    }
    private get canLoadMore(): boolean {
        return store.state.shaders.canLoadMore;
    }
    private get isLoading(): boolean {
        return store.state.shaders.loadingLock;
    }
    private get firstLoading(): boolean {
        return store.state.shaders.firstLoading;
    }

    private loadMore() {
        store.dispatch(Actions.loadShaders, this.searchParams)
            .catch(e => this.loadingError = e.message);
    }

    private search(params: SearchParams) {
        this.searchParams = params;
        store.commit(Mutations.resetShaders);
        this.loadMore()
    }

    mounted() {
        if (this.shaders.length === 0) {
            this.loadMore();
        }
    }
}
</script>

<style scoped>

@import "../shader.sass";

.search-bar {
    display: flex;
    flex-direction: row;
    justify-content: center;

    margin-bottom: 1.5rem;
}
</style>
