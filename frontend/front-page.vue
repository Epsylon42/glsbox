<template>
<div class="has-text-centered">
  <img src="/logo.svg" alg="GLSBox">
  <h1 class="subtitle is-3">Sandbox for running WebGL shaders</h1>
  <div class="field">
    <router-link class="button is-dark is-outlined" to="/browse">Browse existing</router-link>
    <router-link class="button is-dark" to="/create">Create your own</router-link>
  </div>
</div>
</template>

<script lang="ts">

import { Vue, Component } from 'vue-property-decorator';

@Component
export default class FrontPage extends Vue {}
</script>
