import * as fs from 'fs';
import * as path from 'path';
import peerDepsExternal from 'rollup-plugin-peer-deps-external';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';
import babel from '@rollup/plugin-babel';
import { terser } from 'rollup-plugin-terser';
import sizes from 'rollup-plugin-sizes';
import visualizer from 'rollup-plugin-visualizer';

// eslint-disable-next-line @typescript-eslint/no-var-requires,no-undef
const packageJson = require('./package.json');
const license = fs.readFileSync(path.resolve(__dirname, './LICENSE'), 'utf-8');

const external = ['react', 'react-dom', 'react-query', 'rxjs'];
const globals = {
  react: 'React',
  'react-dom': 'ReactDOM',
  'react-query': 'ReactQuery',
  rxjs: 'rxjs',
  'rxjs/operators': 'rxjs.operators',
};

const inputSources = [
  ['src/index.ts', 'ReactQuerySubscription', 'react-query-subscription'],
];
const extensions = ['.js', '.jsx', '.es6', '.es', '.mjs', '.ts', '.tsx'];

const babelConfig = {
  extensions,
  babelHelpers: 'runtime',
  babelrc: true,
  exclude: '**/node_modules/**',
};
const resolveConfig = { browser: true, extensions };

// Throw on warning
function onwarn(warning) {
  throw Error(warning.message);
}

const createBanner = (name, file) => `/**
 * @license ${name} v${packageJson.version}
 * ${file}
 *
 * ${license.replace(/\n$/, '').replace(/\n/g, '\n * ')}
 */
`;

export default inputSources
  .map(([input, name, file]) => {
    return [
      {
        input,
        onwarn,
        output: {
          file: `dist/${file}.development.js`,
          format: 'umd',
          name,
          sourcemap: true,
          banner: createBanner(name, `${file}.development.js`),
          globals,
        },
        external,
        plugins: [
          resolve(resolveConfig),
          babel(babelConfig),
          commonjs(),
          peerDepsExternal(),
        ],
      },
      {
        input: input,
        output: {
          file: `dist/${file}.production.min.js`,
          format: 'umd',
          name,
          sourcemap: true,
          banner: createBanner(name, `${file}.production.min.js`),
          globals,
        },
        external,
        plugins: [
          replace({
            'process.env.NODE_ENV': JSON.stringify('production'),
            delimiters: ['', ''],
            preventAssignment: true,
          }),
          resolve(resolveConfig),
          babel(babelConfig),
          commonjs(),
          peerDepsExternal(),
          terser(),
          sizes(),
          visualizer({
            filename: 'stats.json',
            json: true,
          }),
        ],
      },
    ];
  })
  .flat();
