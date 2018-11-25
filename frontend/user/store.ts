import Vue from 'vue';
import Vuex, { Commit } from 'vuex';

import { RecvUser, PatchUser, UserStorage } from '../api/user-storage.ts';
import { CommentStorage }  from '../api/comment-storage.ts';
import { RecvShaderData, ShaderStorage } from '../api/shader-storage.ts';
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
    public newPublicEmail?: boolean = null;

    public newTelegram?: string = null;
    public telegramChanged: boolean = false;
    public newPublicTelegram?: boolean = null;

    public newPassword?: string = null;
    public newRole?: UserRole = null;

    public shaders = new DynamicLoading<RecvShaderData>(10);
    public commented = new DynamicLoading<ShaderComments>(10);

    public savingLock: boolean = false;
}

export const Mutations = {
    setUserLoading: "setUserLoading",
    setUser: "setUser",
    setMe: "setMe",
    changeEmail: "changeEmail",
    changeTelegram: "changeTelegram",
    changePassword: "changePassword",
    changeRole: "changeRole",

    changePublicEmail: "changePublicEmail",
    changePublicTelegram: "changePublicTelegram",

    resetChanges: "resetChanges",

    pushDLBatch: "pushDLBatch",
    modifyDL: "modifyDL",
    resetShaders: "resetShaders",

    setSavingLock: "setSavingLock",
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

        telegram(state: StoreState) : string | null {
            return state.telegramChanged ? state.newTelegram : state.user.telegram;
        },

        role(state: StoreState): UserRole | null {
            return state.newRole || state.user.role;
        },

        publicEmail(state: StoreState): boolean {
            return state.newPublicEmail != null ? state.newPublicEmail : state.user.publicEmail;
        },

        publicTelegram(state: StoreState): boolean {
            return state.newPublicTelegram != null ? state.newPublicTelegram : state.user.publicTelegram;
        },

        canEditPublic(state: StoreState): boolean {
            return state.me && state.me.id === state.user.id;
        },

        canEditFields(state: StoreState): boolean {
            return state.me && (state.me.id === state.user.id || state.me.role < state.user.role);
        },

        canEditRole(state: StoreState): boolean {
            return state.me && state.me.role === UserRole.Admin && state.user.role !== UserRole.Admin;
        },

        isPriviledged(state: StoreState): boolean {
            return state.me && (state.me.role < state.user.role);
        },

        changed(state: StoreState): boolean {
            return state.emailChanged
                || state.telegramChanged
                || state.newPassword != null
                || state.newRole != null
                || state.newPublicEmail != null
                || state.newPublicTelegram != null;
        },

        isSaving(state: StoreState): boolean {
            return state.savingLock;
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
            if (!email || email.length === 0) {
                state.newEmail = null;
            } else {
                state.newEmail = email;
            }
            state.emailChanged = true;
        },

        [Mutations.changeTelegram] (state: StoreState, telegram?: string) {
            if (!telegram || telegram.length === 0) {
                if (telegram && telegram[0] === "@") {
                    state.newTelegram = telegram.slice(1);
                } else {
                    state.newTelegram = telegram;
                }
            } else {
                state.newTelegram = null;
            }
            state.telegramChanged = true;
        },

        [Mutations.changePassword] (state: StoreState, pass?: string) {
            state.newPassword = pass;
        },

        [Mutations.changeRole] (state: StoreState, role?: UserRole) {
            state.newRole = role;
        },

        [Mutations.changePublicEmail] (state: StoreState, pub: boolean) {
            state.newPublicEmail = pub;
        },

        [Mutations.changePublicTelegram] (state: StoreState, pub: boolean) {
            state.newPublicTelegram = pub;
        },

        [Mutations.resetChanges] (state: StoreState) {
            state.newEmail = null;
            state.emailChanged = false;
            state.newPublicEmail = null;

            state.newTelegram = null;
            state.telegramChanged = false;
            state.newPublicTelegram = null;

            state.newPassword = null;
            state.newRole = null;
        },


        [Mutations.modifyDL] (state: StoreState, { dl, func }: { dl: DynamicLoading<any>, func: (dl: DynamicLoading<any>) => any }) {
            func(dl);
        },

        [Mutations.resetShaders] (state: StoreState) {
            state.shaders.reset();
        },

        [Mutations.setSavingLock] (state: StoreState, lock: boolean) {
            state.savingLock = lock;
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
            if (state.savingLock) {
                return Promise.reject(new Error("Another saving process is already underway"));
            }
            commit(Mutations.setSavingLock, true);

            const promise = UserStorage.patchUser(state.user.id, new PatchUser(
                state.newPassword || undefined,
                state.newRole || undefined,
                state.emailChanged ? state.newEmail : undefined,
                state.telegramChanged ? state.newTelegram : undefined,
                state.newPublicEmail != null ? state.newPublicEmail : undefined,
                state.newPublicTelegram != null ? state.newPublicTelegram : undefined,
            ))
                .then(user => {
                    commit(Mutations.setUser, user);
                    commit(Mutations.resetChanges);
                });

            promise
                .then(() => commit(Mutations.setSavingLock, false))
                .catch(() => commit(Mutations.setSavingLock, false));

            return promise;
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
