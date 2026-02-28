import React, { useEffect, useRef } from 'react';

export default function Cursor() {
    const dotRef = useRef(null);
    const ringRef = useRef(null);
    const pos = useRef({ mx: -100, my: -100, rx: -100, ry: -100 });
    const rafRef = useRef(null);

    useEffect(() => {
        const dot = dotRef.current;
        const ring = ringRef.current;

        function onMouseMove(e) {
            pos.current.mx = e.clientX;
            pos.current.my = e.clientY;
            dot.style.left = e.clientX + 'px';
            dot.style.top = e.clientY + 'px';
        }
        function onMouseLeave() {
            dot.style.opacity = '0';
            ring.style.opacity = '0';
        }
        function onMouseEnter() {
            dot.style.opacity = '1';
            ring.style.opacity = '1';
        }

        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseleave', onMouseLeave);
        document.addEventListener('mouseenter', onMouseEnter);

        function lerpRing() {
            const p = pos.current;
            p.rx += (p.mx - p.rx) * 0.1;
            p.ry += (p.my - p.ry) * 0.1;
            ring.style.left = p.rx + 'px';
            ring.style.top = p.ry + 'px';
            rafRef.current = requestAnimationFrame(lerpRing);
        }
        rafRef.current = requestAnimationFrame(lerpRing);

        return () => {
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseleave', onMouseLeave);
            document.removeEventListener('mouseenter', onMouseEnter);
            cancelAnimationFrame(rafRef.current);
        };
    }, []);

    return (
        <>
            <div id="dot" ref={dotRef} />
            <div id="ring" ref={ringRef} />
        </>
    );
}
