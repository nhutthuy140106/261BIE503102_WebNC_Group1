const app = require('./app');
const { port } = require('./config/env');
const { connectDb } = require('./config/db');

connectDb().then(() => {
  app.listen(port, () => console.log(`AntGo API chạy tại http://localhost:${port} (docs: /api-docs)`));
});
