# Translations

Thanks for your interest in helping translating the software!

## Starting a translation

Before you start working on a translation, look through the [open pull requests](https://github.com/hoppscotch/hoppscotch/pulls) to see if anyone else is already working on one for your language.

If there's not, then today is your day to lead this effort! Here's how to start:

1. [Fork this repository](https://github.com/hoppscotch/hoppscotch/fork)
2. Create a new branch for your translation work e.g. `es`.
3. Copy `lang/en-US.json` to your target language file e.g. `lang/es-ES.json` and translate all the strings.
4. Add your language entry to `nuxt.config.js`.

   e.g.

   ```
    i18n: {
      locales: [
        {
          code: "en",
          name: "English",
          iso: "en-US",
          file: "en-US.json",
        },
        {
          code: 'es',
          name: 'Español',
          iso: 'es-ES',
          file: 'es-ES.json'
        }
      ]
    }
   ```

5. Save & commit changes.
6. Send a pull request. (You may send a pull request before all steps above are complete: e.g., you may want to ask for help with translations, or getting tests to pass. However your pull request will not be merged until all steps above are complete.)

Completing an initial translation of the whole site is a fairly large task. One way to break that task up is to work with other translators through pull requests on your fork. You can also [add collaborators to your fork](https://help.github.com/en/github/setting-up-and-managing-your-github-user-account/inviting-collaborators-to-a-personal-repository) if you'd like to inivte other translators to commit directly to your fork and share responsibility for merging pull requests.

## Updating a translation

### Corrections

If you notice spelling or grammar errors, typos, or opportunities for better phrasing, open a pull request with your suggested fix. If you see a problem that you aren't sure of or don't have time to fix, open an issue.

### Broken links

When tests find broken links, try to fix them across all translations. Ideally, only update the linked URLs, so that translation changes will definitely not be necessary.
