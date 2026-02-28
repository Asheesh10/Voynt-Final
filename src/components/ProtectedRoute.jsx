import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function ProtectedRoute({ children }) {
    const [checking, setChecking] = useState(true);
    const [authed, setAuthed] = useState(false);

    useEffect(() => {
        supabase.auth.getSession().then(({ data }) => {
            setAuthed(!!data.session);
            setChecking(false);
        });
    }, []);

    if (checking) {
        return (
            <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#090708' }}>
                <div className="loading-spinner" />
            </div>
        );
    }

    return authed ? children : <Navigate to="/auth" replace />;
}
