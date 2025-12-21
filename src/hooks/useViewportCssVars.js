import { useLayoutEffect, useRef } from 'react';

// Sync CSS variables for safe area and dynamic viewport height across devices
const useViewportCssVars = () => {
    const rafRef = useRef(null);
    const burstTimersRef = useRef([]);

    useLayoutEffect(() => {
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
                const keyboardOpen = window.innerHeight - vv.height > 120;
                if (!keyboardOpen) {
                    const possibleInset = window.innerHeight - (vv.height + vv.offsetTop);
                    bottomInset = Math.max(0, Math.round(possibleInset));
                    bottomInset = Math.min(40, bottomInset);
                }
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

        const scheduleBurstUpdate = () => {
            burstTimersRef.current.forEach((id) => clearTimeout(id));
            burstTimersRef.current = [];
            [0, 50, 150, 300].forEach((delay) => {
                const id = setTimeout(() => {
                    updateVars();
                }, delay);
                burstTimersRef.current.push(id);
            });
        };

        updateVars();

        const vv = typeof window !== 'undefined' ? window.visualViewport : null;
        const handleVisualViewportResize = () => {
            scheduleUpdate();
            scheduleBurstUpdate();
        };

        vv?.addEventListener('resize', handleVisualViewportResize);
        vv?.addEventListener('scroll', scheduleUpdate);
        window.addEventListener('resize', scheduleUpdate);
        window.addEventListener('orientationchange', scheduleUpdate);

        const handleFocusIn = (event) => {
            const target = event.target;
            if (!(target instanceof HTMLElement)) return;
            if (!target.matches('input, textarea, select, [contenteditable="true"]')) return;

            const container = target.closest('.modal-body');
            if (!container) return;

            // Allow viewport resize to settle before scrolling
            scheduleBurstUpdate();
            setTimeout(() => {
                target.scrollIntoView({ block: 'center', behavior: 'smooth' });
            }, 50);
        };

        document.addEventListener('focusin', handleFocusIn, true);

        return () => {
            vv?.removeEventListener('resize', handleVisualViewportResize);
            vv?.removeEventListener('scroll', scheduleUpdate);
            window.removeEventListener('resize', scheduleUpdate);
            window.removeEventListener('orientationchange', scheduleUpdate);
            document.removeEventListener('focusin', handleFocusIn, true);
            if (rafRef.current) {
                cancelAnimationFrame(rafRef.current);
                rafRef.current = null;
            }
            burstTimersRef.current.forEach((id) => clearTimeout(id));
            burstTimersRef.current = [];
        };
    }, []);
};

export default useViewportCssVars;
