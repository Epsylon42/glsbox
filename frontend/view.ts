import Vue from 'vue';
import ShaderView from './shader-view/shader-view.vue';

export function mount(mtpoint: string, id?: number) {
    new Vue({
        render: h => h(ShaderView, { props: { shaderId: id } }),
    }).$mount(mtpoint);
}
