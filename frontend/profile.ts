import Vue from 'vue';
import Profile from './profile/profile.vue';

export function mount(mtpoint: string) {
    new Vue({
        render: h => h(Profile),
    }).$mount(mtpoint);
}
