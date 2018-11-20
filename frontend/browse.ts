import Vue from 'vue';
import Browse from './browse/browse.vue';

export function mount(mtpoint: string) {
    new Vue({
        render: h => h(Browse),
    }).$mount(mtpoint);
}
