import Vue from 'vue';
import Vuex from 'vuex';

import { RecvUser, PatchUser, UserStorage } from '../backend.ts';
import { UserRole } from '../../common/user-role.ts';

export class StoreState {
    public user?: RecvUser = null;
    public me?: RecvUser = null;

    public newEmail?: string = null;
    public newPassword?: string = null;
    public newRole?: UserRole = null;
}

export const Mutations = {
    setUser: "setUser",
    setMe: "setMe",
    changeEmail: "changeEmail",
    changePassword: "changePassword",
    changeRole: "changeRole",
};

export const Actions = {
    init: "init",
    save: "save",
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
            return state.newEmail || state.user.email;
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
            return store.state.newEmail != null
                || store.state.newPassword != null
                || store.state.newRole != null;
        },
    },

    mutations: {
        [Mutations.setUser] (state: StoreState, user: RecvUser) {
            state.user = user;
        },

        [Mutations.setMe] (state: StoreState, me: RecvUser) {
            state.me = me;
        },

        [Mutations.changeEmail] (state: StoreState, email?: string) {
            state.newEmail = email;
        },

        [Mutations.changePassword] (state: StoreState, pass?: string) {
            state.newPassword = pass;
        },

        [Mutations.changeRole] (state: StoreState, role?: UserRole) {
            state.newRole = role;
        },
    },

    actions: {
        [Actions.init] ({ state, commit }, id: number): Promise<void> {
            return Promise.all([
                UserStorage.requestUser(id),
                UserStorage.requestMe().catch(() => {}),
            ])
                .then(([user, me]) => {
                    commit(Mutations.setUser, user);
                    commit(Mutations.setMe, me);
                });
        },

        [Actions.save] ({ state, commit }): Promise<void> {
            return UserStorage.patchUser(state.user.id, new PatchUser(
                state.newEmail || undefined,
                state.newPassword || undefined,
                state.newRole || undefined,
            ))
                .then(user => {
                    commit(Mutations.setUser, user);
                    commit(Mutations.changeEmail, null);
                    commit(Mutations.changePassword, null);
                    commit(Mutations.changeRole, null);
                });
        },
    },
});
