const http = require('http');
const app = require('./app');

const server = http.createServer(app);

const port = process.env.PORT || 8080;

server.listen(port)
.on('listening', () => {
  console.info('Server listening on port -', port);
}).on('error', (err)=> {
  console.error('Error while listening');
  console.error(err);
});