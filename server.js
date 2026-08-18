const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mineflayer = require('mineflayer');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let bot = null;
let jumpInterval = null;

// BOT BAŞLATMA VE DEĞİŞTİRME FONKSİYONU
function startBot(config) {
  // Eğer çalışan eski bir bot varsa bağlantıyı güvenle kapat
  if (bot) {
    try { bot.quit(); } catch(e) {}
    bot = null;
  }
  if (jumpInterval) clearInterval(jumpInterval);

  io.emit('chatMessage', { sender: 'SİSTEM', text: `[${config.host}:${config.port}] sunucusuna bağlanılıyor...` });

  bot = mineflayer.createBot({
    host: config.host,
    port: parseInt(config.port) || 25565,
    username: config.username || 'AFK_Bot_724',
    version: config.version ? config.version : false
  });

  bot.on('spawn', () => {
    io.emit('chatMessage', { sender: 'SİSTEM', text: 'Sunucuya başarıyla bağlandı!' });

    // Şifre varsa otomatik girer
    if (config.password) {
      setTimeout(() => {
        bot.chat(`/login ${config.password}`);
        bot.chat(`/register ${config.password} ${config.password}`);
      }, 2000);
    }

    // AFK Zıplama Döngüsü
    jumpInterval = setInterval(() => {
      if (bot && bot.entity) {
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
    io.emit('chatMessage', { sender: 'SİSTEM', text: 'Sunucu bağlantısı koptu.' });
  });

  bot.on('error', (err) => {
    io.emit('chatMessage', { sender: 'HATA', text: 'Hata oluştu: ' + err.message });
  });
}

// MOBİL UYUMLU GELİŞMİŞ WEB PANEL ARAYÜZÜ
app.get('/', (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AFK Bot Kontrol Paneli</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #121212; color: #fff; display: flex; flex-direction: column; height: 100vh; }
    
    /* Sunucu Bağlantı Formu */
    .config-panel { background: #1f1f1f; padding: 12px; border-bottom: 2px solid #333; display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    .config-panel input { padding: 8px; border-radius: 5px; border: 1px solid #444; background: #2a2a2a; color: #fff; font-size: 0.85rem; outline: none; }
    .config-panel button { grid-column: span 2; padding: 10px; border-radius: 5px; border: none; background: #2196f3; color: white; font-weight: bold; cursor: pointer; }
    .config-panel button:active { background: #1976d2; }

    /* Chat Alanı */
    #chat-box { flex: 1; padding: 12px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; }
    .msg { background: #2a2a2a; padding: 8px 12px; border-radius: 6px; font-size: 0.9rem; word-break: break-word; }
    .msg.system { background: #3a2e10; color: #ffca28; }
    .msg.bot { background: #1b3a20; color: #81c784; }
    .msg.hata { background: #3e1a1a; color: #ef5350; }

    /* Mesaj Gönderme Formu */
    .send-form { display: flex; padding: 10px; background: #1f1f1f; gap: 8px; border-top: 1px solid #333; }
    .send-form input { flex: 1; padding: 10px; border-radius: 6px; border: 1px solid #444; background: #2a2a2a; color: #fff; font-size: 0.95rem; outline: none; }
    .send-form button { padding: 10px 16px; border-radius: 6px; border: none; background: #4caf50; color: white; font-weight: bold; cursor: pointer; }
  </style>
  <script src="/socket.io/socket.io.js"></script>
</head>
<body>

  <!-- SUNUCU AYARLARI FORMU -->
  <div class="config-panel">
    <input type="text" id="host" placeholder="Sunucu IP (Örn: ornek.aternos.me)">
    <input type="number" id="port" placeholder="Port (Örn: 25565)" value="25565">
    <input type="text" id="version" placeholder="Sürüm (Örn: 1.20.1 veya boş)">
    <input type="password" id="password" placeholder="Bot Şifresi (Varsa)">
    <button onclick="connectServer()">🚀 Sunucuya Bağlan / Değiştir</button>
  </div>

  <!-- CHAT PENCERESİ -->
  <div id="chat-box"></div>

  <!-- MESAJ GÖNDERME -->
  <form class="send-form" id="chat-form">
    <input type="text" id="msg-input" placeholder="Komut veya mesaj yazın..." autocomplete="off" />
    <button type="submit">Gönder</button>
  </form>

  <script>
    const socket = io();
    const chatBox = document.getElementById('chat-box');

    function connectServer() {
      const host = document.getElementById('host').value.trim();
      const port = document.getElementById('port').value.trim();
      const version = document.getElementById('version').value.trim();
      const password = document.getElementById('password').value.trim();

      if (!host) {
        alert('Lütfen en azından bir Sunucu IP adresi girin!');
        return;
      }

      socket.emit('changeServer', { host, port, version, password });
    }

    socket.on('chatMessage', (data) => {
      const msgDiv = document.createElement('div');
      let typeClass = '';
      if (data.sender === 'SİSTEM') typeClass = 'system';
      if (data.sender === 'BOT') typeClass = 'bot';
      if (data.sender === 'HATA') typeClass = 'hata';

      msgDiv.className = 'msg ' + typeClass;
      msgDiv.textContent = data.text;
      chatBox.appendChild(msgDiv);
      chatBox.scrollTop = chatBox.scrollHeight;
    });

    document.getElementById('chat-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const input = document.getElementById('msg-input');
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

// SOCKET.IO ETKİLEŞİMLERİ
io.on('connection', (socket) => {
  // Web panelinden gelen yeni sunucuya bağlanma isteği
  socket.on('changeServer', (config) => {
    startBot(config);
  });

  // Web panelinden gönderilen chat/komut mesajı
  socket.on('sendMessage', (msg) => {
    if (bot && bot.entity) {
      bot.chat(msg);
      io.emit('chatMessage', { sender: 'BOT', text: '[SİZ]: ' + msg });
    } else {
      socket.emit('chatMessage', { sender: 'HATA', text: 'Şu an aktif bir sunucu bağlantısı yok!' });
    }
  });
});

const PORT_WEB = process.env.PORT || 3000;
server.listen(PORT_WEB, () => console.log('Çoklu Sunucu Destekli Panel Aktif!'));
