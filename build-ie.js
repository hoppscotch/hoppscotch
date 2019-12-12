const rimraf = require('rimraf');
const fs = require('fs');
const { exec } = require('child_process');
const ora = require('ora');

const runTask = (task, doingText, doneText) => new Promise((resolve, reject) => {
  const loader = ora(doingText).start();
  task.then((...content) => {
    loader.succeed(doneText);
    resolve(...content);
  }).catch((...err) => {
    loader.fail();
    reject(...err);
  });
});

(async () => {

  await runTask(new Promise((resolve, reject) => {
    rimraf("dist/", (error) => {
      if (error) reject(error);
      else resolve();
    });
  }), "Deleting dist folder", "Deleted dist folder");

  await runTask(new Promise((resolve, reject) => {

    exec("npm run build").on('close', (code) => {
      if (code == 0) resolve();
      else reject(code);
    });

  }), "Building", "Done building");

  await runTask(new Promise((resolve, reject) => {
    exec("babel dist/_nuxt/ --out-dir dist/_nuxt_transp --minified --presets=@babel/preset-env").on('close', (code) => {
      if (code == 0) resolve();
      else reject(code);
    });
  }), "Transpiling ES6 to ES5", "Done transpiling ES6 to ES5");

  await runTask(new Promise((resolve, reject) => {
    rimraf("dist/_nuxt", (error) => {
      if (error) reject(error);
      else resolve();
    });
  }), "Deleting old scripts", "Done deleting old scripts");

  await runTask(new Promise((resolve, reject) => {
    fs.rename("dist/_nuxt_transp", "dist/_nuxt", (error) => {
      if (error) reject(error);
      else resolve();
    });
  }), "Adding transpiled scripts", "Done adding transpiled scripts");
})();
