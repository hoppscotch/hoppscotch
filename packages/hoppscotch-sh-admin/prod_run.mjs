import { execFile } from "child_process"

const runCommand = (command, args) => {
  return new Promise((resolve, reject) => {
    execFile(command, args, (error, stdout, stderr) => {
      if (error) {
        reject(error)
        return
      }
      if (stderr) {
        console.log(stderr)
      }
      console.log(stdout)
      resolve()
    })
  })
}

const main = async () => {
  try {
    await runCommand("npm", ["install"])
    await runCommand("npm", ["run", "generate"])
    await runCommand("npm", ["run", "build"])
    await runCommand("npm", ["start"])
  } catch (error) {
    console.error(error)
  }
}

main()
