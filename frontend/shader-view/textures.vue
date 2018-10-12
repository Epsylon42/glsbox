<template>
  <div class="textures">
    <div class="texture" v-for="tex, i in textures">
      <img ref="images" :src="tex.src" @load="onLoad(i)">
      <div class="texture-controls">

        <button @click="removeTexture(i)">remove</button>

        <input
          type="text"
          v-model="tex.name"
          @change="texUpdate"
          @input="validateName(i)"
          >

        <select v-model.number="tex.kind" @change="texUpdate">
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
import { TextureKind } from '../../common/texture-kind.ts';
import Icon from 'vue-awesome/components/Icon.vue';
import 'vue-awesome/icons/plus.js';

export class TextureData {
    constructor(
        public src: string,
        public name: string,
        public kind: TextureKind = TextureKind.Normal
    ) {}

    public image: HTMLImageElement | null = null;
}

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

    private textures: TextureData[] = [];
    private files: [number, File][] = [];
    
    private addTexture(event) {
        const file = event.target.files[0];
        if (file) {
            let name = file.name.replace(/\..+$/, "");
            name = name.replace(/\W/g, "");

            this.files.push([this.textures.length, file]);
            this.textures.push(new TextureData(URL.createObjectURL(file), name));
        }

        this.$nextTick(() => {
            this.texUpdate();
        });
    }

    private removeTexture(i: number) {
        this.textures.splice(i, 1);
        const fileIndex = this.files.findIndex(([index]) => index === i);
        if (fileIndex) {
            this.files.splice(fileIndex, 0);
        }

        this.texUpdate();
    }

    private onLoad(i: number) {
        this.textures[i].image = this.$refs.images[i];
        this.texUpdate();
    }

    public getTextures(): TextureData[] {
        return this.textures;
    }

    private texUpdate() {
        this.$emit("texUpdate", this.textures);
    }

    private validateName(i: number) {
        this.textures[i].name = this.textures[i].name.replace(/\W/g, "");
        this.$forceUpdate();
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
