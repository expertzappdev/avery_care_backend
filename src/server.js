import app from './app.js'; // import the express app
import connectDB from './config/db.js'; // import the db connection utility
import { startScheduler } from './jobs/callScheduler.js';
import dotenv from 'dotenv';
dotenv.config();
// Connect to Database
connectDB();
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  startScheduler()
});