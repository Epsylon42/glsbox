<template>
  <div class="auth">
    <component class="form" :is="form" />
  </div>
</template>

<script lang="ts">
 
import { Vue, Component, Prop } from 'vue-property-decorator';
import Login from './login.vue';
import Register from './register.vue';

@Component({
    components: {
        Login,
        Register,
    }
})
export default class Auth extends Vue {
    @Prop({ type: String, required: true }) mode: string;

    get form(): typeof Vue | null {
        if (this.mode === "login") {
            return Login;
        } else if (this.mode === "register") {
            return Register;
        } else {
            return null;
        }
    }
}
</script>

<style>

.auth {
    display: flex;
    flex-direction: row;
    justify-content: center;
}

.auth .form {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-around;

    margin-top: 100px;
    min-height: 200px;
    padding: 10px;
    box-shadow: 2px 2px 2px;
    background-color: #f9f9f9;
}

.auth h1 {
    font-size: 15pt;
}

.auth error {
    border: 1px solid red;
    border-radius: 5px;
    margin: 0;
    margin-bottom: 10px;
    padding: 5px;
}
</style>
