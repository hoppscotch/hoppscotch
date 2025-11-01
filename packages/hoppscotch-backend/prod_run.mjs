import { execFile } from 'child_process';

const runCommand = (command, args) => {
  return new Promise((resolve, reject) => {
    // Use shell: true for cross-platform compatibility, especially for 'npx' on Windows.
    // execFile is safer than exec because arguments are passed as an array, preventing injection.
    execFile(command, args, { shell: true }, (error, stdout, stderr) => {
      if (error) {
        console.error(`exec error: ${error}`);
        return reject(error);
      }
      if (stderr) {
        console.log(`stderr: ${stderr}`);
      }
      console.log(`stdout: ${stdout}`);
      resolve();
    });
  });
};

async function main() {
  try {
    console.log('Running Prisma migrations...');
    await runCommand('npx', ['prisma', 'migrate', 'deploy']);

    console.log('Starting the server...');
    await runCommand('node', ['dist/main.js']);
  } catch (error) {
    console.error('An error occurred:', error);
    process.exit(1);
  }
}

main();
