import { useEffect, useRef } from 'react';

// Sync CSS variables for safe area and dynamic viewport height across devices
const useViewportCssVars = () => {
    const rafRef = useRef(null);

    useEffect(() => {
        const updateVars = () => {
            const root = document.documentElement;
            const vv = typeof window !== 'undefined' ? window.visualViewport : null;

            // Dynamic viewport height (accounts for browser bars and IME)
            const vh = vv?.height || window.innerHeight;
            if (vh) {
                root.style.setProperty('--app-viewport-height', `${vh}px`);
                root.style.setProperty('--app-viewport-unit', `${vh / 100}px`);
            }

            // Compute bottom inset for gesture nav / safe area
            let bottomInset = 0;
            if (vv) {
                const possibleInset = window.innerHeight - (vv.height + vv.offsetTop);
                bottomInset = Math.max(0, Math.round(possibleInset));
            }
            root.style.setProperty('--app-safe-area-bottom', `${bottomInset}px`);
        };

        const scheduleUpdate = () => {
            if (rafRef.current) return;
            rafRef.current = requestAnimationFrame(() => {
                rafRef.current = null;
                updateVars();
            });
        };

        updateVars();

        const vv = typeof window !== 'undefined' ? window.visualViewport : null;
        vv?.addEventListener('resize', scheduleUpdate);
        vv?.addEventListener('scroll', scheduleUpdate);
        window.addEventListener('resize', scheduleUpdate);
        window.addEventListener('orientationchange', scheduleUpdate);

        return () => {
            vv?.removeEventListener('resize', scheduleUpdate);
            vv?.removeEventListener('scroll', scheduleUpdate);
            window.removeEventListener('resize', scheduleUpdate);
            window.removeEventListener('orientationchange', scheduleUpdate);
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
        };
    }, []);
};

export default useViewportCssVars;
