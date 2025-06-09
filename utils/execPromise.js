const { exec } = require('child_process');

const execPromise = (command) => {
  return new Promise((resolve, reject) => {
    exec(command, (err, stdout, stderr) => {
      if (err) {
        console.error(stderr);
        reject(err);
      } else {
        resolve(stdout);
      }
    });
  });
};

module.exports = execPromise;
