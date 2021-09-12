import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import babel from '@rollup/plugin-babel';
import { terser } from 'rollup-plugin-terser';

// eslint-disable-next-line @typescript-eslint/no-var-requires,no-undef
const packageJson = require('./package.json');

const minifyExtension = (pathToFile) => pathToFile.replace(/\.js$/, '.min.js');

const input = 'src/index.ts';
const extensions = ['.js', '.ts', '.tsx'];

// Throw on warning
function onwarn(warning) {
  throw Error(warning.message);
}

const banner = `/**
 * react-query-use-subscription v${packageJson.version}
 */
`;

export default [
  {
    input,
    onwarn,
    output: [
      {
        file: minifyExtension(packageJson.browser),
        format: 'umd',
        name: 'ReactQuerySubscription',
        sourcemap: true,
        banner,
        globals: {
          react: 'React',
          'react-dom': 'ReactDOM',
          'react-query': 'ReactQuery',
        },
      },
    ],
    plugins: [
      peerDepsExternal(),
      commonjs(),
      replace({
        'process.env.NODE_ENV': JSON.stringify('production'),
        delimiters: ['', ''],
        preventAssignment: true,
      }),
      resolve({
        browser: true,
        extensions,
      }),
      babel({
        extensions,
        babelHelpers: 'runtime',
        babelrc: true,
        exclude: '**/node_modules/**',
      }),
      terser(),
    ],
  },
];
