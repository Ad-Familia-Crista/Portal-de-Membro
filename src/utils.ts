import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const maskCPF = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

export const maskRG = (value: string) => {
  // Apenas letras e números (permite letra no dígito verificador ou formato alfanumérico)
  const clean = value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 9);
  
  if (clean.length <= 2) {
    return clean;
  }
  if (clean.length <= 5) {
    return clean.replace(/^([A-Z0-9]{2})([A-Z0-9]+)$/, '$1.$2');
  }
  if (clean.length <= 8) {
    return clean.replace(/^([A-Z0-9]{2})([A-Z0-9]{3})([A-Z0-9]+)$/, '$1.$2.$3');
  }
  return clean.replace(/^([A-Z0-9]{2})([A-Z0-9]{3})([A-Z0-9]{3})([A-Z0-9]{1})$/, '$1.$2.$3-$4');
};

export const isValidCPF = (cpf: string): boolean => {
  const clean = (cpf || '').replace(/\D/g, '');
  if (clean.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(clean)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(clean.charAt(i), 10) * (10 - i);
  }
  let rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(9), 10)) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(clean.charAt(i), 10) * (11 - i);
  }
  rev = 11 - (sum % 11);
  if (rev === 10 || rev === 11) rev = 0;
  if (rev !== parseInt(clean.charAt(10), 10)) return false;

  return true;
};


export const maskCEP = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{3})\d+?$/, '$1');
};

export const maskPhone = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
};

export const maskDate = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1/$2')
    .replace(/(\d{2})(\d)/, '$1/$2')
    .replace(/(\/\d{4})\d+?$/, '$1');
};

export const maskMonthYear = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/(\d{2})(\d)/, '$1/$2')
    .replace(/(\/\d{4})\d+?$/, '$1');
};

export const maskYear = (value: string) => {
  return value.replace(/\D/g, '').slice(0, 4);
};
