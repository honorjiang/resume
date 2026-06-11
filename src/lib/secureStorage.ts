/**
 * 简单混淆存储工具
 *
 * 对 sessionStorage / localStorage 中的敏感值做 XOR 混淆 + Base64 编码。
 *
 * ⚠ 这不是真正的加密，只是防止在浏览器 DevTools 中一眼看到明文。
 * 如果攻击者能访问到运行时 JS，混淆可以被轻易还原。
 * 对于真正的高安全场景，应该使用服务端 Session + HttpOnly Cookie。
 */

// 固定盐——混淆用的密钥。变更后已存储的值将无法解码（会回退为空字符串）。
const SALT = '_resume_obfuscate_v1_';

/**
 * 对明文做 XOR 混淆后 Base64 编码。
 * 空字符串直接返回空字符串。
 */
export function obfuscate(plain: string): string {
  if (!plain) return '';

  const chars: string[] = [];
  for (let i = 0; i < plain.length; i += 1) {
    const charCode = plain.charCodeAt(i) ^ SALT.charCodeAt(i % SALT.length);
    chars.push(String.fromCharCode(charCode));
  }

  // btoa 在浏览器中可用；如果遇到多字节字符，先用 encodeURIComponent 转义
  try {
    return btoa(chars.join(''));
  } catch {
    return btoa(encodeURIComponent(chars.join('')));
  }
}

/**
 * 将混淆后的字符串还原为明文。
 * 解码失败（非法 Base64 / 盐变更等）返回空字符串。
 */
export function deobfuscate(cipher: string): string {
  if (!cipher) return '';

  try {
    const decoded = atob(cipher);
    const chars: string[] = [];
    for (let i = 0; i < decoded.length; i += 1) {
      const charCode = decoded.charCodeAt(i) ^ SALT.charCodeAt(i % SALT.length);
      chars.push(String.fromCharCode(charCode));
    }

    const raw = chars.join('');
    // 如果之前 encodeURIComponent 过，尝试 decode
    try {
      return decodeURIComponent(raw);
    } catch {
      return raw;
    }
  } catch {
    return '';
  }
}
