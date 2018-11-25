<template>
<div>
  <div class="search-bar">
    <SearchBar :buttonActive="!storage.loadingLock" @search="search"></SearchBar>
  </div>

  <div v-if="storage.firstLoading" class="loading-panel"></div>

  <div v-else class="browse">

    <div class="tile is-ancestor">
      <div v-for="shader in shaders" class="tile is-parent is-6">
        <div class="tile is-child box">
          <div class="media">
            <div class="media-left preview">
              <a :href="shader.href">
                <img v-if="shader.previewUrl" :src="shader.previewUrl">
                <div v-else class="placeholder"></div>
              </a>
            </div>
            
            <div class="media-content">
              <p>
                <strong><a :href="shader.href">{{ shader.name }}</a></strong>
                <span class="has-text-grey">{{ shader.published }}</span>
              </p>
              <hr>
              <div class="content" v-html="shader.descriptionHTML"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div v-if="shaders.length === 0" class="message is-danger">
      <div class="message-body">
        No shaders found
      </div>
    </div>
    
    <button
      v-if="storage.canLoadMore && !errorOccured"
      class="button is-primary"
      :class="{ 'is-loading': storage.loadingLock }"
      :disabled="storage.loadingLock"
      @click="loadMore"
      >
      Load More
    </button>
    
    <div v-if="loadingError" class="modal is-active">
      <div class="modal-background" @click="loadingError = null"></div>
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
</div>
</template>

<script lang="ts">
    
import { Vue, Component } from 'vue-property-decorator';

import { RecvShaderData, ShaderStorage } from '../api/shader-storage.ts'
import { MDConverter } from '../converter.ts';
import DynamicLoading from '../dynamic-loading.ts';

import SearchBar, { SearchParams } from '../search-bar.vue';

@Component({
    components: {
        SearchBar,
    }
})
export default class Browse extends Vue {
    private storage: DynamicLoading<RecvShaderData> = new DynamicLoading(10);

    private loadingError?: string = null;
    private errorOccured: boolean = false;

    private searchParams: SearchParams | {} = {};

    private get shaders(): any[] {
        return this.storage.shown.map(shader => {
            const obj = {
                ...shader
            };

            Object.defineProperty(obj, "href", {
                get: () => `/view/${shader.id}`
            });
            Object.defineProperty(obj, "descriptionHTML", {
                get: () => MDConverter.makeHtml(shader.description)
            });
            Object.defineProperty(obj, "published", {
                get: () => shader.publishingDate ? `published ${shader.publishingDate.toLocaleString()}` : ""
            });

            return obj;
        });
    }

    private loadMore() {
        this.errorOccured = false;

        this.storage
            .load((limit, page) => ShaderStorage.requestShaders(limit, page, this.searchParams))
            .catch(err => {
                this.errorOccured = true;
                this.loadingError = err.message;
            });
    }

    private search(params: SearchParams) {
        this.searchParams = params;
        this.storage.reset();
        this.loadMore();
    }

    mounted() {
        this.loadMore();
    }
}
</script>

<style scoped>

@import "../shader.sass";

.search-bar {
    display: flex;
    flex-direction: row;
    justify-content: center;
}

.browse {
    padding-top: 20px;
    padding-bottom: 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
}

.is-ancestor {
    flex-wrap: wrap;
    width: 100%;
}
</style>
