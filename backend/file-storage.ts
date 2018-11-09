import Sequelize from 'sequelize';
import { TextureKind } from '../common/texture-kind';
import * as Cloudinary from 'cloudinary';

export class FileData {
    constructor(
        public url: string,
        public id: string,
    ) {}
}

export class Transaction {
    private done: boolean = false;

    private uploaded: string[] = [];
    private removed: string[] = [];

    public writeFile(data: Buffer, folder?: string): Promise<FileData> {
        console.log(`Writing file to folder ${folder}`);
        return new Promise((resolve, reject) => {
            const stream = Cloudinary.v2.uploader.upload_stream({ folder }, (err: any, res: any) => {
                if (err) {
                    reject(err);
                } else {
                    const data = new FileData(res.secure_url || res.url, res.public_id);
                    this.uploaded.push(data.id);
                    resolve(data);
                }
            });

            stream.end(data);
        })
    }

    public removeFile(id: string): Promise<void> {
        console.log(`Removing file ${id}`);
        this.removed.push(id);
        return Promise.resolve();
    }

    public commit(): Promise<void> {
        if (this.done) {
            return Promise.resolve();
        }

        console.log("Commiting file transaction");

        return Promise.all(this.removed.map(id => new Promise(resolve => {
            Cloudinary.v2.uploader.destroy(id, (err: any) => {
                if (err) {
                    console.error("Commit error", err);
                }

                resolve();
            });
        }))).then(() => { this.done = true; });
    }

    public rollback(): Promise<void> {
        if (this.done) {
            return Promise.resolve();
        }

        console.log("Rolling back file transaction");

        return Promise.all(this.uploaded.map(id => new Promise(resolve => {
            Cloudinary.v2.uploader.destroy(id, (err: any) => {
                if (err) {
                    console.error("Rollback error", err);
                }

                resolve();
            });
        }))).then(() => { this.done = true; });
    }
}
