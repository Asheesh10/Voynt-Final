import React, { createContext, useContext, useState, useEffect } from 'react';

const VoyntContext = createContext(null);

const SS_KEYS = {
    profile: 'voynt_profile',
    results: 'voynt_last_results',
    sessionId: 'voynt_session_id',
    firstName: 'voynt_firstName',
    lastName: 'voynt_lastName',
};

function loadFromStorage() {
    try {
        return {
            profile: JSON.parse(sessionStorage.getItem(SS_KEYS.profile) || 'null'),
            results: JSON.parse(sessionStorage.getItem(SS_KEYS.results) || 'null'),
            sessionId: sessionStorage.getItem(SS_KEYS.sessionId) || null,
            user: {
                firstName: sessionStorage.getItem(SS_KEYS.firstName) || '',
                lastName: sessionStorage.getItem(SS_KEYS.lastName) || '',
            },
        };
    } catch {
        return { profile: null, results: null, sessionId: null, user: { firstName: '', lastName: '' } };
    }
}

export function VoyntProvider({ children }) {
    // sessionId is initialized directly from sessionStorage so it is available
    // on the very first render, before any effects run.
    const [state, setState] = useState(() => ({
        ...loadFromStorage(),
        sessionId: sessionStorage.getItem(SS_KEYS.sessionId) || null,
    }));

    // Persist to sessionStorage whenever state changes
    useEffect(() => {
        if (state.profile) sessionStorage.setItem(SS_KEYS.profile, JSON.stringify(state.profile));
        if (state.results) sessionStorage.setItem(SS_KEYS.results, JSON.stringify(state.results));
        if (state.sessionId) sessionStorage.setItem(SS_KEYS.sessionId, state.sessionId);
        if (state.user?.firstName) sessionStorage.setItem(SS_KEYS.firstName, state.user.firstName);
        if (state.user?.lastName) sessionStorage.setItem(SS_KEYS.lastName, state.user.lastName);
    }, [state]);

    const setProfile = (profile) => setState((s) => ({ ...s, profile }));
    const setResults = (results) => setState((s) => ({ ...s, results }));
    const setSessionId = (sessionId) => setState((s) => ({ ...s, sessionId }));
    const setUser = (user) => setState((s) => ({ ...s, user: { ...s.user, ...user } }));

    return (
        <VoyntContext.Provider value={{ ...state, setProfile, setResults, setSessionId, setUser }}>
            {children}
        </VoyntContext.Provider>
    );
}

export function useVoynt() {
    const ctx = useContext(VoyntContext);
    if (!ctx) throw new Error('useVoynt must be used within VoyntProvider');
    return ctx;
}
