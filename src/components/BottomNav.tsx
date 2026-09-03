import React from 'react';
import PieChart from 'lucide-react/dist/esm/icons/pie-chart';
import List from 'lucide-react/dist/esm/icons/list';
import TrendingUp from 'lucide-react/dist/esm/icons/trending-up';
import CalendarClock from 'lucide-react/dist/esm/icons/calendar-clock';

interface BottomNavProps {
    activeTab: 'dashboard' | 'transactions' | 'report' | 'admin' | 'schedule';
    setActiveTab: (tab: 'dashboard' | 'transactions' | 'report' | 'admin' | 'schedule') => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-md border-t border-zinc-800 p-2 pb-safe shadow-lg z-40">
            <div className="max-w-4xl mx-auto flex justify-between px-8">
                <button onClick={() => setActiveTab('dashboard')} className={`flex flex-col items-center p-2 rounded-xl w-20 transition-all ${activeTab === 'dashboard' ? 'text-violet-400 bg-violet-500/10' : 'text-zinc-500 hover:text-zinc-300'}`}><PieChart size={24} /><span className="text-xs font-medium mt-1">ภาพรวม</span></button>
                <button onClick={() => setActiveTab('transactions')} className={`flex flex-col items-center p-2 rounded-xl w-20 transition-all ${activeTab === 'transactions' ? 'text-violet-400 bg-violet-500/10' : 'text-zinc-500 hover:text-zinc-300'}`}><List size={24} /><span className="text-xs font-medium mt-1">รายการ</span></button>
                <button onClick={() => setActiveTab('schedule')} className={`flex flex-col items-center p-2 rounded-xl w-20 transition-all ${activeTab === 'schedule' ? 'text-violet-400 bg-violet-500/10' : 'text-zinc-500 hover:text-zinc-300'}`}><CalendarClock size={24} /><span className="text-xs font-medium mt-1">ตารางงาน</span></button>
                <button onClick={() => setActiveTab('report')} className={`flex flex-col items-center p-2 rounded-xl w-20 transition-all ${activeTab === 'report' ? 'text-violet-400 bg-violet-500/10' : 'text-zinc-500 hover:text-zinc-300'}`}><TrendingUp size={24} /><span className="text-xs font-medium mt-1">สรุปผล</span></button>
                <div className="w-10 sm:hidden"></div>
            </div>
        </nav>
    );
};
