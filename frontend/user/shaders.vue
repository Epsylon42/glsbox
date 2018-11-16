<template>
<div class="shaders">
  <div v-for="shader in shaders" class="media shader box">
    <div class="media-left preview">
      <a :href="shader.url">
        <img v-if="shader.preview" :src="shader.preview.url">
        <div v-else class="placeholder" />
      </a>
    </div>

    <div class="media-content">
      <p><strong><a :href="shader.url">{{ shader.name }}</a></strong></p>
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
</div>
</template>

<script lang="ts">

import { Vue, Component } from 'vue-property-decorator';

import { store, Mutations, Actions } from './store.ts';

import { RecvShaderData } from '../backend.ts';

import { MDConverter } from '../converter.ts';

@Component
export default class Shaders extends Vue {
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

            return obj;
        });
    }
    private get canLoadMore(): boolean {
        return store.state.shaders.canLoadMore;
    }
    private get isLoading(): boolean {
        return store.getters.shadersLoading;
    }

    private loadMore() {
        store.dispatch(Actions.loadShaders);
    }

    mounted() {
        if (this.shaders.length === 0) {
            this.loadMore();
        }
    }
}
</script>

<style scoped>

.preview {
    width: 120px;
    height: 90px;
    border-radius: 15px;
    margin-right: 25px;
}

.preview > a {
    width: 100%;
    height: 100%;
}

.preview > a > img, .preview > a > .placeholder {
    width: 120px;
    height: 90px;
    border-radius: 15px;
    background-color: black;
}

@media screen and (max-width: 500px) {
    .media {
        flex-direction: column;
    }
    
    .media-content {
        width: 100%;
    }
}
</style>
