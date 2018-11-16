<template>
<div class="comment" :id="id">

  <div ref="marker" style="display: none;" />
  
  <a class="full-tree comment-button svg-button" :href="fullTreeLink" v-if="isRoot && isComment">
    <Icon name="arrow-up" />
    View full comment tree
  </a>

  <div class="text-box comment-body" :class="{ focus: isFocused() }" @click="focus" v-if="isComment">

    <div class="comment-info">
      <div class="comment-nav">
        <a class="svg-button" :href="parentLink" v-if="parentLink" title="go to parent comment">
          <Icon name="hashtag" />
        </a>
        <a class="svg-button" :href="nextLink" v-if="nextLink" title="go to next comment">
          <Icon name="arrow-down" />
        </a>
      </div>
      <p><a :href="info.author.ref">{{info.author.username}}</a></p>
      <p>posted {{info.posted}}</p>
      <p v-if="info.edited">edited {{info.edited}}</p>
    </div>
    
    <div class="comment-text" v-html="commentHTML" />
    
    <div class="controls">
      <a class="comment-button" :href="permalink">permalink</a>
      <button class="comment-button" @click="reply" v-if="canReply">reply</button>
      <button class="comment-button" @click="edit" v-if="canEdit">edit</button>
    </div>
    
  </div>
  <button class="comment-button" @click="reply" v-else-if="canReply">comment</button>
  
  <div class="editor" v-if="sendText != null">
    <textarea v-model="sendText" />
    
    <div class="controls">
      <button class="comment-button" @click="sendEditor">send</button>
      <button class="comment-button" @click="cancelEditor">cancel</button>
    </div>
    
    <p v-if="sendText.length > 0">Preview</p>
    <div class="text-box" v-html="sendHTML" v-if="sendText.length > 0" />
  </div>
  
  <ul class="children">
    <li v-for="child, i in children">
      <Comment
        :comment="child"
        :parentId="comment.id"
        :nextId="children[i+1] && children[i+1].id"
        />
    </li>
  </ul>
  
</div>
</template>

<script lang="ts">
    
import { Vue, Component, Prop } from 'vue-property-decorator';

import { store, Mutations } from './store/store.ts';
import CommentData, { GenericComment } from './store/comment.ts';
import { SendCommentData, PatchCommentData, CommentStorage } from '../backend.ts';

import { MDConverter } from '../converter.ts';

import Icon from 'vue-awesome/components/Icon.vue';
import 'vue-awesome/icons/arrow-up.js';
import 'vue-awesome/icons/hashtag.js';
import 'vue-awesome/icons/arrow-down.js';

@Component({
    components: {
        Icon,
    }
})
export default class Comment extends Vue {
    @Prop({ type: Boolean, default: false }) isRoot: boolean;
    @Prop({ type: GenericComment, required: true }) comment: GenericComment;
    @Prop({ type: Number, default: null }) parentId: number;
    @Prop({ type: Number, default: null }) nextId: number;

    public focus() {
        store.commit(Mutations.setFocusedComment, this.$refs.marker);
    }

    private isFocused(): boolean {
        return this.$refs.marker === store.getters.focusedComment;
    }

    private get canReply(): boolean {
        return store.getters.user != null && store.getters.id != null;
    }
    
    private get canEdit(): boolean {
        return this.isComment
            && store.getters.user != null
            && store.getters.user.id === this.comment.author;
    }
    
    private get isComment(): boolean {
        return this.comment instanceof CommentData;
    }

    private get parentLink(): string | null {
        if (this.parentId != null) {
            return `#comment-${this.parentId}`;
        } else {
            return null;
        }
    }

    private get nextLink(): string | null {
        if (this.nextId != null) {
            return `#comment-${this.nextId}`;
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

    private get fullTreeLink(): string {
        return store.getters.link;
    }

    private get permalink(): string {
        if (this.comment.id != null) {
            return `${store.getters.link}?comment=${this.comment.id}`
        } else {
            return store.getters.link;
        }
    }
    
    private get commentHTML(): string {
        return MDConverter.makeHtml(this.comment.text);
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

.full-tree {
    width: fit-content;
    width: -moz-fit-content;
    width: -webkit-fit-content;
}

.comment-body {
    display: flex;
    flex-direction: column;
}

.comment-body.focus {
    border-color: #88f
}

.comment-info {
    display: flex;
    flex-direction: row;
}

.comment-info > * {
    margin: 0;
    margin-right: 20px;
    font-size: 10pt;
    color: grey;
}

.comment-info > *:first-child {
    margin-right: 5px;
}

.comment-nav {
    display: flex;
    flex-direction: row;
}

.comment-nav .svg-button {
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

.comment-button {
    border: none;
    padding: 0;
    margin-left: 2px;
    margin-right: 2px;
    background-color: rgba(0,0,0,0);
    color: grey;
    font-size: 10pt;
}
</style>
