import Vue from 'vue';
import Login from './login/login.vue';

export function mount(mtpoint: string) {
    new Vue({
        render: h => h(Login)
    }).$mount(mtpoint);
}
