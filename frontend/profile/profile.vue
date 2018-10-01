<template>
  <div class="profile">
    <a href="login">Login</a>
    <a href="register">Register</a>
  </div>
</template>

<script lang="ts">

import { Vue, Component } from 'vue-property-decorator';

@Component
export default class Profile extends Vue {
    
}

</script>

<style scoped>

.profile {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    height: 100%;
}
</style>
