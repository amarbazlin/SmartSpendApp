const parseBankSMS = (sms) => {
  if (!sms || typeof sms !== 'string') return null;
  const body = sms.replace(/\s+/g, ' ').trim();

  const amountMatch =
    body.match(/Amount\(Approx\.?\):\s*([\d,]+(?:\.\d+)?)/i) ||
    body.match(/Amount:\s*([\d,]+(?:\.\d+)?)\s*LKR/i) ||
    body.match(/Rs\.?\s*([\d,]+(?:\.\d+)?)/i);

  if (!amountMatch) return null;

  const amount = parseFloat(amountMatch[1].replace(/,/g, ''));
  const dateMatch = body.match(/Date:([0-9]{2}\.[0-9]{2}\.[0-9]{2})/i);
  const timeMatch = body.match(/Time:([0-9]{2}:[0-9]{2})/i);
  const locationMatch = body.match(/Location:([^,]+)/i);
  
  // ✅ Extract location and format category
  const location = locationMatch?.[1]?.trim() || 'Unknown Location';
  const category = `Other - ${location}`;  // Format: "Other - ARPICO-HYDE PARK"

  const type = /credit|income/i.test(body) ? 'income' : 'expense';

  return {
    type,
    category,
    amount,
    description: sms,
    account: 'Bank',  // ✅ Set account as Bank
    smsDate: dateMatch ? dateMatch[1] : null,
    smsTime: timeMatch ? timeMatch[1] : null,
  };
};