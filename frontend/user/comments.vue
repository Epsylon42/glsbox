<template>
<div class="comments">
  <div v-if="firstLoading" class="loadingPanel" />
  
  <template v-else>
    <div v-for="comments, i in commented" class="commented">
      <hr v-if="i !== 0">
      
      <div class="media">
        <div class="media-left preview">
          <a :href="comments.shaderLink">
            <img v-if="comments.shader.preview" :src="comments.shader.preview.url">
            <div v-else class="placeholder" />
          </a>
        </div>
        
        <div class="media-content">
          <p>Commented on shader <a :href="comments.shaderLink"><i>{{ comments.shader.name }}</i></a></p>
        </div>
      </div>
      
      <div class="shader-comments">
        <div v-for="comment in comments.shown" class="comment-body text-box">
          <div class="comment-info">
            <p>posted {{ comment.info.posted }}</p>
            <p v-if="comment.info.edited">edited {{ comment.info.edited }}</p>
          </div>
          
          <div class="comment-text" v-html="comment.html" />

          <div class="controls">
            <a class="comment-button" :href="comment.permalink">visit comment</a>
          </div>
        </div>

        <button
          v-if="comments.canLoadMore"
          class="button is-primary is-small"
          :class="{ 'is-loading': comments.isLoading }"
          :disabled="comments.isLoading"
          @click="comments.loadMore()"
          >
          Load More
        </button>
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
</div>
</template>

<script lang="ts">

import { Vue, Component } from 'vue-property-decorator';

import { store, Mutations, Actions } from './store.ts';

import CommentData from '../shader-view/store/comment.ts';

import { MDConverter } from '../converter.ts';

@Component
export default class Comments extends Vue {
    private loadingError?: string = null;

    private get commented(): any[] {
        return store.state.commented.shown.map(comments => {
            const obj = {
                ...comments,

                loadMore() {
                    store.dispatch(Actions.loadComments, comments);
                }
            };

            Object.defineProperty(obj, "shown", {
                get: () => comments.shown.map(comment => {
                    const obj = {
                        ...comment,
                    };

                    Object.defineProperty(obj, "html", {
                        get: () => MDConverter.makeHtml(comment.text),
                    });
                    Object.defineProperty(obj, "permalink", {
                        get: () => `/view/${comments.shader.id}?comment=${comment.id}`,
                    });
                    Object.defineProperty(obj, "info", {
                        get: () => ({
                            edited: comment.lastEdited && `${comment.lastEdited.toLocaleDateString()} | ${comment.lastEdited.toLocaleTimeString()}`,
                            posted: `${comment.posted.toLocaleDateString()} | ${comment.posted.toLocaleTimeString()}`,
                        }),
                    });

                    return obj;
                }),
            });
            Object.defineProperty(obj, "isLoading", {
                get: () => comments.loadingLock,
            });
            Object.defineProperty(obj, "shaderLink", {
                get: () => `/view/${comments.shader.id}`,
            });

            return obj;
        });
    }
    private get canLoadMore(): boolean {
        return store.state.commented.canLoadMore;
    }
    private get isLoading(): boolean {
        return store.state.commented.loadingLock;
    }
    private get firstLoading(): boolean {
        return store.state.commented.firstLoading;
    }

    private loadMore() {
        store.dispatch(Actions.loadCommented)
            .catch(e => this.loadingError = e.message);
    }

    mounted() {
        if (this.commented.length === 0) {
            this.loadMore();
        }
    }
}
</script>

<style scoped>

@import "../comment.sass";

.comment-body {
    margin-bottom: 20px;
}

.preview {
    margin-right: 20px;
    margin-bottom: 20px
}

.preview, .preview > a > * {
    width: 120px;
    height: 90px;
    border-radius: 15px;
    background-color: black;
}
</style>
