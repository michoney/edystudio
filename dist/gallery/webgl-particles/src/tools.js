// 工具函数 — 兼容 Olon 用法

export function random(a, b) {
  if (b === undefined) {
    if (Array.isArray(a)) return a[Math.floor(Math.random() * a.length)];
    return Math.random() * (a || 1);
  }
  return a + Math.random() * (b - a);
}

export function floor(v) {
  return Math.floor(v);
}

export function min(a, b) {
  return a < b ? a : b;
}
