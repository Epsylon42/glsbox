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
    <table class="declarations">
      <tr v-for="decl in declarations">
        <td class="declaration-kind">{{ decl.kind }}</td>
        <td class="declaration-type">{{ decl.type }}</td>
        <td class="declaration-name">{{ decl.name }}</td>
      </tr>
    </table>

    <textarea v-model="shaderSource"></textarea>
    
    <div class="controls">
      <button @click="updateSource">Update</button>
      <button @click="testUpload">Upload</button>
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
import Textures from './textures.vue';

import { ShaderStorage } from '../backend.ts';
import { store, Mutations, Actions } from './store/store.ts';
import TextureData from './store/texture-data.ts';
import FragShader, { Declaration } from './store/frag-shader.ts';
import { TextureKind } from '../../common/texture-kind.ts';

import { WglError } from 'wgl';

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

    private get declarations(): Declaration[] {
        return store.getters.declarations;
    }

    private shaderSource = "";

    updateSource() {
        store.dispatch(Actions.setSource, this.shaderSource);
    }

    testUpload() {
        this.updateSource();
        store
            .dispatch(Actions.saveShader)
            .then(id => console.log(`Shader successfully saved with id ${id}`))
            .catch(e => console.log("Saving error", e));
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

.declarations {
    border-collapse: collapse;
}

.declarations tr, .declarations td {
    border: 1px solid grey;
    font-size: 10pt;
}

.declarations .declaration-kind {
    background-color: #fdd;
}

.declarations .declaration-type {
    background-color: #dfd;
}

.declarations .declaration-name {
    background-color: #ddf;
}
</style>
