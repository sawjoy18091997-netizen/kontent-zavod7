const crypto = require('crypto');

exports.handler = async (event) => {
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

  // .trim() прибирає випадкові пробіли/переноси при копіюванні в Netlify
  const merchantAccount = (process.env.WFP_MERCHANT_ACCOUNT || '').trim();
  const merchantSecret  = (process.env.WFP_SECRET_KEY || '').trim();
  const merchantDomain  = (process.env.WFP_DOMAIN || '').trim();

  if (!merchantAccount || !merchantSecret || !merchantDomain) {
    console.error('Missing WFP env variables');
    return { statusCode: 500, body: 'Server configuration error' };
  }

  const orderReference = 'cz_' + Date.now();
  const orderDate      = Math.floor(Date.now() / 1000);
  const amount         = 2550;
  const currency       = 'UAH';
  const productName     = 'Kontent Zavod cherez Claude';
  const productCount    = 1;
  const productPrice    = 2550;

  // Підпис HMAC-MD5, порядок строго за докою WFP:
  // merchantAccount;merchantDomainName;orderReference;orderDate;amount;currency;
  // productName[];productCount[];productPrice[]
  const signFields = [
    merchantAccount,
    merchantDomain,
    orderReference,
    String(orderDate),
    String(amount),
    currency,
    productName,
    String(productCount),
    String(productPrice),
  ];
  const signString = signFields.join(';');

  const signature = crypto
    .createHmac('md5', merchantSecret)
    .update(signString, 'utf8')
    .digest('hex');

  // Діагностика (секрет не друкуємо повністю — тільки довжину)
  console.log('SIGN_STRING:', signString);
  console.log('SIGNATURE:', signature);
  console.log('SECRET_LENGTH:', merchantSecret.length);
  console.log('ACCOUNT_LENGTH:', merchantAccount.length);
  console.log('DOMAIN_VALUE:', JSON.stringify(merchantDomain));

  const nameParts       = name.trim().split(' ');
  const clientFirstName = nameParts[0] || 'Client';
  const clientLastName  = nameParts.slice(1).join(' ') || 'Client';

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      merchantAccount,
      merchantDomain,
      orderReference,
      orderDate,
      amount,
      currency,
      productName,
      productCount,
      productPrice,
      signature,
      clientFirstName,
      clientLastName,
      clientEmail: email,
      clientPhone: phone,
    }),
  };
};
