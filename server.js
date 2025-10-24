const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

// Импорт маршрутов
const demonsRoutes = require('./routes/demons');
const playersRoutes = require('./routes/players');
const newsRoutes = require('./routes/news');
const teamRoutes = require('./routes/team');
const rulesRoutes = require('./routes/rules');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(morgan('combined'));

// Статические файлы (фронтенд)
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/demons', demonsRoutes);
app.use('/api/players', playersRoutes);
app.use('/api/news', newsRoutes);
app.use('/api/team', teamRoutes);
app.use('/api/rules', rulesRoutes);

// Главная страница
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'Geometry Dash Demon List API is running!',
        timestamp: new Date().toISOString()
    });
});

// Обработка 404
app.use('*', (req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Обработка ошибок
app.use((error, req, res, next) => {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
    console.log(`🎮 Geometry Dash Demon List Server running on port ${PORT}`);
    console.log(`📱 API available at http://localhost:${PORT}/api`);
    console.log(`🌐 Frontend available at http://localhost:${PORT}`);
});
