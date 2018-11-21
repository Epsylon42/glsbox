<template>
<div class="app">
  
  <div class="window-and-info">
    <div class="window">
      <ShaderWindow
        ref="window"
        :timePause="timePause"
        :updatePause="updatePause"
        @error="processError"
        >
      </ShaderWindow>
      
      <div class="controls">
        <button class="svg-button" @click="resetTime" title="reset time">
          <Icon name="redo" />
        </button>
        <button class="svg-button" @click="timePause = !timePause" title="toggle time">
          <Icon name="play" v-if="timePause" />
          <Icon name="pause" v-else />
        </button>
        <p>{{ shaderTime }}</p>
      </div>
    </div>
    
    <div class="info">
      <Info v-if="showInfo" @error="openErrorModal" />
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
    
    <div class="code-editor">
      <VueCodemirror v-model="shaderSource" :options="cmOptions" />
      
      <div class="controls">
        <button class="svg-button" @click="updateSource" title="run this code">
          <Icon name="arrow-left" />
        </button>
        <button class="svg-button" @click="upload" :title="isSaving ? 'saving' : 'save'" v-if="canSave">
          <Icon v-if="isSaving" name="spinner" pulse />
          <Icon v-else name="save" />
        </button>
      </div>
    </div>
    
    <div v-if="compileErrors" class="message is-danger is-small">
      <div class="message-header">
        <p>Compilation errors</p>
      </div>
      <div class="message-body">
        <template v-for="err in compileErrors">
          <p v-if="err.line != null">
            On line <b>{{ err.line }}</b>: {{ err.message }}
          </p>
          <p v-else>
            {{ err.message }}
          </p>
        </template>
      </div>
    </div>
    
  </div>
  
  <Textures class="textures" />
  
  <Comment :comment="rootComment" :isRoot="true" class="comments" />
  
  <div v-if="modal" class="modal is-active">
    <div class="modal-background" @click="modal = null" />
    <div class="modal-content message is-danger">
      <div class="message-header">
        <p>{{ modal.title }}</p>
      </div>
      
      <div class="message-body">
        <div class="content">
          <p>{{ modal.message }}</p>
        </div>
        <button class="button is-danger is-outlined" @click="modal = null">Close</button>
      </div>
    </div>
  </div>
  
</div>
</template>

<script lang="ts">
    
import { Vue, Component, Prop, Watch } from 'vue-property-decorator';
import ShaderWindow from './shader-window.vue';
import Textures from './textures.vue';
import Info from './info.vue';
import Comment from './comment.vue';

import { CodeMirror as CM, codemirror as VueCodemirror } from 'vue-codemirror';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/ambiance.css';

import * as glsl from 'glsl-editor/glsl';
glsl(CM);

import { ShaderStorage } from '../backend.ts';
import { store, Mutations, Actions } from './store/store.ts';
import TextureData from './store/texture-data.ts';
import FragShader, { Declaration } from './store/frag-shader.ts';
import { GenericComment } from './store/comment.ts';
import { TextureKind } from '../../common/texture-kind.ts';

import { WglError } from 'wgl';

import Icon from 'vue-awesome/components/Icon.vue';
import 'vue-awesome/icons/play.js';
import 'vue-awesome/icons/pause.js';
import 'vue-awesome/icons/redo.js';
import 'vue-awesome/icons/arrow-left.js';
import 'vue-awesome/icons/save.js';
import 'vue-awesome/icons/spinner.js';

class ErrorModal {
    constructor(
        public title: string,
        public message: string,
    ) {}
}

@Component({
    components: {
        ShaderWindow,
        Textures,
        Info,
        Comment,
        Icon,
        VueCodemirror,
    },
})
export default class ShaderView extends Vue {
    private cmOptions = {
        lineNumbers: true,
        mode: "glsl",
        indentUnit: 4,
        indentWithTabs: true,
    };

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

    private get isSaving(): boolean {
        return store.getters.isSaving;
    }

    private get showInfo(): boolean {
        // don't show info if you are not logged in and are editing a new shader
        return !(store.getters.user == null && store.getters.owner == null);
    }

    private get declarations(): Declaration[] {
        return store.getters.declarations;
    }

    private get rootComment(): GenericComment {
        return store.getters.rootComment;
    }

    private shaderTime: string = "";
    private timePause: boolean = false;
    private updatePause: boolean = false;

    private compileErrors?: { line?: number, message: string }[] = null;
    updateSource() {
        this.compileErrors = null;
        store.dispatch(Actions.setSource, this.shaderSource);
    }

    resetTime() {
        (this.$refs.window as ShaderWindow).resetTime();
    }

    private modal?: ErrorModal = null;

    upload() {
        this.updateSource();
        store
            .dispatch(Actions.saveShader)
            .then(id => console.log(`Shader successfully saved with id ${id}`))
            .catch(e => {
                console.log("Saving error", e);
                this.openErrorModal({ title: "Saving error", message: e.message });
            });
    }

    private openErrorModal(err: { title: string, message: string }) {
        this.modal = new ErrorModal(err.title, err.message);
    }

    processError(e: WglError) {
        if (e.errors) {
            this.compileErrors = e.errors;
        } else {
            this.compileErrors = [{ message: e.message }];
        }
        console.error(e);
    }
}
</script>

<style>
.CodeMirror {
    font-family: monospace;
    font-size: 10pt;
    line-height: 1;
}
</style>

<style scoped>

.app {
    display: grid;
    grid-template-columns: minmax(500px, 50%) 50%;
    grid-template-rows: auto auto auto;
    grid-template-areas:
    "window-and-info     editor"
        "window-and-info     textures"
        "comments            comments";
    grid-row-gap: 20px;
    grid-column-gap: 50px;
    
    padding: 40px;
}

@media screen and (max-width: 1000px) {
    .app {
        grid-template-columns: 100%;
        grid-template-rows: auto auto auto auto;
        grid-template-areas:
        "window-and-info"
            "editor"
            "textures"
            "comments";
    }
}

@media screen and (max-width: 390px) {
    .app {
        padding-left: 0;
        padding-right: 0;
    }
}

.window-and-info {
    grid-area: window-and-info;
    display: flex;
    flex-direction: column;
    align-items: stretch;
}

.window {
    margin-left: auto;
    margin-right: auto;

    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-start;
}

.controls {
    display: flex;
    flex-direction: row;
    align-items: center;
    
    border-radius: 0 0 5px 5px;
    border-top: 1px solid #ddd;
    
    height: 30px;
    background-color: white;
    
    padding-left: 5px;
    padding-right: 5px;

    font-family: monospace;
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

.code-editor {
    border: 1px solid #aaa;
    border-radius: 0 0 5px 5px;
}

.comments {
    grid-area: comments;
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
    padding-left: 2px;
    padding-right: 2px;
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
