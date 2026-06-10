const crypto = require('crypto');

exports.handler = async (event) => {
  // Дозволяємо тільки POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const { name = '', email = '', phone = '' } = body;

  // ── Дані з Netlify Environment Variables ──
  const merchantAccount = process.env.WFP_MERCHANT_ACCOUNT;
  const merchantSecret  = process.env.WFP_SECRET_KEY;
  const merchantDomain  = process.env.WFP_DOMAIN;

  if (!merchantAccount || !merchantSecret || !merchantDomain) {
    console.error('Missing WFP env variables');
    return { statusCode: 500, body: 'Server configuration error' };
  }

  // ── Параметри замовлення ──
  const orderReference = 'cz_' + Date.now();
  const orderDate      = Math.floor(Date.now() / 1000);
  const amount         = 2550;
  const currency       = 'UAH';
  const productName    = 'Контент завод через Claude';
  const productCount   = 1;
  const productPrice   = 2550;

  // ── Генерація підпису (HMAC-MD5) ──
  // Порядок полів строго визначений документацією WFP
  const signString = [
    merchantAccount,
    merchantDomain,
    orderReference,
    orderDate,
    amount,
    currency,
    productName,
    productCount,
    productPrice,
  ].join(';');

  const signature = crypto
    .createHmac('md5', merchantSecret)
    .update(signString)
    .digest('hex');

  // ── Розбиваємо ім'я на first/last ──
  const nameParts     = name.trim().split(' ');
  const clientFirstName = nameParts[0] || '';
  const clientLastName  = nameParts.slice(1).join(' ') || '';

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      merchantAccount,
      merchantDomain,
      orderReference,
      orderDate,
      amount,
      signature,
      clientFirstName,
      clientLastName,
      clientEmail: email,
      clientPhone: phone,
    }),
  };
};
