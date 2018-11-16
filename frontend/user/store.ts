import Vue from 'vue';
import Vuex from 'vuex';

import { RecvUser, PatchUser, UserStorage, RecvShaderData, ShaderStorage } from '../backend.ts';
import { UserRole } from '../../common/user-role.ts';

export class UserShaders {
    public shown: RecvShaderData[] = [];
    public nextBatch: RecvShaderData[] = [];
    public canLoadMore: boolean = true;

    public page: number = 1;
    public limit: number = 10;

    public loadingLock: boolean = false;
    public firstLoading: boolean = false;
}

export class StoreState {
    public userLoading: boolean = false;

    public user?: RecvUser = null;
    public me?: RecvUser = null;

    public newEmail?: string = null;
    public emailChanged: boolean = false;

    public newPassword?: string = null;
    public newRole?: UserRole = null;

    public shaders = new UserShaders();
}

export const Mutations = {
    setUserLoading: "setUserLoading",
    setUser: "setUser",
    setMe: "setMe",
    changeEmail: "changeEmail",
    changePassword: "changePassword",
    changeRole: "changeRole",
    pushShaderBatch: "pushShaderBatch",
    setShadersLoadingLock: "setShadersLoadingLock",
    setShadersFirstLoading: "setShadersFirstLoading",
    setCanLoadMoreShaders: "setCanLoadMoreShaders",

    resetChanges: "resetChanges",
};

export const Actions = {
    init: "init",
    save: "save",
    loadShaders: "loadShaders",
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

        shadersLoading(state: StoreState): boolean {
            return state.shaders.loadingLock;
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

        [Mutations.pushShaderBatch] (state: StoreState, shaders: RecvShaderData[]) {
            if (shaders.length === 0) {
                state.shaders.canLoadMore = false;
            }

            if (state.shaders.shown.length == 0) {
                state.shaders.shown = shaders;
            } else {
                state.shaders.shown.splice(state.shaders.shown.length, 0, ...state.shaders.nextBatch);
                state.shaders.nextBatch = shaders;
            }

            state.shaders.page += 1;
        },

        [Mutations.setShadersLoadingLock] (state: StoreState, lock: boolean) {
            state.shaders.loadingLock = lock;
        },

        [Mutations.setShadersFirstLoading] (state: StoreState, loading: boolean) {
            state.shaders.firstLoading = loading;
        },

        [Mutations.setCanLoadMoreShaders] (state: StoreState, canLoad: boolean) {
            state.shaders.canLoadMore = canLoad;
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

        [Actions.loadShaders] ({ state, commit }): Promise<void> {
            if (state.shaders.loadingLock) {
                return Promise.reject(new Error("Some data is already loading"));
            }

            commit(Mutations.setShadersLoadingLock, true);

            const firstTime = state.shaders.shown.length === 0;
            if (firstTime) {
                commit(Mutations.setShadersFirstLoading, true);
            }

            const promise = ShaderStorage
                .requestUserShaders(state.user.id, state.shaders.limit, state.shaders.page)
                .then(shaders => {
                    commit(Mutations.pushShaderBatch, shaders);

                    if (firstTime && shaders.length === state.shaders.limit) {
                        return ShaderStorage
                            .requestUserShaders(state.user.id, state.shaders.limit, state.shaders.page);
                    } else if (firstTime) {
                        commit(Mutations.setCanLoadMoreShaders, false);
                    }
                })
                .then(maybeShaders => {
                    if (maybeShaders) {
                        commit(Mutations.pushShaderBatch, maybeShaders);
                    }
                });

            promise
                .then(() => {
                    commit(Mutations.setShadersLoadingLock, false);
                    commit(Mutations.setShadersFirstLoading, false);
                })
                .catch(() => {
                    commit(Mutations.setShadersLoadingLock, false)
                    commit(Mutations.setShadersFirstLoading, false);
                });

            return promise;
        },
    },
});
