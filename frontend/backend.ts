import FragShader from './shader-view/store/frag-shader.ts';
import TextureData from './shader-view/store/texture-data.ts';
import Preview from './shader-view/store/preview.ts';
import { TextureKind } from '../common/texture-kind.ts';

export class RecvShaderData {
    constructor(
        public id: number,
        public shader: FragShader,
        public name: string = "",
        public description: string = "",
        public textures: TextureData[] = [],
        public preview?: Preview,
    ) {}

    public static fromResponse(str: string): RecvShaderData {
        const data = JSON.parse(str);
        const shader = new FragShader(data.code);
        //append time to force reload image if it is already loaded
        const preview = data.previewUrl && new Preview(data.previewUrl + `#${new Date().getTime()}`);
        const textures = data.textures.map(({ id, name, kind, url }) => {
            const data = new TextureData(url, name, kind);
            data.id = id;
            return data;
        });

        return new RecvShaderData(data.id, shader, data.name || "", data.description || "", textures, preview);
    }
}

export class PostShaderData {
    constructor(
        public name: string,
        public description: string,
        public code: string,
        public textures: TextureData[],
        public preview?: Preview,
    ) {};
}

export class PatchShaderData {
    constructor(
        public id: number,
        public name: string,
        public description: string,
        public code: string,
        public textures: TextureData[],
        public preview?: Preview,
    ) {};
}

export module ShaderStorage {
    export function requestDefaultShader(): Promise<RecvShaderData> {
        return Promise.resolve(new RecvShaderData(
                -1,
            new FragShader(`void main() {
gl_FragColor = vec4(abs(v_pos), 0.0, 1.0);
}`)));
    }

    export function requestShader(id: number): Promise<RecvShaderData> {
        return new Promise((resolve, reject) => {
            const req = new XMLHttpRequest();
            req.open("GET", `/api/shaders/${id}`);
            req.onloadend = () => {
                if (req.status === 200) {
                    try {
                        resolve(RecvShaderData.fromResponse(req.responseText));
                    } catch (e) {
                        reject(e);
                    }
                } else {
                    reject(new Error(req.responseText));
                }
            };
            req.send();
        })
    }

    export function postShader(data: PostShaderData): Promise<RecvShaderData> {
        const form = new FormData();

        form.append("name", data.name);
        form.append("description", data.description);
        form.append("code", data.code);

        if (data.preview) {
            form.append("preview", data.preview.blob, "preview.png");
        }

        if (data.textures.length !== 0) {
            let textureOptions: { name: string, kind: TextureKind, file: number }[] = [];

            let nFiles = 0;
            for (const tex of data.textures) {
                if (tex.file) {
                    form.append("textures", tex.file);
                    textureOptions.push({
                        name: tex.name,
                        kind: tex.kind,
                        file: nFiles,
                    });

                    nFiles += 1;
                }
            }
            form.append("textureOptions", JSON.stringify(textureOptions));
        }

        return new Promise((resolve, reject) => {
            const req = new XMLHttpRequest();
            req.open("POST", `/shaders`);
            req.onloadend = () => {
                if (req.status === 200) {
                    try {
                        resolve(RecvShaderData.fromResponse(req.responseText));
                    } catch (e) {
                        reject(e);
                    }
                } else {
                    reject(new Error(req.responseText));
                }
            }

            req.send(form);
        });
    }

    export function patchShader(data: PatchShaderData): Promise<RecvShaderData> {
        const form = new FormData();

        form.append("name", data.name);
        form.append("description", data.description);
        form.append("code", data.code);

        if (data.preview) {
            if (data.preview.deleted) {
                form.append("deletePreview", "true");
            } else if (data.preview.blob) {
                form.append("preview", data.preview.blob, "preview.png");
            }
        }

        if (data.textures.length !== 0) {
            let textureOptions: {
                id?: number,
                file?: number,
                name?: string,
                kind?: TextureKind,
                delete?: boolean,
            }[] = [];

            let nFiles = 0;
            for (const tex of data.textures) {
                if (tex.deleted) {
                    textureOptions.push({
                        id: tex.id,
                        delete: true,
                    });
                }

                textureOptions.push({
                    id: tex.id,
                    name: tex.name,
                    kind: tex.kind,
                    file: tex.file ? nFiles : undefined,
                });

                if (tex.file) {
                    form.append("textures", tex.file);
                    nFiles += 1;
                }
            }

            form.append("textureOptions", JSON.stringify(textureOptions));
        }

        return new Promise((resolve, reject) => {
            const req = new XMLHttpRequest();
            req.open("PATCH", `/shaders/${data.id}`);
            req.onloadend = () => {
                if (req.status === 200) {
                    try {
                        resolve(RecvShaderData.fromResponse(req.responseText));
                    } catch (e) {
                        reject(e);
                    }
                } else {
                    reject(new Error(req.responseText));
                }
            }

            req.send(form);
        });
    }
}

export class User {
    public id: number;
    public name: string;
}

export module UserStorage {
    export function currentUser(): Promise<User | null> {
        return Promise.resolve(null);
    }

    export function requestUser(id: number): Promise<User> {
        return Promise.reject("Backend not implemented");
    }
}
