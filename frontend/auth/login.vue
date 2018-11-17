<template>
<div class="box">
  <h1 class="title">Login</h1>

  <div v-if="error" class="message is-small is-danger">
    <div class="message-body">
      {{ error }}
    </div>
  </div>

  <form action="/login" method="POST" enctype="multipart/form-data">
    <div class="field">
      <div class="control has-icons-left">
        <input
          @input="trimFields"
          v-model="username"
          class="input"
          type="text"
          name="username"
          placeholder="Username">

        <span class="icon is-small is-left">
          <Icon name="user" />
        </span>
      </div>
    </div>

    <div class="field">
      <div class="control has-icons-left">
        <input
          @input="trimFields"
          v-model="password"
          class="input"
          type="password"
          name="password"
          placeholder="Password">

        <span class="icon is-small is-left">
          <Icon name="lock" />
        </span>
      </div>
    </div>

    <div class="field">
      <div class="control">
        <input class="button is-primary" type="submit" value="Login" :disabled="!isReady">
      </div>
    </div>
  </form>
</div>
</template>

<script lang="ts">

import { Vue, Component } from 'vue-property-decorator';

import Icon from 'vue-awesome/components/Icon.vue';
import 'vue-awesome/icons/user.js';
import 'vue-awesome/icons/lock.js';

@Component({
    components: {
        Icon
    }
})
export default class Login extends Vue {

    private username: string = "";
    private password: string = "";

    private error?: string = null;

    mounted() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has("error")) {
            this.error = urlParams.get("error");
        }
    }

    private trimFields() {
        this.username = this.username.replace(/\s/g, "");
        this.password = this.password.replace(/\s/g, "");
    }

    private get isReady(): boolean {
        return this.username.length !== 0
            && this.password.length !== 0;
    }
}
</script>
