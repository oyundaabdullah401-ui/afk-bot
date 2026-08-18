const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mineflayer = require('mineflayer');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// AYARLARINIZ
const SUNUCU_IP = 'mutgunmc.mcsh.io'; // Örn: sunucunuz.aternos.me
const PORT = 25565;                      // Aternos portunuz
const BOT_SIFRESI = '81168';        // Bot giriş şifreniz

let bot = null;

function createBot() {
  bot = mineflayer.createBot({
    host: SUNUCU_IP,
    port: PORT,
    username: 'MutGunAFK',
    version: '1.20.1' // Sunucu sürümünüz
  });

  bot.on('spawn', () => {
    io.emit('chatMessage', { sender: 'SİSTEM', text: 'Bot sunucuya başarıyla bağlandı!' });

    // Şifre Girişi
    setTimeout(() => {
      bot.chat(`/login ${BOT_SIFRESI}`);
      bot.chat(`/register ${BOT_SIFRESI} ${BOT_SIFRESI}`);
    }, 2000);

    // AFK Zıplama Döngüsü
    setInterval(() => {
      if (bot) {
        bot.setControlState('jump', true);
        setTimeout(() => bot.setControlState('jump', false), 500);
      }
    }, 30000);
  });

  // Oyundaki Chat Mesajlarını Web Paneline Gönder
  bot.on('message', (jsonMsg) => {
    const text = jsonMsg.toString();
    if (text.trim()) {
      io.emit('chatMessage', { sender: 'OYUN', text: text });
    }
  });

  bot.on('end', () => {
    io.emit('chatMessage', { sender: 'SİSTEM', text: 'Bağlantı koptu, 15sn sonra tekrar bağlanılıyor...' });
    setTimeout(createBot, 15000);
  });

  bot.on('error', (err) => {
    io.emit('chatMessage', { sender: 'HATA', text: 'Hata oluştu: ' + err.message });
  });
}

createBot();

// MOBİL UYUMLU WEB PANEL ARAYÜZÜ (HTML)
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AFK Bot Chat Paneli</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #121212; color: #fff; display: flex; flex-direction: column; height: 100vh; }
    header { background: #1f1f1f; padding: 15px; text-align: center; font-weight: bold; font-size: 1.1rem; border-bottom: 1px solid #333; color: #4caf50; }
    #chat-box { flex: 1; padding: 15px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }
    .msg { background: #2a2a2a; padding: 10px; border-radius: 8px; font-size: 0.95rem; word-break: break-word; line-height: 1.4; }
    .msg.system { background: #3a2e10; color: #ffca28; }
    .msg.bot { background: #1b3a20; color: #81c784; }
    form { display: flex; padding: 10px; background: #1f1f1f; gap: 8px; border-top: 1px solid #333; }
    input { flex: 1; padding: 12px; border-radius: 6px; border: 1px solid #444; background: #2a2a2a; color: #fff; font-size: 1rem; outline: none; }
    button { padding: 12px 20px; border-radius: 6px; border: none; background: #4caf50; color: white; font-weight: bold; font-size: 1rem; cursor: pointer; }
    button:active { background: #388e3c; }
  </style>
  <script src="/socket.io/socket.io.js"></script>
</head>
<body>
  <header>🎮 Minecraft AFK Bot Paneli</header>
  <div id="chat-box"></div>
  <form id="chat-form">
    <input type="text" id="msg-input" placeholder="Mesaj veya komut yazın..." autocomplete="off" />
    <button type="submit">Gönder</button>
  </form>

  <script>
    const socket = io();
    const chatBox = document.getElementById('chat-box');
    const form = document.getElementById('chat-form');
    const input = document.getElementById('msg-input');

    socket.on('chatMessage', (data) => {
      const msgDiv = document.createElement('div');
      msgDiv.className = 'msg ' + (data.sender === 'SİSTEM' ? 'system' : data.sender === 'BOT' ? 'bot' : '');
      msgDiv.textContent = data.text;
      chatBox.appendChild(msgDiv);
      chatBox.scrollTop = chatBox.scrollHeight;
    });

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      if (input.value.trim()) {
        socket.emit('sendMessage', input.value.trim());
        input.value = '';
      }
    });
  </script>
</body>
</html>
  `);
});

// Telefondan gönderilen mesajı oyuna iletme
io.on('connection', (socket) => {
  socket.on('sendMessage', (msg) => {
    if (bot) {
      bot.chat(msg);
      io.emit('chatMessage', { sender: 'BOT', text: '[SİZ]: ' + msg });
    }
  });
});

const PORT_WEB = process.env.PORT || 3000;
server.listen(PORT_WEB, () => console.log('Panel aktif!'));
