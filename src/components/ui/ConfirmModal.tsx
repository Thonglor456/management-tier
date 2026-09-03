import React from 'react';
import X from 'lucide-react/dist/esm/icons/x';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';

interface ConfirmModalProps {
    show: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    variant?: 'danger' | 'warning' | 'info';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    show,
    title,
    message,
    confirmText = 'ยืนยัน',
    cancelText = 'ยกเลิก',
    onConfirm,
    onCancel,
    variant = 'danger'
}) => {
    if (!show) return null;

    const colors = {
        danger: 'bg-rose-500 text-white hover:bg-rose-600 shadow-rose-900/20',
        warning: 'bg-yellow-500 text-white hover:bg-yellow-600 shadow-yellow-900/20',
        info: 'bg-amber-600 text-white hover:bg-amber-700 shadow-amber-900/20'
    };

    const icons = {
        danger: <div className="p-3 bg-rose-500/10 text-rose-400 rounded-2xl border border-rose-500/20"><AlertTriangle size={24} /></div>,
        warning: <div className="p-3 bg-yellow-500/10 text-yellow-400 rounded-2xl border border-yellow-500/20"><AlertTriangle size={24} /></div>,
        info: <div className="p-3 bg-amber-500/10 text-amber-400 rounded-2xl border border-amber-500/20"><AlertTriangle size={24} /></div>
    };

    return (
        <div className="fixed inset-0 bg-black/85 z-[9999] flex items-center justify-center p-4 animate-fade-in backdrop-blur-sm">
            <div 
                className="bg-zinc-900 w-full max-w-sm rounded-[2rem] border border-zinc-800 shadow-2xl overflow-hidden animate-slide-up"
                onClick={e => e.stopPropagation()}
            >
                {/* Header with Icon */}
                <div className="pt-8 pb-4 flex flex-col items-center gap-4 text-center px-6">
                    {icons[variant]}
                    <div className="space-y-1">
                        <h3 className="text-xl font-black text-white tracking-tight">{title}</h3>
                        <p className="text-zinc-400 text-sm leading-relaxed whitespace-pre-wrap">{message}</p>
                    </div>
                </div>

                {/* Actions */}
                <div className="p-6 pt-2 flex flex-col gap-3">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onConfirm();
                        }}
                        className={`w-full py-4 rounded-2xl font-black text-base transition-all active:scale-95 flex items-center justify-center gap-2 shadow-xl ${colors[variant]}`}
                    >
                        {confirmText}
                    </button>
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onCancel();
                        }}
                        className="w-full py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-2xl font-bold text-base transition-all active:scale-95 border border-zinc-700"
                    >
                        {cancelText}
                    </button>
                </div>

                {/* Close Button Top-Right */}
                <button 
                    onClick={onCancel}
                    className="absolute top-4 right-4 p-2 text-zinc-500 hover:text-white transition-colors"
                >
                    <X size={20} />
                </button>
            </div>
        </div>
    );
};
