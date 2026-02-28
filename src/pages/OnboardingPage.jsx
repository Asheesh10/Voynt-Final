import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useVoynt } from '../context/VoyntContext';
import { analyzeProfile } from '../lib/api';
import { supabase } from '../lib/supabase';
import '../styles/onboarding.css';

const SPEND_CATS = ['✈ Travel', '🛒 Groceries', '🍽 Dining', '⛽ Fuel', '📦 Online Shopping', '🎬 Entertainment', '🏠 Utilities'];
const REWARD_PREFS = ['💰 Cashback', '✈ Miles & Points', '🎁 Gift Cards', '🏦 Statement Credit'];
const CARDS = [
    'HDFC Regalia Gold', 'HDFC Millennia', 'HDFC Infinia',
    'Axis Atlas', 'Axis Vistara', 'Axis Magnus',
    'Amex MRCC', 'Amex Platinum Travel',
    'SBI SimplyCLICK', 'SBI Air India',
    'ICICI Amazon Pay', 'ICICI Coral',
    'Citi Prestige', 'RBL Icon',
];
const RISK_LEVELS = ['Conservative', 'Moderate', 'Aggressive'];
const CREDIT_SCORES = ['Below 650', '650–700', '700–750', '750–800', '800+'];

function formatINR(val) {
    val = parseInt(val);
    if (isNaN(val)) return '₹0';
    if (val >= 100000) return '₹' + (val / 100000).toFixed(val % 100000 === 0 ? 0 : 1) + 'L';
    return '₹' + val.toLocaleString('en-IN');
}

