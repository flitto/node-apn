module.exports = {
	plugins: ['prettier'],
	extends: ['eslint:recommended', 'plugin:prettier/recommended'],
	parserOptions: {
		ecmaVersion: 13,
		sourceType: 'module',
	},
	env: {
		node: true,
	},
	rules: {
		'prettier/prettier': 'error',
	},
}
