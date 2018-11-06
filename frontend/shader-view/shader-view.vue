<template>
<div class="container">
  
  <div class="window">
    <ShaderWindow
      ref="window"
      class="display"
      :timePause="timePause"
      :updatePause="updatePause"
      @error="processError"
      >
    </ShaderWindow>
    
    <div class="controls">
      <button @click="resetTime" title="reset time">
        <Icon name="redo" />
      </button>
      <button @click="timePause = !timePause" title="toggle time">
        <Icon name="play" v-if="timePause" />
        <Icon name="pause" v-else />
      </button>
      <p>{{ shaderTime }}</p>
    </div>
  </div>

  <div class="info">
    <Info v-if="showInfo" />
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
      <button @click="updateSource" title="run this code">
        <Icon name="arrow-left" />
      </button>
      <button @click="upload" title="save" v-if="canSave">
        <Icon name="save" />
      </button>
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
import Info from './info.vue';

import { ShaderStorage } from '../backend.ts';
import { store, Mutations, Actions } from './store/store.ts';
import TextureData from './store/texture-data.ts';
import FragShader, { Declaration } from './store/frag-shader.ts';
import Preview from './store/preview.ts';
import { TextureKind } from '../../common/texture-kind.ts';

import { WglError } from 'wgl';

import Icon from 'vue-awesome/components/Icon.vue';
import 'vue-awesome/icons/play.js';
import 'vue-awesome/icons/pause.js';
import 'vue-awesome/icons/redo.js';
import 'vue-awesome/icons/arrow-left.js';
import 'vue-awesome/icons/save.js';

@Component({
    components: {
        ShaderWindow,
        Textures,
        Info,
        Icon,
    },
})
export default class ShaderView extends Vue {
    mounted() {
        this.$watch(
            () => (this.$refs.window as ShaderWindow).shaderTime,
            time => {
                this.shaderTime = (Math.round(time * 100) / 100).toString();
                const dot = this.shaderTime.indexOf(".");
                if (dot !== -1) {
                    while (this.shaderTime.length - dot < 3) {
                        this.shaderTime += "0";
                    }
                } else {
                    this.shaderTime += ".00";
                }
            }
        );
    }

    private shaderSource = "";

    private get storedSource(): string {
        return store.getters.source;
    }
    @Watch('storedSource') storedSourceChanged(newSource: string) {
        this.shaderSource = newSource;
    }

    private get canSave(): boolean {
        return store.getters.canSave;
    }

    private get showInfo(): boolean {
        // don't show info if you are not logged in and are editing a new shader
        return !(store.getters.user == null && store.getters.owner == null);
    }

    private get declarations(): Declaration[] {
        return store.getters.declarations;
    }

    private shaderTime: string = "";
    private timePause: boolean = false;
    private updatePause: boolean = false;

    updateSource() {
        store.dispatch(Actions.setSource, this.shaderSource);
    }

    resetTime() {
        (this.$refs.window as ShaderWindow).resetTime();
    }

    upload() {
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
        "info     textures"
        "comments .";
    grid-row-gap: 20px;
    grid-column-gap: 50px;
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
    
    padding-left: 5px;
    padding-right: 5px;

    font-family: monospace;
}

.controls p {
    margin: 0;
}

.controls button {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;

    border: none;
    background-color: white;
    padding: 0;
    padding-left: 5px;
    padding-right: 5px;
}

.controls button svg {
    height: 100%;
    width: auto;
}

.controls button:active svg {
    color: black;
}

.info {
    grid-area: info;
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
