# Hoppscotch CLI <sup>ALPHA</sup>

A CLI to run Hoppscotch test scripts in CI environments.

### **Commands:**
- `hopp test [options] [file]`: testing hoppscotch collection.json file

### **Usage:**
```
hopp [options or commands] arguments
```

### **Options:**
- `-v`, `--ver`: see the current version of the CLI
- `-h`, `--help`: display help for command

## **Command Descriptions:**

1. #### **`hopp -v` / `hopp --ver`**

   - Prints out the current version of the Hoppscotch CLI

2. #### **`hopp -h` / `hopp --help`**

   - Displays the help text

3. #### **`hopp test [options] <file_path>`**
   - Interactive CLI to accept Hoppscotch collection JSON path
   - Parses the collection JSON and executes each requests
   - Executes pre-request script.
   - Outputs the response of each request.
   - Executes and outputs test-script response.

    #### Options:
    ##### `-e <file_path>` / `--env <file_path>`
    - Accepts path to env.json with contents in below format:   
        ```json
        {
            "ENV1":"value1",
            "ENV2":"value2"
        }
        ```
    - You can now access those variables using `pw.env.get('<var_name>')`
			
			Taking the above example, `pw.env.get("ENV1")` will return `"value1"`

## Install

Install [@hoppscotch/cli](https://www.npmjs.com/package/@hoppscotch/cli) from npm by running:
```
npm i -g @hoppscotch/cli
```

## **Developing:**

1. Clone the repository, make sure you've installed latest [pnpm](https://pnpm.io).
2. `pnpm install`
3. `cd packages/hoppscotch-cli`
4. `pnpm run build`
5. `sudo pnpm link --global`
6. Test the installation by executing `hopp`

## **Contributing:**

To get started contributing to the repository, please read **[CONTRIBUTING.md](./CONTRIBUTING.md)**
