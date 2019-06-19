import Vue from 'vue';
import Vuex from 'vuex';

import FragShader, { Declaration, declarations } from './frag-shader.ts';
import Preview from './preview.ts';
import TextureData from './texture-data.ts';
import CommentData, { GenericComment } from './comment.ts';

import { ShaderStorage, PostShaderData, PatchShaderData, RecvShaderData } from '../../api/shader-storage.ts';
import { CommentStorage } from '../../api/comment-storage.ts';
import { UserStorage, RecvUser } from '../../api/user-storage.ts';
import { TextureKind } from '../../../common/texture-kind.ts';
import { UserRole } from '../../../common/user-role.ts';
import { Uniform, Texture2DUniform, TextureCubeUniform } from 'wgl';

export class ShaderData {
    public id: number;
    public owner: number;
    public name: string;
    public description: string;
    public frag: FragShader;
    public preview?: Preview = null;
    public textures: TextureData[] = [];
    public published: boolean;
    public liked: boolean;
    public likeCount: number;

    constructor(recv: RecvShaderData) {
        this.id = recv.id;
        this.owner = recv.owner;
        this.name = recv.name;
        this.description = recv.description;
        this.frag = new FragShader(recv.code);
        this.published = recv.published;
        this.liked = recv.liked;
        this.likeCount = recv.likeCount;

        this.textures = recv.textures.map(tex => {
            const texData = new TextureData(tex.url, tex.name, tex.kind);
            texData.id = tex.id;
            return texData;
        });

        if (recv.previewUrl) {
            this.preview = new Preview(recv.previewUrl);
        }
    }

    public static defaultShader(): ShaderData {
        const data = new RecvShaderData(-1, -1, FragShader.defaultShader().source);
        data.published = false;
        return new ShaderData(data);
    }
}

export class StoreState {
    // current logged in user
    public user?: RecvUser = null;
    public shader: ShaderData = ShaderData.defaultShader();
    public deletedTextures: TextureData[] = [];

    public ownerRole: UserRole = -1;

    public rootComment: GenericComment = new GenericComment();
    public focusedComment?: HTMLElement = null;

    public sendLock: boolean = false;
}

export const Mutations = {
    setShader: "setShader",
    setFrag: "setFrag",
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
    setPublished: "setPublished",
    setLikes: "setLikes",
    setRootComment: "setRootComment",
    modifyComment: "modifyComment",
    setFocusedComment: "setFocusedComment",
    setOwnerRole: "setOwnerRole",
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
    requestComment: "requestComment",
    setPublished: "setPublishedAction",
    like: "like",

    saveShader: "saveShader",
};

Vue.use(Vuex);

