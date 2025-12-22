import typescript from '@rollup/plugin-typescript';

export default {
    input: 'main.user.ts',
    output: {
        file: '.out/main.user.js',
        format: 'iife'
    },
    plugins: [typescript()]
};