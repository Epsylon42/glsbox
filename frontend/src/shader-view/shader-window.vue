<template>
<canvas ref="shader_canvas" width="400" height="300">
  No WebGl support
</canvas>
</template>

<script lang="ts">
    
import { Vue, Component, Prop, Watch, Emit } from 'vue-property-decorator';
import ShaderCompute from './shader-compute.ts';
import FragShader from '../frag-shader.ts';
import Wgl, { FloatUniform, FloatVecUniform, TextureCubeUniform, WglError } from 'wgl';

@Component
export default class ShaderWindow extends Vue {
    @Prop({ type: FragShader, required: false }) shader: FragShader | null = null;
    
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
    
    updateShader(shader: FragShader | null) {
        if (!shader) {
            if (this.timerId) {
                clearInterval(this.timerId);
                this.timerId = null;
            }
        } else {
            if (!this.shaderCompute) {
                this.shaderCompute = new ShaderCompute(this.shader, this.gl);
            } else {
                this.shaderCompute.setShader(shader);
            }
            
            this.timerId = setInterval(() => {
                this.time += 1/30;
                
                this.shaderCompute.draw([
                    ['u_time', new FloatUniform(this.time)],
                    ['u_resolution', new FloatVecUniform([400.0, 300.0])],
                ]);
            }, 1/30 * 1000);
        }
    }

    mounted() {
        this.gl = new Wgl((this.$refs.shader_canvas as HTMLCanvasElement).getContext("webgl"));
        if (this.shader) {
            this.updateShader(this.shader);
        }
    }

    destroyed() {
        if (this.timerId) {
            clearInterval(this.timerId);
        }
    }

    @Emit() private error(err: WglError) {}
}
</script>
