import Vue from 'vue';
import ShaderView from './shader-view/shader-view.vue';


export function mount(mtpoint: string) {
    new Vue({
        render: h => h(ShaderView),
    }).$mount(mtpoint);
}
