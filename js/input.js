// ===== Input Helpers =====

export function isConfirmKey(code) {
  return code === 'Enter' || code === 'KeyE';
}

export function isBackKey(code) {
  return code === 'Escape' || code === 'KeyQ';
}
