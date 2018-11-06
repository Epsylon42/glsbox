export class GenericComment {
    public id?: number = null;
    public author?: number = null;
    public text?: string = null;
    public parentComment?: number = null;

    public topComment: GenericComment = this;

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
        children: CommentData[] = [],
        public childrenTruncated: boolean = false,
    ) {
        super(children);
    }

    public topComment: GenericComment = new GenericComment();

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

        return new CommentData(
            obj.id,
            obj.author,
            obj.text,
            obj.parentComment,
            children.map(child => CommentData.fromObject(child)),
            truncated,
        );
    }
}
