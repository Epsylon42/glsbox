<template>
<div class="profile">
  <p class="text-box username">
    {{ user.username }}
  </p>
  
  <div class="field">
    
    <p class="field-name">email</p>
    <p class="text-box email field-value" v-if="editingEmail == null">
      {{ user.email }}
    </p>
    <input type="email" v-if="editingEmail != null" v-model="editingEmail" placeholder="email">
    <div v-if="canEditFields" class="edit-buttons">
      <button
        v-if="editingEmail == null"
        class="svg-button"
        @click="editingEmail = user.email || ''"
        title="edit"
        >
        <Icon name="edit" />
      </button>
      <button
        v-if="editingEmail == null"
        class="svg-button"
        @click="clearEmail"
        title="clear"
        >
        <Icon name="backspace" />
      </button>
      
      <button
        v-if="editingEmail != null"
        class="svg-button"
        @click="saveEmail"
        title="save"
        >
        <Icon name="save" />
      </button>
      <button
        v-if="editingEmail != null"
        class="svg-button"
        @click="editingEmail = null"
        title="cancel"
        >
        <Icon name="undo" />
      </button>
      
    </div>
  </div>
  
  <div class="field" v-if="canEditFields">
    <p class="field-name">password</p>
    <div class="password" v-if="editingPassword != null">
      <input type="password" v-model="editingPassword" placeholder="password">
      <input type="password" v-model="repeatPassword" placeholder="repeat password">
    </div>
    
    <div class="edit-buttons">
      <button
        v-if="editingPassword == null"
        class="svg-button"
        @click="editPassword"
        title="edit"
        >
        <Icon name="edit" />
      </button>
      
      <button
        v-if="editingPassword != null"
        class="svg-button"
        @click="savePassword"
        title="save"
        >
        <Icon name="save" />
      </button>
      <button
        v-if="editingPassword != null"
        class="svg-button"
        @click="editingPassword = null"
        title="cancel"
        >
        <Icon name="undo" />
      </button>
    </div>
  </div>
  
</div>
</div>
</template>

<script lang="ts">
    
import { Vue, Component } from 'vue-property-decorator';
import { RecvUser } from '../backend.ts';

import { store, Mutations, Actions } from './store.ts';

import Icon from 'vue-awesome/components/Icon.vue';
import 'vue-awesome/icons/edit.js';
import 'vue-awesome/icons/backspace.js';
import 'vue-awesome/icons/save.js';
import 'vue-awesome/icons/undo.js';

@Component({
    components: {
        Icon,
    }
})
export default class Profile extends Vue {
    private get user(): RecvUser {
        return store.getters.user as RecvUser;
    }

    private get me(): RecvUser | null {
        return store.getters.me;
    }

    private get canEditFields(): boolean {
        return store.getters.canEditFields;
    }

    private editingEmail?: string = null;
    private saveEmail() {
        store.commit(Mutations.setEmail, this.editingEmail);
        this.editingEmail = null;
    }
    private clearEmail() {
        store.commit(Mutations.setEmail, null);
        this.$forceUpdate();
    }

    private editingPassword?: string = null;
    private repeatPassword: string = "";
    private editPassword() {
        this.editingPassword = "";
        this.repeatPassword = "";
    }
    private savePassword() {
        this.editingPassword = null;
    }
}
</script>

<style scoped>

.profile {
    display: flex;
    flex-direction: column;
}

.username {
    display: flex;
    flex-direction: row;
    justify-content: center;
    
    margin-bottom: 30px;
}

.edit-buttons {
    display: flex;
    flex-direction: row;
    align-items: center;

    margin-left: 10px;
}

.edit-buttons .svg-button {
    padding: 0;
    margin-left: 2px;
}

.field {
    display: flex;
    flex-direction: row;
    align-items: center;
}

.field-name {
    min-width: 50px;
}

.field-value {
    min-width: 50px;
}

.password {
    display :flex;
    flex-direction: column;
}

</style>
