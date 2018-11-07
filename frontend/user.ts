import Vue from 'vue';
import User from './user/user.vue';

export function mount(mtpoint: string, id?: number) {
    new Vue({
        render: h => h(User, { props: { id } }),
    }).$mount(mtpoint)
}
