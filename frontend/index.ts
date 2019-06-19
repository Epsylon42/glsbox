import Vue from 'vue';
import * as VueScrollTo from 'vue-scrollto';

import { store, Mutations, Actions } from './shader-view/store/store.ts';
import { UserStorage } from './api/user-storage.ts';

import { Router } from './router.ts';
import Main from './main.vue';

Vue.use(VueScrollTo, {
    container: "body",
    duration: 500,
    easing: "ease",
    offset: 0,
    force: true,
    cancelable: true,
    onStart: false,
    onDone: false,
    onCancel: false,
    x: false,
    y: true,
});

UserStorage.requestMe()
    .then(user => {
        store.commit(Mutations.setUser, user);
    })
    .catch(() => {});

new Vue({
    render: h => h(Main),
    router: Router
}).$mount("#app");