export const store = new Vuex.Store({
    strict: true,

    state: new StoreState(),

    getters: {
        user(state: StoreState): RecvUser | null {
            return state.user;
        },

        id(state: StoreState): number | null {
            if (state.shader.id === -1) {
                return null;
            } else {
                return state.shader.id;
            }
        },

        owner(state: StoreState): number | null {
            return state.shader.owner !== -1 && state.shader.owner;
        },

        canSave(state: StoreState): boolean {
            return state.user && (state.shader.owner === -1 || state.shader.owner === state.user.id);
        },

        canEdit(state: StoreState): boolean {
            return state.user && state.shader.id !== -1 && state.user.id === state.shader.owner;
        },

        canDelete(state: StoreState): boolean {
            return state.user
                && state.shader.id !== -1
                && (state.user.id === state.shader.owner
                    || state.user.role < state.ownerRole);
        },

        frag(state: StoreState): FragShader {
            return state.shader.frag;
        },

        activeTextures(state: StoreState): [number, TextureData][] {
            return state.shader.textures
                .map((tex, i) => [i, tex] as [number, TextureData])
                .filter(([_, tex]) => !tex.deleted);
        },

        name(state: StoreState): string {
            return state.shader.name;
        },

        description(state: StoreState): string {
            return state.shader.description;
        },

        source(state: StoreState): string {
            return state.shader.frag.source;
        },

        declarations(state: StoreState): Declaration[] {
            return declarations.concat(state.shader.frag.textures);
        },

        preview(state: StoreState): Preview | null {
            if (state.shader.preview && !state.shader.preview.deleted) {
                return state.shader.preview;
            }
        },

        published(state: StoreState): boolean {
            return state.shader.published;
        },

        liked(state: StoreState): boolean {
            return state.shader.liked;
        },

        likeCount(state: StoreState): number {
            return state.shader.likeCount;
        },

        textureUniforms(state: StoreState): [string, Uniform][] {
            return state.shader.textures
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
                });
        },

        rootComment(state: StoreState): GenericComment {
            return state.rootComment;
        },

        link(state: StoreState): string {
            if (state.shader) {
                return `/view/${state.shader.id}`;
            } else {
                return "/create";
            }
        },

        focusedComment(state: StoreState): HTMLElement | null {
            return state.focusedComment;
        },

        isSaving(state: StoreState): boolean {
            return state.sendLock;
        },
    },

    mutations: {
        [Mutations.setUser] (state: StoreState, user: RecvUser) {
            state.user = user;
            if (state.shader.owner === -1) {
                state.shader.owner = user.id;
            }
        },

        [Mutations.setShader] (state: StoreState, shader: ShaderData) {
            state.shader = shader;
        },

        [Mutations.setFrag] (state: StoreState, frag: FragShader) {
            state.shader.frag = frag;
        },

        [Mutations.setId] (state: StoreState, id?: number) {
            state.shader.id = id;
        },

        [Mutations.setName] (state: StoreState, name: string) {
            state.shader.name = name;
        },

        [Mutations.setDescription] (state: StoreState, description: string) {
            state.shader.description = description;
        },

        [Mutations.setPublished] (state: StoreState, published: boolean) {
            state.shader.published = published;
        },

        [Mutations.setPreview] (state: StoreState, preview?: Preview) {
            state.shader.preview = preview;
        },

        [Mutations.setTextures] (state: StoreState, textures: TextureData[]) {
            state.shader.textures = textures.map(tex => {
                if (tex.id != null) {
                    const old = state.shader.textures.find(old => old.id === tex.id);
                    if (old && old.image && !tex.image) {
                        tex.image = old.image;
                    }
                }

                return tex;
            });
        },

        [Mutations.updateShaderTextures] (state: StoreState) {
            state.shader.frag.constructTextures(state.shader.textures.filter(tex => !tex.deleted));
        },

        [Mutations.removeTexture] (state: StoreState, i: number) {
            const tex = state.shader.textures[i];
            tex.deleted = true;
            state.shader.textures.splice(i, 1);
            if (tex.id != null) {
                state.deletedTextures.push(tex);
            }
        },

        [Mutations.setTextureImage] (state: StoreState, arg: { i: number, image: HTMLImageElement }) {
            state.shader.textures[arg.i].image = arg.image;
        },

        [Mutations.setTextureName] (state: StoreState, arg: { i: number, name: string }) {
            state.shader.textures[arg.i].name = arg.name;
        },

        [Mutations.setTextureKind] (state: StoreState, arg: { i: number, kind: TextureKind }) {
            state.shader.textures[arg.i].kind = arg.kind;
        },

        [Mutations.setSendLock] (state: StoreState, lock: boolean) {
            state.sendLock = lock;
        },

        [Mutations.setRootComment] (state: StoreState, comment: GenericComment) {
            state.rootComment = comment;
        },

        [Mutations.modifyComment] (state: StoreState, args: { comment: Comment, callback: (comment: Comment) => void }) {
            args.callback(args.comment);
        },

        [Mutations.setFocusedComment] (state: StoreState, comment: HTMLElement | null) {
            state.focusedComment = comment;
        },

        [Mutations.setLikes] (state: StoreState, likes: { liked: boolean, likeCount: number }) {
            state.shader.liked = likes.liked;
            state.shader.likeCount = likes.likeCount;
        },

        [Mutations.setOwnerRole] (state: StoreState, role: UserRole) {
            state.ownerRole = role;
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
            commit(Mutations.setTextures, state.shader.textures.concat([texture]));
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

        [Actions.setShader] ({ state, commit }, shader: ShaderData) {
            state.deletedTextures = [];
            commit(Mutations.setShader, shader);
            commit(Mutations.updateShaderTextures);
            if (shader.owner !== -1) {
                return UserStorage
                    .requestUser(shader.owner)
                    .then(owner => {
                        if (state.shader.owner == owner.id) {
                            commit(Mutations.setOwnerRole, owner.role)
                        }
                    });
            } else {
                commit(Mutations.setOwnerRole, -1);
                return Promise.resolve();
            }
        },

        [Actions.requestShader] ({ dispatch }, id: number | null): Promise<void> {
            if (id != null) {
                return ShaderStorage
                    .requestShader(id)
                    .then(shader => dispatch(Actions.setShader, new ShaderData(shader)));
            } else {
                return dispatch(Actions.setShader, ShaderData.defaultShader());
            }
        },

        [Actions.removeTexture] ({ commit }, i: number) {
            commit(Mutations.removeTexture, i);
            commit(Mutations.updateShaderTextures);
        },

        [Actions.setSource] ({ state, commit }, source: string) {
            commit(Mutations.setFrag, new FragShader(source));
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
            if (state.shader.preview) {
                const preview = new Preview(
                    state.shader.preview.url,
                    state.shader.preview.blob,
                );
                preview.deleted = true;
                commit(Mutations.setPreview, preview);
            }
        },

        [Actions.requestComment] ({ state, commit }, comment?: number): Promise<void> {
            if (state.shader.id !== -1) {
                return CommentStorage
                    .requestComment(state.shader.id, comment)
                    .then(comment => commit(Mutations.setRootComment, comment));
            } else {
                commit(Mutations.setFocusedComment, null);
                commit(Mutations.setRootComment, new GenericComment());
                return Promise.resolve();
            }
        },

        [Actions.saveShader] ({ state, commit, dispatch }): Promise<number> {
            if (state.sendLock) {
                return Promise.reject(new Error("Another saving process is currently underway"));
            } else {
                if (state.shader.name.length === 0) {
                    return Promise.reject(new Error("Please enter a name"));
                }

                commit(Mutations.setSendLock, true);

                const createNew = state.shader.id === -1;

                let promise: Promise<RecvShaderData> | null = null;
                if (createNew) {

                    const data = new PostShaderData(
                        state.shader.name,
                        state.shader.description,
                        state.shader.frag.source,
                        state.shader.textures.map(tex => ({
                            name: tex.name,
                            kind: tex.kind,
                            file: tex.file,
                        })),
                        state.shader.preview && !state.shader.preview.deleted && state.shader.preview.blob
                    );

                    promise = ShaderStorage.postShader(data);
                    promise
                        .then(shader => dispatch(Actions.setShader, new ShaderData(shader)))
                } else {
                    let preview: Blob | "delete" | null;
                    if (state.shader.preview) {
                        if (!state.shader.preview.deleted && state.shader.preview.blob) {
                            preview = state.shader.preview.blob;
                        } else if (state.shader.preview.deleted) {
                            preview = "delete";
                        }
                    }

                    const data = new PatchShaderData(
                        state.shader.id,
                        state.shader.name,
                        state.shader.description,
                        state.shader.frag.source,
                        state.shader.textures.concat(state.deletedTextures).map(tex => ({
                            id: tex.id,
                            name: tex.name,
                            kind: tex.kind,
                            file: tex.file,
                            deleted: tex.deleted,
                        })),
                        preview
                    );

                    promise = ShaderStorage.patchShader(data);
                    promise
                        .then(shader => dispatch(Actions.setShader, new ShaderData(shader)));
                }

                promise
                    .catch(() => commit(Mutations.setSendLock, false));

                return promise
                    .then(shader => {
                        commit(Mutations.setSendLock, false);
                        if (createNew) {
                            window.history.pushState("", "", `#/view/${shader.id}`);
                        }
                        return shader.id;
                    });
            }
        },

        [Actions.setPublished] ({ state, commit }, published: boolean): Promise<void> {
            if (state.shader.id === -1) {
                throw new Error("Can't publish an unsaved shader");
            }

            return ShaderStorage
                .setPublishedState(state.shader.id, published)
                .then(() => {
                    commit(Mutations.setPublished, published);
                });
        },

        [Actions.like] ({ state, commit }): Promise<void> {
            return ShaderStorage
                .setLikedState(state.shader.id, !state.shader.liked)
                .then(response => commit(Mutations.setLikes, response));
        },
    },
});
