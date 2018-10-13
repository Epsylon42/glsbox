import FragShader from './frag-shader.ts';

export class ShaderStorage {
    static requestDefaultShader(): Promise<FragShader> {
        return Promise.resolve(new FragShader(`void main() {
    gl_FragColor = vec4(abs(v_pos), 0.0, 1.0);
}`));
    }

    static requestShader(id: number): Promise<FragShader> {
        return Promise.reject("Backend not implemented");
    }
}

export class User {
    public id: number;
    public name: string;
}

export class UserStorage {
    static currentUser(): Promise<User | null> {
        return Promise.resolve(null);
    }

    static requestUser(id: number): Promise<User> {
        return Promise.reject("Backend not implemented");
    }
}
