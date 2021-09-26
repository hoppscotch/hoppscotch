<div align="center">
  <a href="https://hoppscotch.io">
    <img
      src="https://avatars.githubusercontent.com/u/56705483"
      alt="Hoppscotch Logo"
      height="64"
    />
  </a>
</div>
<div align="center">

# Hoppscotch JavaScript Sandbox <font size=2><sup>ALPHA</sup></font>

</div>

This package deals with providing a JavaScript sandbox for executing various security sensitive external scripts.

## How does this work?

This package makes use of [quickjs-empscripten](https://www.npmjs.com/package/quickjs-emscripten) for building sandboxes for running external code on Hoppscotch.

Currently implemented sandboxes:
- Hoppscotch Test Scripts
- Hoppscotch Pre Request Scripts

## Development

1. Clone the repository

```
git clone https://github.com/hoppscotch/hoppscotch
```

2. Install the package dependencies

```
pnpm install
```

3. Navigate to the [package folder](https://github.com/hoppscotch/hoppscotch/tree/main/packages/hoppscotch-js-sandbox)
```
cd hoppscotch/packages/hoppscotch-js-sandbox
```


4. Try out the demo [`src/demo.ts`](https://github.com/hoppscotch/hoppscotch/blob/main/packages/hoppscotch-js-sandbox/src/demo.ts) using:

```
npm run demo
```

## Versioning
This project follows [Semantic Versioning](https://semver.org/) but as the project is still pre-1.0. The code and the public exposed API should not be considered to be fixed and stable. Things can change at any time!

## License
This project is licensed under the [MIT License](https://opensource.org/licenses/MIT) - see [`LICENSE`](https://github.com/hoppscotch/hopp-js-sandbox/blob/main/LICENSE) for more details.

<div align="center">
  <br />
  <br />

  ###### built with ❤︎ by the [Hoppscotch Team](https://github.com/hoppscotch) and [contributors](https://github.com/AndrewBastin/hopp-js-sandbox/graphs/contributors).

</div>
