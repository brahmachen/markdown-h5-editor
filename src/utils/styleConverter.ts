import React from 'react';

// 定义一个集合，包含不应从 px 转换为 vw 的 CSS 属性。
// 例如，边框宽度为1px时，如果转换为vw，在小屏幕上可能变得几乎看不见。
// 用户可以根据需求调整这个列表。
const nonConvertibleProperties: Set<keyof React.CSSProperties> = new Set([
  'lineHeight',
  'border',
  'borderWidth',
  'borderTopWidth',
  'borderRightWidth',
  'borderBottomWidth',
  'borderLeftWidth',
  'outline',
  'outlineWidth',
]);

/**
 * 将像素值（数字或字符串）转换为 vw 字符串。
 * @param value 像素值 (例如, 16, '16px').
 * @param designWidth 用于计算的基准设计稿宽度。
 * @returns 以 vw 为单位的值的字符串 (例如, '4.2700vw').
 */
const pxToVw = (value: number | string, designWidth: number = 375): string => {
  const px = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(px)) {
    // 如果解析失败（例如值为 'auto'），返回原始值
    return String(value);
  }
  if (px === 0) {
    return '0';
  }
  const vw = (px / designWidth) * 100;
  // 保留4位小数以提高精度
  return `${vw.toFixed(4)}vw`;
};

/**
 * 遍历一个 React.CSSProperties 对象，并将所有像素值转换为 vw 单位，
 * 但会跳过在 nonConvertibleProperties 列表中的属性。
 * @param style 要转换的样式对象。
 * @param designWidth 基准设计稿宽度。
 * @returns 一个新的、将 px 值转换为 vw 的样式对象。
 */
export const convertStyleObject = (
  style: React.CSSProperties,
  designWidth: number = 375
): React.CSSProperties => {
  const newStyle: React.CSSProperties = {};

  for (const key in style) {
    const typedKey = key as keyof React.CSSProperties;
    const value = style[typedKey];

    // 如果属性在豁免列表中，则保留原始值
    if (nonConvertibleProperties.has(typedKey)) {
      newStyle[typedKey] = value;
      continue;
    }

    // 如果值是数字且不为0，则转换
    if (typeof value === 'number' && value !== 0) {
      newStyle[typedKey] = pxToVw(value, designWidth);
    } 
    // 如果值是字符串且以 'px' 结尾，则转换
    else if (typeof value === 'string' && value.toLowerCase().endsWith('px')) {
      newStyle[typedKey] = pxToVw(value, designWidth);
    } 
    // 否则，保留原始值 (例如, '#fff', 'bold', '10%')
    else {
      newStyle[typedKey] = value;
    }
  }

  return newStyle;
};
