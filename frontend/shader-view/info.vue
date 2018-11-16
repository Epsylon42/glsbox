<template>
<div class="info">
  <div class="media">
    
    <div class="preview media-left" v-if="canSave">
      <div class="preview-header">
        <p>Preview</p>
        
        <button class="svg-button" @click="removePreview" v-if="preview">
          <Icon name="trash" />
        </button>
        
        <button class="svg-button" @click="takePreview" v-else>
          <Icon name="camera" />
        </button>
        
      </div>
      
      <img :src="preview.url" v-if="preview">
      <div class="preview-placeholder" v-else />
    </div>
    
    <div class="media-center">
      <div class="field">
        <label class="label">Name</label>
        <div class="control">
          <input v-if="canSave" class="input" type="text" v-model="name">
          <p v-else class="text-box">{{ name }}</p>
        </div>
      </div>
      
      <div class="field">
        <label class="label">Description</label>
        <div class="control">
          <textarea v-if="canSave" class="input description" v-model="description" />
          <div class="text-box content" v-else v-html="descriptionHTML" />
        </div>
      </div>
    </div>
    
  </div>

  <div v-if="description.length !== 0 && canSave" class="field">
    <label class="label">Description preview</label>
    <div class="box content" v-html="descriptionHTML" />
  </div>
</div>
</template>

<script lang="ts">

import { Vue, Component } from 'vue-property-decorator';

import { store, Mutations, Actions } from './store/store.ts';
import Preview from './store/preview.ts';
import ShaderWindow from './shader-window.vue';

import { MDConverter } from '../converter.ts';

import Icon from 'vue-awesome/components/Icon.vue';
import 'vue-awesome/icons/camera.js';
import 'vue-awesome/icons/trash.js';

@Component({
    components: {
        Icon,
    }
})
export default class Info extends Vue {
    private get name(): string {
        return store.getters.name;
    }
    private set name(name: string) {
        store.commit(Mutations.setName, name);
    }

    private get description(): string {
        return store.getters.description;
    }
    private set description(description: string) {
        store.commit(Mutations.setDescription, description);
    }

    private get descriptionHTML(): string {
        return MDConverter.makeHtml(store.getters.description);
    }

    private get preview(): Preview | null {
        return store.getters.preview;
    }

    private get canSave(): boolean {
        return store.getters.canSave;
    }


    private takePreview() {
        store
            .dispatch(
                Actions.setPreviewFromCanvas,
                (this.$parent.$refs.window as ShaderWindow).canvas
            );
    }


    private removePreview() {
        store.dispatch(Actions.removePreview);
    }
    
}
</script>

<style scoped>

.info {
    margin-top: 20px;
}

.preview {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    width: 120px;
    height: 130px;
    border: 1px solid grey;
    border-radius: 15px;
}

.preview > .preview-header {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    
    background-color: white;
    border-radius: 15px 15px 0 0;
    padding: 5px;
    height: 40px;
}

.preview > img, .preview-placeholder {
    height: 90px;
    border-radius: 0 0 15px 15px;
}

.media-center {
    width: 100%;
}

.description {
    resize: vertical;
    height: 100px;
    width: 100%;
}
</style>
