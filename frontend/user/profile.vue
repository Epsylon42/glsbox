<template>
<div class="profile">
  <div class="field">
    <label class="label">Username</label>
    <p>{{ data.user.username }}</p>
  </div>

  <div class="field">
    <label class="label">Registered</label>

    <p> {{ data.user.registrationDate.toLocaleString() }} </p>
  </div>
  
  <div class="field">
    <label class="label">Role</label>

    <div class="control">
      <label v-if="perm.canEditRole" class="checkbox">
        <input type="checkbox" v-model.boolean="data.isModerator">
        Is Moderator
      </label>
      <label v-else>
        {{ data.role }}
      </label>
    </div>
  </div>
  
  <div class="field">
    <label class="label">Email</label>
    
    <div class="control">
      <template v-if="edit.email == null">
        <p>
          {{ data.email }}
        </p>
        
        <template v-if="perm.canEditFields">
          <button
            class="button is-primary is-small"
            @click="edit.editEmail()"
            title="edit"
            >
            Edit
          </button>
          <button
            class="button is-warning is-small"
            @click="edit.clearEmail()"
            title="clear"
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
          title="save"
          >
          Save
        </button>
        <button
          class="button is-small"
          @click="edit.email = null"
          title="cancel"
          >
          Cancel
        </button>
        
      </template>
    </div>
  </div>
  
  <div v-if="perm.canEditFields" class="field">
    <label class="label">Password</label>
    
    <div class="control">
      <template v-if="edit.password == null">
        <button
          class="button is-primary is-small"
          @click="edit.editPassword()"
          title="edit"
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
          title="save"
          >
          Save
        </button>
        <button
          class="button is-small"
          @click="edit.password = null"
          title="cancel"
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
}

class Data {
    public get user(): RecvUser {
        return store.getters.user as RecvUser;
    }

    public get email(): string {
        return store.getters.email || "";
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

</style>
