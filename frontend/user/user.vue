<template>
  <div class="user">
    <p class="text-box error" v-if="error">
      {{ error }}
    </p>

    <div class="user-data card" v-else>

      <div class="user-header">
        <button @click="selectProfile">Profile</button>
        <button @click="selectShaders">Shaders</button>
        <button @click="selectComments">Comments</button>
      </div>

      <component :is="component" />

    </div>
  </div>
</template>

<script lang="ts">

import { Vue, Component, Prop } from 'vue-property-decorator';
import { RecvUser, UserStorage } from '../backend.ts';
import { UserRole } from '../../common/user-role.ts';

import Profile from './profile.vue';

import { store, Actions } from './store.ts';

@Component
export default class User extends Vue {
    @Prop({ type: Number, required: true }) id: number;

    private error?: string = null;
    private component?: typeof Vue = null;

    mounted() {
        store
            .dispatch(Actions.init, this.id)
            .then(() => this.selectProfile())
            .catch(err => this.error = err.message);
    }

    private selectProfile() {
        this.component = Profile;
    }

    private selectShaders() {
        
    }

    private selectComments() {
        
    }
}
</script>

<style scoped>

.user {
    display: flex;
    flex-direction: row;
    justify-content: center;
    margin-top: 200px;
}

.error {
    width: 50%;
}

.user-data {
    display: flex;
    flex-direction: column;
    width: 75%;
}

.user-header {
    height: 30px;
}

</style>
