import { PROXY } from '../constants/proxy';

let _authToken = null;
const _cache = {};

export function LS(k, v) {
  if (v === undefined) { return _cache[k] !== undefined ? _cache[k] : null; }
  if (v === null) {
    delete _cache[k];
    if (_authToken) fetch(`${PROXY}/kv/${encodeURIComponent(k)}`, { method: "DELETE", headers: { Authorization: `Bearer ${_authToken}` } }).catch(() => {});
    return;
  }
  _cache[k] = v;
  if (_authToken) fetch(`${PROXY}/kv/${encodeURIComponent(k)}`, { method: "PUT", headers: { Authorization: `Bearer ${_authToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ value: JSON.stringify(v) }) }).catch(() => {});
}

export async function storageInit(token) {
  _authToken = token;
  sessionStorage.setItem("t3-token", token);
  try {
    const r = await fetch(`${PROXY}/kv-list`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) return;
    const { keys } = await r.json();
    await Promise.all((keys || []).map(async key => {
      try {
        const r2 = await fetch(`${PROXY}/kv/${encodeURIComponent(key)}`, { headers: { Authorization: `Bearer ${token}` } });
        const d = await r2.json();
        if (d.value !== null && d.value !== undefined) { try { _cache[key] = JSON.parse(d.value); } catch { _cache[key] = d.value; } }
      } catch {}
    }));
  } catch (e) { console.warn("storageInit:", e); }
}

export function storageLogout() {
  _authToken = null;
  sessionStorage.removeItem("t3-token");
  Object.keys(_cache).forEach(k => delete _cache[k]);
}

export async function saveUserApiKey(key) {
  if (!_authToken) return { ok: false, error: "Não autenticado" };
  const r = await fetch(`${PROXY}/user/apikey`, { method: "PUT", headers: { Authorization: `Bearer ${_authToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ apiKey: key }) });
  return r.json();
}

export async function deleteUserApiKey() {
  if (!_authToken) return { ok: false };
  const r = await fetch(`${PROXY}/user/apikey`, { method: "DELETE", headers: { Authorization: `Bearer ${_authToken}` } });
  return r.json();
}

export async function getUserApiKeyStatus() {
  if (!_authToken) return { configured: false };
  try { const r = await fetch(`${PROXY}/user/apikey`, { headers: { Authorization: `Bearer ${_authToken}` } }); return r.json(); } catch { return { configured: false }; }
}

export async function callAI(body) {
  return fetch(`${PROXY}/api/anthropic`, { method: "POST", headers: { Authorization: `Bearer ${_authToken}`, "Content-Type": "application/json" }, body: JSON.stringify(body) });
}
