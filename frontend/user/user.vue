<template>
<div class="container">
  
  <div v-if="error" class="message is-danger">
    <div class="message-header">
      <p>Error</p>
    </div>
    
    <div class="message-body">
      <p>{{ error }}</p>
    </div>
  </div>
  
  <div v-else class="box">
    <div v-if="userLoading" class="loading-panel" />

    <template v-else>
      <div class="tabs is-centered">
        <ul>
          <li :class="{ 'is-active': profileSelected }"> <a @click="selectProfile">Profile</a> </li>
          <li :class="{ 'is-active': shadersSelected }"> <a @click="selectShaders">Shaders</a> </li>
          <li :class="{ 'is-active': commentsSelected }"> <a @click="selectComments">Comments</a> </li>
        </ul>
      </div>
      
      <component :is="component" />
    </template>
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
    
    private error?: string = null;
    private component?: typeof Vue = null;

    private get userLoading(): boolean {
        return store.state.userLoading;
    }
    
    mounted() {
        window.onpopstate = event => {
            console.log(event.state);
            if (event.state === "profile") {
                this.selectProfile(false);
            } else if (event.state === "shaders") {
                this.selectShaders(false);
            } else if (event.state === "comments") {
                this.selectComments(false);
            } else if (event.state == null) {
                this.selectOriginalPage(false);
            }
        };
        
        store
            .dispatch(Actions.init, this.id)
            .then(() => this.selectOriginalPage())
            .catch(err => this.error = err.message);
    }
    
    private selectOriginalPage(hist: boolean = true) {
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
        if (hist) {
            window.history.pushState(this.panel, "", `/users/${this.id}/profile`);
        }
        this.component = Profile;
    }
    
    private get profileSelected(): boolean {
        return this.component === Profile;
    }
    
    private selectShaders(hist: boolean = true) {
        if (hist) {
            window.history.pushState(this.panel, "", `/users/${this.id}/shaders`);
        }
        this.component = Shaders;
    }
    
    private get shadersSelected() {
        return this.component === Shaders;
    }
    
    private selectComments(hist: boolean = true) {
        if (hist) {
            window.history.pushState(this.panel, "", `/users/${this.id}/comments`);
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
