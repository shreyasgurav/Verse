/**
 * Answer Validators - Validate answers before filling
 */

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validatePhone(phone: string): boolean {
  // Remove common formatting characters
  const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
  // Check if it's a valid phone number (7-15 digits)
  return /^\+?[0-9]{7,15}$/.test(cleaned);
}

export function validateUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

export function validateDate(date: string): boolean {
  // Check YYYY-MM-DD format
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;

  const parsed = new Date(date);
  return !isNaN(parsed.getTime());
}

export function validateTime(time: string): boolean {
  // Check HH:MM format
  return /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/.test(time);
}

export function validateNumber(value: string, min?: number, max?: number): boolean {
  const num = parseFloat(value);
  if (isNaN(num)) return false;

  if (min !== undefined && num < min) return false;
  if (max !== undefined && num > max) return false;

  return true;
}

export function validateAnswer(answer: string, fieldType: string, constraints?: any): boolean {
  if (!answer || answer.trim() === '') return false;

  switch (fieldType) {
    case 'email':
      return validateEmail(answer);
    case 'tel':
      return validatePhone(answer);
    case 'url':
      return validateUrl(answer);
    case 'date':
      return validateDate(answer);
    case 'time':
      return validateTime(answer);
    case 'number':
      return validateNumber(answer, constraints?.min, constraints?.max);
    default:
      // Check length constraints
      if (constraints?.minLength && answer.length < constraints.minLength) return false;
      if (constraints?.maxLength && answer.length > constraints.maxLength) return false;
      return true;
  }
}
