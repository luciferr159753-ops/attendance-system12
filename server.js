const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Step 1: Tell Backend to serve Frontend files (built via npm run build)
const frontendPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendPath));

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/subjects', require('./routes/subjectRoutes'));

// Step 2: Handle any route not matching API by serving React's index.html
// This allows React Router to work properly on the backend.
app.get('*', (req, res) => {
    // Only handle if it's not a /api request
    if (!req.path.startsWith('/api/')) {
        res.sendFile(path.join(frontendPath, 'index.html'));
    } else {
        res.status(404).json({ message: 'API route not found' });
    }
});

// Database Connection
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    console.error('ERROR: MONGODB_URI is not defined in .env');
    process.exit(1);
}

mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('--- CONNECTED TO MONGODB ATLAS ---');
        app.listen(PORT, () => {
            console.log(`Server running on port ${PORT}`);
        });
    })
    .catch((error) => {
        console.error('Database connection failed:', error.message);
        console.log('Hint: Check your .env file and ensure your IP is whitelisted in Atlas.');
    });

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!', error: err.message });
});
