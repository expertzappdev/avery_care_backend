import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mainRoutes from './routes/index.js'; // combined routes
import { notFound, errorHandler } from './midllewares/errorMiddleware.js'; // Error handling middlewares

dotenv.config();

const app = express();

// --- Middlewares ---
app.use(express.json()); // Body-parser middleware, parses the json body
app.use(express.urlencoded({ extended: true })); // url to parses encoded data
app.use(cors()); // enable Cors for all origins 


// --- Routes ---
// all API routes will be handled by '/api' prefix 
app.use('/api', mainRoutes);

// --- Error Handling Middlewares ---
// if no route matches then this middleware will handle
app.use(notFound);

// Global error handler
app.use(errorHandler);

export default app;