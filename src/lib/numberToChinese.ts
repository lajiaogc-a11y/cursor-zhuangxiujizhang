// 数字转中文大写金额
const CHINESE_DIGITS = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
const CHINESE_UNITS = ['', '拾', '佰', '仟'];
const CHINESE_GROUP_UNITS = ['', '万', '亿', '兆'];

const CURRENCY_NAMES: Record<string, { prefix: string; unit: string; subunit: string }> = {
  CNY: { prefix: '人民币', unit: '元', subunit: '分' },
  MYR: { prefix: '马币', unit: '令吉', subunit: '仙' },
  USD: { prefix: '美元', unit: '元', subunit: '分' },
};

function convertIntegerPart(num: string): string {
  if (num === '0' || num === '') return '零';
  
  const groups: string[] = [];
  let temp = num;
  
  // Split into groups of 4 digits from right
  while (temp.length > 0) {
    groups.unshift(temp.slice(-4));
    temp = temp.slice(0, -4);
  }
  
  let result = '';
  let lastGroupHadValue = false;
  
  for (let i = 0; i < groups.length; i++) {
    const group = groups[i].padStart(4, '0');
    const groupIndex = groups.length - 1 - i;
    let groupResult = '';
    let hasValue = false;
    let needZero = false;
    
    for (let j = 0; j < 4; j++) {
      const digit = parseInt(group[j]);
      const unitIndex = 3 - j;
      
      if (digit === 0) {
        if (hasValue) needZero = true;
      } else {
        if (needZero) groupResult += '零';
        groupResult += CHINESE_DIGITS[digit] + CHINESE_UNITS[unitIndex];
        hasValue = true;
        needZero = false;
      }
    }
    
    if (groupResult) {
      // Add zero if previous group had value but current group starts with zeros
      if (lastGroupHadValue && group[0] === '0' && hasValue) {
        result += '零';
      }
      result += groupResult + CHINESE_GROUP_UNITS[groupIndex];
      lastGroupHadValue = true;
    } else if (lastGroupHadValue && groupIndex > 0) {
      // Keep track for zero insertion
      lastGroupHadValue = false;
    }
  }
  
  return result || '零';
}

function convertDecimalPart(decimal: string, subunit: string): string {
  if (!decimal || decimal === '00') return '';
  
  const jiao = parseInt(decimal[0] || '0');
  const fen = parseInt(decimal[1] || '0');
  
  let result = '';
  if (jiao > 0) {
    result += CHINESE_DIGITS[jiao] + '角';
  } else if (fen > 0) {
    result += '零';
  }
  if (fen > 0) {
    result += CHINESE_DIGITS[fen] + subunit;
  }
  
  return result;
}

export function numberToChinese(amount: number | string, currency: string = 'CNY'): string {
  // Ensure amount is a valid number
  const numAmount = typeof amount === 'number' ? amount : parseFloat(String(amount));
  
  if (isNaN(numAmount) || numAmount < 0) return '';
  if (numAmount === 0) return CURRENCY_NAMES[currency]?.prefix + '零' + CURRENCY_NAMES[currency]?.unit + '整' || '零元整';
  
  const currencyInfo = CURRENCY_NAMES[currency] || CURRENCY_NAMES['CNY'];
  
  // Handle very large numbers
  if (numAmount >= 1e16) return currencyInfo.prefix + '金额过大';
  
  // Split integer and decimal parts
  const [intPart, decPart = ''] = numAmount.toFixed(2).split('.');
  
  const integerChinese = convertIntegerPart(intPart);
  const decimalChinese = convertDecimalPart(decPart.padEnd(2, '0'), currencyInfo.subunit);
  
  let result = currencyInfo.prefix + integerChinese + currencyInfo.unit;
  
  if (decimalChinese) {
    result += decimalChinese;
  } else {
    result += '整';
  }
  
  return result;
}

// Quick format for display
export function formatChineseAmount(amount: number | string, currency: string = 'CNY'): string {
  const numAmount = typeof amount === 'number' ? amount : parseFloat(String(amount));
  if (isNaN(numAmount) || numAmount === 0) return '';
  return numberToChinese(numAmount, currency);
}
