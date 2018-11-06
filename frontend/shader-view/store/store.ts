import Vue from 'vue';
import Vuex from 'vuex';

import { Converter as MDConverter } from 'showdown';

import FragShader, { Declaration, declarations } from './frag-shader.ts';
import Preview from './preview.ts';
import TextureData from './texture-data.ts';

import { ShaderStorage, PostShaderData, PatchShaderData, RecvShaderData } from '../../backend.ts';
import { TextureKind } from '../../../common/texture-kind.ts';
import { Uniform, Texture2DUniform, TextureCubeUniform } from 'wgl';

export class StoreState {
    // current logged in user
    public user?: number = null;

    // owner of the shader
    public owner?: number = null;

    public id?: number = null;
    public mainShader?: FragShader = null;
    public preview?: Preview = null;

    public name: string = "";
    public description: string = "";

    public textures: TextureData[] = [];
    public sendLock: boolean = false;

    public converter = new MDConverter();
}

export const Mutations = {
    setShader: "setShader",
    setTextures: "setTextures",
    setName: "setName",
    setDescription: "setDescription",
    updateShaderTextures: "updateShaderTextures",
    removeTexture: "removeTexture",
    setTextureImage: "setTextureImage",
    setTextureName: "setTextureName",
    setTextureKind: "setTextureKind",
    setId: "setId",
    setSendLock: "setSendLock",
    setPreview: "setPreview",
    setUser: "setUser",
    setOwner: "setOwner",
};

export const Actions = {
    addTexture: "addTexture",
    addTextureFile: "addTextureFile",
    setTextureName: "setTextureName",
    setTextureKind: "setTextureKind",
    setShader: "setShader",
    requestShader: "requestShader",
    removeTexture: "removeTexture",
    setSource: "setSource",
    setPreviewFromCanvas: "setPreviewFromCanvas",
    removePreview: "removePreview",

    saveShader: "saveShader",
};

Vue.use(Vuex);

export const store = new Vuex.Store({
    strict: true,

    state: new StoreState(),

    getters: {
        user(state: StoreState): number | null {
            return state.user;
        },

        owner(state: StoreState): number | null {
            return state.owner;
        },

        canSave(state: StoreState): boolean {
            return state.user != null && state.user === state.owner;
        },

        shader(state: StoreState): FragShader | null {
            return state.mainShader;
        },

        activeTextures(state: StoreState): [number, TextureData][] {
            return state.textures
                .map((tex, i) => [i, tex] as [number, TextureData])
                .filter(([_, tex]) => !tex.deleted);
        },

        name(state: StoreState): string {
            return state.name;
        },

        description(state: StoreState): string {
            return state.description;
        },

        descriptionHTML(state: StoreState): string {
            return state.converter.makeHtml(state.description);
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

        preview(state: StoreState): Preview | null {
            if (state.preview && !state.preview.deleted) {
                return state.preview;
            } else {
                return null;
            }
        },

        textureUniforms(state: StoreState): [string, Uniform][] {
            return state.textures
                .filter(tex => tex.image && !tex.deleted)
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
        [Mutations.setUser] (state: StoreState, user?: number) {
            state.user = user;
        },

        [Mutations.setOwner] (state: StoreState, owner?: number) {
            state.owner = owner;
        },

        [Mutations.setShader] (state: StoreState, shader: FragShader) {
            state.mainShader = shader;
        },

        [Mutations.setId] (state: StoreState, id?: number) {
            state.id = id;
        },

        [Mutations.setName] (state: StoreState, name: string) {
            state.name = name;
        },

        [Mutations.setDescription] (state: StoreState, description: string) {
            state.description = description;
        },

        [Mutations.setTextures] (state: StoreState, textures: TextureData[]) {
            state.textures = textures.map(tex => {
                if (tex.id != null) {
                    const old = state.textures.find(old => old.id === tex.id);
                    if (old && old.image && !tex.image) {
                        tex.image = old.image;
                    }
                }

                return tex;
            })
        },

        [Mutations.updateShaderTextures] (state: StoreState) {
            state.mainShader.constructTextures(state.textures.filter(tex => !tex.deleted));
        },

        [Mutations.removeTexture] (state: StoreState, i: number) {
            const tex = state.textures[i];
            if (tex.id) {
                tex.deleted = true;
            } else {
                state.textures.splice(i, 1);
            }
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

        [Mutations.setPreview] (state: StoreState, preview?: Preview) {
            state.preview = preview;
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

        [Actions.setShader] ({ state, commit }, shader: RecvShaderData) {
            commit(Mutations.setShader, shader.shader);
            if (shader.id >= 0) {
                commit(Mutations.setId, shader.id);
            } else {
                commit(Mutations.setId, null);
            }
            commit(Mutations.setOwner, shader.owner != null ? shader.owner : state.user);
            commit(Mutations.setName, shader.name);
            commit(Mutations.setDescription, shader.description);
            commit(Mutations.setTextures, shader.textures);
            commit(Mutations.updateShaderTextures);
            if (shader.preview) {
                commit(Mutations.setPreview, shader.preview);
            }
        },

        [Actions.requestShader] ({ dispatch }, id?: number): Promise<void> {
            return (id ?
                    ShaderStorage.requestShader(id) :
                    ShaderStorage.requestDefaultShader())
                .then(shader => dispatch(Actions.setShader, shader))
        },

        [Actions.removeTexture] ({ commit }, i: number) {
            commit(Mutations.removeTexture, i);
            commit(Mutations.updateShaderTextures);
        },

        [Actions.setSource] ({ state, commit }, source: string) {
            commit(Mutations.setShader, new FragShader(source));
            commit(Mutations.updateShaderTextures);
        },

        [Actions.setPreviewFromCanvas] ({ commit }, canvas: HTMLCanvasElement) {
            canvas.toBlob(blob => {
                const preview = new Preview(
                    canvas.toDataURL("image/png"),
                    blob
                );
                commit(Mutations.setPreview, preview);
            })
        },

        [Actions.removePreview] ({ state, commit }) {
            if (state.preview) {
                const preview = new Preview(
                    state.preview.url,
                    state.preview.blob,
                );
                preview.deleted = true;
                commit(Mutations.setPreview, preview);
            }
        },

        [Actions.saveShader] ({ state, commit, dispatch }): Promise<number> {
            if (state.sendLock) {
                return Promise.reject(new Error("Another saving process is currently underway"));
            } else {
                if (state.name.length === 0) {
                    return Promise.reject(new Error("Please enter a name"));
                }

                commit(Mutations.setSendLock, true);

                let promise: Promise<RecvShaderData> | null = null;
                if (state.id == null) {

                    const data = new PostShaderData(
                        state.name,
                        state.description,
                        state.mainShader.source,
                        state.textures,
                        state.preview,
                    );

                    promise = ShaderStorage.postShader(data);
                    promise
                        .then(shader => dispatch(Actions.setShader, shader))
                } else {
                    const data = new PatchShaderData(
                        state.id,
                        state.name,
                        state.description,
                        state.mainShader.source,
                        state.textures,
                        state.preview
                    );

                    promise = ShaderStorage.patchShader(data);
                    promise
                        .then(shader => dispatch(Actions.setShader, shader));
                }

                promise
                    .catch(() => commit(Mutations.setSendLock, false));

                return promise
                    .then(shader => {
                        commit(Mutations.setSendLock, false);
                        return shader.id;
                    });
            }
        }
    },
});