import FragShader from './shader-view/store/frag-shader.ts';
import TextureData from './shader-view/store/texture-data.ts';
import Preview from './shader-view/store/preview.ts';
import { TextureKind } from '../common/texture-kind.ts';

export class RecvShaderData {
    constructor(
        public shader: FragShader,
        public textures: TextureData[] = [],
        public preview?: Preview,
    ) {}
}

export class SendShaderData {
    constructor(
        public code: string,
        public textures: TextureData[],
        public preview?: Preview,
    ) {};
}

export module ShaderStorage {
    export function requestDefaultShader(): Promise<RecvShaderData> {
        return Promise.resolve(new RecvShaderData(
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
                    const data = JSON.parse(req.responseText);
                    const shader = new FragShader(data.code);
                    resolve(new RecvShaderData(
                        shader,
                        data.textures.map(({ id, name, kind, url }) => {
                            const data = new TextureData(url, name, kind);
                            data.id = id;
                            return data;
                        }),
                        data.previewUrl && new Preview(data.previewUrl),
                    ));
                } else {
                    reject(new Error(req.responseText));
                }
            };
            req.send();
        })
    }

    export function postShader(data: SendShaderData, id?: number): Promise<number> {
        const form = new FormData();
        if (id) {
            form.append("id", id.toString());
        }
        if (data.preview) {
            if (data.preview.save && data.preview.blob) {
                form.append("preview", data.preview.blob, "preview.png");
            } else {
                form.append("keep_preview", "true");
            }
        }

        form.append("code", data.code);

        let textureOptions: { name: string, kind: TextureKind, file?: number, id?: number }[] = [];

        let nFiles = 0;
        for (const tex of data.textures) {
            let opt: typeof textureOptions[0] = {
                name: tex.name,
                kind: tex.kind,
            };

            if (tex.file) {
                form.append("textures", tex.file);
                opt.file = nFiles;
                nFiles++;
            } else if (tex.id) {
                opt.id = tex.id;
            }

            textureOptions.push(opt);
        }
        form.append("textureOptions", JSON.stringify(textureOptions));

        return new Promise((resolve, reject) => {
            const req = new XMLHttpRequest();
            req.open("POST", `/api/shaders`);
            req.onloadend = () => {
                if (req.status === 200) {
                    resolve(Number(req.responseText));
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
