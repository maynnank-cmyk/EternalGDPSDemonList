const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;

const DEMONS_FILE = path.join(__dirname, '../data/demons.json');

// Вспомогательная функция для чтения JSON
async function readJsonFile(filePath) {
    try {
        const data = await fs.readFile(filePath, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error(`Error reading ${filePath}:`, error);
        return { demons: [] };
    }
}

// Вспомогательная функция для записи JSON
async function writeJsonFile(filePath, data) {
    try {
        await fs.writeFile(filePath, JSON.stringify(data, null, 2));
        return true;
    } catch (error) {
        console.error(`Error writing ${filePath}:`, error);
        return false;
    }
}

// GET /api/demons - Получить всех демонов
router.get('/', async (req, res) => {
    try {
        const data = await readJsonFile(DEMONS_FILE);
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load demons' });
    }
});

// GET /api/demons/:id - Получить демона по ID
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const data = await readJsonFile(DEMONS_FILE);
        const demon = data.demons.find(d => d.id === id);
        
        if (!demon) {
            return res.status(404).json({ error: 'Demon not found' });
        }
        
        res.json(demon);
    } catch (error) {
        res.status(500).json({ error: 'Failed to load demon' });
    }
});

// POST /api/demons - Создать нового демона
router.post('/', async (req, res) => {
    try {
        const { name, creator, image, videoUrl, description } = req.body;
        
        if (!name || !creator) {
            return res.status(400).json({ error: 'Name and creator are required' });
        }
        
        const data = await readJsonFile(DEMONS_FILE);
        const newDemon = {
            id: `demon_${Date.now()}`,
            name,
            creator,
            image: image || `https://via.placeholder.com/240x135/333333/ffffff?text=${encodeURIComponent(name)}`,
            videoUrl: videoUrl || '',
            description: description || '',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        data.demons.push(newDemon);
        const success = await writeJsonFile(DEMONS_FILE, data);
        
        if (!success) {
            return res.status(500).json({ error: 'Failed to save demon' });
        }
        
        res.status(201).json(newDemon);
    } catch (error) {
        res.status(500).json({ error: 'Failed to create demon' });
    }
});

// PUT /api/demons/:id - Обновить демона
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        const data = await readJsonFile(DEMONS_FILE);
        const demonIndex = data.demons.findIndex(d => d.id === id);
        
        if (demonIndex === -1) {
            return res.status(404).json({ error: 'Demon not found' });
        }
        
        data.demons[demonIndex] = {
            ...data.demons[demonIndex],
            ...updates,
            updatedAt: new Date().toISOString()
        };
        
        const success = await writeJsonFile(DEMONS_FILE, data);
        
        if (!success) {
            return res.status(500).json({ error: 'Failed to update demon' });
        }
        
        res.json(data.demons[demonIndex]);
    } catch (error) {
        res.status(500).json({ error: 'Failed to update demon' });
    }
});

// DELETE /api/demons/:id - Удалить демона
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        
        const data = await readJsonFile(DEMONS_FILE);
        const demonIndex = data.demons.findIndex(d => d.id === id);
        
        if (demonIndex === -1) {
            return res.status(404).json({ error: 'Demon not found' });
        }
        
        data.demons.splice(demonIndex, 1);
        const success = await writeJsonFile(DEMONS_FILE, data);
        
        if (!success) {
            return res.status(500).json({ error: 'Failed to delete demon' });
        }
        
        res.json({ message: 'Demon deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Failed to delete demon' });
    }
});

module.exports = router;
