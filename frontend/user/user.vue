<template>
<div class="container">
  <p v-if="error" class="text-box error">
    {{ error }}
  </p>
  
  <div class="box" v-else>
    <div class="tabs is-centered">
      <ul>
        <li class="is-active"> <a @click="selectProfile">Profile</a> </li>
        <li> <a @click="selectShaders">Shaders</a> </li>
        <li> <a @click="selectComments">Comments</a> </li>
      </ul>
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

.error {
    width: 50%;
}

.user-data {
    display: flex;
    flex-direction: column;
    width: 75%;
}

</style>
