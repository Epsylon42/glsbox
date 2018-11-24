<template>
<div class="profile">
  <div class="field">
    <label class="label">Username</label>
    <div class="message">
      <p class="message-body field-value">{{ data.user.username }}</p>
    </div>
  </div>
  
  <div class="field">
    <label class="label">Registered</label>
    
    <div class="message">
      <p class="message-body field-value"> {{ data.user.registrationDate.toLocaleString() }} </p>
    </div>
  </div>
  
  <div class="field">
    <label class="label">Role</label>
    
    <div class="control">
      <label v-if="perm.canEditRole" class="checkbox">
        <input type="checkbox" v-model.boolean="data.isModerator">
        Is Moderator
      </label>
      <label v-else class="message">
        <div class="message">
          <div class="message-body field-value">
            {{ data.role }}
          </div>
        </div>
      </label>
    </div>
  </div>
  
  <div v-if="perm.canEditFields || data.publicEmail" class="field">
    <label class="label">Email</label>
    
    <div class="control">
      <template v-if="edit.email == null">
        <div v-if="data.email.length !== 0" class="message">
          <p class="message-body field-value"> {{ data.email }} </p>
        </div>
        <div v-else-if="data.publicEmail || !perm.isPriviledged" class="message is-warning">
          <p class="message-body field-value">Empty</p>
        </div>
        <div v-else class="message is-danger">
          <p class="message-body field-value">Private</p>
        </div>
        
        <template v-if="perm.canEditFields">
          <button
            class="button is-primary is-small"
            @click="edit.editEmail()"
            >
            Edit
          </button>
          <button
            class="button is-warning is-small"
            @click="edit.clearEmail()"
            >
            Clear
          </button>
        </template>
      </template>
      
      <template v-else>
        <input class="input" type="email" v-model="edit.email" placeholder="email">
        
        <button
          class="button is-success is-small"
          @click="edit.saveEmail()"
          >
          Save
        </button>
        <button
          class="button is-small"
          @click="edit.email = null"
          >
          Cancel
        </button>
        
      </template>
      
      <label v-if="perm.canEditPublic" class="checkbox">
        <input type="checkbox" v-model.boolean="data.publicEmail">
        Email is public
      </label>
    </div>
  </div>
  
  <div v-if="perm.canEditFields || data.publicTelegram" class="field">
    <label class="label">Telegram</label>
    
    <div class="control">
      <template v-if="edit.telegram == null">
        <div v-if="data.telegram.length !== 0" class="message">
          <p class="message-body field-value"> {{ data.telegram }} </p>
        </div>
        <div v-else-if="data.publicTelegram || !perm.isPriviledged" class="message is-warning">
          <p class="message-body field-value">Empty</p>
        </div>
        <div v-else class="message is-danger">
          <p class="message-body field-value">Private</p>
        </div>

        <template v-if="perm.canEditFields">
          <button
            class="button is-primary is-small"
            @click="edit.editTelegram()"
            >
            Edit
          </button>
          <button
            class="button is-warning is-small"
            @click="edit.clearTelegram()"
            >
            Clear
          </button>
        </template>
      </template>

      <template v-else>
        <input class="input" type="text" v-model="edit.telegram" placeholder="telegram">

        <button
          class="button is-success is-small"
          @click="edit.saveTelegram()"
          >
          Save
        </button>
        <button
          class="button is-small"
          @click="edit.telegram = null"
          >
          Cancel
        </button>
      </template>

      <label v-if="perm.canEditPublic" class="checkbox">
        <input type="checkbox" v-model.boolean="data.publicTelegram">
        Telegram is public
      </label>
    </div>
  </div>

  <div v-if="perm.canEditFields" class="field">
    <label class="label">Password</label>
    
    <div class="control">
      <template v-if="edit.password == null">
        <button
          class="button is-primary is-small"
          @click="edit.editPassword()"
          >
          Edit
        </button>
      </template>

      <template v-else>
        <input class="input" type="password" v-model="edit.password" placeholder="Password">
        <input class="input" type="password" v-model="edit.repeatPassword" placeholder="Repeat password">
        
        <button
          class="button is-success is-small"
          @click="edit.savePassword()"
          >
          Save
        </button>
        <button
          class="button is-small"
          @click="edit.password = null"
          >
          Cancel
        </button>
      </template>
    </div>
  </div>

  <div v-if="perm.canEditFields" class="field">
    <div class="control">
      <button class="button is-success" :disabled="!changed" @click="save">Save</button>
    </div>
  </div>

