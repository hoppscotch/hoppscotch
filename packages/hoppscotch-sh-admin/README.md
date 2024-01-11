<div align="center">
  <a href="https://hoppscotch.io">
    <img
      src="https://avatars.githubusercontent.com/u/56705483"
      alt="Hoppscotch Logo"
      height="64"
    />
  </a>
  <br />
  <p>
    <h3>
      <b>
        Hoppscotch Self Hosted Admin Dashboard
      </b>
    </h3>
  </p>

#### **Support**

[![Chat on Discord](https://img.shields.io/badge/chat-Discord-7289DA?logo=discord)](https://hoppscotch.io/discord) [![Chat on Telegram](https://img.shields.io/badge/chat-Telegram-2CA5E0?logo=telegram)](https://hoppscotch.io/telegram) [![Discuss on GitHub](https://img.shields.io/badge/discussions-GitHub-333333?logo=github)](https://github.com/hoppscotch/hoppscotch/discussions)

 </div>

## **Built with**

- [HTML](https://developer.mozilla.org/en-US/docs/Web/HTML)
- [CSS](https://developer.mozilla.org/en-US/docs/Web/CSS), [SCSS](https://sass-lang.com), [Tailwind CSS](https://tailwindcss.com)
- [JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
- [TypeScript](https://www.typescriptlang.org)
- [Vue](https://vuejs.org)
- [Vite](https://vitejs.dev)

## **Developing**

0. Update [`.env.example`](https://github.com/hoppscotch/hoppscotch/blob/main/.env.example) file found in the root of repository with your own keys and rename it to `.env`.

### Local development environment

1. [Clone this repo](https://help.github.com/en/articles/cloning-a-repository) with git.
2. Update `.env.example` file found in the root of `hoppscotch-sh-admin` directory with your own keys and rename it to `.env`.
3. Install pnpm using npm by running `npm install -g pnpm`.
4. Install dependencies by running `pnpm install` within the `hoppscotch-sh-admin` directory
5. It is assumed that the backend is running. Refer the Hoppscotch Backend [`README`](https://github.com/hoppscotch/self-hosted/blob/main/packages/hoppscotch-backend/README.md) to get the backend setup and running.
6. Start the development server with `pnpm run dev`.
7. Open the development site by going to [`http://localhost:3100`](http://localhost:3100) in your browser.
