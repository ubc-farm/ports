import nodeResolve from 'rollup-plugin-node-resolve';

export default {
	entry: 'index.js',
	plugins: [
		nodeResolve({jsnext: true, browser: true})
	],
	sourceMap: true,
	targets: [
		{ dest: 'index.es.js', format: 'es' }
	]
};