import sliceCubemap, { CubemapPromise } from './image_clipper.ts';

export default class TextureStorage {
    private textures: Map<HTMLImageElement, [number, WebGLTexture]> = new Map();
    private cubemapPromises: Map<HTMLImageElement, [CubemapPromise, WebGLTexture]> = new Map();

    constructor(private gl: WebGLRenderingContext) {}

    public step() {
        if (this.textures.size === 0) {
            return;
        }

        const remove: HTMLImageElement[] = [];
        for (let [key, [age, _]] of this.textures) {
            age += 1;
            if (age > 10) {
                remove.push(key);
            }
        }

        for (let key of remove) {
            this.gl.deleteTexture(this.textures.get(key));
            this.textures.delete(key);
        }
    }

    public get(image: HTMLImageElement, kind: "2d" | "cubemap"): WebGLTexture {
        if (this.textures.has(image)) {
            const pair = this.textures.get(image);
            pair[0] = 0;
            return pair[1];
        }

        if (kind === "2d") {
            const textureKind = this.gl.TEXTURE_2D;
            const tex = this.gl.createTexture();
            this.gl.bindTexture(textureKind, tex);
            {
                const gl = this.gl;
                gl.texImage2D(textureKind, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

                gl.texParameteri(textureKind, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                gl.texParameteri(textureKind, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                gl.texParameteri(textureKind, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(textureKind, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            }
            this.gl.bindTexture(textureKind, null);

            this.textures.set(image, [0, tex]);
            return tex;
        } else {
            const textureKind = this.gl.TEXTURE_CUBE_MAP;
            if (this.cubemapPromises.has(image)) {
                let [promise, tex] = this.cubemapPromises.get(image);
                let parts = promise.tryGetParts();
                if (parts) {
                    this.gl.bindTexture(textureKind, tex);
                    {
                        const gl = this.gl;

                        for (let i = 0; i < 6; i++) {
                            gl.texImage2D(gl.TEXTURE_CUBE_MAP_POSITIVE_X+i, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, parts[i]);
                        }

                        gl.texParameteri(textureKind, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                        gl.texParameteri(textureKind, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
                        gl.texParameteri(textureKind, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                        gl.texParameteri(textureKind, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                    }
                    this.gl.bindTexture(textureKind, null);

                    this.cubemapPromises.delete(image);
                    this.textures.set(image, [0, tex]);
                    return tex;
                } else {
                    return tex;
                }
            } else {
                let tex = this.gl.createTexture();
                let promise = sliceCubemap(image);
                this.cubemapPromises.set(image, [promise, tex]);
                return tex;
            }
        }

        // gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_NEAREST);
        // gl.generateMipmap(gl.TEXTURE_2D);
    }
}
