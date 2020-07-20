module.exports = {
    root: true,
    "env": {
        "commonjs": true,
        "es2020": true,
        "node": true
    },
    "extends": [
        "eslint:recommended",
        "plugin:@typescript-eslint/recommended"
    ],
    "parser": "@typescript-eslint/parser",
    "parserOptions": {
        "ecmaVersion": 11
    },
    "plugins": ["@typescript-eslint"],
    "rules": {
        "indent": ["error", 2],
        "semi": "error",
        "@typescript-eslint/no-var-requires": 0,
        "no-constant-condition": 0
    }
};
