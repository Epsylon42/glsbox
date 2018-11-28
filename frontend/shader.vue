<template>
<div class="media">
  
  <div class="media-left preview">
    <a :href="href">
      <img v-if="previewUrl" :src="previewUrl">
      <div v-else class="placeholder"></div>
    </a>
  </div>
  
  <div class="media-content">
    <p> <strong><a :href="href">{{ name }}</a></strong> </p>
    <p class="monospace">{{ published }}</p>
    <div class="likes">
      <div class="svg-button">
        <Icon name="heart" />
      </div>
      <p class="monospace"> {{ likeCount }} </p>
    </div>
    <hr>
    <div class="content" v-html="descriptionHTML"></div>
  </div>
</div>
</template>

<script lang="ts">

import { Vue, Component, Prop } from 'vue-property-decorator';

import { RecvShaderData } from './api/shader-storage.ts';
import { MDConverter } from './converter.ts';

import Icon from 'vue-awesome/components/Icon.vue';
import 'vue-awesome/icons/heart.js';

@Component({
    components: {
        Icon
    }
})
export default class Shader extends Vue {
    @Prop({ type: RecvShaderData, required: true }) shader: RecvShaderData;

    public get name(): string {
        return this.shader.name;
    }
    public get previewUrl(): string | null {
        return this.shader.previewUrl;
    }
    public get likeCount(): number {
        return this.shader.likeCount;
    }

    public get published(): string {
        return this.shader.publishingDate ?
            `published ${this.shader.publishingDate.toLocaleString()}` : "";
    }

    public get href(): string {
        return `/view/${this.shader.id}`;
    }

    public get descriptionHTML(): string {
        return MDConverter.makeHtml(this.shader.description);
    }
}
</script>

<style scoped>

@import "./shader.sass";

.likes {
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
}

.monospace {
    color: grey;
    font-family: monospace;
    font-size: 12pt;
}

.svg-button {
    padding-left: 0;
}
</style>