</div>
</template>

<script lang="ts">
    
import { Vue, Component } from 'vue-property-decorator';
import { RecvUser } from '../api/user-storage.ts';

import { store, Mutations, Actions } from './store.ts';

import { UserRole } from '../../common/user-role.ts';

import Icon from 'vue-awesome/components/Icon.vue';
import 'vue-awesome/icons/edit.js';
import 'vue-awesome/icons/backspace.js';
import 'vue-awesome/icons/save.js';
import 'vue-awesome/icons/undo.js';

class Permissions {
    public get canEditFields(): boolean {
        return store.getters.canEditFields;
    }

    public get canEditRole(): boolean {
        return store.getters.canEditRole;
    }

    public get canEditPublic(): boolean {
        return store.getters.canEditPublic;
    }

    public get isPriviledged(): boolean {
        return store.getters.isPriviledged;
    }
}

class Data {
    public get user(): RecvUser {
        return store.getters.user as RecvUser;
    }

    public get email(): string {
        return store.getters.email || "";
    }

    public get telegram(): string {
        return store.getters.telegram || "";
    }

    public get role(): string {
        switch (store.getters.user.role) {
        case UserRole.User:
            return "Regular User";

        case UserRole.Moderator:
            return "Moderator";

        case UserRole.Admin:
            return "Admin";

        default:
            return "Unknown Role";
        }
    }

    public get isModerator(): boolean {
        return store.getters.role === UserRole.Moderator;
    }
    public set isModerator(val: boolean) {
        store.commit(Mutations.changeRole, val ? UserRole.Moderator : UserRole.User);
    }

    constructor() {
        Object.defineProperty(this, "publicEmail", {
            get: () => store.getters.publicEmail,
            set: val => store.commit(Mutations.changePublicEmail, val),
        });
        Object.defineProperty(this, "publicTelegram", {
            get: () => store.getters.publicTelegram,
            set: val => store.commit(Mutations.changePublicTelegram, val),
        });
        // for some reason if we define getters like below, they don't work properly
    }

    // public get publicEmail(): boolean {
    //     return store.getters.publicEmail;
    // }
    // public set publicEmail(val: boolean) {
    //     store.commit(Mutations.changePublicEmail, val);
    // }

    // public get publicTelegram(): boolean {
    //     return store.getters.publicTelegram;
    // }
    // public set publicTelegram(val: boolean) {
    //     store.commit(Mutations.changePublicTelegram, val);
    // }
}

class Edit {
    constructor(private data: Data) {}

    public email?: string = null;

    public editEmail() {
        this.email = this.data.email;
    }
    public saveEmail() {
        store.commit(Mutations.changeEmail, this.email);
        this.email = null;
    }
    public clearEmail() {
        store.commit(Mutations.changeEmail, null);
    }

    //
    public telegram?: string = null;

    public editTelegram() {
        this.telegram = this.data.telegram;
    }
    public saveTelegram() {
        store.commit(Mutations.changeTelegram, this.telegram);
        this.telegram = null;
    }
    public clearTelegram() {
        store.commit(Mutations.changeTelegram, null);
    }

    //
    public password?: string = null;
    public repeatPassword: string = "";

    public editPassword() {
        this.password = "";
        this.repeatPassword = "";
    }
    public savePassword() {
        store.commit(Mutations.changePassword, this.password);
        this.password = null;
    }
}

@Component({
    components: {
        Icon,
    }
})
export default class Profile extends Vue {
    private get changed(): boolean {
        return store.getters.changed;
    }

    private perm = new Permissions();
    private data = new Data();
    private edit: Edit;

    constructor() {
        super();
        this.edit = new Edit(this.data);
    }

    private save() {
        store.dispatch(Actions.save)
            .then(() => alert("saved successfully"))
            .catch(() => alert("error"));
    }
}
</script>

<style scoped>

.profile {
    display: flex;
    flex-direction: column;
}

.message-body.field-value {
    padding: 5px;
}

</style>
