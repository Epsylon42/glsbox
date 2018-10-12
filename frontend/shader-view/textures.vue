<template>
  <div class="textures">
    <div class="texture" v-for="tex, i in textures">
      <img ref="images" :src="tex.src">
      <div class="texture-controls">
        <button @click="removeTexture(i)">remove</button>
        <input
          type="text"
          v-model="tex.name"
          @change="texUpdate"
          @input="validateName(i)"
          >
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
import Icon from 'vue-awesome/components/Icon.vue';
import 'vue-awesome/icons/plus.js';

class TextureSource {
    constructor(public src: string, public name: string) {}
}

@Component({
    components: {
        Icon,
    }
})
export default class Textures extends Vue {
    
    private textures: TextureSource[] = [];
    private files: [number, File][] = [];
    
    private addTexture(event) {
        const file = event.target.files[0];
        if (file) {
            let name = file.name.replace(/\..+$/, "");
            name = name.replace(/\W/g, "");

            this.files.push([this.textures.length, file]);
            this.textures.push(new TextureSource(URL.createObjectURL(file), name));
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

    public getTextures(): [string, HTMLImageElement][] {
        return this.textures.map((tex, i) => {
            return [tex.name, this.$refs.images[i]] as [string, HTMLImageElement];
        });
    }

    private texUpdate() {
        this.$emit("texUpdate");
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
