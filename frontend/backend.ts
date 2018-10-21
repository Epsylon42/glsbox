import FragShader from './frag-shader.ts';
import TextureData from './texture-data.ts';
import { TextureKind } from '../common/texture-kind.ts';

export class ShaderData {
    constructor(
        public shader: FragShader,
        public textures: { id: number, name: string, kind: TextureKind }[],
    ) {}
}

export class SendShaderData {
    constructor(
        public code: string,
        public textures: TextureData[],
    ) {};
}

export module ShaderStorage {
    export function requestDefaultShader(): Promise<ShaderData> {
        return Promise.resolve(new ShaderData(
            new FragShader(`void main() {
gl_FragColor = vec4(abs(v_pos), 0.0, 1.0);
}`),
            []
        ));
    }

    export function requestShader(id: number): Promise<ShaderData> {
        return new Promise((resolve, reject) => {
            const req = new XMLHttpRequest();
            req.open("GET", `/api/shaders/${id}`);
            req.onerror = () => {
                reject(new Error(req.responseText));
            }
            req.onloadend = () => {
                const data = JSON.parse(req.responseText);
                const shader = new FragShader(data.code);
                resolve(new ShaderData(shader, data.textures));
            }
            req.send();
        })
    }

    export function postShader(data: SendShaderData, id?: number): Promise<number> {
        const form = new FormData();
        if (id) {
            form.append("id", id.toString());
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
            req.onerror = () => {
                reject(new Error(req.responseText));
            }
            req.onloadend = () => {
                resolve(Number(req.responseText));
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
