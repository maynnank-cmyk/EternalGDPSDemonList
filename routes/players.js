const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;

const PLAYERS_FILE = path.join(__dirname, '../data/players.json');
const DEMONS_FILE = path.join(__dirname, '../data/demons.json');

async function readJsonFile(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading ${filePath}:`, error);
        return { players: [] };
    }
}

async function writeJsonFile(filePath, data) {
    try {
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error(`Error writing ${filePath}:`, error);
        return false;
    }
}

// Расчет очков (такой же как на фронтенде)
function calculatePointsByRank(rank) {
    if (rank <= 50) {
        return Math.max(1000 - (rank - 1) * 20, 300);
    } else {
        return Math.max(300 - (rank - 51) * 5, 5);
    }
}

function calculatePointsWithProgress(demonRank, progress) {
    const basePoints = calculatePointsByRank(demonRank);
    
    if (progress === 100) {
        return basePoints;
    } else if (progress >= 51) {
        return Math.floor(basePoints / 4);
    } else {
        return 0;
    }
}

// GET /api/players - Получить всех игроков с расчетом очков
router.get('/', async (req, res) => {
    try {
        const playersData = await readJsonFile(PLAYERS_FILE);
        const demonsData = await readJsonFile(DEMONS_FILE);
        
        // Рассчитываем очки для каждого игрока
        const playersWithPoints = playersData.players.map(player => {
            let totalPoints = 0;
            
            if (player.completedDemons) {
                player.completedDemons.forEach(demonId => {
                    const demon = demonsData.demons.find(d => d.id === demonId);
                    if (demon) {
                        const demonRank = demonsData.demons.indexOf(demon) + 1;
                        const progress = player.progress ? player.progress[demonId] || 100 : 100;
                        totalPoints += calculatePointsWithProgress(demonRank, progress);
                    }
                });
            }
            
            return {
                ...player,
                totalPoints
            };
        });
        
        // Сортируем по очкам
        playersWithPoints.sort((a, b) => b.totalPoints - a.totalPoints);
        
        res.json({ players: playersWithPoints });
    } catch (error) {
        res.status(500).json({ error: 'Failed to load players' });
    }
});

// GET /api/players/:id - Получить игрока по ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const playersData = await readJsonFile(PLAYERS_FILE);
        const demonsData = await readJsonFile(DEMONS_FILE);
        
        const player = playersData.players.find(p => p.id === id);
        
        if (!player) {
            return res.status(404).json({ error: 'Player not found' });
        }
        
        // Рассчитываем полную статистику игрока
        let totalPoints = 0;
        let completedCount = 0;
        let hardestDemon = null;
        let maxPoints = 0;
        
        if (player.completedDemons) {
            const completions = player.completedDemons.map(demonId => {
                const demon = demonsData.demons.find(d => d.id === demonId);
                if (demon) {
                    const demonRank = demonsData.demons.indexOf(demon) + 1;
                    const progress = player.progress ? player.progress[demonId] || 100 : 100;
                    const points = calculatePointsWithProgress(demonRank, progress);
                    
                    totalPoints += points;
                    completedCount++;
                    
                    if (points > maxPoints) {
                        maxPoints = points;
                        hardestDemon = { demon, points, progress };
                    }
                    
                    return { demon, rank: demonRank, points, progress };
                }
                return null;
            }).filter(Boolean);
            
            // Сортируем завершения по очкам
            completions.sort((a, b) => b.points - a.points);
            
            player.completions = completions;
        }
        
        // Находим ранг игрока
        const allPlayers = playersData.players.map(p => {
            let points = 0;
            if (p.completedDemons) {
                p.completedDemons.forEach(demonId => {
                    const demon = demonsData.demons.find(d => d.id === demonId);
                    if (demon) {
                        const demonRank = demonsData.demons.indexOf(demon) + 1;
                        const progress = p.progress ? p.progress[demonId] || 100 : 100;
                        points += calculatePointsWithProgress(demonRank, progress);
                    }
                });
            }
            return { player: p, points };
        }).filter(p => p.points > 0);
        
        allPlayers.sort((a, b) => b.points - a.points);
        const rank = allPlayers.findIndex(p => p.player.id === id) + 1;
        
        const playerStats = {
            ...player,
            totalPoints,
            completedCount,
            hardestDemon,
            rank: rank || allPlayers.length + 1,
            averageRank: player.completions ? player.completions.reduce((sum, c) => sum + c.rank, 0) / player.completions.length : 0
        };
        
        res.json(playerStats);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load player' });
    }
});

// POST /api/players - Создать нового игрока
router.post('/', async (req, res) => {
    try {
        const { name, avatar, completedDemons, progress } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: 'Name is required' });
        }
        
        const data = await readJsonFile(PLAYERS_FILE);
        const newPlayer = {
            id: `player_${Date.now()}`,
            name,
            avatar: avatar || '👤',
            completedDemons: completedDemons || [],
            progress: progress || {},
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        data.players.push(newPlayer);
        const success = await writeJsonFile(PLAYERS_FILE, data);
        
        if (!success) {
            return res.status(500).json({ error: 'Failed to save player' });
        }
        
        res.status(201).json(newPlayer);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create player' });
    }
});

// PUT /api/players/:id/demons - Добавить/обновить прогресс по демону
router.put('/:id/demons', async (req, res) => {
    try {
        const { id } = req.params;
        const { demonId, progress } = req.body;
        
        if (!demonId || progress === undefined) {
            return res.status(400).json({ error: 'Demon ID and progress are required' });
        }
        
        if (progress < 0 || progress > 100) {
            return res.status(400).json({ error: 'Progress must be between 0 and 100' });
        }
        
        const data = await readJsonFile(PLAYERS_FILE);
        const playerIndex = data.players.findIndex(p => p.id === id);
        
        if (playerIndex === -1) {
            return res.status(404).json({ error: 'Player not found' });
        }
        
        const player = data.players[playerIndex];
        
        // Добавляем демона в completedDemons если прогресс >= 51%
        if (progress >= 51 && !player.completedDemons.includes(demonId)) {
            player.completedDemons.push(demonId);
        }
        
        // Удаляем демона из completedDemons если прогресс < 51%
        if (progress < 51 && player.completedDemons.includes(demonId)) {
            player.completedDemons = player.completedDemons.filter(id => id !== demonId);
        }
        
        // Обновляем прогресс
        if (!player.progress) {
            player.progress = {};
        }
        player.progress[demonId] = progress;
        player.updatedAt = new Date().toISOString();
        
        const success = await writeJsonFile(PLAYERS_FILE, data);
        
        if (!success) {
            return res.status(500).json({ error: 'Failed to update player progress' });
        }
        
        res.json(player);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update player progress' });
    }
});

module.exports = router;
