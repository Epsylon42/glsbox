<template>
<div class="comment" :id="id">
  
  <div class="comment-head">

    <div class="comment-info" v-if="asComment">
      <p><a :href="info.author.ref">{{info.author.username}}</a></p>
      <p>posted {{info.posted}}</p>
      <p v-if="info.edited">edited {{info.edited}}</p>
    </div>
    
    <div class="comment-text" v-html="commentHTML" v-if="asComment" />
    
    <div class="controls">
      <button @click="reply" v-if="canReply">reply</button>
      <button @click="edit" v-if="canEdit">edit</button>
    </div>
    
  </div>
  
  <div class="editor" v-if="sendText != null">
    <textarea v-model="sendText" />
    
    <div class="controls">
      <button @click="sendEditor">send</button>
      <button @click="cancelEditor">cancel</button>
    </div>
    
    <p v-if="sendText.length > 0">Preview</p>
    <div class="reply-preview" v-html="sendHTML" v-if="sendText.length > 0" />
  </div>
  
  <ul class="children">
    <li v-for="child in children">
      <Comment :comment="child" />
    </li>
  </ul>
  
</div>
</template>

<script lang="ts">
    
import { Vue, Component, Prop } from 'vue-property-decorator';

import { store, Mutations } from './store/store.ts';
import CommentData, { GenericComment } from './store/comment.ts';
import { SendCommentData, PatchCommentData, CommentStorage } from '../backend.ts';

import { MDConverter } from './converter.ts';

@Component
export default class Comment extends Vue {
    @Prop({ type: GenericComment, required: true }) comment: GenericComment;
    
    private get canReply(): boolean {
        return store.getters.user != null && store.getters.id != null;
    }
    
    private get canEdit(): boolean {
        return this.asComment
            && store.getters.user != null
            && store.getters.user.id === this.comment.author;
    }
    
    private get asComment(): CommentData | null {
        if (this.comment instanceof CommentData) {
            return this.comment as CommentData;
        } else {
            return null;
        }
    }

    private get info(): object {
        const edited = this.comment.lastEdited;
        const posted = this.comment.posted;

        return {
            author: {
                ref: `/users/${this.comment.author}`,
                username: this.comment.authorUsername,
            },
            edited: edited && `${edited.toLocaleDateString()} | ${edited.toLocaleTimeString()}`,
            posted: posted && `${posted.toLocaleDateString()} | ${posted.toLocaleTimeString()}`,
        };
    }
    
    private get id(): string {
        return `comment-${this.comment.id || "root"}`;
    }
    
    private get commentHTML(): string {
        return MDConverter.makeHtml(this.asComment.text);
    }
    
    private get children(): CommentData[] {
        return this.comment.children;
    }
    
    
    private sendText?: string = null;
    private sendReply: boolean = true;
    
    private reply() {
        this.sendText = "";
        this.sendReply = true;
    }
    
    private edit() {
        this.sendText = this.comment.text;
        this.sendReply = false;
    }
    
    private cancelEditor() {
        this.sendText = null;
    }
    
    private sendEditor() {
        const data = this.sendText as string;
        this.sendText = null;
        
        if (this.sendReply) {
            CommentStorage
                .postComment(new SendCommentData(
                    data,
                    store.getters.id as number,
                    this.comment.id,
                ))
                .then(comment => {
                    store.commit(Mutations.modifyComment, {
                        comment: this.comment,
                        callback: com => com.children.push(comment)
                    });
                });
        } else {
            CommentStorage
                .patchComment(new PatchCommentData(
                    this.comment.id,
                    data,
                ))
                .then(comment => {
                    store.commit(Mutations.modifyComment, {
                        comment: this.comment,
                        callback: com => {
                            com.text = comment.text;
                            com.lastEdited = comment.lastEdited;
                        }
                    });
                });
        }

    }

    private get sendHTML(): string {
        return MDConverter.makeHtml(this.sendText);
    }
}
</script>

<style scoped>

.comment-head {
    display: flex;
    flex-direction: column;
    padding: 5px;
    
    background-color: #f9f9f9;
}

.comment-info {
    display: flex;
    flex-direction: row;
}

.comment-info p {
    margin: 0;
    margin-left: 20px;
    font-size: 10pt;
    color: grey;
}

.comment-info p:first-child {
    margin-left: 0;
}

.comment-info a {
    text-decoration: none;
}

button {
    border: none;
    padding: 0;
}

.editor {
    padding-left: 20px;
}

.children {
    list-style: none;
    margin-top: 20px;
    padding-left: 20px;
}

.reply-preview {
    border: 1px solid grey;
    background-color: #f9f9f9;
}
</style>
