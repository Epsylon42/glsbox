<template>
<div class="container">
  
  <div class="window">
    <ShaderWindow
      v-if="loaded"
      ref="window"
      class="display"
      :shader="currentShader"
      @error="processError"
      >
    </ShaderWindow>

    <div class="controls">
      <p>Controls go here</p>
    </div>
  </div>
  
  <div class="editor">
    <ul class="args" v-if="currentShader">
      <li v-for="decl in currentShader.uniforms">
        <p>{{ decl }}</p>
      </li>
      <li v-for="decl in currentShader.textures">
        <p>{{ decl }}</p>
      </li>
    </ul>

    <textarea v-model="shaderSource"></textarea>
    
    <div class="controls">
      <button @click="updateShader">Update</button>
    </div>
    
  </div>

  <Textures
    class="textures"
    ref="textures"
    @texUpdate="updateTextures"
    >
  </Textures>
  
  <div class="comments">
    <p>Comments go here</p>
  </div>
  
</div>
</template>

<script lang="ts">
    
import { Vue, Component, Prop } from 'vue-property-decorator';
import ShaderWindow from './shader-window.vue';
import FragShader from '../frag-shader.ts';
import Textures from './textures.vue';
import { WglError } from 'wgl';
import { ShaderStorage } from '../backend.ts';

@Component({
    components: {
        ShaderWindow,
        Textures,
    },
})
export default class ShaderView extends Vue {
    @Prop({type: Number, required: false}) public shaderId: number | null;
    public currentShader: FragShader | null = null;
    
    public shaderSource = "";
    public loaded: boolean = false;
    
    mounted() {
        var promise = (this.shaderId
                       ? ShaderStorage.requestShader(this.shaderId)
                       : ShaderStorage.requestDefaultShader());
        
        promise.then(shader => {
            this.loaded = true;
            this.$nextTick(() => {
                this.currentShader = shader;
                this.shaderSource = shader.source;
            })
        });
    }
    
    updateShader() {
        this.currentShader = new FragShader(
            this.shaderSource,
            this.currentShader.uniforms,
            this.currentShader.textures
        );
    }
    
    updateTextures() {
        console.log("update");
        const textures = this.$refs.textures as Textures;
        this.currentShader.textures = textures.getTextures().map(([name]) => "uniform sampler2D tex_" + name + ";");
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
