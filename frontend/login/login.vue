<template>
  <div class="login">
    <form action="/login" method="POST">
      <input type="text" name="login">
      <input type="text" name="password">
      <input type="submit">
    </form>
  </div>
</template>

<script lang="ts">

import { Vue, Component } from 'vue-property-decorator';

export default class Login extends Vue {}
</script>

<style scoped>

.login {
    margin: 20px;
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
}

.login > form {
    width: 25%;
    border: 5px solid grey;
    border-radius: 5px;
}
</style>
