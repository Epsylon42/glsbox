export class GenericComment {
    public id?: number = null;
    public author?: number = null;
    public text?: string = null;
    public parentComment?: number = null;
    public lastEdited?: Date = null;
    public posted?: Date = null;
    public authorUsername?: string = null;

    constructor(
        public children: CommentData[] = []
    ) {}

    public static fromObject(obj: any): GenericComment {
        return new GenericComment(
            (obj.children as any[] || []).map(child => CommentData.fromObject(child))
        );
    }
}

export default class CommentData extends GenericComment {
    constructor(
        public id: number,
        public author: number,
        public text: string,
        public parentComment: number | null = null,
        public posted: Date = new Date(),
    ) {
        super();
    }

    public childrenTruncated: boolean = false;

    public static fromObjectMaybeRoot(obj: any): GenericComment {
        if (obj.root && obj.children) {
            return new GenericComment(obj.children.map(child => CommentData.fromObject(child)));
        } else {
            return CommentData.fromObject(obj);
        }
    }

    public static fromObject(obj: any): CommentData {
        if (!(obj.id != null && obj.author != null && obj.text)) {
            throw new Error("Invalid comment data");
        }

        let children: any[] = [];
        let truncated = false;
        if (obj.children === true) {
            truncated = true;
        } else if (obj.children) {
            children = obj.children;
        }

        let authorId: number;
        if (typeof obj.author === "number") {
            authorId = obj.author;
        } else {
            authorId = obj.author.id;
        }

        const data = new CommentData(
            obj.id,
            authorId,
            obj.text,
            obj.parentComment,
            new Date(obj.posted),
        );

        if (obj.author.username) {
            data.authorUsername = obj.author.username;
        }

        data.childrenTruncated = truncated;
        data.children = children.map(child => CommentData.fromObject(child));

        if (obj.lastEdited) {
            data.lastEdited = new Date(obj.lastEdited);
        }

        data.authorUsername = obj.author.username;

        return data;
    }
}
