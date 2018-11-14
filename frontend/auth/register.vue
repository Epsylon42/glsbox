<template>
<div class="box">
  <h1 class="title">Register</h1>
  
  <form action="/register" method="POST" enctype="multipart/form-data">
    <div class="field">
      <div class="control">
        <input class="input" type="text" name="username" placeholder="Username">
      </div>
    </div>

    <div class="field">
      <div class="control">
        <input class="input" type="password" name="password" placeholder="Password">
      </div>
    </div>

    <div class="field">
      <div class="control">
        <input class="input" type="password" placeholder="Repeat Password">
      </div>
    </div>

    <div class="field">
      <div class="control">
        <input class="button is-primary" type="submit" value="Register">
      </div>
    </div>
  </form>
</div>
</template>

<script lang="ts">
  
import { Vue, Component } from 'vue-property-decorator';

@Component
export default class Login extends Vue {}
</script>
