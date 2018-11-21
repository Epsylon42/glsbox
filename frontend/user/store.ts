import Vue from 'vue';
import Vuex, { Commit } from 'vuex';

import { RecvUser, PatchUser, UserStorage, RecvShaderData, ShaderStorage, CommentStorage } from '../backend.ts';
import CommentData from '../shader-view/store/comment.ts';
import { UserRole } from '../../common/user-role.ts';

import DynamicLoading from '../dynamic-loading.ts';

export class ShaderComments extends DynamicLoading<CommentData> {
    constructor(
        limit: number,
        public shader: RecvShaderData,
    ) {
        super(limit);
    }
}

function commitModifyDL<T>(commit: Commit) {
    return (dl: DynamicLoading<T>, func: (dl: DynamicLoading<T>) => void) =>
        commit(Mutations.modifyDL, { dl, func });
}

export class StoreState {
    public userLoading: boolean = false;

    public user?: RecvUser = null;
    public me?: RecvUser = null;

    public newEmail?: string = null;
    public emailChanged: boolean = false;

    public newPassword?: string = null;
    public newRole?: UserRole = null;

    public shaders = new DynamicLoading<RecvShaderData>(10);
    public commented = new DynamicLoading<ShaderComments>(10);
}

export const Mutations = {
    setUserLoading: "setUserLoading",
    setUser: "setUser",
    setMe: "setMe",
    changeEmail: "changeEmail",
    changePassword: "changePassword",
    changeRole: "changeRole",

    resetChanges: "resetChanges",

    pushDLBatch: "pushDLBatch",
    modifyDL: "modifyDL",
    resetShaders: "resetShaders",
};

export const Actions = {
    init: "init",
    save: "save",
    loadShaders: "loadShaders",
    loadCommented: "loadCommented",
    loadComments: "loadComments",
};

Vue.use(Vuex);

export const store = new Vuex.Store({
    strict: true,

    state: new StoreState(),

    getters: {
        user(state: StoreState): RecvUser | null {
            return state.user;
        },

        me(state: StoreState): RecvUser | null {
            return state.me;
        },

        email(state: StoreState): string | null {
            return state.emailChanged ? state.newEmail : state.user.email;
        },

        role(state: StoreState): UserRole | null {
            return state.newRole || state.user.role;
        },

        canEditFields(state: StoreState): boolean {
            return state.me && (state.me.id === state.user.id || state.me.role < state.user.role);
        },

        canEditRole(state: StoreState): boolean {
            return state.me && state.me.role === UserRole.Admin && state.user.role !== UserRole.Admin;
        },

        changed(state: StoreState): boolean {
            return store.state.emailChanged
                || store.state.newPassword != null
                || store.state.newRole != null;
        },
    },

    mutations: {
        [Mutations.setUserLoading] (state: StoreState, loading: boolean) {
            state.userLoading = loading;
        },

        [Mutations.setUser] (state: StoreState, user: RecvUser) {
            state.user = user;
        },

        [Mutations.setMe] (state: StoreState, me: RecvUser) {
            state.me = me;
        },

        [Mutations.changeEmail] (state: StoreState, email?: string) {
            state.newEmail = email;
            state.emailChanged = true;
        },

        [Mutations.changePassword] (state: StoreState, pass?: string) {
            state.newPassword = pass;
        },

        [Mutations.changeRole] (state: StoreState, role?: UserRole) {
            state.newRole = role;
        },

        [Mutations.resetChanges] (state: StoreState) {
            state.newEmail = null;
            state.newPassword = null;
            state.newRole = null;
            state.emailChanged = false;
        },


        [Mutations.modifyDL] (state: StoreState, { dl, func }: { dl: DynamicLoading<any>, func: (dl: DynamicLoading<any>) => any }) {
            func(dl);
        },

        [Mutations.resetShaders] (state: StoreState) {
            state.shaders.reset();
        },
    },

    actions: {
        [Actions.init] ({ state, commit }, id: number): Promise<void> {
            commit(Mutations.setUserLoading, true);

            return Promise.all([
                UserStorage.requestUser(id),
                UserStorage.requestMe().catch(() => {}),
            ])
                .then(([user, me]) => {
                    commit(Mutations.setUser, user);
                    commit(Mutations.setMe, me);
                    commit(Mutations.setUserLoading, false);
                });
        },

        [Actions.save] ({ state, commit }): Promise<void> {
            return UserStorage.patchUser(state.user.id, new PatchUser(
                state.emailChanged && state.newEmail || undefined,
                state.newPassword || undefined,
                state.newRole || undefined,
            ))
                .then(user => {
                    commit(Mutations.setUser, user);
                    commit(Mutations.resetChanges);
                });
        },

        [Actions.loadShaders] ({ state, commit }, obj: { time?: string, search?: string }): Promise<void> {
            return state.shaders.load((limit, page) => {
                return ShaderStorage
                    .requestShaders(limit, page, { owner: state.user.id, ...obj });
            }, commitModifyDL(commit));
        },

        [Actions.loadCommented] ({ state, commit, dispatch }): Promise<void> {
            return state.commented.load((limit, page) => {
                return ShaderStorage
                    .requestCommentedShaders(state.user.id, limit, page)
                    .then(shaders => Promise.all(shaders.map(shader => {
                        const dl = new ShaderComments(5, shader);
                        return dispatch(Actions.loadComments, dl)
                            .then(() => dl);
                    })));
            }, commitModifyDL(commit));
        },

        [Actions.loadComments] ({ state, commit }, arg: ShaderComments | number): Promise<void> {
            let dl: ShaderComments;
            if (typeof arg === "number") {
                dl = state.commented.shown[arg];
            } else {
                dl = arg;
            }

            return dl.load((limit, page) => {
                return CommentStorage
                    .requestCommentsUnderShader(state.user.id, dl.shader.id, limit, page);
            }, commitModifyDL(commit));
        }
    },
});
