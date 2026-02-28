import React from 'react';

const TICKER_ITEMS = [
    { key: 'HDFC REGALIA', val: '5x pts' },
    { key: 'AXIS ATLAS', val: '5 MILES/₹100' },
    { key: 'AMEX MRCC', val: '4x MR' },
    { key: 'SBI SIMPLYCLICK', val: '10x online' },
    { key: 'ICICI AMAZON PAY', val: '5% CB' },
    { key: 'HDFC MILLENNIA', val: '5% CB' },
    { key: 'HDFC INFINIA', val: '3.3% return' },
];

export default function Ticker() {
    // Duplicate for infinite scroll
    const items = [...TICKER_ITEMS, ...TICKER_ITEMS];
    return (
        <div className="ticker">
            <div className="ticker-track">
                {items.map((item, i) => (
                    <div className="ticker-item" key={i}>
                        <span className="ticker-key">{item.key}</span>
                        <span className="ticker-val">{item.val}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
