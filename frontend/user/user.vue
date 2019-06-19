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
  
  <div v-else class="user-data box">
    
    <div class="tabs is-centered">
      <ul>
        <li :class="{ 'is-active': routeName == 'user-profile' }">
          <router-link :to="profile">Profile</router-link>
        </li>
        <li :class="{ 'is-active': routeName == 'user-shaders' }">
          <router-link :to="shaders">Shaders</router-link>
        </li>
        <li :class="{ 'is-active': routeName == 'user-comments' }">
          <router-link :to="comments">Comments</router-link>
        </li>
      </ul>
    </div> 
    
    <div v-if="userLoading" class="loading-panel"></div>
    <router-view v-if="userLoaded"></router-view>
  </div>
  
</div>
</template>

<script lang="ts">
    
import { Vue, Component, Prop, Watch } from 'vue-property-decorator';
import { RecvUser, UserStorage } from '../api/user-storage.ts';
import { UserRole } from '../../common/user-role.ts';

import { store, Actions } from './store.ts';

@Component
export default class User extends Vue {
    private error?: string = null;
    private userId: string | null = null;

    private get userLoading(): boolean {
        return store.state.userLoading;
    }

    private get userLoaded(): boolean {
        return store.getters.user != null;
    }
    
    private initialize() {
        this.userId = this.$route.params.userId;

        store
            .dispatch(Actions.init, Number(this.userId))
            .catch(err => this.error = err.message);
    }

    mounted() {
        this.initialize();
    }

    updated() {
        if (this.$route.params.userId !== this.userId) {
            this.initialize();
        }
    }

    private get routeName() {
        return this.$route.name;
    }

    private get profile() {
        return `/users/${this.userId}/profile`;
    }
    private get shaders() {
        return `/users/${this.userId}/shaders`;
    }
    private get comments() {
        return `/users/${this.userId}/comments`;
    }
}
</script>

<style scoped>

.error {
    width: 50%;
}

.user-data {
    margin-top: 20px;
    margin-bottom: 20px;
}

</style>
