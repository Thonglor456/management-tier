import React from 'react';

export const Card = ({ children, className = "" }: { children: React.ReactNode, className?: string }) => (
    <div className={`bg-zinc-900 rounded-xl shadow-lg border border-zinc-800 ${className}`}>
        {children}
    </div>
);
