# Hoppscotch Desktop App <sup>ALPHA</sup>

<div align="center">
   <img align="center" width="128px" src="public/logo.svg" />
   <h1 align="center"><b>Hoppscotch Desktop</b></h1>
   <h2 align="center">
      <a href="https://hoppscotch.com/download">Download</a> |
      <a href="https://docs.hoppscotch.io/documentation/clients/desktop">Official Docs</a>
   </h2>
</div>

<br/>

#### Hoppscotch Desktop App is a cross-platform [Hoppscotch](https://hoppscotch.io) app built with [Tauri V2](https://v2.tauri.app/)

![Hoppscotch Desktop App](desktop-app.png)

#### Now with the ability to connect to Self-Hosted instances

![Hoppscotch Desktop App](connection-to-self-hosted-instance.png)

## Install Hoppscotch Desktop App

1. [Download the latest version of Hoppscotch Desktop App](https://hoppscotch.com/download)
2. Open the downloaded file.
3. Follow the on-screen instructions to install Hoppscotch Desktop App.
4. Open Hoppscotch Desktop App.

## Access Hoppscotch

### Hoppscotch Cloud Edition for Individuals

Access Hoppscotch Cloud Edition from Hoppscotch Desktop App:

1. Open Hoppscotch Desktop App.
2. Click the Hoppscotch logo in the top-left corner.
3. Click "**HOPPSCOTCH CLOUD**".
4. Sign in with your Hoppscotch Cloud account to access your workspaces and collections.

### Hoppscotch Self-Hosted Edition for Community

> [!Note]
> To enable desktop app support for your self-hosted Hoppscotch instance, make sure to update the `WHITELISTED_ORIGINS` environment variable in your `.env` file with your deployment URL.
>
> e.g. to allow connection to `https://hoppscotch.mydomain.com` you need to add `app://hoppscotch_mydomain_com` (MacOS, Linux) and `http://app.hoppscotch_mydomain_com` (Windows) to the `WHITELISTED_ORIGINS` environment variable.
> ```bash
> WHITELISTED_ORIGINS=...existing_origins,app://hoppscotch_mydomain_com,http://app.hoppscotch_mydomain_com
> ```

Add your self-hosted Hoppscotch Community Edition instance to Hoppscotch Desktop App:

1. Open Hoppscotch Desktop App.
2. Click the Hoppscotch logo in the top-left corner.
3. Click "**Add an instance**".
4. Enter the URL of your self-hosted Hoppscotch instance.
5. Click "**Connect**".

> [!Tip]
> You can also self-host Hoppscotch Desktop App.
> 1. Install and generate the selfhost web app:
>    ```bash
>    cd ../hoppscotch-selfhost-web
>    pnpm install
>    pnpm generate
>    ```
> 2. Build the webapp bundler:
>    ```bash
>    cd crates/webapp-bundler
>    cargo build --release
>    ```
> 3. Bundle the web app:
>    ```bash
>    cd target/release
>    ./webapp-bundler --input [path-to-dist-directory] --output [path-to-hoppscotch-desktop]/bundle.zip --manifest [path-to-hoppscotch-desktop]/manifest.json
>    ```
> 4. Run the Tauri development server:
>    ```bash
>    cd src-tauri
>    pnpm tauri dev
>    ```
>    or the following for production build:
>    ```bash
>    cd src-tauri
>    pnpm tauri dev
>    ```

> [!Note]
> `[path-to-dist-directory]` should point to the `dist` directory created by the `pnpm generate` command in step 1.

### Hoppscotch Self-Hosted Edition for Enterprise

> [!Note]
> To enable desktop app support for your self-hosted Hoppscotch instance, make sure to update the `WHITELISTED_ORIGINS` environment variable in your `.env` file with your deployment URL.
>
> e.g. to allow connection to `https://hoppscotch.mydomain.com` you need to add `app://hoppscotch_mydomain_com` (MacOS, Linux) and `http://app.hoppscotch_mydomain_com` (Windows) to the `WHITELISTED_ORIGINS` environment variable.
> ```bash
> WHITELISTED_ORIGINS=...existing_origins,app://hoppscotch_mydomain_com,http://app.hoppscotch_mydomain_com
> ```

Add your self-hosted Hoppscotch Enterprise Edition instance to Hoppscotch Desktop App:

1. Open Hoppscotch Desktop App.
2. Click the Hoppscotch logo in the top-left corner.
3. Click "**Add an instance**".
4. Enter the URL of your self-hosted Hoppscotch instance.
5. Click "**Connect**".

> [!Note]
> For docker setup, the desktop app uses a server at port `3200`, and it is part of the frontend container:
> 
> ```
> ❯ docker run -p 3000:3000 -p 3200:3200 hoppscotch/hoppscotch-frontend
> ```
> 
> Once the container is live, you can enter `[your-ip]:3200` or simply the base address of the instance if you are using [subpath access](https://docs.hoppscotch.io/guides/articles/self-host-hoppscotch-on-your-own-servers#4-subpath-access). 
