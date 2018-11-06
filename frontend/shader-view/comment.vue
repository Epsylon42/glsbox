<template>
<div class="comment" :id="id">
  
  <div class="comment-head">

    <div class="comment-info" v-if="asComment">

    </div>
    
    <div class="comment-text" v-html="commentHTML" v-if="asComment" />
    
    <div class="controls">
      <button @click="reply" v-if="canReply">reply</button>
    </div>
    
  </div>
  
  <div class="editor" v-if="replyText != null">
    <textarea v-model="replyText" />
    
    <div class="controls">
      <button @click="sendReply">send</button>
      <button @click="cancelReply">cancel</button>
    </div>
    
    <p v-if="replyText.length > 0">Preview</p>
    <div class="reply-preview" v-html="replyHTML" v-if="replyText.length > 0" />
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

import { store } from './store/store.ts';
import CommentData, { GenericComment } from './store/comment.ts';
import { SendCommentData, CommentStorage } from '../backend.ts';

import { MDConverter } from './converter.ts';

@Component
export default class Comment extends Vue {
    @Prop({ type: GenericComment, required: true }) comment: GenericComment;

    private get canReply(): boolean {
        return store.getters.user != null && store.getters.id != null;
    }

    private get asComment(): CommentData | null {
        if (this.comment instanceof CommentData) {
            return this.comment as CommentData;
        } else {
            return null;
        }
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


    private replyText?: string = null;

    private reply() {
        this.replyText = "";
    }

    private cancelReply() {
        this.replyText = null;
    }

    private sendReply() {
        const reply = this.replyText as string;
        this.replyText = null;

        CommentStorage
            .postComment(new SendCommentData(
                store.getters.user as number,
                reply,
                store.getters.id as number,
                this.comment.id,
            ))
            .then(comment => {
                this.comment.children.push(comment);
            });
    }

    private get replyHTML(): string {
        return MDConverter.makeHtml(this.replyText);
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
