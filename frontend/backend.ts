import FragShader from './shader-view/store/frag-shader.ts';
import TextureData from './shader-view/store/texture-data.ts';
import Preview from './shader-view/store/preview.ts';
import { TextureKind } from '../common/texture-kind.ts';
import { UserRole } from '../common/user-role.ts';
import CommentData, { GenericComment } from './shader-view/store/comment.ts';


function checkError(obj: any): any {
    if (obj.error) {
        throw new Error(obj.message);
    } else {
        return obj;
    }
}


export class RecvShaderData {
    constructor(
        public id: number,
        public shader: FragShader,
        public name: string = "",
        public description: string = "",
        public textures: TextureData[] = [],
        public owner?: number,
        public preview?: Preview,
    ) {}

    public static fromJson(data: any): RecvShaderData {
        const shader = new FragShader(data.code);
        //append time to force reload image if it is already loaded
        const preview = data.previewUrl && new Preview(data.previewUrl + `#${new Date().getTime()}`);
        const textures = data.textures.map(({ id, name, textureKind, url }) => {
            const data = new TextureData(url, name, textureKind);
            data.id = id;
            return data;
        });

        return new RecvShaderData(
            data.id,
            shader,
            data.name || "",
            data.description || "",
            textures,
            data.owner,
            preview
        );
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
\tgl_FragColor = vec4(abs(v_pos), 0.0, 1.0);
}`)));
    }

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

        return fetch(`/api/v1/shaders/${data.id}`, {
            method: "PATCH",
            body: form,
        })
            .then(response => response.json())
            .then(checkError)
            .then(json => RecvShaderData.fromJson(json));
    }

    export function requestUserShaders(user: number, limit: number, page: number): Promise<RecvShaderData[]> {
        return fetch(`/api/v1/shaders?owner=${user}&limit=${limit}&page=${page}`)
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
}

export class SendCommentData {
    constructor(
        public text: string,
        public parentShader: number,
        public parentComment?: number,
    ) {}
}

export class PatchCommentData {
    constructor(
        public id: number,
        public text: string,
    ) {}
}

export module CommentStorage {
    export function requestComment(shader: number, comment?: number): Promise<GenericComment> {
        let promise: Promise<Response>;
        if (comment != null) {
            promise = fetch(`/api/v1/comments/${shader}?comment=${comment}`);
        } else {
            promise = fetch(`/api/v1/comments/${shader}`);
        }

        return promise
            .then(response => response.json())
            .then(checkError)
            .then(json => CommentData.fromObjectMaybeRoot(json));
    }

    export function postComment(data: SendCommentData): Promise<CommentData> {
        return fetch("/api/v1/comments", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data),
        })
            .then(response => response.json())
            .then(checkError)
            .then(json => CommentData.fromObject(json));
    }

    export function patchComment(data: PatchCommentData): Promise<CommentData> {
        return fetch("/api/v1/comments", {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data),
        })
            .then(response => response.json())
            .then(checkError)
            .then(json => CommentData.fromObject(json));
    }

    function deleteComment(id: number): Promise<void> {
        return fetch("/api/v1/comments", {
            method: "DELETE",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ id })
        })
            .then(() => {});
    }

    export function requestCommentsUnderShader(user: number, shader: number, limit: number, page: number): Promise<CommentData[]> {
        return fetch(`/api/v1/users/${user}/comments?shader=${shader}&limit=${limit}&page=${page}`)
            .then(response => response.json())
            .then(checkError)
            .then(json => json.map(CommentData.fromObject));
    }
}


export class RecvUser {
    constructor(
        public id: number,
        public username: string,
        public role: UserRole,
        public registrationDate: Date,
    ) {}

    public email?: string = null;
    public static fromJson(obj: any): RecvUser {
        if (!(obj.id != null && obj.username && obj.role != null && obj.registrationDate)) {
            throw new Error("Invalid user format");
        }

        const user = new RecvUser(
            obj.id,
            obj.username,
            obj.role,
            new Date(obj.registrationDate),
        );

        if (obj.email) {
            user.email = obj.email;
        }

        return user;
    }
}

export class PatchUser {
    constructor(
        public email?: string,
        public password?: string,
        public role?: UserRole,
    ) {}
}

export module UserStorage {
    export function requestUser(id: number): Promise<RecvUser> {
        return fetch(`/api/v1/users/${id}`)
            .then(response => response.json())
            .then(checkError)
            .then(json => RecvUser.fromJson(json));
    }

    export function requestMe(): Promise<RecvUser> {
        return fetch("/api/v1/users/me")
            .then(response => response.json())
            .then(checkError)
            .then(json => RecvUser.fromJson(json));
    }

    export function patchUser(id: number, data: PatchUser): Promise<RecvUser> {
        return fetch(`/api/v1/users/${id}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data),
        })
            .then(response => response.json())
            .then(checkError)
            .then(json => RecvUser.fromJson(json));
    }
}
