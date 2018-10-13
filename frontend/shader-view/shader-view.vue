<template>
<div class="container">
  
  <div class="window">
    <ShaderWindow
      ref="window"
      class="display"
      @error="processError"
      >
    </ShaderWindow>

    <div class="controls">
      <p>Controls go here</p>
    </div>
  </div>
  
  <div class="editor">
    <ul class="args">
      <li v-for="uni in uniforms">
        <p>{{ uni }}</p>
      </li>
    </ul>

    <textarea v-model="shaderSource"></textarea>
    
    <div class="controls">
      <button @click="updateSource">Update</button>
    </div>
    
  </div>

  <Textures class="textures"></Textures>
  
  <div class="comments">
    <p>Comments go here</p>
  </div>
  
</div>
</template>

<script lang="ts">
    
import { Vue, Component, Prop, Watch } from 'vue-property-decorator';
import ShaderWindow from './shader-window.vue';
import FragShader from '../frag-shader.ts';
import Textures from './textures.vue';
import TextureData from '../texture-data.ts';
import { WglError } from 'wgl';
import { ShaderStorage } from '../backend.ts';
import { TextureKind } from '../../common/texture-kind.ts';
import { store, Mutations, Actions } from './shader-store/store.ts';

@Component({
    components: {
        ShaderWindow,
        Textures,
    },
})
export default class ShaderView extends Vue {
    @Prop({ type: Number }) shaderId?: number;

    mounted() {
        store.dispatch(Actions.requestShader, this.shaderId);
    }

    private get storedSource(): string {
        return store.getters.source;;
    }
    @Watch('storedSource') storedSourceChanged(newSource: string) {
        this.shaderSource = newSource;
    }

    private get uniforms(): string[] {
        return store.getters.uniformStrings;
    }

    private shaderSource = "";

    updateSource() {
        store.dispatch(Actions.setSource, this.shaderSource);
    }
    
    processError(e: WglError) {
        console.log(e);
    }
}
</script>

<style scoped>

.container {
    margin: 20px;
    
    display: grid;
    grid-template-columns: minmax(400px, auto) 50%;
    grid-template-rows: auto auto auto;
    grid-template-areas:
        "window   editor"
        ".        textures"
        "comments .";
    grid-row-gap: 20px;
}

.window {
    grid-area: window;
    justify-self: center;
    align-self: center;
    
    display: flex;
    flex-direction: column;
    align-items: stretch;
    
    width: 400px;
}

.window .display {
    width: 400px;
    height: 300px;
    
    border-radius: 5px 5px 0 0;
}

.controls {
    display: flex;
    flex-direction: row;
    align-items: center;
    
    border-radius: 0 0 5px 5px;
    
    height: 30px;
    background-color: white;
}

.editor {
    grid-area: editor;
    justify-self: stretch;
    align-self: stretch;
    
    min-height: 200px;
    
    display: flex;
    flex-direction: column;
    align-items: stretch;
}

.editor > textarea {
    height: 100%;
    width: 100%;
    min-height: 250px;
    resize: none;
}

.comments {
    grid-area: comments;
    border: 2px dotted red;
}

.textures {
    grid-area: textures;
}
</style>
