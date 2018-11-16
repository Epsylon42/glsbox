<template>
<div class="container">
  <p v-if="error" class="text-box error">
    {{ error }}
  </p>
  
  <div class="box" v-else>
    <div class="tabs is-centered">
      <ul>
        <li :class="{ 'is-active': profileSelected }"> <a @click="selectProfile">Profile</a> </li>
        <li :class="{ 'is-active': shadersSelected }"> <a @click="selectShaders">Shaders</a> </li>
        <li :class="{ 'is-active': commentsSelected }"> <a @click="selectComments">Comments</a> </li>
      </ul>
    </div>
    
    <component :is="component" />
  </div>

</div>
</template>

<script lang="ts">
    
import { Vue, Component, Prop, Watch } from 'vue-property-decorator';
import { RecvUser, UserStorage } from '../backend.ts';
import { UserRole } from '../../common/user-role.ts';

import Profile from './profile.vue';
import Shaders from './shaders.vue';

import { store, Actions } from './store.ts';

@Component
export default class User extends Vue {
    @Prop({ type: Number, required: true }) id: number;
    @Prop({ type: String, required: true }) panel: string;
    private originalPanel: string = "";
    
    private error?: string = null;
    private component?: typeof Vue = null;
    
    mounted() {
        this.originalPanel = this.panel;
        
        window.onpopstate = event => {
            console.log(event.state);
            if (event.state === "profile") {
                this.selectProfile(false);
            } else if (event.state === "shaders") {
                this.selectShaders(false);
            } else if (event.state === "comments") {
                this.selectComments(false);
            } else if (event.state == null) {
                this.panel = this.originalPanel;
                this.selectPage(false);
            }
        };
        
        store
            .dispatch(Actions.init, this.id)
            .then(() => this.selectPage())
            .catch(err => this.error = err.message);
    }
    
    private selectPage(hist: boolean = true) {
        switch (this.panel) {
        case "profile":
            this.selectProfile(hist);
            break;
            
        case "shaders":
            this.selectShaders(hist);
            break;
            
        case "comments":
            this.selectComments(hist);
            break;
        }
    }
    
    private selectProfile(hist: boolean = true) {
        this.panel = "profile";
        if (hist) {
            window.history.pushState(this.panel, "", `/users/${this.id}/${this.panel}`);
        }
        this.component = Profile;
    }
    
    private get profileSelected(): boolean {
        return this.component === Profile;
    }
    
    private selectShaders(hist: boolean = true) {
        this.panel = "shaders";
        if (hist) {
            window.history.pushState(this.panel, "", `/users/${this.id}/${this.panel}`);
        }
        this.component = Shaders;
    }
    
    private get shadersSelected() {
        return this.component === Shaders;
    }
    
    private selectComments(hist: boolean = true) {
        this.panel = "comments";
        if (hist) {
            window.history.pushState(this.panel, "", `/users/${this.id}/${this.panel}`);
        }
        this.component = null;
    }

    private get commentsSelected() {
        return false;
    }
}
</script>

<style scoped>

.error {
    width: 50%;
}

.user-data {
    display: flex;
    flex-direction: column;
    width: 75%;
}

</style>
