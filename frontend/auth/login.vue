<template>
  <form action="/login" method="POST" enctype="multipart/form-data">
    <h1>Login</h1>

    <table>
      <tr>
        <td> Username </td>
        <td> <input type="text" name="username" required> </td>
      </tr>

      <tr>
        <td> Password </td>
        <td> <input type="password" name="password" required> </td>
      </tr>
    </table>
    <input type="submit">
  </form>
</template>

<script lang="ts">

import { Vue, Component } from 'vue-property-decorator';

@Component
export default class Login extends Vue {}
</script>
