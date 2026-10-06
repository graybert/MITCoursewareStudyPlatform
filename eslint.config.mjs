import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { FlatCompat } = require('@eslint/eslintrc');
const compat = new FlatCompat({ baseDirectory: import.meta.dirname });
export default [...compat.extends('next/core-web-vitals', 'next/typescript'), { ignores: ['9.01-fall-2007/**','courses/**','generated/**','.next/**','node_modules/**'] }];
