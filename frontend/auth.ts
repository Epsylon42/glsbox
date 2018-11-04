import Vue from 'vue';
import Auth from './auth/auth.vue';

export function mount(mtpoint: string, mode: string) {
    new Vue({
        render: h => h(Auth, { props: { mode } }),
    }).$mount(mtpoint);
}
