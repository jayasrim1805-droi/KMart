const { config, validateConfig } = require('./config/env');
const { connectDB } = require('./config/db');

async function start() {
  try {
    validateConfig();
    await connectDB();
    console.log('MongoDB connected.');
    const app = require('./app');
    app.listen(config.port, () => console.log(`KMart is running at http://localhost:${config.port}`));
  } catch (err) {
    console.error(err.message);
    if (/ECONNREFUSED|ENOTFOUND|Server selection/i.test(err.message)) {
      console.error('Could not reach MongoDB. Check MONGODB_URI and that MongoDB is running (see README > Troubleshooting).');
    }
    process.exit(1);
  }
}

process.on('unhandledRejection', (err) => {
  console.error('Unhandled promise rejection:', err);
  process.exit(1);
});

start();
