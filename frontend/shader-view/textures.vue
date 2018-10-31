<template>
  <div class="textures">
    <div class="texture" v-for="tex in textures">
      <img ref="images" :src="tex.data.src" @load="onLoad(tex.index)">
      <div class="texture-controls">

        <button @click="removeTexture(tex.index)">remove</button>

        <input
          type="text"
          v-model="tex.data.name"
          >

        <select v-model.number="tex.data.kind">
          <option v-for="opt in texKindVariants" :value="opt.value">
            {{ opt.text }}
          </option>
        </select>

      </div>
    </div>

    <div class="add-texture">
      <Icon name="plus" />
      <input type="file" @change="addTexture">
    </div>
  </div>
</template>

<script lang="ts">
    
import { Vue, Component, Emit } from 'vue-property-decorator';

import { store, Actions, Mutations } from './store/store.ts';
import TextureData from './store/texture-data.ts';
import { TextureKind } from '../../common/texture-kind.ts';

import Icon from 'vue-awesome/components/Icon.vue';
import 'vue-awesome/icons/plus.js';

@Component({
    components: {
        Icon,
    }
})
export default class Textures extends Vue {
    
    private texKindVariants = [
        { text: "Normal",      value: TextureKind.Normal },
        // { text: "NormalVFlip", value: TextureKind.NormalVFlip },
        { text: "Cubemap",     value: TextureKind.Cubemap },
    ];

    private get textures(): { data: TextureData, index: number }[] {
        return store.getters.activeTextures.map(([ i, tex ]) => {
            const obj =  {
                data: {
                    ...tex,
                },
                index: i,
            };

            Object.defineProperty(obj.data, "name", {
                get: () => tex.name,
                set: name => store.dispatch(Actions.setTextureName, { i, name }),
            });
            Object.defineProperty(obj.data, "kind", {
                get: () => tex.kind,
                set: kind => store.dispatch(Actions.setTextureKind, { i, kind }),
            });

            return obj;
        });
    }
    
    private addTexture(event) {
        const file = event.target.files[0];
        if (file) {
            store.dispatch(Actions.addTextureFile, file)
        }
    }

    private removeTexture(i: number) {
        store.dispatch(Actions.removeTexture, i);
    }

    private onLoad(i: number) {
        store.commit(Mutations.setTextureImage, { i, image: this.$refs.images[i] });
    }
}
</script>

<style scoped>

.textures {
    display: flex;
    flex-direction: row;
    flex-wrap: wrap;
}

.textures > div {
    width: 125px;
    height: 125px;
    border-radius: 15px;
    margin-right: 25px;
    margin-bottom: 25px;
}

.add-texture {
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: white;
    border: 1px solid #aaa;
    position: relative;
}

.add-texture svg {
    width: auto;
    height: 50%;
    color: #aaa
}

.add-texture:hover {
    background-color: grey;
    border-color: white;
}

.add-texture:hover svg {
    color: white;
}

.add-texture > input {
    position: absolute;
    width: 100%;
    height: 100%;
    opacity: 0;
}


.texture {
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid #aaa;
    position: relative;
}

.texture, .texture > * {
    border-radius: 15px;
}

.texture > img {
    width: 100%;
    height: 100%;
}

.texture-controls {
    position: absolute;
    width: 100%;
    height: 100%;
    opacity: 0;
    background-color: rgba(0, 0, 0, 0.5);

    display: flex;
    flex-direction: column;
    justify-content: space-around;
}

.texture-controls:hover {
    opacity: 1;
}

</style>
