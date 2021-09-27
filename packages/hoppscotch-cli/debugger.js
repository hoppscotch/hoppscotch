// * A simple implementation to listen to a local TCP socket for debugging logs

if (!(process.argv.length >= 3)) {
  console.error("Usage: 'node debugger.js <PORT>'");
  process.exit(1);
}
let PORT = process.argv[2];
let net = require("net");
const { stdout } = require("process");

const client = net.createServer((socket) => {
  socket.pipe(stdout);
});
client.listen(PORT, () => {
  console.log(`Listening on Port ${PORT}`);
});
