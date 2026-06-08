const { Client, GatewayIntentBits } = require('discord.js');
const express = require('express');
const mongoose = require('mongoose');

// 1. Initialize Express Web Server
const app = express();
app.use(express.json()); // Allows the website to send JSON data to the backend

// 2. Database Schema (How server data is structured)
const GuildSettingSchema = new mongoose.Schema({
    guildId: { type: String, required: true, unique: true },
    prefix: { type: String, default: '!' }
});
const GuildSetting = mongoose.model('GuildSetting', GuildSettingSchema);

// 3. Web Dashboard Routes
app.get('/', (req, res) => {
    res.send('<h1>Your Discord Bot Dashboard is Online!</h1>');
});

// API endpoint to change a server's prefix from the UI
app.post('/api/prefix', async (req, res) => {
    const { guildId, newPrefix } = req.body;
    
    if (!guildId || !newPrefix) {
        return res.status(400).json({ error: "Missing guildId or newPrefix" });
    }

    try {
        await GuildSetting.findOneAndUpdate(
            { guildId },
            { prefix: newPrefix },
            { upsert: true, new: true }
        );
        res.json({ success: true, message: `Prefix updated to: ${newPrefix}` });
    } catch (err) {
        res.status(500).json({ error: "Database error" });
    }
});

// 4. Initialize Discord Bot
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ] 
});

client.once('ready', () => {
    console.log(`🤖 Discord Bot logged in as ${client.user.tag}!`);
});

// Bot command handler that uses data from MongoDB
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // Fetch this server's specific custom prefix from the database
    let serverSettings = await GuildSetting.findOne({ guildId: message.guild.id });
    const currentPrefix = serverSettings ? serverSettings.prefix : '!';

    // Test command: typing "[prefix]ping"
    if (message.content.startsWith(currentPrefix + 'ping')) {
        message.reply(`Pong! The current prefix for this server is: \`${currentPrefix}\``);
    }
});

// 5. Connect to MongoDB and start the processes
const MONGO_URI = process.env.MONGO_URI;
const BOT_TOKEN = process.env.BOT_TOKEN;
const PORT = process.env.PORT || 8080;

if (!MONGO_URI || !BOT_TOKEN) {
    console.error("❌ CRITICAL: Missing MONGO_URI or BOT_TOKEN in environment variables!");
    process.exit(1);
}

mongoose.connect(MONGO_URI)
    .then(() => {
        console.log("Connected to MongoDB Database!");
        
        // Start Web UI
        app.listen(PORT, () => console.log(`🌐 Dashboard web server listening on port ${PORT}`));
        
        // Start Discord Bot
        client.login(BOT_TOKEN);
    })
    .catch(err => console.error("Database connection error:", err));
