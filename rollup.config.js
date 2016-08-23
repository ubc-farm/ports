import nodeResolve from 'rollup-plugin-node-resolve';
import commonjs from 'rollup-plugin-commonjs';
import babel from 'rollup-plugin-babel';

export default {
	entry: 'index.js',
	external: ['moment', 'react'],
	plugins: [
		nodeResolve({jsnext: true, browser: true}),
		commonjs({
			exclude: './lodash/**',
			namedExports: {
				'react': ['PropTypes', 'Component']
			}
		}),
		babel({
			plugins: ['transform-react-jsx', 'external-helpers-2'],
			exclude: '../../node_modules/**'
		})
	],
	sourceMap: true,
	moduleName: 'Timeline',
	targets: [
		{ dest: 'index.es.js', format: 'es' },
		{ dest: 'index.iife.js', format: 'iife' }
	]
};