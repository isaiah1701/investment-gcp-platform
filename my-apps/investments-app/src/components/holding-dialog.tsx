'use client';

import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { Holding } from '@/lib/types';
import { validateHolding } from '@/lib/portfolio';

type Props = { open: boolean; initial?: Holding; symbol: string; name: string; onClose: () => void; onSave: (holding: Holding) => void };

export function HoldingDialog({ open, initial, symbol, name, onClose, onSave }: Props) {
  const quantityRef = useRef<HTMLInputElement>(null);
  const [quantity, setQuantity] = useState('');
  const [averagePrice, setAveragePrice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setQuantity(initial ? String(initial.quantity) : '');
    setAveragePrice(initial ? String(initial.averagePrice) : '');
    setError('');
    const previous = document.activeElement as HTMLElement | null;
    const timer = window.setTimeout(() => quantityRef.current?.focus(), 0);
    function escape(event: KeyboardEvent) { if (event.key === 'Escape') onClose(); }
    document.addEventListener('keydown', escape);
    return () => { window.clearTimeout(timer); document.removeEventListener('keydown', escape); previous?.focus(); };
  }, [open, initial, onClose]);

  if (!open) return null;

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const qty = Number(quantity);
    const price = Number(averagePrice);
    const validation = validateHolding(qty, price);
    if (validation) { setError(validation); return; }
    onSave({ symbol, name, quantity: qty, averagePrice: price });
  }

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="holding-dialog" role="dialog" aria-modal="true" aria-labelledby="holding-title" aria-describedby="holding-description">
      <div className="dialog-heading"><div><span className="eyebrow">PORTFOLIO POSITION</span><h2 id="holding-title">{initial ? 'Edit holding' : 'Add holding'}</h2></div><button className="icon-button" type="button" onClick={onClose} aria-label="Close holding form"><X size={18} /></button></div>
      <p id="holding-description" className="dialog-intro">{symbol} · {name}. Enter your shares and average purchase price in USD.</p>
      <form onSubmit={submit} noValidate>
        <label className="field-label" htmlFor="shares">Share quantity</label><input ref={quantityRef} id="shares" inputMode="decimal" type="number" min="0.0001" step="any" value={quantity} onChange={(event) => setQuantity(event.target.value)} required aria-describedby={error ? 'holding-error' : undefined} />
        <label className="field-label" htmlFor="basis">Average purchase price <span>USD per share</span></label><div className="money-input"><span aria-hidden="true">$</span><input id="basis" inputMode="decimal" type="number" min="0.01" step="any" value={averagePrice} onChange={(event) => setAveragePrice(event.target.value)} required /></div>
        {error && <p className="form-error" id="holding-error" role="alert">{error}</p>}
        <div className="dialog-actions"><button type="button" className="button-secondary" onClick={onClose}>Cancel</button><button type="submit" className="button-primary">{initial ? 'Save changes' : 'Add to portfolio'}</button></div>
      </form>
    </section>
  </div>;
}
