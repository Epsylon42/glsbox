<template>
<div class="app">
  <nav class="navbar is-dark">
    <div class="navbar-brand">
      <router-link class="navbar-item logo" to="/">
        <img src="/brand.svg" alt="GLSBox">
      </router-link>
    </div>
    
    <div class="navbar-menu is-active">
      <div class="navbar-start">
        <router-link class="navbar-item" to="/browse">Browse</router-link>
        <router-link class="navbar-item" to="/create">Create</router-link>
      </div>
      
      <div class="navbar-end">
        <template v-if="user">
          <router-link class="navbar-item" :to="userUrl">{{ user.username }}</router-link>
          
          <form class="navbar-item" action="/logout" method="POST">
            <input class="button is-light" type="submit" value="Logout">
          </form>
        </template>
        
        <div class="navbar-item" v-else>
          <div class="buttons">
            <router-link class="button is-primary is-outlined" to="/login">Login</router-link>
            <router-link class="button is-primary" to="/register">Register</router-link>
          </div>
        </div>
      </div>
    </div>
  </nav>
  
  <div class="content">
    <router-view></router-view>
  </div>

  <div class="footer">
    <p>budenniy42396@gmail.com</p>
    <span>|</span>
    <p><a class="navbar-item" href="/developer/v1">api documentation</a></p>
  </div>
</div>
</template>

<script lang="ts">

import { Vue, Component } from 'vue-property-decorator';

import { store } from './shader-view/store/store.ts';

@Component
export default class Main extends Vue {
    private get user() {
        return store.getters.user;
    }

    private get userUrl() {
        return `/users/${this.user.id}`;
    }

    private logout() {
        fetch("/logout", {
            method: "POST",
            redirect: "follow",
        });
    }
}
</script>

<style scoped>

.app {
    min-height: 100vh;
    display: flex;
    flex-direction: column;
}

.content {
    margin-top: auto;
    margin-bottom: auto;
}

.navbar-item.logo img {
    max-height: 2.5rem;
}

.navbar-start a {
    color: #ddd !important;
}

.navbar-start a:hover {
    color: #06f !important;
}

.footer {
    display: flex;
    flex-direction: row;
    align-items: center;
    
    color: #ddd;
    margin-top: auto;
    padding: 0;
}

.footer > * {
    display: inline-flex;
    flex-direction: column;
    justify-content: center;
    
    height: 100%;
    margin-left: 10px;
    margin-right: 10px;
}
</style>
