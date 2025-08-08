import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import mainRoutes from './routes/index.js'; // combined routes
import { notFound, errorHandler } from './middlewares/errorMiddleware.js';
dotenv.config();

const app = express();

// --- Middlewares ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors()); // enable Cors for all origins 


// --- Routes ---
// all API routes will be handled by '/api' prefix 
app.use('/api', mainRoutes);

app.use(notFound);
// --- Error Handling Middlewares ---
// if no route matches then this middleware will handle

// Global error handler
app.use(errorHandler);

export default app;