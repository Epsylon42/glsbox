<template>
  <div class="column is-4 is-offset-4">
    <component :is="form" />
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
