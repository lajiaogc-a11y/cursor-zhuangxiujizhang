/**
 * 智能货币格式化工具
 * - 大金额（≥1000）不显示小数位
 * - 小金额（<1000）显示2位小数
 * - 数值始终单行显示，自适应字体大小由CSS控制
 */

const CURRENCY_SYMBOLS: Record<string, string> = {
  MYR: 'RM',
  CNY: '¥',
  USD: '$',
};

/**
 * 格式化货币金额 - 智能去除小数点
 * @param amount 金额数值
 * @param currency 币种 (MYR/CNY/USD)
 * @param options 配置选项
 */
export function formatMoney(
  amount: number,
  currency: string = 'MYR',
  options?: {
    showSymbol?: boolean;
    forceNoDecimals?: boolean;
    threshold?: number;
  }
): string {
  const { showSymbol = true, forceNoDecimals = false, threshold = 1000 } = options || {};
  const symbol = showSymbol ? (CURRENCY_SYMBOLS[currency] || '') : '';
  
  // 确保 amount 是有效数字
  const numAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  const absAmount = Math.abs(numAmount);
  
  // 大金额或强制无小数：不显示小数位
  if (absAmount >= threshold || forceNoDecimals) {
    return `${symbol}${numAmount.toLocaleString('zh-CN', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    })}`;
  }
  
  // 小金额：显示2位小数
  return `${symbol}${numAmount.toLocaleString('zh-CN', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  })}`;
}

/**
 * 简化格式化 - 用于表格和列表
 * 统一不显示小数点，保持紧凑
 */
export function formatCompact(amount: number, currency: string = 'MYR'): string {
  const symbol = CURRENCY_SYMBOLS[currency] || '';
  const numAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  return `${symbol}${Math.round(numAmount).toLocaleString('zh-CN')}`;
}

/**
 * 紧凑格式化 - 使用"万"单位显示大数值
 * 用于仪表盘卡片等空间有限的场景
 */
export function formatCompactWan(amount: number, currency: string = 'MYR'): string {
  const symbol = CURRENCY_SYMBOLS[currency] || '';
  
  // 确保 amount 是有效数字
  const numAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  const absAmount = Math.abs(numAmount);
  const sign = numAmount < 0 ? '-' : '';
  
  if (absAmount >= 10000) {
    // 大于1万时显示为"X万"
    const wan = absAmount / 10000;
    if (wan >= 100) {
      return `${sign}${symbol}${Math.round(wan)}万`;
    } else {
      return `${sign}${symbol}${wan.toFixed(1)}万`;
    }
  } else if (absAmount >= 1000) {
    return `${sign}${symbol}${Math.round(absAmount).toLocaleString('zh-CN')}`;
  } else if (absAmount > 0) {
    return `${sign}${symbol}${absAmount.toFixed(2)}`;
  } else {
    return `${symbol}0`;
  }
}

/**
 * 获取货币符号
 */
export function getCurrencySymbol(currency: string): string {
  return CURRENCY_SYMBOLS[currency] || '';
}

/**
 * 双币种显示格式化
 * 原币种金额 (≈ 主币种金额)
 * 如果原币种与主币种相同，只显示一个金额
 * 
 * @param amount 原币种金额
 * @param originalCurrency 原币种
 * @param baseCurrency 系统主币种
 * @param rate 原币种→主币种的汇率
 * @param options 配置选项
 */
export function formatWithBase(
  amount: number,
  originalCurrency: string,
  baseCurrency: string,
  rate: number,
  options?: { compact?: boolean }
): string {
  const numAmount = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  const origSymbol = CURRENCY_SYMBOLS[originalCurrency] || '';
  const baseSymbol = CURRENCY_SYMBOLS[baseCurrency] || '';

  const formatNum = (n: number) => {
    const abs = Math.abs(n);
    if (abs >= 1000) {
      return n.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    }
    return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Same currency — single display
  if (originalCurrency === baseCurrency) {
    return `${origSymbol}${formatNum(numAmount)}`;
  }

  // Different currency — dual display
  const baseAmount = numAmount * (rate || 1);
  return `${origSymbol}${formatNum(numAmount)} (≈ ${baseSymbol}${formatNum(baseAmount)})`;
}
