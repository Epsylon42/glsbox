<template>
<canvas ref="shader_canvas" width="400" height="300">
  No WebGl support
</canvas>
</template>

<script lang="ts">
    
import { Vue, Component, Prop, Watch, Emit } from 'vue-property-decorator';

import { store } from './store/store.ts';
import FragShader from './store/frag-shader.ts';
import TextureData from './store/texture-data.ts';
import { TextureKind } from '../../common/texture-kind.ts';

import ShaderCompute from './shader-compute.ts';
import Wgl, { Uniform, FloatUniform, FloatVecUniform, Texture2DUniform, TextureCubeUniform, WglError } from 'wgl';

@Component
export default class ShaderWindow extends Vue {
    private get shader(): FragShader | null {
        return store.getters.shader;
    }
    @Watch('shader') shaderChanged(newShader: FragShader | null) {
        try {
            this.updateShader(newShader);
        } catch (e) {
            if (e instanceof WglError) {
                this.error(e);
            } else {
                throw e;
            }
        }
    }
    
    private gl: Wgl;
    private shaderCompute: ShaderCompute | null = null;
    private timerId: number | null = null;
    private time: number = 0;

    public get canvas(): HTMLCanvasElement {
        return this.$refs.shader_canvas as HTMLCanvasElement;
    }
    
    updateShader(shader: FragShader | null) {
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }

        if (!this.shaderCompute) {
            this.shaderCompute = new ShaderCompute(this.shader, this.gl);
        } else {
            this.shaderCompute.setShader(shader);
        }
        
        this.timerId = setInterval(() => {
            this.time += 1/30;
            
            const uniforms: [string, Uniform][] = [
                ['u_time', new FloatUniform(this.time)],
                ['u_resolution', new FloatVecUniform([400.0, 300.0])],
            ];
            
            this.shaderCompute.draw(uniforms.concat(store.getters.textureUniforms));
        }, 1/30 * 1000);
    }
    
    mounted() {
        this.gl = new Wgl((this.$refs.shader_canvas as HTMLCanvasElement).getContext("webgl"));
    }

    destroyed() {
        if (this.timerId) {
            clearInterval(this.timerId);
        }
    }

    @Emit() private error(err: WglError) {}
}
</script>
