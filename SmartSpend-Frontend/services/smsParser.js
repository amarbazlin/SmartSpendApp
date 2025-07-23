export const parseBankSMS = (body) => {
  const match = body.match(/(?:Rs\.?|LKR)\s?([\d,]+\.\d{2})/);
  const amount = match ? parseFloat(match[1].replace(',', '')) : null;

  let category = 'Other';
  if (/food|restaurant|eat|dine/i.test(body)) category = 'Food';
  else if (/uber|bus|train|taxi/i.test(body)) category = 'Transport';
  else if (/movie|netflix|tv|cinema/i.test(body)) category = 'Entertainment';
  else if (/shop|store|mall|purchase/i.test(body)) category = 'Shopping';
  else if (/hospital|medical|health|clinic/i.test(body)) category = 'Health & Fitness';
  else if (/electric|water|bill|utility/i.test(body)) category = 'Utilities';
  else if (/school|tuition|education/i.test(body)) category = 'Education';

  return amount ? { amount, category } : null;
};