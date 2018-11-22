<template>
<canvas class="display" ref="shaderCanvas" width="400" height="300">
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
    private get shader(): FragShader {
        return store.getters.frag;
    }
    @Watch('shader') shaderChanged(newShader: FragShader) {
        try {
            this.updateShader(newShader);
        } catch (e) {
            if (e instanceof WglError) {
                if (e.errors) {
                    for (const err of e.errors) {
                        err.line -= newShader.additionalLines();
                    }
                }

                this.error(e);
            } else {
                throw e;
            }
        }
    }
    
    @Prop({ type: Boolean, default: false }) public timePause: boolean;
    @Prop({ type: Boolean, default: false }) public updatePause: boolean;
    
    private gl: Wgl;
    private shaderCompute: ShaderCompute | null = null;
    private timerId: number | null = null;
    private time: number = 0;

    public get shaderTime(): number {
        return this.time;
    }
    
    public get canvas(): HTMLCanvasElement {
        return this.$refs.shaderCanvas as HTMLCanvasElement;
    }

    public resetTime() {
        this.time = 0;
    }
    
    private updateShader(shader: FragShader) {
        if (!this.shaderCompute) {
            this.shaderCompute = new ShaderCompute(this.shader, this.gl);
        } else {
            this.shaderCompute.setShader(shader);
        }
        
        if (!this.timerId) {
            this.timerId = setInterval(() => {
                if (!this.timePause){
                    this.time += 1/30;
                }
                
                if (!this.updatePause) {
                    const uniforms: [string, Uniform][] = [
                        ['u_time', new FloatUniform(this.time)],
                        ['u_resolution', new FloatVecUniform([400.0, 300.0])],
                    ];
                    
                    this.shaderCompute.draw(uniforms.concat(store.getters.textureUniforms));
                }
            }, 1/30 * 1000);
        }
    }
    
    mounted() {
        this.gl = new Wgl(
            (this.$refs.shaderCanvas as HTMLCanvasElement)
                .getContext("webgl", { preserveDrawingBuffer: true })
        );

        window.addEventListener("resize", () => {
            if (this.$refs) {
                const canvas = this.canvas;
                canvas.height = canvas.width * 3/4;
            }
        });

        this.shaderChanged(this.shader);
    }

    destroyed() {
        if (this.timerId) {
            clearInterval(this.timerId);
        }
    }

    @Emit() private error(err: WglError) {}
}
</script>

<style scoped>

.display {
    width: 100%;
    max-width: 400px;

    border-radius: 5px 5px 0 0;
}
</style>
