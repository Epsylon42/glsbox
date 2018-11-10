<template>
  <div class="info">

    <div class="preview" v-if="canSave">
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

    <div class="name-box">
      <input type="text" placeholder="name" v-model="name" v-if="canSave">
      <p class="immutable text-box" v-else>{{ name }}</p>
    </div>

    <div class="description-box">
      <textarea placeholder="description" v-model="description" v-if="canSave" />

      <p v-if="canSave">Description preview:</p>
      <div class="immutable text-box" :class="{ 'description-preview': canSave }" v-html="descriptionHTML" />
    </div>
  </div>
</template>

<script lang="ts">

import { Vue, Component } from 'vue-property-decorator';

import { store, Mutations, Actions } from './store/store.ts';
import Preview from './store/preview.ts';
import ShaderWindow from './shader-window.vue';

import { MDConverter } from './converter.ts';

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
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: flex-start;
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
    height: 30px;
}

.preview > img, .preview-placeholder {
    height: 90px;
    border-radius: 0 0 15px 15px;
}


.name-box {
    width: 100%;
    margin-bottom: 20px;
}

.description-box {
    width: 100%;
}

.name-box .immutable {
    display: flex;
    flex-direction: row;
    justify-content: center;
}

.description-box textarea {
    resize: vertical;
    width: 100%;
}

.immutable {
    margin: 0;
    width: 100%;
    min-height: 20px;
}

p {
    margin: 0;
}
</style>
