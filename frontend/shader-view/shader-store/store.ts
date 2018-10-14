import Vue from 'vue';
import Vuex from 'vuex';
import FragShader, { uniforms } from '../../frag-shader.ts';
import TextureData from '../../texture-data.ts';
import { ShaderStorage } from '../../backend.ts';
import { TextureKind } from '../../../common/texture-kind.ts';
import { Uniform, Texture2DUniform, TextureCubeUniform } from 'wgl';

export class StoreState {
    public mainShader: FragShader | null = null;
    public textures: TextureData[] = [];
}

export interface IStore {
    getters: {
        getUniformStrings: string[],
        getTextureUniforms: [string, Uniform][],
    },
}

export const Mutations = {
    setShader: "setShader",
    setTextures: "setTextures",
    updateShaderTextures: "updateShaderTextures",
    removeTexture: "removeTexture",
    setTextureImage: "setTextureImage",
    setTextureName: "setTextureName",
    setTextureKind: "setTextureKind",
};

export const Actions = {
    addTexture: "addTexture",
    addTextureFile: "addTextureFile",
    setTextureName: "setTextureName",
    setTextureKind: "setTextureKind",
    requestShader: "requestShader",
    removeTexture: "removeTexture",
    setSource: "setSource",
};

Vue.use(Vuex);

export const store = new Vuex.Store({
    strict: true,

    state: new StoreState(),

    getters: {
        shader(state: StoreState): FragShader | null {
            return state.mainShader;
        },

        textures(state: StoreState): TextureData[] {
            return state.textures;
        },

        source(state: StoreState): string {
            if (state.mainShader) {
                return state.mainShader.source;
            } else {
                return "";
            }
        },

        uniformStrings(state: StoreState): string[] {
            if (state.mainShader) {
                return uniforms.concat(state.mainShader.textures);
            } else {
                return uniforms;
            }
        },

        textureUniforms(state: StoreState): [string, Uniform][] {
            return state.textures
                .filter(tex => tex.image)
                .map(tex => {
                    if (tex.kind !== TextureKind.Normal && tex.kind !== TextureKind.Cubemap) {
                        throw new Error("Invalid TextureKind");
                    }

                    const uni =
                        tex.kind === TextureKind.Normal ? new Texture2DUniform(tex.image) :
                        tex.kind === TextureKind.Cubemap ? new TextureCubeUniform(tex.image) :
                        "UNREACHABLE";

                    return ["tex_" + tex.name, uni] as [string, Uniform];
                })
        },
    },

    mutations: {
        [Mutations.setShader] (state: StoreState, shader: FragShader) {
            state.mainShader = shader;
        },

        [Mutations.setTextures] (state: StoreState, textures: TextureData[]) {
            state.textures = textures;
        },

        [Mutations.updateShaderTextures] (state: StoreState) {
            state.mainShader.textures = [];
            for (let tex of state.textures) {
                    const uniType =
                        tex.kind === TextureKind.Normal ? "sampler2D" :
                        tex.kind === TextureKind.Cubemap ? "samplerCube" :
                        "UNREACHABLE";

                state.mainShader.textures.push(`uniform ${uniType} tex_${tex.name};`);
            }
        },

        [Mutations.removeTexture] (state: StoreState, i: number) {
            state.textures.splice(i, 1);
        },

        [Mutations.setTextureImage] (state: StoreState, arg: { i: number, image: HTMLImageElement }) {
            state.textures[arg.i].image = arg.image;
        },

        [Mutations.setTextureName] (state: StoreState, arg: { i: number, name: string }) {
            state.textures[arg.i].name = arg.name;
        },

        [Mutations.setTextureKind] (state: StoreState, arg: { i: number, kind: TextureKind }) {
            state.textures[arg.i].kind = arg.kind;
        },
    },

    actions: {
        [Actions.addTextureFile] ({ dispatch, commit }, file: File) {
            let name = file.name.replace(/\..+$/, "");
            name = name.replace(/\W/g, "");

            dispatch(Actions.addTexture, new TextureData(URL.createObjectURL(file), name));
        },

        [Actions.addTexture] ({ state, commit }, texture: TextureData) {
            commit(Mutations.setTextures, state.textures.concat([texture]));
            commit(Mutations.updateShaderTextures);
        },

        [Actions.setTextureName] ({ commit }, arg: { i: number, name: string }) {
            commit(Mutations.setTextureName, {
                i: arg.i,
                name: arg.name.replace(/\W/g, ""),
            });
            commit(Mutations.updateShaderTextures);
        },

        [Actions.setTextureKind] ({ commit }, arg: { i: number, kind: TextureKind }) {
            if (arg.kind !== TextureKind.Normal && arg.kind != TextureKind.Cubemap) {
                throw new Error("Invalid TextureKind");
            }

            commit(Mutations.setTextureKind, arg);
            commit(Mutations.updateShaderTextures);
        },

        [Actions.requestShader] ({ commit }, id?: number) {
            const promise =
                id ? ShaderStorage.requestShader(id) :
                ShaderStorage.requestDefaultShader();

            promise.then(shader => {
                commit(Mutations.setShader, shader);
            });
        },

        [Actions.removeTexture] ({ commit }, i: number) {
            commit(Mutations.removeTexture, i);
            commit(Mutations.updateShaderTextures);
        },

        [Actions.setSource] ({ state, commit }, source: string) {
            commit(Mutations.setShader, new FragShader(source));
            commit(Mutations.updateShaderTextures);
        },
    },
});