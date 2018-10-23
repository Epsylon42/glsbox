import Vue from 'vue';
import Vuex from 'vuex';
import FragShader, { Declaration, declarations } from '../../frag-shader.ts';
import TextureData from '../../texture-data.ts';
import { ShaderStorage, SendShaderData } from '../../backend.ts';
import { TextureKind } from '../../../common/texture-kind.ts';
import { Uniform, Texture2DUniform, TextureCubeUniform } from 'wgl';

export class StoreState {
    public id?: number = null;
    public mainShader: FragShader | null = null;
    public textures: TextureData[] = [];
    public sendLock: boolean = false;
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
    setId: "setId",
    setSendLock: "setSendLock",
};

export const Actions = {
    addTexture: "addTexture",
    addTextureFile: "addTextureFile",
    setTextureName: "setTextureName",
    setTextureKind: "setTextureKind",
    requestShader: "requestShader",
    removeTexture: "removeTexture",
    setSource: "setSource",

    saveShader: "saveShader",
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

        declarations(state: StoreState): Declaration[] {
            if (state.mainShader) {
                return declarations.concat(state.mainShader.textures);
            } else {
                return declarations;
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

        [Mutations.setId] (state: StoreState, id?: number) {
            state.id = id;
        },

        [Mutations.setTextures] (state: StoreState, textures: TextureData[]) {
            state.textures = textures;
        },

        [Mutations.updateShaderTextures] (state: StoreState) {
            state.mainShader.constructTextures(state.textures);
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

        [Mutations.setSendLock] (state: StoreState, lock: boolean) {
            state.sendLock = lock;
        },
    },

    actions: {
        [Actions.addTextureFile] ({ dispatch, commit }, file: File) {
            let name = file.name.replace(/\..+$/, "");
            name = name.replace(/\W/g, "");

            const data = new TextureData(URL.createObjectURL(file), name);
            data.file = file;
            dispatch(Actions.addTexture, data);
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
            if (id) {
                return ShaderStorage.requestShader(id)
                    .then(shader => {
                        commit(Mutations.setShader, shader.shader);
                        commit(Mutations.setId, id);
                        const textures = shader.textures.map(({ id, name, kind }) => {
                            const data = new TextureData(`/api/textures/${id}`, name, kind);
                            data.id = id;
                            return data;
                        });
                        if (textures.length !== 0) {
                            commit(Mutations.setTextures, textures);
                            commit(Mutations.updateShaderTextures);
                        }
                    });
            }  else {
                return ShaderStorage.requestDefaultShader()
                    .then(shader => {
                        commit(Mutations.setShader, shader.shader);
                    });
            }
        },

        [Actions.removeTexture] ({ commit }, i: number) {
            commit(Mutations.removeTexture, i);
            commit(Mutations.updateShaderTextures);
        },

        [Actions.setSource] ({ state, commit }, source: string) {
            commit(Mutations.setShader, new FragShader(source));
            commit(Mutations.updateShaderTextures);
        },

        [Actions.saveShader] ({ state, commit }) {
            if (state.sendLock) {
                return Promise.reject(new Error("Another saving process is currently underway"));
            } else {
                commit(Mutations.setSendLock, true);
                const promise = ShaderStorage.postShader(
                    new SendShaderData(state.mainShader.source, state.textures),
                    state.id
                );
                promise
                    .then(id => {
                        commit(Mutations.setId, id);
                        commit(Mutations.setSendLock, false)
                    })
                    .catch(() => commit(Mutations.setSendLock, false));

                return promise;
            }
        }
    },
});
