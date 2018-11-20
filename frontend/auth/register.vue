<template>
<div class="box">
  <h1 class="title">Register</h1>
  
  <form action="/register" method="POST" enctype="multipart/form-data">
    <div class="field">
      <div class="control has-icons-left has-icons-right">
        <input
          class="input"
          :class="{ 'is-success': usernameState === 1, 'is-danger': usernameState === 2 }"
          @change="checkUsername"
          @input="trimFields"
          v-model="username"
          type="text"
          name="username"
          placeholder="Username">

        <span class="icon is-small is-left">
          <Icon name="user" />
        </span>

        <span v-if="usernameState !== 0" class="icon is-small is-right">
          <Icon v-if="usernameChecking" name="spinner" pulse />
          <Icon v-else-if="usernameState === 1" name="check" />
          <Icon v-else name="times" />
        </span>
      </div>
      <p v-if="usernameMessage" class="help" :class="{ 'is-success': usernameState === 1, 'is-danger': usernameState === 2 }">
        {{ usernameMessage }}
      </p>
    </div>

    <div class="field">
      <div class="control has-icons-left">
        <input
          class="input"
          :class="{ 'is-success': passwordState === 1, 'is-danger': passwordState === 2 }"
          @change="checkPassword"
          @input="trimFields"
          v-model="password"
          type="password"
          name="password"
          placeholder="Password">

        <span class="icon is-small is-left">
          <Icon name="lock" />
        </span>
      </div>
      <p v-if="passwordMessage" class="help" :class="{ 'is-success': passwordState === 1, 'is-danger': passwordState === 2 }">
        {{ passwordMessage }}
      </p>
    </div>

    <div class="field">
      <div class="control has-icons-left">
        <input
          class="input"
          :class="{ 'is-success': repeatPasswordState === 1, 'is-danger': repeatPasswordState === 2 }"
          @change="checkRepeatPassword"
          @input="trimFields"
          v-model="repeatPassword"
          type="password"
          placeholder="Repeat Password">

        <span class="icon is-small is-left">
          <Icon name="lock" />
        </span>
      </div>
      <p v-if="repeatPasswordMessage" class="help" :class="{ 'is-success': repeatPasswordState === 1, 'is-danger': repeatPasswordState === 2 }">
        {{ repeatPasswordMessage }}
      </p>
    </div>

    <div class="field">
      <div class="control">
        <input class="button is-primary" type="submit" value="Register" :disabled="!isReady">
      </div>
    </div>
  </form>

  <div v-if="error" class="modal is-active">
    <div class="modal-background" @click="error = null" />
    <div class="modal-content message is-danger">
      <div class="message-header">
        <p>Username check error</p>
      </div>

      <div class="message-body">
        <p>{{ error }}</p>

        <button class="button is-danger is-outlined" @click="error = null">
          Close
        </button>
      </div>
    </div>
  </div>
</div>
</template>

<script lang="ts">
    
import { Vue, Component } from 'vue-property-decorator';

import { UserStorage } from '../backend.ts';

import Icon from 'vue-awesome/components/Icon.vue';
import 'vue-awesome/icons/user.js';
import 'vue-awesome/icons/lock.js';
import 'vue-awesome/icons/check.js';
import 'vue-awesome/icons/spinner.js';
import 'vue-awesome/icons/times.js';

enum FieldState {
    Normal = 0,
    Success = 1,
    Fail = 2,
}

@Component({
    components: {
        Icon
    }
})
export default class Login extends Vue {
    private usernameState: FieldState = FieldState.Normal;
    private passwordState: FieldState = FieldState.Normal;
    private repeatPasswordState: FieldState = FieldState.Normal;
    
    private usernameMessage?: string = null;
    private passwordMessage?: string = null;
    private repeatPasswordMessage?: string = null;
    
    private username: string = "";
    private password: string = "";
    private repeatPassword: string = "";
    
    private usernameChecking: boolean = false;

    private error?: string = null;
    
    private get isReady(): boolean {
        return this.usernameState === FieldState.Success
            && this.passwordState === FieldState.Success
            && this.repeatPasswordState === FieldState.Success;
    }

    private trimFields() {
        this.username = this.username.replace(/\s/g, "");
        this.password = this.password.replace(/\s/g, "");
        this.repeatPassword = this.repeatPassword.replace(/\s/g, "");
    }


    private checkUsername() {
        this.usernameMessage = null;
        this.usernameState = FieldState.Normal;
        this.usernameChecking = false;

        if (this.username.length === 0) {
            return;
        }

        if (Number.isFinite(Number(this.username))) {
            this.usernameState = FieldState.Fail;
            this.usernameMessage = "Username can't be a number";
            return;
        }

        this.usernameChecking = true;
        const checkedUsername = this.username;
        UserStorage
            .userExists(this.username)
            .then(exists => {
                this.usernameChecking = false;

                if (exists && this.username === checkedUsername) {
                    this.usernameState = FieldState.Fail;
                    this.usernameMessage = "A user with this name already exists";
                } else {
                    this.usernameState = FieldState.Success;
                }
            })
            .catch(err => {
                this.usernameChecking = false;
                this.error = err.message;
            });
    }

    private checkPassword() {
        this.passwordMessage = null;
        this.passwordState = FieldState.Normal;

        if (this.password.length === 0) {
            this.checkRepeatPassword();
            return;
        }

        if (this.password.length < 8) {
            this.passwordState = FieldState.Fail;
            this.passwordMessage = "Password must be at least 8 characters long";
        } else {
            this.passwordState = FieldState.Success;
            this.checkRepeatPassword();
        }
    }

    private checkRepeatPassword() {
        this.repeatPasswordMessage = null
        this.repeatPasswordState = FieldState.Normal;

        if (this.repeatPassword.length === 0) {
            return;
        }

        if (this.repeatPassword !== this.password) {
            this.repeatPasswordState = FieldState.Fail
            this.repeatPasswordMessage = "Passwords don't match";
        } else if (this.password.length === 0 && this.repeatPassword.length === 0) {
            this.repeatPasswordState = FieldState.Normal;
        } else {
            this.repeatPasswordState = FieldState.Success;
        }
    }
}
</script>
