import Vue from 'vue';
import User from './user/user.vue';

export function mount(mtpoint: string, id: number, panel: string) {
    new Vue({
        render: h => h(User, { props: { id, panel } }),
    }).$mount(mtpoint)
}