export default function OnboardingPage() {
    const navigate = useNavigate();
    const { setProfile, setSessionId, setUser } = useVoynt();
    const [checking, setChecking] = useState(true);
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [form, setForm] = useState({
        firstName: '', lastName: '', age: '', occupation: '', city: '',
        income: 100000, spend: 30000, travel: 100000,
        selectedCats: [], rewardPref: '',
        selectedCards: [], noneCards: false,
        risk: 'Moderate', creditScore: '750–800',
    });
    const upd = (k, v) => setForm(f => ({ ...f, [k]: v }));

    // On mount: check if this user already completed onboarding
    useEffect(() => {
        async function checkExistingProfile() {
            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) { setChecking(false); return; }
                const { data } = await supabase
                    .from('user_profiles')
                    .select('profile')
                    .eq('user_id', user.id)
                    .maybeSingle();
                if (data?.profile) {
                    setProfile(data.profile);
                    sessionStorage.setItem('voynt_profile', JSON.stringify(data.profile));
                    navigate('/dashboard', { replace: true });
                    return;
                }
            } catch { /* silently fall through to show form */ }
            setChecking(false);
        }
        checkExistingProfile();
    }, []);

    const PROGRESS = { 1: 25, 2: 50, 3: 75, 4: 100 };

    function toggleCat(cat) { upd('selectedCats', form.selectedCats.includes(cat) ? form.selectedCats.filter(c => c !== cat) : [...form.selectedCats, cat]); }
    function toggleCard(card) {
        upd('noneCards', false);
        upd('selectedCards', form.selectedCards.includes(card) ? form.selectedCards.filter(c => c !== card) : [...form.selectedCards, card]);
    }
    function selectNoneCards() { upd('selectedCards', []); upd('noneCards', !form.noneCards); }

    function validateStep() {
        if (step === 1) {
            if (!form.firstName.trim()) { setError('First name is required.'); return false; }
        }
        setError('');
        return true;
    }

    function next() { if (!validateStep()) return; setStep(s => Math.min(s + 1, 4)); }
    function back() { setStep(s => Math.max(s - 1, 1)); setError(''); }

    function updateSlider(key, val) {
        upd(key, Number(val));
        const el = document.getElementById(key + 'Slider');
        if (el) {
            const pct = (val - el.min) / (el.max - el.min) * 100;
            el.style.background = `linear-gradient(90deg, rgba(98,159,134,.6) ${pct}%, rgba(255,255,255,.06) ${pct}%)`;
        }
    }

    async function handleFinish() {
        setLoading(true); setError('');

        // Persist name to sessionStorage for dashboard greeting
        sessionStorage.setItem('voynt_firstName', form.firstName);
        sessionStorage.setItem('voynt_lastName', form.lastName);

        const riskMap = { Conservative: 'low', Moderate: 'medium', Aggressive: 'high' };
        const payload = {
            goal_text: form.city ? `${form.city} trip` : 'Reward goal',
            goal_amount_inr: form.travel,
            timeline_months: 4,
            monthly_spend_inr: form.spend,
            cards_owned: form.noneCards ? [] : form.selectedCards,
            risk_level: riskMap[form.risk] || 'medium',
            credit_score_range: form.creditScore.replace('–', '-'),
            spend_breakdown: (() => {
                const raw = {
                    groceries: form.spend * 0.20,
                    dining: form.spend * 0.12,
                    travel: form.spend * 0.25,
                    fuel: form.spend * 0.08,
                    online: form.selectedCats.some(c => c.includes('Online'))
                        ? form.spend * 0.20
                        : form.spend * 0.10,
                    entertainment: form.spend * 0.05,
                    utilities: form.spend * 0.08,
                    other: form.spend * 0.07,
                };
                const total = Object.values(raw).reduce((a, b) => a + b, 0);
                const normalized = {};
                Object.entries(raw).forEach(([k, v]) => {
                    normalized[k] = Math.round((v / total) * form.spend);
                });
                return normalized;
            })(),
        };

        try {
            const res = await analyzeProfile(payload);
            const sid = res.session_id || res.sessionId;

            // Synchronous write so it survives navigation regardless of batching.
            sessionStorage.setItem('voynt_session_id', sid);
            sessionStorage.setItem('voynt_goal_text', payload.goal_text);
            sessionStorage.setItem('voynt_profile', JSON.stringify(payload));

            // Upsert profile to Supabase user_profiles
            try {
                const { data: { user: sbUser } } = await supabase.auth.getUser();
                if (sbUser) {
                    await supabase.from('user_profiles').upsert({
                        user_id: sbUser.id,
                        profile: payload,
                        updated_at: new Date().toISOString(),
                    }, { onConflict: 'user_id' });
                }
            } catch { /* non-fatal — continue to dashboard */ }

            setProfile(payload);
            setSessionId(sid);
            setUser({ firstName: form.firstName, lastName: form.lastName });
            navigate('/dashboard');
        } catch (e) {
            setError(e.message || 'Something went wrong. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    if (checking) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#090708' }}>
                <div className="loading-spinner" />
            </div>
        );
    }

    return (
        <div style={{ background: 'var(--black)', color: 'var(--white)', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 20px 40px' }}>
            <div className="bg-glow" /><div className="bg-grid" /><div className="bg-scan" />
            <Link className="ob-logo" to="/">Voy<span className="ln">n</span>t</Link>
            <div className="step-tracker">
                {[1, 2, 3, 4].map(n => <div key={n} className={`st-dot ${step === n ? 'active' : step > n ? 'done' : ''}`} />)}
            </div>
            <div className="ob-wrap" style={{ position: 'relative', zIndex: 10 }}>
                <div className="ob-progress"><div className="ob-progress-fill" style={{ width: PROGRESS[step] + '%' }} /></div>

                {/* STEP 1 — Profile */}
                {step === 1 && (
                    <div className="ob-step active">
                        <div className="ob-eyebrow">Step 1 of 4 &nbsp;→&nbsp; Your Profile</div>
                        <h1 className="ob-title">Tell us about <span className="accent">yourself.</span></h1>
                        <p className="ob-subtitle">Basic info to personalize your strategy.</p>
                        <div className="ob-card">
                            {error && <div style={{ fontSize: 11, color: 'rgba(220,80,80,.7)', marginBottom: 14 }}>{error}</div>}
                            <div className="field-row">
                                <div className="field-group"><input className="form-input" placeholder="First name *" value={form.firstName} onChange={e => upd('firstName', e.target.value)} /><label className="floating-label">First name *</label></div>
                                <div className="field-group"><input className="form-input" placeholder="Last name" value={form.lastName} onChange={e => upd('lastName', e.target.value)} /><label className="floating-label">Last name</label></div>
                            </div>
                            <div className="field-row">
                                <div className="field-group"><input className="form-input" type="number" placeholder="Age" value={form.age} onChange={e => upd('age', e.target.value)} /><label className="floating-label">Age</label></div>
                                <div className="field-group"><SelectField label="Occupation" value={form.occupation} onChange={v => upd('occupation', v)} options={['Salaried', 'Self-employed', 'Freelancer', 'Student', 'Other']} /></div>
                            </div>
                            <div className="field-group"><SelectField label="City" value={form.city} onChange={v => upd('city', v)} options={['Mumbai', 'Delhi', 'Bengaluru', 'Hyderabad', 'Chennai', 'Pune', 'Kolkata', 'Other']} /></div>
                            <div className="btn-row"><button className="btn-hero-ob" onClick={next}>Continue <span className="arrow">→</span></button></div>
                        </div>
                    </div>
                )}

                {/* STEP 2 — Finances */}
                {step === 2 && (
                    <div className="ob-step active">
                        <div className="ob-eyebrow">Step 2 of 4 &nbsp;→&nbsp; Finances & Spend</div>
                        <h1 className="ob-title">Your <span className="accent">spending</span> profile.</h1>
                        <p className="ob-subtitle">Helps us estimate reward potential accurately.</p>
                        <div className="ob-card">
                            {[
                                { key: 'income', label: 'Monthly Income', min: 10000, max: 1000000, step: 5000 },
                                { key: 'spend', label: 'Monthly Spend (card)', min: 5000, max: 500000, step: 2500 },
                                { key: 'travel', label: 'Annual Travel Budget', min: 0, max: 2000000, step: 10000 },
                            ].map(s => (
                                <div className="slider-wrap" key={s.key}>
                                    <div className="slider-meta"><span className="slider-label-text">{s.label}</span><span className="val">{formatINR(form[s.key])}</span></div>
                                    <input id={s.key + 'Slider'} type="range" min={s.min} max={s.max} step={s.step} value={form[s.key]} onChange={e => updateSlider(s.key, e.target.value)} style={{ background: `linear-gradient(90deg, rgba(98,159,134,.6) ${((form[s.key] - s.min) / (s.max - s.min)) * 100}%, rgba(255,255,255,.06) ${((form[s.key] - s.min) / (s.max - s.min)) * 100}%)` }} />
                                </div>
                            ))}
                            <div className="btn-row"><button className="btn-back-ob" onClick={back}>← Back</button><button className="btn-hero-ob" onClick={next}>Continue <span className="arrow">→</span></button></div>
                        </div>
                    </div>
                )}

                {/* STEP 3 — Categories & Reward Prefs */}
                {step === 3 && (
                    <div className="ob-step active">
                        <div className="ob-eyebrow">Step 3 of 4 &nbsp;→&nbsp; Spend & Rewards</div>
                        <h1 className="ob-title">How do you <span className="accent">spend?</span></h1>
                        <p className="ob-subtitle">Select your top spend categories and reward preference.</p>
                        <div className="ob-card">
                            <div className="section-label">Spend categories <span style={{ color: 'rgba(151,198,177,.3)' }}>(select all that apply)</span></div>
                            <div className="chip-grid">
                                {SPEND_CATS.map(c => <button key={c} className={`chip ${form.selectedCats.includes(c) ? 'selected' : ''}`} onClick={() => toggleCat(c)}>{c}</button>)}
                            </div>
                            <div className="section-divider" />
                            <div className="section-label">Reward preference</div>
                            <div className="chip-grid">
                                {REWARD_PREFS.map(r => <button key={r} className={`chip ${form.rewardPref === r ? 'selected' : ''}`} onClick={() => upd('rewardPref', r)}>{r}</button>)}
                            </div>
                            <div className="btn-row"><button className="btn-back-ob" onClick={back}>← Back</button><button className="btn-hero-ob" onClick={next}>Continue <span className="arrow">→</span></button></div>
                        </div>
                    </div>
                )}

                {/* STEP 4 — Cards + Risk + Credit */}
                {step === 4 && (
                    <div className="ob-step active">
                        <div className="ob-eyebrow">Step 4 of 4 &nbsp;→&nbsp; Your Stack</div>
                        <h1 className="ob-title">Cards & <span className="accent">risk level.</span></h1>
                        <p className="ob-subtitle">Helps us know what you already have and how to stretch.</p>
                        <div className="ob-card">
                            <div className="section-label">Cards you own</div>
                            <div className="chip-grid">
                                {CARDS.map(c => <button key={c} className={`chip ${form.selectedCards.includes(c) ? 'selected' : ''}`} onClick={() => toggleCard(c)}>{c}</button>)}
                                <button className={`chip none-chip ${form.noneCards ? 'selected' : ''}`} onClick={selectNoneCards}>None yet</button>
                            </div>
                            <div className="section-divider" />
                            <div className="section-label">Risk tolerance</div>
                            <div className="chip-grid">
                                {RISK_LEVELS.map(r => <button key={r} className={`chip ${form.risk === r ? 'selected' : ''}`} onClick={() => upd('risk', r)}>{r}</button>)}
                            </div>
                            <div className="section-divider" />
                            <div className="section-label">Credit score range</div>
                            <div className="chip-grid">
                                {CREDIT_SCORES.map(s => <button key={s} className={`chip ${form.creditScore === s ? 'selected' : ''}`} onClick={() => upd('creditScore', s)}>{s}</button>)}
                            </div>
                            {error && <div style={{ fontSize: 11, color: 'rgba(220,80,80,.7)', margin: '14px 0 0' }}>{error}</div>}
                            <div className="btn-row">
                                <button className="btn-back-ob" onClick={back}>← Back</button>
                                <button className="btn-hero-ob" onClick={handleFinish} disabled={loading}>{loading ? 'Analysing…' : <>Launch My Strategy <span className="arrow">→</span></>}</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function SelectField({ label, value, onChange, options }) {
    return (
        <div className="field-group" style={{ position: 'relative' }}>
            <select className="form-input" value={value} onChange={e => { onChange(e.target.value); }} style={{ paddingTop: value ? 20 : 14, paddingBottom: value ? 8 : 14 }}>
                <option value=""></option>
                {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <label className="floating-label" style={value ? { top: 6, fontSize: 9, color: 'var(--beauty)', letterSpacing: '1.5px' } : {}}>{label}</label>
        </div>
    );
}
