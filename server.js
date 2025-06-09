require('dotenv').config();
const express = require('express');
const deviceRoutes = require('./routes/deviceRoutes');
const certRoutes = require('./routes/certRoutes');
const errorHandler = require('./middleware/errorHandler');
const userRoutes = require('./routes/userRoutes');

const app = express();
app.use(express.json());

app.use('/api/devices', deviceRoutes);
app.use('/api/certificates', certRoutes);
app.use('/api/users', userRoutes);

// Common error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
