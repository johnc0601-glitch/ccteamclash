'use client';

import {useEffect, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import styles from './StatsHeaderInfo.module.css';

type StatsHeaderInfoProps = {
  label: string;
  text: string;
};

type PopupPosition = {
  top: number;
  left: number;
};

export function StatsHeaderInfo({label, text}: StatsHeaderInfoProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState<PopupPosition>({top: 0, left: 0});
  const rootRef = useRef<HTMLSpanElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popupRef = useRef<HTMLSpanElement>(null);

  function updatePosition() {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const popupWidth = 220;
    const viewportPadding = 12;
    const left = Math.max(
      viewportPadding,
      Math.min(window.innerWidth - popupWidth - viewportPadding, rect.right - popupWidth),
    );

    setPosition({top: rect.bottom + 8, left});
  }

  useEffect(() => {
    if (!open) return;

    updatePosition();

    function closeOnOutsidePointer(event: PointerEvent) {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || popupRef.current?.contains(target)) return;
      setOpen(false);
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }

    document.addEventListener('pointerdown', closeOnOutsidePointer);
    document.addEventListener('keydown', closeOnEscape);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      document.removeEventListener('pointerdown', closeOnOutsidePointer);
      document.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open]);

  return (
    <>
      <span ref={rootRef} className={styles.root} data-open={open ? 'true' : 'false'}>
        <button
          ref={buttonRef}
          type="button"
          className={styles.button}
          aria-label={`About ${label}`}
          aria-expanded={open}
          onClick={(event) => {
            event.stopPropagation();
            if (!open) updatePosition();
            setOpen((value) => !value);
          }}
        >
          i
        </button>
      </span>
      {open && typeof document !== 'undefined'
        ? createPortal(
          <span
            ref={popupRef}
            className={styles.popup}
            role="tooltip"
            style={{top: position.top, left: position.left}}
          >
            {text}
          </span>,
          document.body,
        )
        : null}
    </>
  );
}
