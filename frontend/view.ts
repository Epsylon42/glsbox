import Vue from 'vue';
import ShaderView from './shader-view/shader-view.vue';

import { store, Mutations, Actions } from './shader-view/store/store.ts';

export function mount(mtpoint: string, id?: number, user?: number) {
    store.dispatch(Actions.requestShader, id);
    store.commit(Mutations.setUser, user);

    new Vue({
        render: h => h(ShaderView),
    }).$mount(mtpoint);
}
