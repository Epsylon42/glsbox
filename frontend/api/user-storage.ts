import { UserRole } from '../../common/user-role.ts';
import checkError from './api.ts';

export class RecvUser {
    constructor(
        public id: number,
        public username: string,
        public role: UserRole,
        public registrationDate: Date,
    ) {}

    public email?: string = null;
    public telegram?: string = null;

    public publicEmail: boolean = false;
    public publicTelegram: boolean = false;

    public static fromJson(obj: any): RecvUser {
        if (!(
            obj.id != null
                && obj.username
                && obj.role != null
                && obj.registrationDate
                && obj.publicEmail != null
                && obj.publicTelegram != null
        )) {
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
        if (obj.telegram) {
            user.telegram = obj.telegram;
        }

        if (obj.publicEmail != null) {
            user.publicEmail = obj.publicEmail;
        }
        if (obj.publicTelegram != null) {
            user.publicTelegram = obj.publicTelegram;
        }

        return user;
    }
}

export class PatchUser {
    constructor(
        public password?: string,
        public role?: UserRole,
        public email?: string,
        public telegram?: string,
        public publicEmail?: boolean,
        public publicTelegram?: boolean,
    ) {}
}

export module UserStorage {
    export function userExists(id: number | string): Promise<boolean> {
        return fetch(`/api/v1/users/${id}`)
            .then(response => response.status === 200);
    }

    export function requestUser(id: number | string): Promise<RecvUser> {
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
