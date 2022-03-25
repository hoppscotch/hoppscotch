# Hoppscotch CLI

A CLI to run Hoppscotch test scripts in CI environments.

## **Commands Available:**

```
Usage: hopp [options or commands] arguments

Options:
  -v, --ver            see the current version of the CLI
  -h, --help           display help for command

Commands:
  test [options] [file] testing hoppscotch collection.json file
```

## **Command Descriptions:**

1. #### **`hopp -v` / `hopp --ver`**

   - Prints out the current version of the Hoppscotch CLI

2. #### **`hopp -h` / `hopp --help`**

   - Displays the help text

3. #### **`hopp test <file_path>`**
   - Interactive CLI to accept Hoppscotch collection JSON path
   - Parses the collection JSON and executes each requests
   - Executes pre-request script.
   - Outputs the response of each request.
   - Executes and outputs test-script response.

## **Installation:**

1. Clone the repository
2. `pnpm install`
3. `cd packages/hoppscotch-cli`
4. `pnpm run build`
5. `sudo pnpm link --global`
6. Test the installation by executing `hopp`

## **Contributing:**

To get started contributing to the repository, please read **[CONTRIBUTING.md](./CONTRIBUTING.md)**
