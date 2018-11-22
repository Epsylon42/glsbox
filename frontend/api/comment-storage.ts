import CommentData, { GenericComment } from '../shader-view/store/comment.ts';
import checkError from './api.ts';

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
