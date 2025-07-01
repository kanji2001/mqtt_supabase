require('dotenv').config();
const express = require('express');
const deviceRoutes = require('./routes/deviceRoutes');
// const certRoutes = require('./routes/certRoutes');
const errorHandler = require('./middleware/errorHandler');
const userRoutes = require('./routes/userRoutes');
const cors = require('cors'); 

const app = express();

app.use(cors({
  origin: 'http://localhost:5173' 
}));


app.use(express.json());

app.use('/api/devices', deviceRoutes);
app.use('/api/users', userRoutes);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(` Server running on http://localhost:${PORT}`));