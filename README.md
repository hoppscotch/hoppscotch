```
When I wrote this, only God and I understood what I was doing. Now, only God knows.
```

<div align="center">
    <a href="https://liyas-thomas.firebaseapp.com"><img src="static/icons/logo.svg" alt="Liyas Thomas" height="128"></a>
    <br>
    <h1>Postwoman</h1>
    <p>
      API request builder - Helps you create your requests faster, saving you precious time on your development
    </p>
<p>

[![Financial Contributors on Open Collective](https://opencollective.com/postwoman/all/badge.svg?label=financial+contributors)](https://opencollective.com/postwoman) [![Build Status](https://travis-ci.com/liyasthomas/postwoman.svg?branch=master)](https://travis-ci.com/liyasthomas/postwoman) [![GitHub release](https://img.shields.io/github/release/liyasthomas/postwoman/all.svg)](https://github.com/liyasthomas/postwoman/releases/latest) [![repo size](https://img.shields.io/github/repo-size/liyasthomas/postwoman.svg)](https://github.com/liyasthomas/postwoman/archive/master.zip) [![license](https://img.shields.io/github/license/liyasthomas/postwoman.svg)](https://github.com/liyasthomas/postwoman/blob/master/LICENSE) [![contributions welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg?style=flat)](https://github.com/liyasthomas/postwoman/issues) [![Website](https://img.shields.io/website-up-down-green-red/https/shields.io.svg?label=website)](https://postwoman.io) [![Donate](https://img.shields.io/badge/$-donate-blue.svg)](https://www.paypal.me/liyascthomas) [![Buy me a coffee](https://img.shields.io/badge/$-BuyMeACoffee-orange.svg)](https://www.buymeacoffee.com/liyasthomas) [![Chat on Telegram](https://img.shields.io/badge/chat-Telegram-blueviolet)](https://t.me/postwoman_app) [![Chat on Discord](https://img.shields.io/badge/chat-Discord-violet?logo=discord)](https://discord.gg/GAMWxmR)

</p>
    <sub>Built with ❤︎ by
      <a href="https://github.com/liyasthomas">liyasthomas</a> and
      <a href="https://github.com/liyasthomas/postwoman/graphs/contributors">contributors</a>
    </sub>
</div>

---

**Start here: _[Story behind Postwoman](https://dev.to/liyasthomas/i-created-postwoman-an-online-open-source-api-request-builder-41md)_**

**Chat here: _[Telegram](https://t.me/postwoman_app), [Discord](https://discord.gg/GAMWxmR)_**

**Donate here: _[PayPal](https://www.paypal.me/liyascthomas), [Buy me a coffee](https://www.buymeacoffee.com/liyasthomas)_**

<div align="center">
  <br>
  <img src="static/screenshot1.png" alt="postwoman" width="100%">
  <img src="static/screenshot2.png" alt="postwoman" width="100%">
  <br>
</div>

### Features :sparkles:

:heart: **Lightweight**: Crafted with minimalistic UI design

 - Faster, lighter, cleaner, minimal & responsive

:zap: **Real-time**: Send requests and get/copy responses right away!

**Methods:**
 - `GET` - Retrieve information about the REST API resource
 - `HEAD` - Asks for a response identical to that of a GET request, but without the response body.
 - `POST` - Create a REST API resource
 - `PUT` - Update a REST API resource
 - `DELETE` - Delete a REST API resource or related component
 - `OPTIONS` - Describe the communication options for the target resource
 - `PATCH` - Applies partial modifications to a REST API resource

_History entries are synced with local session storage_

:rainbow: **VIBGYOR**: Neon combination background, foreground & accent colors - because customization === freedom :sparkles:

**Customizations:**
 - Dark and Light background themes
 - Choose accent color
 - Toggle multi-colored frames

_Customized themes are also synced with local session storage_

:fire: **PWA**: Install as a **[PWA](https://developers.google.com/web/progressive-web-apps)** on your device

**Features:**
 - Instant loading with Service Workers
 - Offline support
 - Low RAM/memory and CPU usage

:rocket: **Request**: Retrieve data from a URL without having to do a full page refresh

 - Choose `method`
 - Enter `URL`
 - Enter `Path`
 - Copy public "Share URL"
 - Generate request code for JavaScript XHR, Fetch, cURL
 - Copy generated request code to clipboard
 - Import cURL

:electric_plug: **Web Socket**: Establish full-duplex communication channels over a single TCP connection

 -  Send and receive data

:closed_lock_with_key: **Authentication**: Allows to identity the end user

**Types:**
 - None
 - Basic authentication using username and password
 - Token based authentication

:loudspeaker: **Headers**: Describes the format the body of your request is being sent as

:mailbox: **Parameters**: Use request parameters to set varying parts in simulated requests

:page_with_curl: **Request Body**: Used to send and receive data via the REST API

**Options:**
 - Set content Type
 - Toggle between RAW input and parameter list

:wave: **Responses**: Contains the status line, headers and the message/response body

 - Copy response to clipboard
 - View preview for HTML responses

_HTML responses have "Preview HTML" feature_

:alarm_clock: **History**: Request entries are synced with local session storage to reuse with a single click

**Fields**
 - Timestamp
 - Method
 - Status code
 - URL
 - Path

_History entries can be deleted one-by-one or all together_

## Demo 🚀

[https://postwoman.io](https://postwoman.io)

## Usage 💡

1. Specify your request method
2. Type in your API URL
3. Add API path
4. Send request
5. Get response!

You're done!

## Built with 🔧

* [Chromium](https://github.com/chromium/chromium) - Thanks for being so fast!
* HTML - For the web framework
* CSS - For styling components
* JavaScript - For magic!
* [Vue](https://vuejs.org/) - To add to the JavaScript magic!
* [Nuxt](https://nuxtjs.org/) - To add to the Vue magic!

## Developing 👷

1. [Clone this repo](https://help.github.com/en/articles/cloning-a-repository) with git.
1. Install dependencies by running `npm install` within the directory that you cloned (probably `postwoman`).
1. Start the development server with `npm run dev`.
1. Open development site by going to [http://localhost:3000](http://localhost:3000) in your browser.

#### Or, with docker-compose:

1. [Clone this repo](https://help.github.com/en/articles/cloning-a-repository) with git.
1. Run `docker-compose up`
1. Open development site by going to [http://localhost:3000](http://localhost:3000) in your browser.

## Docker 🐳

```bash
#pull
docker pull liyasthomas/postwoman

#run
docker run -p 3000:3000 liyasthomas/postwoman:latest

#build
docker build -t postwoman:latest
```

## Releasing 🔖

1. [Clone this repo](https://help.github.com/en/articles/cloning-a-repository) with git.
1. Install dependencies by running `npm install` within the directory that you cloned (probably `postwoman`).
1. Build the release files with `npm run build`.
1. Find the built project in `./dist`.


## Contributing 🍰

Please read [CONTRIBUTING](CONTRIBUTING.md) for details on our [CODE OF CONDUCT](CODE_OF_CONDUCT.md), and the process for submitting pull requests to us.

## Continuous Integration 💚

We use [Travis CI](https://travis-ci.com) for continuous integration. Check out our [Travis CI Status](https://travis-ci.com/liyasthomas/postwoman).

## Versioning ✅

This project is developed by [Liyas Thomas](https://github.com/liyasthomas) using the [Semantic Versioning specification](https://semver.org). For the versions available, see the [releases on this repository](https://github.com/liyasthomas/postwoman/releases).

## Change log 📝

See the [CHANGELOG](CHANGELOG.md) file for details.

## Authors 🔮

### Lead Developers 👨‍💻

* **[Liyas Thomas](https://github.com/liyasthomas)** - *Author*

### Testing and Debugging 🚧

* ([contributors](https://github.com/liyasthomas/postwoman/graphs/contributors))

### Contributors 🚸

<table>
  <tr>
    <td align="center"><a href="https://github.com/NBTX"><img src="https://github.com/NBTX.png?size=100" width="100px;" alt="John Harker"/><br /><sub><b>John Harker</b></sub></a><br /><a href="https://github.com/liyasthomas/postwoman/commits?author=NBTX" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/izerozlu"><img src="https://github.com/izerozlu.png?size=100" width="100px;" alt="izerozlu"/><br /><sub><b>izerozlu</b></sub></a><br /><a href="https://github.com/liyasthomas/postwoman/commits?author=izerozlu" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/AndrewBastin"><img src="https://github.com/AndrewBastin.png?size=100" width="100px;" alt="Andrew Bastin"/><br /><sub><b>Andrew Bastin</b></sub></a><br /><a href="https://github.com/liyasthomas/postwoman/commits?author=AndrewBastin" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/nickpalenchar"><img src="https://github.com/nickpalenchar.png?size=100" width="100px;" alt="Nick Palenchar"/><br /><sub><b>Nick Palenchar</b></sub></a><br /><a href="https://github.com/liyasthomas/postwoman/commits?author=nickpalenchar" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/yubathom"><img src="https://github.com/yubathom.png?size=100" width="100px;" alt="Thomas Yuba"/><br /><sub><b>Thomas Yuba</b></sub></a><br /><a href="https://github.com/liyasthomas/postwoman/commits?author=yubathom" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/larouxn"><img src="https://github.com/larouxn.png?size=100" width="100px;" alt="Nicholas La Roux"/><br /><sub><b>Nicholas La Roux</b></sub></a><br /><a href="https://github.com/liyasthomas/postwoman/commits?author=larouxn" title="Code">💻</a></td>
    <td align="center"><a href="https://github.com/JacobAnavisca"><img src="https://github.com/JacobAnavisca.png?size=100" width="100px;" alt="Jacob Anavisca"/><br /><sub><b>Jacob Anavisca</b></sub></a><br /><a href="https://github.com/liyasthomas/postwoman/commits?author=JacobAnavisca" title="Code">💻</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://github.com/nityanandagohain"><img src="https://github.com/nityanandagohain.png?size=100" width="100px;" alt="Nityananda Gohain"/><br /><sub><b>Nityananda Gohain</b></sub></a><br /><a href="https://github.com/liyasthomas/postwoman/commits?author=nityanandagohain" title="Code">💻</a></td>
  </tr>
</table>

See the list of [contributors](https://github.com/liyasthomas/postwoman/graphs/contributors) who participated in this project.

### Thanks 🤝

* [Dribbble](https://dribbble.com)

## Contributors

### Code Contributors

This project exists thanks to all the people who contribute. [[Contribute](CONTRIBUTING.md)].
<a href="https://github.com/liyasthomas/postwoman/graphs/contributors"><img src="https://opencollective.com/postwoman/contributors.svg?width=890&button=false" /></a>

### Financial Contributors

Become a financial contributor and help us sustain our community. [[Contribute](https://opencollective.com/postwoman/contribute)]

#### Individuals

<a href="https://opencollective.com/postwoman"><img src="https://opencollective.com/postwoman/individuals.svg?width=890"></a>

#### Organizations

Support this project with your organization. Your logo will show up here with a link to your website. [[Contribute](https://opencollective.com/postwoman/contribute)]

<a href="https://opencollective.com/postwoman/organization/0/website"><img src="https://opencollective.com/postwoman/organization/0/avatar.svg"></a>
<a href="https://opencollective.com/postwoman/organization/1/website"><img src="https://opencollective.com/postwoman/organization/1/avatar.svg"></a>
<a href="https://opencollective.com/postwoman/organization/2/website"><img src="https://opencollective.com/postwoman/organization/2/avatar.svg"></a>
<a href="https://opencollective.com/postwoman/organization/3/website"><img src="https://opencollective.com/postwoman/organization/3/avatar.svg"></a>
<a href="https://opencollective.com/postwoman/organization/4/website"><img src="https://opencollective.com/postwoman/organization/4/avatar.svg"></a>
<a href="https://opencollective.com/postwoman/organization/5/website"><img src="https://opencollective.com/postwoman/organization/5/avatar.svg"></a>
<a href="https://opencollective.com/postwoman/organization/6/website"><img src="https://opencollective.com/postwoman/organization/6/avatar.svg"></a>
<a href="https://opencollective.com/postwoman/organization/7/website"><img src="https://opencollective.com/postwoman/organization/7/avatar.svg"></a>
<a href="https://opencollective.com/postwoman/organization/8/website"><img src="https://opencollective.com/postwoman/organization/8/avatar.svg"></a>
<a href="https://opencollective.com/postwoman/organization/9/website"><img src="https://opencollective.com/postwoman/organization/9/avatar.svg"></a>

## License 📄

This project is licensed under the [MIT License](https://opensource.org/licenses/MIT) - see the [LICENSE](LICENSE) file for details.

## Acknowledgments 🙏

* Hat tip to anyone who's code was used
* Inspirations:
	* [Dribbble](https://dribbble.com)

<div align="center">
    <a href="https://liyas-thomas.firebaseapp.com"><img src="https://raw.githubusercontent.com/liyasthomas/templates/master/assets/logo.gif" alt="Liyas Thomas" width="200"></a>
    <br>
    <h3>Happy Coding ❤︎</h3>
</div>
