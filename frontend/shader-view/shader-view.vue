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
      <li v-for="decl in currentShader.declarations">
        <p>{{ decl }}</p>
      </li>
    </ul>

    <textarea v-model="shaderString"></textarea>
    
    <div class="controls">
      <button @click="updateShader">Update</button>
    </div>
    
  </div>
  
  <div class="comments">
    <p>Comments go here</p>
  </div>
  
</div>
</template>

<script lang="ts">
    
import { Vue, Component, Prop } from 'vue-property-decorator';
import ShaderWindow from './shader-window.vue';
import FragShader from '../frag-shader.ts';
import { WglError } from 'wgl';
import { ShaderStorage } from '../backend.ts';

@Component({
    components: {
        ShaderWindow
    },
})
export default class ShaderView extends Vue {
    @Prop({type: Number, required: false}) public shaderId: number | null;
    public currentShader: FragShader | null = null;
    
    public shaderString = "";
    public loaded: boolean = false;
    
    mounted() {
        var promise = (this.shaderId
                       ? ShaderStorage.requestShader(this.shaderId)
                       : ShaderStorage.requestDefaultShader());

        promise.then(shader => {
            this.loaded = true;
            this.$nextTick(() => {
                this.currentShader = shader;
                this.shaderString = shader.source;
            })
        })
    }

    updateShader() {
        this.currentShader = new FragShader(this.shaderString, this.currentShader.declarations);
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
    grid-template-rows: auto auto;
    grid-template-areas:
        "window   editor"
        "comments .     ";
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
    resize: none;
}

.comments {
    grid-area: comments;
    border: 2px dotted red;
    margin-top: 100px;
}

</style>
