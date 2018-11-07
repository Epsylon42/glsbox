import Vue from 'vue';
import ShaderView from './shader-view/shader-view.vue';

import { store, Mutations, Actions } from './shader-view/store/store.ts';
import { UserStorage } from './backend.ts';

export function mount(mtpoint: string, id?: number, user?: number) {
    Promise.all([
        user && UserStorage.requestUser(user),
        store.dispatch(Actions.requestShader, id),
    ])
        .then(([user]) => {
            if (user) {
                store.commit(Mutations.setUser, user);
            }
            store.dispatch(Actions.requestComment)
        });

    new Vue({
        render: h => h(ShaderView),
    }).$mount(mtpoint);
}
