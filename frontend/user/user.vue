<template>
  <div class="user">
    <p class="error" v-if="error">
      {{ error }}
    </p>

    <div class="user-data" v-else>
    </div>
  </div>
</template>

<script lang="ts">

import { Vue, Component, Prop } from 'vue-property-decorator';
import { RecvUser, UserStorage } from '../backend.ts';
import { UserRole } from '../../common/user-role.ts';

@Component
export default class User extends Vue {
    @Prop({ type: Number, default: null }) id?: number;

    private user?: RecvUser = null;
    private myRole?: UserRole = null;
    private error?: string = null;

    mounted() {
        UserStorage
            .requestUser(this.id)
            .then(user => this.user = user)
            .catch(err => this.error = err.message);

        UserStorage
            .requestMe()
            .then(user => this.myRole = user.role)
            .catch(() => {});
    }
}
</script>

<style scoped>

</style>
