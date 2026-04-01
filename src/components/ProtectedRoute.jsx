// src/components/ProtectedRoute.jsx
import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { Loader } from 'lucide-react';

export default function ProtectedRoute({ allowedRoles }) {
  const [loading, setLoading] = useState(true);
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const verifyRole = async (session) => {
      if (!session) {
        if (isMounted) { setIsAuthorized(false); setLoading(false); }
        return;
      }

      // If no specific roles required, just need to be logged in
      if (!allowedRoles || allowedRoles.length === 0) {
        if (isMounted) { setIsAuthorized(true); setLoading(false); }
        return;
      }

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (isMounted) {
          setIsAuthorized(profile && allowedRoles.includes(profile.role));
          setLoading(false);
        }
      } catch (err) {
        console.error('Auth verification failed:', err);
        if (isMounted) { setIsAuthorized(false); setLoading(false); }
      }
    };

    // 1. Check current session first (fast path)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        verifyRole(session);
      }
      // If no session yet, onAuthStateChange below will handle it
    });

    // 2. Listen for auth state changes (handles reload + token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        verifyRole(session);
      }
    );

    // Fallback timeout: if neither fires in 3s, stop loading
    const timeout = setTimeout(() => {
      if (isMounted && loading) {
        setLoading(false);
      }
    }, 3000);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      clearTimeout(timeout);
    };
  }, [allowedRoles]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <Loader className="w-8 h-8 text-amber-500 animate-spin" />
          <p className="text-zinc-500 font-medium">Verifying access...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}
