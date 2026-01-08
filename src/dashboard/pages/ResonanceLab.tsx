import React, { useState, useEffect } from 'react';
import { FlaskConical, Play, RefreshCw, Trash2, Zap, Clock, MousePointer } from 'lucide-react';
import { getAllItems, saveItem, clearAllItems } from '@/shared/db';
import { calculateResonanceWeight, selectCapsuleItems } from '../utils/algorithm';
import type { ContentItem } from '@/shared/types';

// Mock Data Utilities
const createMockItem = (id: string, title: string, score: number, lastShownHoursAgo: number | null, showCount: number, clickCount: number, actions: string[] = []): ContentItem => ({
  id,
  platform: 'bilibili',
  title,
  url: `https://example.com/${id}`,
  firstSeen: Date.now(),
  lastUpdated: Date.now(),
  author: { name: 'Mock Author' },
  contentExcerpt: 'Mock Content',
  actions: actions.map(a => ({ type: a as any, timestamp: Date.now() })),
  metadata: {
    score: score,
    manualScore: score,
    lastShownAt: lastShownHoursAgo !== null ? Date.now() - lastShownHoursAgo * 60 * 60 * 1000 : undefined,
    capsuleShowCount: showCount,
    capsuleClickCount: clickCount,
  }
});

export default function ResonanceLab() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [simulationResults, setSimulationResults] = useState<Record<string, number>>({});
  const [isSimulating, setIsSimulating] = useState(false);
  const [simulationRound, setSimulationRound] = useState(0);

  const refreshData = async () => {
    const data = await getAllItems();
    setItems(data);
  };

  useEffect(() => {
    refreshData();
  }, []);

  const handleGenerateMock = async () => {
    if (!confirm('This will clear all current data. Continue?')) return;
    await clearAllItems();
    
    const mocks = [
      createMockItem('high-fresh', 'High Energy Fresh', 10, null, 0, 0, ['coin', 'triple']),
      createMockItem('high-stale', 'High Energy Stale (24h ago)', 10, 24, 5, 2, ['coin']),
      createMockItem('high-ignored', 'High Energy Ignored', 10, 48, 20, 0, ['coin']), // Should have low immunity
      createMockItem('mid-normal', 'Mid Energy Normal', 7, 12, 2, 1),
      createMockItem('low-spam', 'Low Energy Spam', 3, null, 0, 0),
      createMockItem('clicked-recently', 'Recently Clicked', 8, 0.1, 10, 8, ['like']), 
      createMockItem('old-favorite', 'Old Favorite', 9, 72, 5, 5, ['favorite']),
    ];

    for (const m of mocks) {
      await saveItem(m);
    }
    await refreshData();
    setSimulationResults({});
    setSimulationRound(0);
  };

  const runSimulation = async () => {
    setIsSimulating(true);
    const results: Record<string, number> = {};
    const rounds = 1000;
    
    // Simulate 1000 draws
    for (let i = 0; i < rounds; i++) {
      const selected = selectCapsuleItems(items, 1); // Select 1 at a time to track freq
      selected.forEach(item => {
        results[item.id] = (results[item.id] || 0) + 1;
      });
    }
    
    setSimulationResults(results);
    setSimulationRound(rounds);
    setIsSimulating(false);
  };

  return (
    <div className="p-8 max-w-7xl mx-auto min-h-screen bg-slate-50">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3 text-slate-800">
            <FlaskConical className="text-purple-600" size={32} />
            Resonance Algorithm Lab
          </h1>
          <p className="text-slate-500 mt-2">Debug and visualize the Hachimi Resonance Algorithm v1.0</p>
        </div>
        
        <div className="flex gap-3">
          <button onClick={handleGenerateMock} className="flex items-center gap-2 px-4 py-2 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 shadow-sm transition-colors">
            <Trash2 size={16} /> Reset & Mock
          </button>
          <button onClick={refreshData} className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 shadow-sm transition-colors">
            <RefreshCw size={16} /> Refresh
          </button>
          <button onClick={runSimulation} disabled={isSimulating} className="flex items-center gap-2 px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
            {isSimulating ? <RefreshCw className="animate-spin" size={16} /> : <Play size={16} />}
            Run Monte Carlo (1000x)
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-xs tracking-wider">
            <tr>
              <th className="p-4 w-64">Content</th>
              <th className="p-4 text-center">Score</th>
              <th className="p-4 text-center">
                <div className="flex flex-col items-center gap-1">
                  <MousePointer size={14} />
                  <span>Show / Click</span>
                </div>
              </th>
              <th className="p-4 text-center">
                <div className="flex flex-col items-center gap-1">
                  <Clock size={14} />
                  <span>Last Shown</span>
                </div>
              </th>
              <th className="p-4 text-center">
                <div className="flex flex-col items-center gap-1">
                  <Zap size={14} />
                  <span>Energy</span>
                </div>
              </th>
              <th className="p-4 text-center">Cooling</th>
              <th className="p-4 text-center">Immunity</th>
              <th className="p-4 text-right">Final Weight</th>
              <th className="p-4 w-48">Selection Prob (Sim)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.sort((a, b) => calculateResonanceWeight(b) - calculateResonanceWeight(a)).map(item => {
              const weight = calculateResonanceWeight(item);
              
              // Breakdown calculation for display
              let energy = 1;
              if (item.metadata.manualScore) energy += (item.metadata.manualScore - 5) * 5;
              const actionTypes = new Set(item.actions.map(a => a.type));
              const ENERGY_WEIGHTS: any = { copy: 5, share: 15, triple: 15, coin: 5, favorite: 8, star: 8, comment: 8, danmaku: 8, open_comment: 4, upvote: 5, like: 3, read_30s: 5, play_90: 8, play_50: 3 };
              actionTypes.forEach(t => { if (ENERGY_WEIGHTS[t]) energy += ENERGY_WEIGHTS[t]; });

              let cooling = 1;
              if (item.metadata.lastShownAt) {
                 const gap = Date.now() - item.metadata.lastShownAt;
                 const effE = Math.max(1, energy);
                 const K = (86400000) / effE;
                 cooling = 1 - Math.exp(-gap / K);
              }

              const show = item.metadata.capsuleShowCount || 0;
              const click = item.metadata.capsuleClickCount || 0;
              const immunity = 1 / Math.max(0.1, 1 + (show - click * 3));

              const simCount = simulationResults[item.id] || 0;
              const simPercent = simulationRound > 0 ? (simCount / simulationRound) * 100 : 0;
              
              return (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <div className="font-medium text-slate-900">{item.title}</div>
                    <div className="text-xs text-slate-400 mt-1 font-mono">{item.id}</div>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs text-slate-400">Signal: {item.metadata.score.toFixed(1)}</span>
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${item.metadata.manualScore && item.metadata.manualScore >= 7 ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                        Manual: {item.metadata.manualScore || '-'}
                      </span>
                    </div>
                  </td>
                  <td className="p-4 text-center font-mono text-slate-600">
                    {show} <span className="text-slate-300">/</span> {click}
                  </td>
                  <td className="p-4 text-center text-slate-500 text-xs">
                    {item.metadata.lastShownAt ? (
                      <span title={new Date(item.metadata.lastShownAt).toLocaleString()}>
                        {Math.round((Date.now() - item.metadata.lastShownAt) / 3600000 * 10) / 10}h ago
                      </span>
                    ) : (
                      <span className="text-slate-300">Never</span>
                    )}
                  </td>
                  <td className="p-4 text-center text-blue-600 font-medium">{energy.toFixed(1)}</td>
                  <td className="p-4 text-center">
                    <div className="flex flex-col items-center">
                      <span className="text-cyan-600 font-medium">{cooling.toFixed(3)}</span>
                      <div className="w-12 h-1 bg-slate-100 rounded mt-1 overflow-hidden">
                        <div className="h-full bg-cyan-500" style={{ width: `${cooling * 100}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                     <div className="flex flex-col items-center">
                      <span className={`font-medium ${immunity < 0.5 ? 'text-red-500' : 'text-orange-600'}`}>{immunity.toFixed(3)}</span>
                      <div className="w-12 h-1 bg-slate-100 rounded mt-1 overflow-hidden">
                        <div className={`h-full ${immunity < 0.5 ? 'bg-red-500' : 'bg-orange-500'}`} style={{ width: `${Math.min(100, immunity * 100)}%` }} />
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    <span className="text-lg font-bold text-slate-800">{weight.toFixed(2)}</span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="h-2 bg-purple-100 rounded-full flex-1 overflow-hidden w-24">
                        <div className="h-full bg-purple-600 transition-all duration-500" style={{ width: `${Math.min(100, simPercent * 5)}%` /* Scale for visibility */ }} />
                      </div>
                      <span className="text-xs text-slate-500 w-8 text-right">{simPercent.toFixed(1)}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={9} className="p-12 text-center text-slate-400">
                  No data available. Click "Reset & Mock" to generate test data.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
