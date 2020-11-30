<div align="center">
  <a href="https://hoppscotch.io"><img src="https://raw.githubusercontent.com/hoppscotch/hoppscotch/main/static/logo.png" alt="hoppscotch.io logo" height="128"></a>
  <br>
  <br>
  <p>
    <b>Hoppscotch - A free, fast and beautiful API request builder</b>
  </p>
  <p>
     <i>Helps you create requests faster, saving precious time on development - <a href="https://hoppscotch.launchaco.com">Subscribe</a></i>
  </p>
  <p>

[![Website](https://img.shields.io/website?url=https%3A%2F%2Fhoppscotch.io&logo=postwoman)](https://hoppscotch.io) [![Travis Build Status](https://img.shields.io/travis/com/hoppscotch/hoppscotch/main?logo=Travis)](https://travis-ci.com/hoppscotch/hoppscotch) [![GitHub release](https://img.shields.io/github/release/hoppscotch/hoppscotch/all?logo=GitHub)](https://github.com/hoppscotch/hoppscotch/releases/latest) [![Tweet](https://img.shields.io/twitter/url?url=https%3A%2F%2Fhoppscotch.io%2F)](https://twitter.com/intent/tweet?url=https%3A%2F%2Fhoppscotch.io&text=%F0%9F%91%BD%20hoppscotch%20%E2%80%A2%20API%20request%20builder%20-%20Helps%20you%20create%20your%20requests%20faster%2C%20saving%20you%20precious%20time%20on%20your%20development&original_referer=https%3A%2F%2Ftwitter.com%2Fshare%3Ftext%3D%25F0%259F%2591%25BD%2520hoppscotch%2520%25E2%2580%25A2%2520API%2520request%2520builder%2520-%2520Helps%2520you%2520create%2520your%2520requests%2520faster%2C%2520saving%2520you%2520precious%2520time%2520on%2520your%2520development%26url%3Dhttps%3A%2F%2Fhoppscotch.io%26hashtags%3Dhoppscotch%26via%3Dliyasthomas&via=liyasthomas&hashtags=hoppscotch)

  </p>
  <p>
    <sub>Built with ❤︎ by
      <a href="https://github.com/liyasthomas">liyasthomas</a> and
      <a href="https://github.com/hoppscotch/hoppscotch/graphs/contributors">contributors</a>
    </sub>
  </p>
</div>

<div align="center">
  <a href="https://hoppscotch.io"><img src="https://raw.githubusercontent.com/hoppscotch/hoppscotch/main/static/images/screenshot1.png" alt="Screenshot1" width="100%"></a>
</div>

#### **Contact**

[![Chat on Telegram](https://img.shields.io/badge/chat-Telegram-2CA5E0?logo=Telegram)](https://t.me/hoppscotch) [![Chat on Discord](https://img.shields.io/badge/chat-Discord-7289DA?logo=discord)](https://discord.gg/GAMWxmR)

#### **Support**

[![Sponsor on GitHub](https://img.shields.io/badge/sponsor-GitHub-181717?logo=github)](https://github.com/sponsors/hoppscotch) [![Contribute on Open Collective](https://img.shields.io/badge/contribute-Open%20Collective-7FADF2?logo=open-collective)](https://opencollective.com/hoppscotch) [![Join on Patreon](https://img.shields.io/badge/join-Patreon-F96854?logo=patreon)](https://www.patreon.com/liyasthomas) [![Donate on PayPal](https://img.shields.io/badge/donate-PayPal-00457C?logo=paypal)](https://www.paypal.me/liyascthomas)

<details>
  <summary>Table of contents</summary>

---

- [Features](#features)
- [Demo](#demo)
- [Usage](#usage)
- [Built with](#built-with)
- [Developing](#developing)
  - [Browser based development environment](#browser-based-development-environment)
  - [Local development environment](#local-development-environment)
  - [Docker compose](#docker-compose)
- [Docker](#docker)
- [Releasing](#releasing)
- [Contributing](#contributing)
- [Continuous Integration](#continuous-integration)
- [Versioning](#versioning)
- [Changelog](#changelog)
- [Authors](#authors)
  - [Lead Developers](#lead-developers)
  - [Testing and Debugging](#testing-and-debugging)
  - [Collaborators](#collaborators-)
  - [Thanks](#thanks)
  - [Financial Contributors](#financial-contributors)
    - [GitHub Sponsors](#github-sponsors)
    - [Open Collective](#open-collective)
  - [Code Contributors](#code-contributors)
- [License](#license)
- [Acknowledgements](#acknowledgements)
- [Badges](#badges)

---

</details>

### **Features**

❤️ **Lightweight:** Crafted with minimalistic UI design.

⚡️ **Fast:** Send requests and get/copy responses in real-time.

**Methods**

- `GET` - Requests retrieve resource information
- `HEAD` - Retrieve response headers identical to those of a GET request, but without the response body.
- `POST` - The server creates a new entry in a database
- `PUT` - Updates an existing resource
- `DELETE` - Deletes resource or related component
- `CONNECT` - Establishes a tunnel to the server identified by the target resource
- `OPTIONS` - Describe the communication options for the target resource
- `TRACE` - Performs a message loop-back test along the path to the target resource
- `PATCH` - Very similar to `PUT` but makes a partial update on a resource
- `<custom>` - Some APIs use custom request methods such as `LIST`. Type in your custom methods.

🌈 **Make it yours:** Customizable combinations for background, foreground and accent colors.

**Theming:** [Customize now ✨](https://hoppscotch.io/settings)

- Choose theme: System, Light, Dark (default) and Black
- Choose accent color: Blue, Green (default), Teal, Purple, Orange, Pink, Red, and Yellow
- Toggle multi-colored headings
- Toggle auto-scroll to response

_Customized themes are synced with local session storage_

🔥 **PWA:** Install as a [PWA](https://developers.google.com/web/progressive-web-apps) on your device.

**Features**

- Instant loading with Service Workers
- Offline support
- Low RAM/memory and CPU usage
- Add to Home Screen
- Desktop PWA

🚀 **Request:** Retrieve response from endpoint instantly.

- Choose `method`
- Enter `URL`
- Send

**Features**

- Copy/share public "Share URL"
- Generate/copy request code snippets for 10+ languages and frameworks
- Import `cURL`
- Label requests

🔌 **WebSocket:** Establish full-duplex communication channels over a single TCP connection.

- Send and receive data
- Basic and Bearer Token authentication

📡 **Server Sent Events:** Receive a stream of updates from a server over a HTTP connection without resorting to polling.

🌩 **Socket.IO:** Send and Receive data with SocketIO server.

🦟 **MQTT:** Subscribe and Publish to topics of a MQTT Broker.

🔮 **GraphQL:** GraphQL is a query language for APIs and a runtime for fulfilling those queries with your existing data.

- Set endpoint and get schemas
- Multi-column docs
- Set custom request headers
- Query schema
- Get query response

🔐 **Authentication:** Allows to identify the end user.

**Types**

- None
- Basic
- Bearer Token
- OAuth 2.0
- OIDC Access Token/PKCE

📢 **Headers:** Describes the format the body of your request is being sent as.

📫 **Parameters:** Use request parameters to set varying parts in simulated requests.

📃 **Request Body:** Used to send and receive data via the REST API.

**Options**

- Set `Content Type`
- Add or remove Parameter list
- Toggle between key-value and RAW input parameter list

👋 **Responses:** Contains the status line, headers and the message/response body.

- Copy response to clipboard
- Download response as a file
- View preview of HTML responses

⏰ **History:** Request entries are synced with cloud / local session storage to restore with a single click.

📁 **Collections:** Keep your API requests organized with collections and folders. Reuse them with a single click.

_Collections are synced with cloud / local session storage_

🌐 **Proxy:** Enable Proxy Mode from Settings to access blocked APIs.

**Features**

- Hide your IP address
- Fixes [`CORS`](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS) (Cross Origin Resource Sharing) issues
- Access APIs served in non-HTTPS (`http://`)
- Use custom Proxy URL

_Official Hoppscotch Proxy is hosted by Apollo Software - **[Privacy Policy](https://apollosoftware.xyz/legal/postwoman)**_

📜 **Pre-Request Scripts β:** Snippets of code associated with a request that are executed before the request is sent.

**Use-cases**

- Include timestamp in the request headers
- Send a random alphanumeric string in the URL parameters

📄 **API Documentation:** Create and share dynamic API documentation easily, quickly.

**Usage**

1. Add your requests to Collections and Folders
2. Export Collections and easily share your APIs with the rest of your team
3. Import Collections and Generate Documentation on-the-go

⌨️ **Keyboard Shortcuts:** Optimized for efficiency.

> **[Shortcuts WIki](https://github.com/hoppscotch/hoppscotch/wiki/Shortcuts)**

🌎 **i18n β:** Experience the app in your own language.

1. Scroll down to the footer
2. Click "Choose Language" icon button
3. Select your language from the menu

_Keep in mind: Translations aren't available for all source and target language combinations_

**To provide a localized experience for users around the world, you can add you own translations.**

_**All `i18n` contributions are welcome to `i18n` [branch](https://github.com/hoppscotch/hoppscotch/tree/i18n) only!**_

📦 **Add-ons:** Official add-ons for hoppscotch.

- **[Proxy](https://github.com/hoppscotch/proxywoman)** - A simple proxy server created for Hoppscotch
- **[CLI β](https://github.com/hoppscotch/hopp-cli)** - A CLI solution for Hoppscotch
- **[Browser Extensions](https://github.com/hoppscotch/hoppscotch-extension)** - Browser extensions that simplifies access to Hoppscotch

  [![Firefox](https://raw.github.com/alrra/browser-logos/master/src/firefox/firefox_16x16.png) **Firefox**](https://addons.mozilla.org/en-US/firefox/addon/hoppscotch) &nbsp;|&nbsp; [![Chrome](https://raw.github.com/alrra/browser-logos/master/src/chrome/chrome_16x16.png) **Chrome**](https://chrome.google.com/webstore/detail/hoppscotch-extension-for-c/amknoiejhlmhancpahfcfcfhllgkpbld)

  > **Extensions fixes `CORS` issues.**

_Add-ons are developed and maintained under **[Official Hoppscotch Organization](https://github.com/hoppscotch)**._

☁️ **Auth + Sync:** Sign in and sync in real-time.

**Sign in with**

- Google
- GitHub

**Sync**

- History
- Collections
- Environments
- Notes

✅ **Post-Request Tests β:** Write tests associated with a request that are executed after the request response.

**Use-cases**

- Check the status code as an integer
- Filter response headers
- Parse the response data

📝 **Notes** : Instantly jot down notes, tasks or whatever you feel like as they come to your mind.

_Notes are only available for signed-in users_

🌱 **Environments** : Environment variables allow you to store and reuse values in your requests and scripts.

**Use-cases**

- By storing a value in a variable, you can reference it throughout your request section
- If you need to update the value, you only have to change it in one place
- Using variables increases your ability to work efficiently and minimizes the likelihood of error

**To find out more, please check out [Hoppscotch Wiki](https://github.com/hoppscotch/hoppscotch/wiki).**

## **Demo**

[hoppscotch.io](https://hoppscotch.io)

## **Usage**

1. Choose `method`
2. Enter `URL`
3. Send request
4. Get response

## **Built with**

- [HTML](https://developer.mozilla.org/en-US/docs/Web/HTML)
- [CSS](https://developer.mozilla.org/en-US/docs/Web/CSS), [SCSS](https://sass-lang.com), [Tailwind CSS](https://tailwindcss.com)
- [JavaScript](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
- [Vue](https://vuejs.org)
- [Nuxt](https://nuxtjs.org)

## **Developing**

0. Update [`.env.example`](https://github.com/hoppscotch/hoppscotch/blob/main/.env.example) file found in repository's root directory with your own keys and rename it to `.env`.

_Sample keys only works with the [production build](https://hoppscotch.io)._

#### Browser based development environment

[![Open in Gitpod](https://gitpod.io/button/open-in-gitpod.svg)](https://gitpod.io/#https://github.com/hoppscotch/hoppscotch)

#### Local development environment

1. [Clone this repo](https://help.github.com/en/articles/cloning-a-repository) with git.
2. Install dependencies by running `npm install` within the directory that you cloned (probably `hoppscotch`).
3. Start the development server with `npm run dev`.
4. Open development site by going to [`http://localhost:3000`](http://localhost:3000) in your browser.

#### Docker compose

1. [Clone this repo](https://help.github.com/en/articles/cloning-a-repository) with git.
2. Run `docker-compose up`
3. Open development site by going to [`http://localhost:3000`](http://localhost:3000) in your browser.

## **Docker**

```bash
#pull
docker pull liyasthomas/postwoman

#build
docker build -t postwoman:latest .

#run
docker run -p 3000:3000 postwoman:latest
```

## **Releasing**

1. [Clone this repo](https://help.github.com/en/articles/cloning-a-repository) with git.
2. Install dependencies by running `npm install` within the directory that you cloned (probably `hoppscotch`).
3. Build the release files with `npm run generate`.
4. Find the built project in `./dist`.

## **Contributing**

Please contribute using [GitHub Flow](https://guides.github.com/introduction/flow). Create a branch, add commits, and [open a pull request](https://github.com/hoppscotch/hoppscotch/compare).

Please read [`CONTRIBUTING`](CONTRIBUTING.md) for details on our [`CODE OF CONDUCT`](CODE_OF_CONDUCT.md), and the process for submitting pull requests to us.

## **Continuous Integration**

We use [Travis CI](https://travis-ci.com) for continuous integration. Check out our [Travis CI Status](https://travis-ci.com/hoppscotch/hoppscotch).

## **Versioning**

This project is developed by [Liyas Thomas](https://github.com/liyasthomas) using the [Semantic Versioning specification](https://semver.org). For the versions available, see the [releases on this repository](https://github.com/liyasthomas/hoppscotch/releases).

## **Changelog**

See the [`CHANGELOG`](CHANGELOG.md) file for details.

## **Authors**

### Lead Developers

- **[Liyas Thomas](https://github.com/liyasthomas)** - _Author_
- **[John Harker](https://github.com/NBTX)** - _Lead developer_
- **[Andrew Bastin](https://github.com/andrewbastin)** - _Lead developer_
- **[James George](https://github.com/jamesgeorge007)** - _Lead maintainer_
- **[Caneco](https://twitter.com/caneco)** - _Logo and banner designer_

### Testing and Debugging

- [Contributors](https://github.com/hoppscotch/hoppscotch/graphs/contributors)

### Collaborators <!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->

<!-- ALL-CONTRIBUTORS-BADGE:END -->

<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->
<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<table>
  <tr>
    <td align="center"><a href="https://liyasthomas.web.app"><img src="https://avatars1.githubusercontent.com/u/10395817?v=4" width="100px;" alt=""/><br /><sub><b>Liyas Thomas</b></sub></a><br /><a href="https://github.com/liyasthomas/hoppscotch/commits?author=liyasthomas" title="Code">💻</a> <a href="#design-liyasthomas" title="Design">🎨</a></td>
    <td align="center"><a href="https://github.com/AndrewBastin"><img src="https://avatars2.githubusercontent.com/u/9131943?v=4" width="100px;" alt=""/><br /><sub><b>Andrew Bastin</b></sub></a><br /><a href="https://github.com/liyasthomas/hoppscotch/commits?author=AndrewBastin" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/NBTX"><img src="https://avatars3.githubusercontent.com/u/43181178?v=4" width="100px;" alt=""/><br /><sub><b>John Harker</b></sub></a><br /><a href="https://github.com/liyasthomas/hoppscotch/commits?author=NBTX" title="Code">💻</a></td>
    <td align="center"><a href="https://ghuser.io/jamesgeorge007"><img src="https://avatars2.githubusercontent.com/u/25279263?v=4" width="100px;" alt=""/><br /><sub><b>James George</b></sub></a><br /><a href="https://github.com/liyasthomas/hoppscotch/commits?author=jamesgeorge007" title="Code">💻</a></td>
  </tr>
</table>

<!-- markdownlint-enable -->
<!-- prettier-ignore-end -->

<!-- ALL-CONTRIBUTORS-LIST:END -->

See the list of [contributors](https://github.com/hoppscotch/hoppscotch/graphs/contributors) who participated in this project.

### Thanks

- [dev.to 👩‍💻👨‍💻](https://dev.to)

### Financial Contributors

Become a financial contributor and help us sustain our community [[Support](#support)].

#### GitHub Sponsors

**🧞 Genie Sponsors**

<a href="https://www.deta.sh/?ref=hoppscotch" target="_blank" rel="noopener">
<img
	style="max-width: 200px; max-height: 200px;"
	src="https://raw.githubusercontent.com/hoppscotch/hoppscotch/main/assets/images/Deta-Logo-for-Hoppscotch.svg"
	alt="Deta"
/>
</a>

<a href="https://github.com/gianlucapisati" target="_blank" rel="noopener">
<img
	style="max-width: 64px; max-height: 64px; border-radius: 100%"
	src="https://github.com/gianlucapisati.png?size=64"
	alt="Gianluca Pisati"
/>
</a>
<a href="https://github.com/kcomain" target="_blank" rel="noopener">
<img
	style="max-width: 64px; max-height: 64px; border-radius: 100%"
	src="https://github.com/kcomain.png?size=64"
	alt="Kenny Cheung"
/>
</a>
<a href="https://github.com/scmmishra" target="_blank" rel="noopener">
<img
	style="max-width: 64px; max-height: 64px; border-radius: 100%"
	src="https://github.com/scmmishra.png?size=64"
	alt="Shivam Mishra"
/>
</a>
<a href="https://zach.codes" target="_blank" rel="noopener">
<img
	style="max-width: 64px; max-height: 64px; border-radius: 100%"
	src="https://github.com/zackify.png?size=64"
	alt="Zach Silveira"
/>
</a>
<a href="https://github.com/pantharshit00" target="_blank" rel="noopener">
<img
	style="max-width: 64px; max-height: 64px; border-radius: 100%"
	src="https://github.com/pantharshit00.png?size=64"
	alt="Harshit Pant"
/>
</a>
<a href="https://github.com/janpio" target="_blank" rel="noopener">
<img
	style="max-width: 64px; max-height: 64px; border-radius: 100%"
	src="https://github.com/janpio.png?size=64"
	alt="Jan Piotrowski"
/>
</a>
<a href="https://github.com/ankumar" target="_blank" rel="noopener">
<img
	style="max-width: 64px; max-height: 64px; border-radius: 100%"
	src="https://github.com/ankumar.png?size=64"
	alt="Anil Kumar"
/>
</a>
<a href="https://github.com/gpeal" target="_blank" rel="noopener">
<img
	style="max-width: 64px; max-height: 64px; border-radius: 100%"
	src="https://github.com/gpeal.png?size=64"
	alt="Gabriel Peal"
/>
</a>
<a href="https://github.com/koddsson" target="_blank" rel="noopener">
<img
	style="max-width: 64px; max-height: 64px; border-radius: 100%"
	src="https://github.com/koddsson.png?size=64"
	alt="Kristján Oddsson"
/>
</a>
<a href="https://github.com/donokuda" target="_blank" rel="noopener">
<img
	style="max-width: 64px; max-height: 64px; border-radius: 100%"
	src="https://github.com/donokuda.png?size=64"
	alt="Don Okuda"
/>
</a>
<a href="https://github.com/ebrescia" target="_blank" rel="noopener">
<img
	style="max-width: 64px; max-height: 64px; border-radius: 100%"
	src="https://github.com/ebrescia.png?size=64"
	alt="Erica Brescia"
/>
</a>
<a href="http://tom.preston-werner.com" target="_blank" rel="noopener">
<img
	style="max-width: 64px; max-height: 64px; border-radius: 100%"
	src="https://github.com/mojombo.png?size=64"
	alt="Tom Preston-Werner"
/>
</a>
<a href="https://github.com/mlynch" target="_blank" rel="noopener">
<img
	style="max-width: 64px; max-height: 64px; border-radius: 100%"
	src="https://github.com/mlynch.png?size=64"
	alt="Max Lynch"
/>
</a>
<a href="https://github.com/brianshaler" target="_blank" rel="noopener">
<img
	style="max-width: 64px; max-height: 64px; border-radius: 100%"
	src="https://github.com/brianshaler.png?size=64"
	alt="Brian Shaler"
/>
</a>
<a href="https://github.com/mxstbr" target="_blank" rel="noopener">
<img
	style="max-width: 64px; max-height: 64px; border-radius: 100%"
	src="https://github.com/mxstbr.png?size=64"
	alt="Max Stoiber"
/>
</a>
<a href="https://github.com/jjcaine" target="_blank" rel="noopener">
<img
	style="max-width: 64px; max-height: 64px; border-radius: 100%"
	src="https://github.com/jjcaine.png?size=64"
	alt="John Caine"
/>
</a>

#### Open Collective

**🧚 Angel Sponsors**

<a href="https://paw.cloud/?utm_source=hoppscotch&utm_medium=github&utm_campaign=hoppscotch-sponsorship" target="_blank" rel="noopener">
<img
	style="max-width: 100px; max-height: 100px;"
	src="https://raw.githubusercontent.com/hoppscotch/hoppscotch/main/assets/images/Paw-Logo-for-Hoppscotch.png"
	alt="Paw"
/>
</a>

<a href="https://opencollective.com/hoppscotch/organization/0/website"><img src="https://opencollective.com/hoppscotch/organization/0/avatar.svg"></a>
<a href="https://opencollective.com/hoppscotch/organization/1/website"><img src="https://opencollective.com/hoppscotch/organization/1/avatar.svg"></a>

### Code Contributors

This project exists thanks to all the people who contribute [[Contribute](CONTRIBUTING.md)].

<a href="https://github.com/hoppscotch/hoppscotch/graphs/contributors"><img src="https://opencollective.com/hoppscotch/contributors.svg?width=890&button=false" /></a>

## **License**

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT) - see the [`LICENSE`](LICENSE) file for details.

## **Acknowledgements**

- Hat tip to anyone whose code was used
- Inspirations:
  - [Dribbble](https://dribbble.com)

## **Badges**

<table>
	<tr>
		<th>Preview</th>
		<th>Markdown code</th>
	</tr>
	<tbody>
		<tr>
			<td align="center" width="200px">
				<a href="https://hoppscotch.io">
					<br/>
					<img src="https://img.shields.io/badge/Tested_on-Hoppscotch-202124?logo=postwoman"/>
				</a>
				<br/>
				<sub>
          Default
        </sub>
			</td>
			<td>
				<code>[![hoppscotch](https://img.shields.io/badge/Tested_on-Hoppscotch-202124?logo=postwoman)](https://hoppscotch.io)</code>
			</td>
		</tr>
		<tr>
			<td align="center" width="200px">
				<a href="https://hoppscotch.io">
					<br/>
					<img src="https://img.shields.io/badge/Tested_on-Hoppscotch-success?logo=postwoman"/>
				</a>
				<br/>
				<sub>
          Success
        </sub>
			</td>
			<td>
				<code>[![hoppscotch](https://img.shields.io/badge/Tested_on-Hoppscotch-success?logo=postwoman)](https://hoppscotch.io)</code>
			</td>
		</tr>
		<tr>
			<td align="center" width="200px">
				<a href="https://hoppscotch.io">
					<br/>
					<img src="https://img.shields.io/badge/Tested_on-Hoppscotch-critical?logo=postwoman"/>
				</a>
				<br/>
				<sub>
          Critical
        </sub>
			</td>
			<td>
				<code>[![hoppscotch](https://img.shields.io/badge/Tested_on-Hoppscotch-critical?logo=postwoman)](https://hoppscotch.io)</code>
			</td>
		</tr>
		<tr>
			<td align="center" width="200px">
				<a href="https://hoppscotch.io">
					<br/>
					<img src="https://img.shields.io/badge/Tested_on-Hoppscotch-blueviolet?logo=postwoman"/>
				</a>
				<br/>
				<sub>
          Custom
        </sub>
			</td>
			<td>
				<code>[![hoppscotch](https://img.shields.io/badge/Tested_on-Hoppscotch-blueviolet?logo=postwoman)](https://hoppscotch.io)</code>
			</td>
		</tr>
		<tr>
			<td align="center" width="200px">
				<a href="https://hoppscotch.io">
					<br/>
					<img src="https://img.shields.io/badge/your_text-Hoppscotch-hex_color_code?logo=postwoman"/>
				</a>
				<br/>
				<sub>
          Customize
        </sub>
			</td>
			<td>
				<code>[![hoppscotch](https://img.shields.io/badge/your_text-Hoppscotch-hex_color_code?logo=postwoman)](https://hoppscotch.io)</code>
			</td>
		</tr>
	</tbody>
</table>

<div align="center">
  <br>
  <a href="https://hoppscotch.io"><img src="https://raw.githubusercontent.com/liyasthomas/templates/master/assets/logo.gif" alt="hoppscotch.io" width="200"></a>
  <br>
  <h3>Happy Coding ❤︎</h3>
</div>
