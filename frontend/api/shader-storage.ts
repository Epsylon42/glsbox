import checkError from './api.ts';
import { TextureKind } from '../../common/texture-kind.ts';

export class RecvShaderData {
    public name: string = "";
    public description: string = "";
    public textures: {
        id: number,
        name: string,
        kind: TextureKind,
        url: string,
    }[] = [];
    public previewUrl: string | null = null;
    public creationDate: Date | null = null;
    public publishingDate: Date | null = null;
    public published: boolean = true;
    public liked: boolean = false;
    public likeCount: number = 0;

    constructor(
        public id: number,
        public owner: number,
        public code: string,
    ) {}

    public static fromJson(data: any): RecvShaderData {
        if (data.id == null) {
            throw new Error("Shader data is missing id");
        }
        if (data.owner == null) {
            throw new Error("Shader data is missing owner");
        }
        if (data.code == null) {
            throw new Error("Shader data is missing code");
        }

        const shader = new RecvShaderData(data.id, data.owner, data.code);

        if (data.textures) {
            const texturesAreValid = data.textures.every && data.textures.every(tex => {
                return tex.id != null
                    && tex.name != null
                    && tex.textureKind != null
                    && tex.url != null;
            });

            if (!texturesAreValid) {
                throw new Error("Shader data textures have invalid format");
            }

            shader.textures = data.textures.map(tex => ({
                id: tex.id,
                name: tex.name,
                kind: tex.textureKind,
                url: tex.url,
            }));

            delete data.textures;
        }

        for (const key in data) {
            shader[key] = data[key];
        }

        console.log(shader);
        return shader;
    }
}

export class PostShaderData {
    constructor(
        public name: string,
        public description: string,
        public code: string,
        public textures: {
            name: string,
            kind: TextureKind,
            file: File,
        }[],
        public preview?: Blob,
    ) {};
}

export class PatchShaderData {
    constructor(
        public id: number,
        public name: string,
        public description: string,
        public code: string,
        public textures: {
            id?: number,
            name: string,
            kind: TextureKind,
            file?: File,
            deleted: boolean,
        }[],
        public preview?: Blob | "delete",
    ) {};
}

export module ShaderStorage {
    export function requestShader(id: number): Promise<RecvShaderData> {
        return fetch(`/api/v1/shaders/${id}`)
            .then(response => response.json())
            .then(checkError)
            .then(json => RecvShaderData.fromJson(json));
    }

    export function postShader(data: PostShaderData): Promise<RecvShaderData> {
        const form = new FormData();

        form.append("name", data.name);
        form.append("description", data.description);
        form.append("code", data.code);

        if (data.preview) {
            form.append("preview", data.preview, "preview.png");
        }

        if (data.textures.length !== 0) {
            let textureOptions: { name: string, kind: TextureKind, file: number }[] = [];

            let nFiles = 0;
            for (const tex of data.textures) {
                form.append("textures", tex.file);
                textureOptions.push({
                    name: tex.name,
                    kind: tex.kind,
                    file: nFiles,
                });

                nFiles += 1;
            }
            form.append("textureOptions", JSON.stringify(textureOptions));
        }

        return fetch(`/api/v1/shaders`, {
            method: "POST",
            body: form,
        })
            .then(response => response.json())
            .then(checkError)
            .then(json => RecvShaderData.fromJson(json));
    }

    export function patchShader(data: PatchShaderData): Promise<RecvShaderData> {
        const form = new FormData();

        form.append("name", data.name);
        form.append("description", data.description);
        form.append("code", data.code);

        if (data.preview === "delete") {
            form.append("deletePreview", "true");
        } else if (data.preview) {
            form.append("preview", data.preview, "preview.png");
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
                if (tex.id != null) {
                    if (tex.deleted) {
                        textureOptions.push({
                            id: tex.id,
                            delete: true,
                        });
                    } else {
                        textureOptions.push({
                            id: tex.id,
                            name: tex.name,
                            kind: tex.kind,
                        });
                    }
                } else if (tex.file) {
                    textureOptions.push({
                        name: tex.name,
                        kind: tex.kind,
                        file: nFiles,
                    });

                    form.append("textures", tex.file);
                    nFiles += 1;
                }
            }

            form.append("textureOptions", JSON.stringify(textureOptions));
        }

        return fetch(`/api/v1/shaders/${data.id}`, {
            method: "PATCH",
            body: form,
        })
            .then(response => response.json())
            .then(checkError)
            .then(json => RecvShaderData.fromJson(json));
    }

    export function setPublishedState(id: number, published: boolean): Promise<void> {
        return fetch(`/api/v1/shaders/${id}/publish`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ published })
        })
            .then(response => response.json())
            .then(checkError)
            .then(() => {});
    }

    export function setLikedState(id: number, liked: boolean): Promise<{ liked: boolean, likeCount: number }> {
        return fetch(`/api/v1/shaders/${id}/like`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ liked })
        })
            .then(response => response.json())
            .then(checkError)
            .then(obj => {
                if (!((typeof obj.liked) === "boolean" && (typeof obj.likeCount) === "number")) {
                    throw new Error("Invalid response received");
                } else {
                    return obj as { liked: boolean, likeCount: number };
                }
            });
    }

    export function requestShaders(limit: number, page: number, options: { search?: string, sort?: string, time?: string, owner?: number } = {}): Promise<RecvShaderData[]> {
        let addr = `/api/v1/shaders?limit=${limit}&page=${page}`;
        if (options.search) {
            addr += `&search=${encodeURIComponent(options.search)}`;
        }
        if (options.time) {
            addr += `&time=${encodeURIComponent(options.time)}`;
        }
        if (options.sort) {
            addr += `&sort=${encodeURIComponent(options.sort)}`;
        }
        if (options.owner != null) {
            addr += `&owner=${encodeURIComponent(options.owner.toString())}`;
        }

        return fetch(addr)
            .then(response => response.json())
            .then(checkError)
            .then(items => items.map(RecvShaderData.fromJson));
    }

    export function requestCommentedShaders(user: number, limit: number, page: number): Promise<RecvShaderData[]> {
        return fetch(`/api/v1/users/${user}/commented-shaders?limit=${limit}&page=${page}`)
            .then(response => response.json())
            .then(checkError)
            .then((ids: number[]) => Promise.all(ids.map(id => ShaderStorage.requestShader(id))));
    }

    export function deleteShader(id: number): Promise<void> {
        return fetch(`/api/v1/shaders/${id}`, {
            method: "DELETE"
        })
            .then(response => response.json())
            .then(checkError)
            .then(() => {});
    }
}
