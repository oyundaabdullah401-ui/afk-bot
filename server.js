const express = require('express');
const mineflayer = require('mineflayer');

// Render'ın kapanmaması için web sunucusu
const app = express();
app.get('/', (req, res) => res.send('AFK Botu Aktif!'));
app.listen(process.env.PORT || 3000);

// BOT VE ŞİFRE AYARLARI
const BOT_SIFRESI = '8116812381168123'; // Botun sunucudaki şifresini buraya yazın

function createBot() {
    const bot = mineflayer.createBot({
    host: 'mutgunmc.mcsh.io', // Örn: sunucum.aternos.me (Sonunda port olmayacak!)
    port: 25565,                 // Aternos'un verdiği 5 haneli port numarası
    username: 'AFK_Bot_724',
    version: '1.21.4'            // false yerine sunucunuzun sürümünü yazın (Örn: '1.20.1', '1.16.5')
  });
  

  bot.on('spawn', () => {
    console.log('Bot sunucuya girdi, şifre giriliyor...');

    // Sunucuya girdikten 2 saniye sonra otomatik giriş komutları atar
    setTimeout(() => {
      // Bot daha önce kayıt olmadıysa kayıt eder, olduysa doğrudan giriş yapar
      bot.chat(`/register ${BOT_SIFRESI} ${BOT_SIFRESI}`);
      bot.chat(`/login ${BOT_SIFRESI}`);
    }, 2000);

    // AFK kalıp oyundan atılmaması için 30 saniyede bir zıplar
    setInterval(() => {
      bot.setControlState('jump', true);
      setTimeout(() => bot.setControlState('jump', false), 500);
    }, 30000);
  });

  bot.on('end', () => {
    console.log('Bağlantı koptu, 15 saniye sonra tekrar bağlanılıyor...');
    setTimeout(createBot, 15000);
  });

  bot.on('error', err => console.log('Hata oluştu:', err));
}

createBot();
