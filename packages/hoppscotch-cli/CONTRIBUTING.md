# Contributing

When contributing to this repository, please first discuss the change you wish to make via issue,
email, or any other method with the owners of this repository before making a change.

Please note we have a code of conduct, please follow it in all your interactions with the project.

## Pull Request Process

1. Ensure any install or build dependencies are removed before the end of the layer when doing a
   build.
2. Update the README.md with details of changes to the interface, this includes new environment
   variables, exposed ports, useful file locations and container parameters.
3. Increase the version numbers in any examples files and the README.md to the new version that this
   Pull Request would represent. The versioning scheme we use is [SemVer](https://semver.org).
4. You may merge the Pull Request once you have the sign-off of two other developers, or if you
   do not have permission to do that, you may request the second reviewer merge it for you.

## Set Up The Development Environment

1.  After cloning the repository, execute the following commands:

    ```bash
    pnpm install
    pnpm run build
    ```

2.  In order to test locally, you can use two types of package linking:

    1.  The 'pnpx' way (preferred since it does not hamper your original installation of the CLI):

        ```bash
        pnpm link @hoppscotch/cli

        // Then to use or test the CLI:
        pnpx hopp

        // After testing, to remove the package linking:
        pnpm rm @hoppscotch/cli
        ```

    2.  The 'global' way (warning: this might override the globally installed CLI, if exists):

        ```bash
        sudo pnpm link --global

        // Then to use or test the CLI:
        hopp

        // After testing, to remove the package linking:
        sudo pnpm rm --global @hoppscotch/cli
        ```

3.  To use the Typescript watch scripts:
    ```bash
    pnpm run dev
    ```
