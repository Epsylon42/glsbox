<template>
<div class="info">
  <div class="media">
    
    <div class="preview media-left" v-if="canSave">
      <div class="preview-header">
        <div>Preview</div>
        
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
      <div v-if="showName" class="field">
        <label class="label">Name</label>
        <div class="control">
          <input v-if="canSave" class="input" type="text" v-model="name">
          <p v-else class="text-box">{{ name }}</p>
        </div>
      </div>
      
      <div v-if="showDescription" class="field">
        <label class="label">Description</label>
        <div class="control">
          <textarea v-if="canSave" class="input description" v-model="description" />
          <div v-else class="text-box content" v-html="descriptionHTML" />
        </div>
      </div>
      
      <div>
        <button
          v-if="canDelete"
          class="button is-danger is-outlined"
          @click="confirm('delete')"
          >
          Delete
        </button>
        
        <template v-if="canPublish">
          <button
            v-if="!isPublished"
            class="button is-primary"
            @click="confirm('publish')"
            >
            Publish
          </button>
          <button
            v-else
            class="button is-link"
            @click="confirm('unpublish')"
            >
            Unpublish
          </button>
        </template>
      </div>
      
    </div>
    
  </div>
  
  <div v-if="description.length !== 0 && canSave" class="field">
    <label class="label">Description preview</label>
    <div class="box content" v-html="descriptionHTML"></div>
  </div>
  
  <div v-if="confirmation" class="modal is-active">
    <div class="modal-background" @click="confirmation = null"></div>
    <div
      class="modal-content message"
      :class="{ 'is-danger': confirmation === 'delete', 'is-link': confirmation.endsWith('publish') }"
      >
      
      <template v-if="confirmation === 'delete'">
        <div class="message-header">
          Delete
        </div>
        
        <div class="message-body">
          <p>
            Are you sure you want to delete this shader?
          </p>
          <p>
            <strong>This can't be undone</strong>
          </p>

          <div>
            <button class="button is-danger is-outlined" @click="deleteShader">Delete</button>
            <button class="button" @click="confirmation = null">Cancel</button>
          </div>
        </div>
      </template>

      <template v-else-if="confirmation === 'publish'">
        <div class="message-header">
          Publish
        </div>

        <div class="message-body">
          <p>Are you sure you want to publish this shader?</p>

          <div>
            <button class="button is-link is-outlined" @click="publish">Publish</button>
            <button class="button" @click="confirmation = null">Cancel</button>
          </div>
        </div>
      </template>

      <template v-else>
        <div class="message-header">
          Unpublish
        </div>

        <div class="message-body">
          <p>Are you sure you want to unpublish this shader?</p>
          <p>You can publish it again later</p>

          <div>
            <button class="button is-link is-outlined" @click="unpublish">Unpublish</button>
            <button class="button" @click="confirmation = null">Cancel</button>
          </div>
        </div>
      </template>

    </div>
  </div>
</div>
</template>

<script lang="ts">

import { Vue, Component, Emit } from 'vue-property-decorator';

import { store, Mutations, Actions } from './store/store.ts';
import Preview from './store/preview.ts';
import ShaderWindow from './shader-window.vue';
import { ShaderStorage } from '../api/shader-storage.ts';

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
    private confirmation?: string = null;

    private get showName(): boolean {
        return this.canSave || this.name.length !== 0;
    }
    private get name(): string {
        return store.getters.name;
    }
    private set name(name: string) {
        store.commit(Mutations.setName, name);
    }

    private get showDescription(): boolean {
        return this.canSave || this.description.length !== 0;
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
    
    private get isPublished(): boolean {
        return store.getters.published;
    }
    
    private get preview(): Preview | null {
        return store.getters.preview;
    }
    
    private get canSave(): boolean {
        return store.getters.canSave;
    }
    
    private get canPublish(): boolean {
        return store.getters.canEdit;
    }
    
    private get canDelete(): boolean {
        return store.getters.canDelete;
    }
    
    
    private takePreview() {
        store
            .dispatch(
                Actions.setPreviewFromCanvas,
                (this.$parent.$refs.window as ShaderWindow).canvas
            );
    }
    
    
    private confirm(which: string) {
        this.confirmation = which;
    }
    
    private deleteShader() {
        ShaderStorage
            .deleteShader(store.getters.id)
            .then(() => {
                window.location.href = `/users/${store.getters.user.id}/shaders`;
            })
            .catch(err => this.error({ title: "Deletion error", message: err.message }));
    }
    
    private publish() {
        this.confirmation = null;
        store
            .dispatch(Actions.setPublished, true)
            .catch(err => this.error({ title: "Publishing error", message: err.message }));
    }
    
    private unpublish() {
        this.confirmation = null;
        store
            .dispatch(Actions.setPublished, false)
            .catch(err => this.error({ title: "Publishing error", message: err.message }));
    }
    
    
    private removePreview() {
        store.dispatch(Actions.removePreview);
    }

    @Emit() private error(err: { title: string, message: string }) {}
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
