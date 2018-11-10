import Vue from 'vue';
import Vuex from 'vuex';

import { RecvUser, UserStorage } from '../backend.ts';

export class StoreState {
    public user?: RecvUser = null;
    public me?: RecvUser = null;
}

export const Mutations = {
    setUser: "setUser",
    setMe: "setMe",
    setEmail: "setEmail",
};

export const Actions = {
    init: "init",
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

        canEditFields(state: StoreState): boolean {
            return state.me && (state.me.id === state.user.id || state.me.role < state.user.role);
        },
    },

    mutations: {
        [Mutations.setUser] (state: StoreState, user: RecvUser) {
            state.user = user;
        },

        [Mutations.setMe] (state: StoreState, me: RecvUser) {
            state.me = me;
        },

        [Mutations.setEmail] (state: StoreState, email?: string) {
            state.user.email = email;
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
        }
    },
});
