import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import './App.css';

const API = import.meta.env.VITE_API_URL ?? '';
type Asset = {
  symbol: string;
  display_name: string;
  price: string | null;
  change_24h_pct?: string | null;
  data_classification: string;
  stale: boolean;
  ticker_latency_ms: number | null;
  buy_locked: boolean;
  eligibility: string;
  eligibility_note: string;
};
type Tranche = { id: string; tranche_number: number; amount: string; scheduled_at: string; status: string };
type Plan = {
  id: string;
  symbol: string;
  quote_asset: string;
  available_balance: string;
  allocation_pct: string;
  total_allocation: string;
  tranche_amount: string;
  status: string;
  signal_id?: string | null;
  tranches?: Tranche[];
};
type Note = { id: string; title: string; body: string; updated_at: string };
type Device = { id: string; device_name: string; key_fingerprint: string; registered_at: string };
type Signal = { id: string; symbol: string; state: string; outcome: string; generated_at: string; expires_at: string };
type Trade = Record<string, string>;

function toBase64Url(bytes: Uint8Array) {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function toPemSpki(der: ArrayBuffer) {
  const base64 = btoa(String.fromCharCode(...new Uint8Array(der)));
  const lines = base64.match(/.{1,64}/g)?.join('\n') ?? base64;
  return `-----BEGIN PUBLIC KEY-----\n${lines}\n-----END PUBLIC KEY-----`;
}

function readableError(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;
  try {
    const body = JSON.parse(error.message) as { message?: unknown; reasons?: unknown };
    if (typeof body.message === 'string') return body.message;
    if (body.message && typeof body.message === 'object' && 'message' in body.message && typeof body.message.message === 'string') {
      const nested = body.message as { message: string; reasons?: unknown };
      const reasons = Array.isArray(nested.reasons) ? nested.reasons.filter((item): item is string => typeof item === 'string') : [];
      return reasons.length ? `${nested.message} ${reasons.join(', ')}` : nested.message;
    }
    const reasons = Array.isArray(body.reasons) ? body.reasons.filter((item): item is string => typeof item === 'string') : [];
    if (reasons.length) return `${typeof body.message === 'string' ? `${body.message} ` : ''}${reasons.join(', ')}`;
  } catch {
    // The message is already plain text.
  }
  return error.message || fallback;
}

function App() {
  const [page, setPage] = useState<'login' | 'register'>('login');
  const [token, setToken] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accountEmail, setAccountEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [watchlist, setWatchlist] = useState<Asset[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [notifications, setNotifications] = useState<Array<Record<string, unknown>>>([]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [accuracy, setAccuracy] = useState<{ sample_size: number; display_value: string; history_note: string } | null>(null);
  const [devices, setDevices] = useState<Device[]>([]);
  const [deviceName, setDeviceName] = useState('Primary Browser Device');
  const [deviceKeys, setDeviceKeys] = useState<Record<string, CryptoKey>>({});
  const [allocation, setAllocation] = useState('2');
  const [balance, setBalance] = useState('1000');
  const [symbol, setSymbol] = useState('BTC/USDT');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteBody, setNoteBody] = useState('');
  const [editingNoteId, setEditingNoteId] = useState('');
  const [replacingPlanId, setReplacingPlanId] = useState('');
  const [busy, setBusy] = useState(false);
  const [tradeFrom, setTradeFrom] = useState('');
  const [tradeTo, setTradeTo] = useState('');

  const api = useCallback(async <T = unknown,>(path: string, init: RequestInit = {}): Promise<T> => {
    const response = await fetch(`${API}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...init.headers },
    });
    const data: unknown = await response.json().catch(() => ({}));
    if (!response.ok) {
      const details = data && typeof data === 'object' ? data : { message: String(data) };
      throw new Error(JSON.stringify(details));
    }
    return data as T;
  }, [token]);

  const tradeQuery = useCallback(() => {
    const params = new URLSearchParams();
    if (tradeFrom) params.set('from', tradeFrom);
    if (tradeTo) params.set('to', tradeTo);
    return params.size ? `?${params.toString()}` : '';
  }, [tradeFrom, tradeTo]);

  const refreshAll = useCallback(async () => {
    setBusy(true);
    try {
      const [market, planData, watchData, noteData, notificationData, tradeData, deviceData, signalData, accuracyData] = await Promise.all([
        api<{ assets: Asset[] }>('/market-data'), api<Plan[]>('/plans'), api<Asset[]>('/watchlist'), api<Note[]>('/journal'), api<Array<Record<string, unknown>>>('/notifications'),
        api<Trade[]>(`/trades${tradeQuery()}`), api<Device[]>('/auth/devices'), api<Signal[]>('/advisories'), api<{ sample_size: number; display_value: string; history_note: string }>('/advisories/accuracy'),
      ]);
      setAssets(market.assets ?? []);
      setPlans(planData ?? []);
      setWatchlist(watchData ?? []);
      setNotes(noteData ?? []);
      setNotifications(notificationData ?? []);
      setTrades(tradeData ?? []);
      setDevices(deviceData ?? []);
      setSignals(signalData ?? []);
      setAccuracy(accuracyData ?? null);
    } catch (error) {
      setMessage(readableError(error, 'Could not load dashboard data.'));
    } finally {
      setBusy(false);
    }
  }, [api, tradeQuery]);

  useEffect(() => {
    if (!token) return;
    const refresh = window.setTimeout(() => { void refreshAll(); }, 0);
    return () => window.clearTimeout(refresh);
  }, [token, refreshAll]);

  async function authenticate() {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch(`${API}/auth/${page}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.message === 'string' ? data.message : 'Authentication failed.');
      if (page === 'register') {
        setPage('login'); setPassword(''); setMessage('Account created. Sign in to continue.');
      } else {
        setToken(data.access_token); setAccountEmail(data.user.email);
      }
    } catch (error) {
      setMessage(readableError(error, 'Could not connect. Please try again.'));
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    try { await api('/auth/logout', { method: 'POST' }); } catch { /* Local logout still clears the session. */ }
    setToken(''); setPassword(''); setAccountEmail(''); setDevices([]); setDeviceKeys({});
  }

  async function registerBrowserDevice(event: FormEvent) {
    event.preventDefault(); setMessage('');
    try {
      if (!window.crypto?.subtle) throw new Error('WebCrypto is unavailable in this browser.');
      const keyPair = await window.crypto.subtle.generateKey({ name: 'Ed25519' }, false, ['sign', 'verify']) as CryptoKeyPair;
      const publicKey = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
      const challenge = await api<{ challenge: string; challenge_id: string }>('/auth/devices/challenge', { method: 'POST' });
      const signature = await window.crypto.subtle.sign('Ed25519', keyPair.privateKey, new TextEncoder().encode(challenge.challenge));
      const created = await api('/auth/devices', {
        method: 'POST', body: JSON.stringify({ challengeId: challenge.challenge_id, deviceName: deviceName.trim(), publicKey: toPemSpki(publicKey), signature: toBase64Url(new Uint8Array(signature)) }),
      }) as Device;
      setDeviceKeys((current) => ({ ...current, [created.id]: keyPair.privateKey }));
      setMessage('Browser device registered. Its signing key remains in this page session; this is not native biometric security.');
      await refreshAll();
    } catch (error) { setMessage(readableError(error, 'Device registration failed.')); }
  }

  async function verifyDeviceProof(deviceId: string) {
    setMessage('');
    try {
      const key = deviceKeys[deviceId];
      if (!key) throw new Error('This device key is unavailable in the current browser session.');
      const challenge = await api<{ challenge: string; challenge_id: string }>(`/auth/devices/${deviceId}/authorization-challenge`, { method: 'POST' });
      const signature = await window.crypto.subtle.sign('Ed25519', key, new TextEncoder().encode(challenge.challenge));
      const result = await api<{ verified_at: string }>(`/auth/devices/${deviceId}/verify`, { method: 'POST', body: JSON.stringify({ challengeId: challenge.challenge_id, signature: toBase64Url(new Uint8Array(signature)) }) });
      setMessage(`Device proof verified at ${new Date(result.verified_at).toLocaleString()}.`);
    } catch (error) { setMessage(readableError(error, 'Device verification failed.')); }
  }

  async function revokeDevice(deviceId: string) {
    setMessage('');
    try {
      await api(`/auth/devices/${deviceId}`, { method: 'DELETE' });
      setDeviceKeys((current) => { const next = { ...current }; delete next[deviceId]; return next; });
      setMessage('Device revoked.'); await refreshAll();
    } catch (error) { setMessage(readableError(error, 'Device revocation failed.')); }
  }

  async function refreshMarket() {
    setMessage('');
    try {
      const result = await api<{ tick_count: number }>('/market-data/refresh', { method: 'POST' });
      setMessage(`Refreshed ${result.tick_count} simulated market ticks. This feed is not live.`);
      await refreshAll();
    } catch (error) { setMessage(readableError(error, 'Market refresh failed.')); }
  }

  async function generateAdvisory() {
    setMessage('');
    try {
      await api('/advisories/generate', { method: 'POST', body: JSON.stringify({ symbol }) });
      setMessage('Advisory generated.'); await refreshAll();
    } catch (error) {
      setMessage(readableError(error, 'Advisory generation is unavailable.'));
      try { setSignals(await api<Signal[]>('/advisories')); } catch { /* Preserve existing history if refresh fails. */ }
    }
  }

  async function createPlan(event: FormEvent) {
    event.preventDefault(); setMessage('');
    try {
      if (replacingPlanId) {
        await api(`/plans/${replacingPlanId}/adjust`, { method: 'POST', body: JSON.stringify({ symbol, quoteAsset: 'USDT', availableBalance: Number(balance), allocationPct: Number(allocation) }) });
        setMessage('Replacement plan created and the previous remainder cancelled. No trade was executed.'); setReplacingPlanId('');
      } else {
        await api('/plans', { method: 'POST', body: JSON.stringify({ symbol, quoteAsset: 'USDT', availableBalance: Number(balance), allocationPct: Number(allocation) }) });
        setMessage('Plan created. No trade was executed. Each tranche requires separate authorization.');
      }
      await refreshAll();
    } catch (error) { setMessage(readableError(error, 'Plan creation failed.')); }
  }

  async function planAction(id: string, action: 'pause' | 'resume' | 'cancel') {
    if (action === 'cancel' && !window.confirm('Cancel this plan? Unexecuted tranches will not be scheduled again.')) return;
    setMessage('');
    const pastTense = { pause: 'paused', resume: 'resumed', cancel: 'cancelled' }[action];
    try { await api(`/plans/${id}/${action}`, { method: 'POST' }); setMessage(`Plan ${pastTense}.`); await refreshAll(); }
    catch (error) { setMessage(readableError(error, `Plan ${action} failed.`)); }
  }

  async function replacePlan(plan: Plan) {
    setReplacingPlanId(plan.id); setSymbol(plan.symbol); setBalance(plan.available_balance); setAllocation(plan.allocation_pct);
    document.getElementById('plan-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setMessage('Review the replacement inputs, then submit to cancel the old remainder and create the replacement plan.');
  }

  async function addWatch(symbolValue: string) {
    setMessage('');
    try { await api('/watchlist', { method: 'POST', body: JSON.stringify({ symbol: symbolValue }) }); setMessage(`${symbolValue} added to watchlist.`); await refreshAll(); }
    catch (error) { setMessage(readableError(error, 'Watchlist update failed.')); }
  }

  async function removeWatch(symbolValue: string) {
    setMessage('');
    try { await api(`/watchlist/${encodeURIComponent(symbolValue)}`, { method: 'DELETE' }); setMessage(`${symbolValue} removed from watchlist.`); await refreshAll(); }
    catch (error) { setMessage(readableError(error, 'Watchlist update failed.')); }
  }

  async function saveNote(event: FormEvent) {
    event.preventDefault(); setMessage('');
    const endpoint = editingNoteId ? `/journal/${editingNoteId}` : '/journal';
    try {
      await api(endpoint, { method: editingNoteId ? 'PUT' : 'POST', body: JSON.stringify({ title: noteTitle, body: noteBody }) });
      setNoteTitle(''); setNoteBody(''); setEditingNoteId(''); setMessage(editingNoteId ? 'Journal note updated.' : 'Journal note saved.'); await refreshAll();
    } catch (error) { setMessage(readableError(error, 'Could not save note.')); }
  }

  async function deleteNote(id: string) {
    if (!window.confirm('Delete this journal note? This cannot be undone.')) return;
    setMessage('');
    try { await api(`/journal/${id}`, { method: 'DELETE' }); setMessage('Journal note deleted.'); await refreshAll(); }
    catch (error) { setMessage(readableError(error, 'Could not delete note.')); }
  }

  async function schedulerTick() {
    setMessage('');
    try {
      const result = await api<{ authorization_windows_opened: number; executed_automatically: number }>('/scheduler/tick', { method: 'POST' });
      setMessage(`${result.authorization_windows_opened} authorization window(s) opened. Automatic executions: ${result.executed_automatically}.`); await refreshAll();
    } catch (error) { setMessage(readableError(error, 'Scheduler check failed.')); }
  }

  async function authorizeTranche(trancheId: string) {
    setMessage('');
    try {
      const deviceId = Object.keys(deviceKeys)[0];
      if (!deviceId) throw new Error('Register a browser device in Security first. Its signing key must be available in this page session.');
      const key = deviceKeys[deviceId];
      const challenge = await api<{ challenge: string; challenge_id: string }>(`/tranches/${trancheId}/authorization-challenge`, { method: 'POST', body: JSON.stringify({ deviceId }) });
      const signature = await window.crypto.subtle.sign('Ed25519', key, new TextEncoder().encode(challenge.challenge));
      const result = await api<{ symbol: string }>(`/tranches/${trancheId}/authorize`, { method: 'POST', body: JSON.stringify({ challengeId: challenge.challenge_id, deviceId, signature: toBase64Url(new Uint8Array(signature)) }) });
      setMessage(`Simulated execution recorded for ${result.symbol}. No live exchange order was sent.`); await refreshAll();
    } catch (error) { setMessage(readableError(error, 'Tranche authorization failed.')); }
  }

  async function exportCsv() {
    setMessage('');
    try {
      const response = await fetch(`${API}/trades/export.csv${tradeQuery()}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(typeof body.message === 'string' ? body.message : 'Trade export failed.');
      }
      const blob = await response.blob(); const url = URL.createObjectURL(blob); const link = document.createElement('a');
      link.href = url; link.download = 'advisora-simulated-trade-history.csv'; link.click(); URL.revokeObjectURL(url);
      setMessage('Simulated trade history exported.');
    } catch (error) { setMessage(readableError(error, 'Trade export failed.')); }
  }

  const trancheCounts = useMemo(() => plans.flatMap((plan) => plan.tranches ?? []), [plans]);
  const openWindows = trancheCounts.filter((tranche) => tranche.status === 'AUTHORIZATION_OPEN');
  const activePlans = plans.filter((plan) => plan.status === 'ACTIVE').length;

  if (!token) {
    const passwordValid = password.length >= 12;
    const passwordClass = !password ? 'password-hint muted' : passwordValid ? 'password-hint password-hint-valid' : 'password-hint password-hint-invalid';
    return <main className="auth-page"><section className="auth-card" aria-labelledby="auth-title">
      <div className="brand-lockup"><span className="brand-mark">A</span><span>ADVISORA<span className="brand-kicker">HUMAN-CONTROLLED ADVISORY</span></span></div>
      <div className="auth-intro"><span className="eyebrow">SIMULATION ENVIRONMENT</span><h1 id="auth-title">{page === 'login' ? 'A calmer way to plan.' : 'Create your account.'}</h1><p>Review market context and organize your plan. Every simulated trade still requires your explicit authorization.</p></div>
      <form onSubmit={(event) => { event.preventDefault(); void authenticate(); }}>
        <label htmlFor="auth-email">Email address</label><input id="auth-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        <label htmlFor="auth-password">Password</label><input id="auth-password" type="password" autoComplete={page === 'login' ? 'current-password' : 'new-password'} value={password} onChange={(event) => setPassword(event.target.value)} minLength={page === 'register' ? 12 : undefined} aria-describedby={page === 'register' ? 'register-password-hint' : undefined} aria-invalid={page === 'register' && password.length > 0 && !passwordValid} required />
        {page === 'register' && <p id="register-password-hint" className={passwordClass} role="status" aria-live="polite">{passwordValid ? `Meets 12-character minimum (${password.length}/12)` : `At least 12 characters required (${password.length}/12)`}</p>}
        <button className="button button-primary auth-submit" disabled={loading}>{loading ? 'Please waitâ€¦' : page === 'login' ? 'Sign in securely' : 'Create account'}</button>
      </form>
      {message && <p className="feedback" role="status">{message}</p>}
      <p className="switch-page">{page === 'login' ? 'New to ADVISORA?' : 'Already registered?'} <button onClick={() => { setPage(page === 'login' ? 'register' : 'login'); setMessage(''); }}>{page === 'login' ? 'Create an account' : 'Sign in'}</button></p>
      <p className="auth-footnote">Simulated market data Â· No live exchange connection Â· No withdrawals or transfers</p>
    </section></main>;
  }

  return <main className="app-shell">
    <header className="topbar"><a href="#overview" className="brand-lockup brand-link"><span className="brand-mark">A</span><span>ADVISORA<span className="brand-kicker">INVESTMENT COMPANION</span></span></a>
      <nav className="main-nav" aria-label="Main navigation"><a href="#market">Markets</a><a href="#advisory">Advisory</a><a href="#plans">Plans</a><a href="#activity">Activity</a><a href="#security">Security</a></nav>
      <div className="account-menu"><span className="account-email">{accountEmail}</span><button className="button button-quiet" onClick={() => void logout()}>Log out</button></div>
    </header>
    <div className="page-wrap" id="overview">
      <div className="page-heading"><div><span className="eyebrow">YOUR ADVISORY SPACE</span><h1>Good to see you.</h1><p>Review whatâ€™s happening, then decide what deserves your attention.</p></div><button className="button button-secondary" onClick={() => void refreshAll()} disabled={busy}>{busy ? 'Refreshingâ€¦' : 'â†» Refresh data'}</button></div>
      <div className="safety-banner"><span className="safety-icon">!</span><div><strong>Simulation only</strong><p>Market prices and trade execution are simulated. No live exchange, withdrawal, or transfer capability is connected.</p></div><span className="mode-pill">DEMO MODE</span></div>
      {message && <p className="feedback page-feedback" role="status" aria-live="polite">{message}</p>}
      <section className="metric-grid" aria-label="Account summary"><article className="metric-card"><span className="metric-label">Active plans</span><strong>{activePlans}</strong><span className="metric-note">of {plans.length} total plans</span></article><article className="metric-card"><span className="metric-label">Open authorization windows</span><strong>{openWindows.length}</strong><span className="metric-note">Each expires on its own schedule</span></article><article className="metric-card"><span className="metric-label">Watchlist</span><strong>{watchlist.length}</strong><span className="metric-note">Configured assets only</span></article><article className="metric-card"><span className="metric-label">Simulated trades</span><strong>{trades.length}</strong><span className="metric-note">Recorded executions in history</span></article></section>

      <section className="section-block" id="market"><div className="section-heading"><div><span className="eyebrow">VS-02 Â· MARKET CONTEXT</span><h2>Market overview</h2><p>Simulated feed status and approved eligibility state.</p></div><button className="button button-secondary" onClick={() => void refreshMarket()} disabled={busy}>Refresh simulated feed</button></div>
        <div className="asset-grid">{assets.length === 0 ? <div className="empty-state">No market assets are currently available.</div> : assets.map((asset) => <article className="asset-card" key={asset.symbol}><div className="asset-top"><div><span className="asset-symbol">{asset.symbol}</span><span className="asset-name">{asset.display_name}</span></div><span className={`status-pill ${asset.stale ? 'status-danger' : 'status-calm'}`}>{asset.stale ? 'Stale' : 'Fresh'}</span></div><div className="asset-price">{asset.price === null ? 'â€”' : `${asset.price} ${asset.symbol.split('/')[1] ?? ''}`}</div><div className="asset-meta"><span>{asset.data_classification.replaceAll('_', ' ')}</span><span>Latency {asset.ticker_latency_ms === null ? 'â€”' : `${asset.ticker_latency_ms} ms`}</span></div><div className="asset-policy"><span className={`status-pill ${asset.eligibility === 'PENDING_POLICY' ? 'status-warn' : asset.buy_locked ? 'status-danger' : 'status-calm'}`}>{asset.buy_locked ? 'Action locked' : asset.eligibility.replaceAll('_', ' ')}</span><p>{asset.eligibility_note}</p></div><button className="text-button" onClick={() => void addWatch(asset.symbol)} disabled={watchlist.some((item) => item.symbol === asset.symbol)}> {watchlist.some((item) => item.symbol === asset.symbol) ? 'âœ“ In watchlist' : '+ Add to watchlist'}</button></article>)}</div>
      </section>

      <section className="section-block" id="advisory"><div className="section-heading"><div><span className="eyebrow">VS-03 Â· SAFELY DISABLED</span><h2>Advisory signals</h2><p>Signal generation remains locked until required financial policy is approved.</p></div><span className="status-pill status-warn">PENDING POLICY</span></div><div className="advisory-panel"><div><h3>No recommendation will be guessed.</h3><p>Target yield, volatility rules, and asset eligibility criteria still need approved values. You can request a check; the service will explain why it stays blocked.</p></div><button className="button button-secondary" onClick={() => void generateAdvisory()}>Check advisory status</button></div>{accuracy && <div className="accuracy-summary"><span className="metric-label">Historical accuracy Â· rolling 30 days</span><strong>{accuracy.display_value}</strong><span className="metric-note">{accuracy.sample_size} evaluated signals Â· {accuracy.history_note}</span></div>}{signals.length > 0 && <div className="table-wrap"><table><thead><tr><th>Asset</th><th>State</th><th>Outcome</th><th>Generated</th><th>Expires</th></tr></thead><tbody>{signals.map((signal) => <tr key={signal.id}><td>{signal.symbol}</td><td>{signal.state}</td><td>{signal.outcome}</td><td>{new Date(signal.generated_at).toLocaleString()}</td><td>{new Date(signal.expires_at).toLocaleString()}</td></tr>)}</tbody></table></div>}</section>

      <section className="section-block" id="plans"><div className="section-heading"><div><span className="eyebrow">VS-04 Â· VS-05</span><h2>Investment plans</h2><p>Plan schedules never place orders. Every tranche needs a separate, time-limited signature.</p></div><button className="button button-secondary" onClick={() => void schedulerTick()} disabled={busy}>Check schedule</button></div>
        <div className="content-grid"><article className="surface-card" id="plan-form"><h3>{replacingPlanId ? 'Review replacement plan' : 'Create a plan'}</h3><p className="card-intro">Uses a simulated balance for the coursework demo. Allocation is capped at 5%.</p><form onSubmit={(event) => void createPlan(event)}><label htmlFor="plan-asset">Asset</label><select id="plan-asset" value={symbol} onChange={(event) => setSymbol(event.target.value)}>{assets.map((asset) => <option key={asset.symbol} value={asset.symbol}>{asset.symbol}</option>)}</select><label htmlFor="plan-balance">Simulated available USDT balance</label><input id="plan-balance" type="number" min="0.01" step="0.01" value={balance} onChange={(event) => setBalance(event.target.value)} required/><label htmlFor="plan-allocation">Allocation percentage (maximum 5%)</label><input id="plan-allocation" type="number" min="0.01" max="5" step="0.01" value={allocation} onChange={(event) => setAllocation(event.target.value)} required/><p className="field-hint">Three equal tranches, scheduled 24 hours apart. No order is placed when you create a plan. Because advisory generation is pending policy, execution stays blocked until a valid signal can be linked.</p><div className="form-actions"><button className="button button-primary" disabled={assets.length === 0}>{replacingPlanId ? 'Create replacement' : 'Create three-tranche plan'}</button>{replacingPlanId && <button className="button button-quiet" type="button" onClick={() => setReplacingPlanId('')}>Cancel replacement</button>}</div></form></article>
          <div className="plan-list">{plans.length === 0 ? <div className="empty-state">No plans yet. A plan can be created without authorizing a trade.</div> : plans.map((plan) => <article className="surface-card plan-card" key={plan.id}><div className="plan-top"><div><span className="eyebrow">{plan.symbol} Â· {plan.allocation_pct}% ALLOCATION</span><h3>{plan.total_allocation} {plan.quote_asset}</h3><p>{plan.status} Â· {plan.tranche_amount} {plan.quote_asset} per tranche</p></div><span className={`status-pill ${plan.status === 'ACTIVE' ? 'status-calm' : 'status-muted'}`}>{plan.status}</span></div><div className="tranche-list">{plan.tranches?.map((tranche) => <div className="tranche-item" key={tranche.id}><div><strong>Tranche {tranche.tranche_number}</strong><span>{tranche.amount} {plan.quote_asset} Â· {new Date(tranche.scheduled_at).toLocaleString()}</span></div><span className={`status-pill ${tranche.status === 'AUTHORIZATION_OPEN' ? 'status-warn' : tranche.status === 'EXECUTED' ? 'status-calm' : 'status-muted'}`}>{tranche.status.replaceAll('_', ' ')}</span>{tranche.status === 'AUTHORIZATION_OPEN' && (plan.signal_id ? <button className="button button-primary button-small" onClick={() => void authorizeTranche(tranche.id)}>Sign &amp; simulate</button> : <span className="status-pill status-warn" title="A valid active advisory signal is required before execution can proceed.">Valid signal required</span>)}</div>)}</div><div className="plan-actions">{plan.status === 'ACTIVE' && <button className="button button-quiet" onClick={() => void planAction(plan.id, 'pause')}>Pause</button>}{plan.status === 'PAUSED' && <button className="button button-quiet" onClick={() => void planAction(plan.id, 'resume')}>Resume</button>}{!['CANCELLED', 'COMPLETED'].includes(plan.status) && <button className="button button-quiet" onClick={() => void replacePlan(plan)}>Replace remainder</button>}{!['CANCELLED', 'COMPLETED'].includes(plan.status) && <button className="button button-danger-quiet" onClick={() => void planAction(plan.id, 'cancel')}>Cancel plan</button>}</div></article>)}</div></div>
      </section>

      <section className="section-block two-column" id="activity"><article className="surface-card"><div className="section-heading compact"><div><span className="eyebrow">VS-08</span><h2>Watchlist</h2><p>Configured assets and available market context.</p></div></div>{watchlist.length === 0 ? <p className="empty-copy">Your watchlist is empty. Add an asset from Market overview.</p> : <div className="list-stack">{watchlist.map((asset) => <div className="list-row" key={asset.symbol}><div><strong>{asset.symbol}</strong><span>{asset.price ?? 'â€”'} {asset.symbol.split('/')[1] ?? ''} Â· 24h {asset.change_24h_pct ?? 'N/A'}%</span></div><button className="text-button text-danger" onClick={() => void removeWatch(asset.symbol)}>Remove</button></div>)}</div>}</article>
        <article className="surface-card"><div className="section-heading compact"><div><span className="eyebrow">VS-07</span><h2>Notifications</h2><p>In-app outbox only. External delivery is not connected.</p></div></div>{notifications.length === 0 ? <p className="empty-copy">No notifications yet.</p> : <div className="list-stack">{notifications.slice(0, 8).map((notification, index) => <div className="list-row" key={String(notification.id ?? index)}><div><strong>{String(notification.event_type).replaceAll('_', ' ')}</strong><span>{String(notification.status)} Â· {notification.created_at ? new Date(String(notification.created_at)).toLocaleString() : 'Time unavailable'}</span></div></div>)}</div>}</article>
      </section>

      <section className="section-block" id="trades"><div className="section-heading"><div><span className="eyebrow">VS-06 Â· SIMULATED ONLY</span><h2>Trade history</h2><p>Historical simulated executions. This is not a live exchange ledger.</p></div><button className="button button-secondary" onClick={() => void exportCsv()}>Download CSV</button></div><article className="surface-card"><div className="date-filter"><label>From<input type="date" value={tradeFrom} onChange={(event) => setTradeFrom(event.target.value)} /></label><label>To<input type="date" value={tradeTo} onChange={(event) => setTradeTo(event.target.value)} /></label><button className="button button-quiet" onClick={() => void refreshAll()}>Apply dates</button></div>{trades.length === 0 ? <p className="empty-copy">No simulated executions match this period.</p> : <div className="table-wrap"><table><thead><tr><th>Asset</th><th>Quantity</th><th>Price</th><th>Quote amount</th><th>Executed</th><th>Mode</th></tr></thead><tbody>{trades.map((trade, index) => <tr key={String(trade.id ?? index)}><td>{trade.symbol}</td><td>{trade.quantity}</td><td>{trade.price}</td><td>{trade.quote_amount}</td><td>{trade.executed_at ? new Date(trade.executed_at).toLocaleString() : 'â€”'}</td><td><span className="status-pill status-muted">{trade.execution_mode}</span></td></tr>)}</tbody></table></div>}</article></section>

      <section className="section-block two-column"><article className="surface-card"><div className="section-heading compact"><div><span className="eyebrow">VS-08</span><h2>Decision journal</h2><p>Private notes attached to your account.</p></div></div><form onSubmit={(event) => void saveNote(event)}><label htmlFor="journal-title">Title</label><input id="journal-title" maxLength={160} value={noteTitle} onChange={(event) => setNoteTitle(event.target.value)} required/><label htmlFor="journal-body">Note</label><textarea id="journal-body" maxLength={10000} value={noteBody} onChange={(event) => setNoteBody(event.target.value)} required/><div className="form-actions"><button className="button button-primary">{editingNoteId ? 'Update note' : 'Save note'}</button>{editingNoteId && <button className="button button-quiet" type="button" onClick={() => { setEditingNoteId(''); setNoteTitle(''); setNoteBody(''); }}>Cancel edit</button>}</div></form>{notes.length === 0 ? <p className="empty-copy">Your saved notes will appear here.</p> : <div className="list-stack">{notes.map((note) => <div className="note-card" key={note.id}><div className="list-row"><strong>{note.title}</strong><span>{new Date(note.updated_at).toLocaleString()}</span></div><p>{note.body}</p><div className="form-actions"><button className="text-button" onClick={() => { setEditingNoteId(note.id); setNoteTitle(note.title); setNoteBody(note.body); }}>Edit</button><button className="text-button text-danger" onClick={() => void deleteNote(note.id)}>Delete</button></div></div>)}</div>}</article>
        <article className="surface-card" id="security"><div className="section-heading compact"><div><span className="eyebrow">VS-01 Â· BROWSER KEY</span><h2>Security &amp; devices</h2><p>Ed25519 proof of possession. This does not invoke OS biometrics.</p></div></div><form onSubmit={(event) => void registerBrowserDevice(event)}><label htmlFor="device-name">Device label</label><input id="device-name" value={deviceName} maxLength={100} onChange={(event) => setDeviceName(event.target.value)} required/><button className="button button-secondary">Register browser device</button></form><p className="field-hint">The private key is kept in page memory and is lost when this page is reloaded. Register again to authorize from a new session.</p>{devices.length === 0 ? <p className="empty-copy">No active registered devices.</p> : <div className="list-stack">{devices.map((device) => <div className="device-card" key={device.id}><div className="list-row"><div><strong>{device.device_name}</strong><span>Fingerprint {device.key_fingerprint.slice(0, 16)}â€¦ Â· {new Date(device.registered_at).toLocaleString()}</span></div><span className={deviceKeys[device.id] ? 'key-state key-ready' : 'key-state'}>{deviceKeys[device.id] ? 'Key ready' : 'Key unavailable'}</span></div><div className="form-actions">{deviceKeys[device.id] && <button className="text-button" onClick={() => void verifyDeviceProof(device.id)}>Verify proof</button>}<button className="text-button text-danger" onClick={() => void revokeDevice(device.id)}>Revoke device</button></div></div>)}</div>}</article></section>
      <footer className="page-footer"><span>ADVISORA Â· Human-controlled digital-asset advisory</span><span>No live exchange, withdrawal, or transfer integration</span></footer>
    </div>
  </main>;
}

export default App;
