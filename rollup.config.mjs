import json from '@rollup/plugin-json';
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import typescript from '@rollup/plugin-typescript';

// Rollup automatically bundles npm dependencies (including lz-string)
// unless they are marked as external. This ensures all dependencies
// are included in the final bundle for offline support.
export default {
    input: 'main.user.ts',
    output: {
        file: '.out/main.user.js',
        format: 'iife',
        sourcemap: "inline",
    },
    plugins: [
        nodeResolve({
            browser: true,
            preferBuiltins: false
        }),
        commonjs({ requireReturnsDefault: 'auto' }),
        json(),
        typescript()
    ],
    // No external dependencies - bundle everything for offline use
    external: []
};