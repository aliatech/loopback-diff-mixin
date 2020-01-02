# Loopback Diff mixin

[![Build Status](https://travis-ci.org/aliatech/loopback-diff-mixin.svg?branch=master)](https://travis-ci.org/aliatech/loopback-diff-mixin)
[![Coverage Status](https://coveralls.io/repos/github/aliatech/loopback-diff-mixin/badge.svg?branch=master)](https://coveralls.io/github/aliatech/loopback-diff-mixin?branch=master)
[![npm version](https://img.shields.io/npm/v/@aliatech/loopback-diff-mixin.svg?color=blue)](https://www.npmjs.com/package/@aliatech/loopback-diff-mixin)

Loopback diff mixin allows to detect and hook for specific changes in persist models

**Highlights**

* //TODO

**IMPORTANT:**
This Loopback mixin has only be tested with Loopback 3 and MongoDB connector.
Requires Node ≥ 8

**This project is under development.**

## How to install

Install the package through NPM

```bash
npm i -S @aliatech/loopback-diff-mixin
```

Install the package through Yarn

```bash
yarn add --prod @aliatech/loopback-diff-mixin
```

## Basic configuration

Include the mixin in `server/model-config.json`. Example for Loopback 3:

```json
{
  "_meta": {
    "sources": [
      "loopback/common/models",
      "loopback/server/models",
      "../common/models",
      "./models"
    ],
    "mixins": [
      "loopback/common/mixins",
      "../node_modules/@aliatech/loopback-diff-mixin/lib",
      "../common/mixins"
    ]
  }
}
```

Enable the mixin in your model definition, ie `person.json`.

```json
{
  "name": "Person",
  "properties": {
    "name": "string"
  },
  "mixins": {
    "Diff": {
      "hooks": {
        "email": "emailChanged"
      }
    }
  }
}
```

## Usage

//TODO

# Debug

Prepend DEBUG environment when running server or tests to display what is happening:

```bash
DEBUG=loopback:mixins:diff node . # Run server with debug
```

# Testing

Install develop dependences

````bash
npm i -D # If you use NPM
yarn install # If you use Yarn
````

Execute tests

````bash
npm test # Without coverage check
npm run test-with-coverage # With coverage check
DEBUG=loopback:mixins:diff npm test # With debug
````

# Credits

Developed by
[Juan Costa](https://github.com/Akeri "Github's profile")
for
[ALIA Technologies](https://github.com/aliatech "Github's profile")

[<img src="http://alialabs.com/images/logos/logo-full-big.png" alt="ALIA Technologies" height=100/>](http://alialabs.com "Go to ALIA Technologies' website")
