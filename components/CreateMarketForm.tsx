import React, { useState } from 'react';
import { useWeb3 } from '../app/context/Web3Context';

export default function CreateMarketForm() {
  const { createMarketOnChain, txStatus } = useWeb3();

  const [marketDescription, setMarketDescription] = useState("");
  const [selectedDateFromForm, setSelectedDateFromForm] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!marketDescription || !selectedDateFromForm) {
      alert("Please fill in all fields!");
      return;
    }

    // 1. Automatically convert local date/time to blockchain Unix seconds timestamp
    const marketEndTimeInSeconds = Math.floor(new Date(selectedDateFromForm).getTime() / 1000);

    // 2. Broadcast transaction with dynamic EIP-1559 gas
    const success = await createMarketOnChain(marketDescription, marketEndTimeInSeconds);

    if (success) {
      setMarketDescription("");
      setSelectedDateFromForm("");
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
      <h2 className="text-xl font-bold text-white mb-1">Create New Market Proposal</h2>
      <p className="text-slate-400 text-sm mb-6">Propose a predictive event pool. Creation requires a stake of 1.00 tITL.</p>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Market Question */}
        <div>
          <label className="block text-slate-300 text-sm font-medium mb-2">Market Question / Description</label>
          <input
            type="text"
            placeholder="e.g. Will Interlink network testnet gateway process over 10M transactions this week?"
            value={marketDescription}
            onChange={(e) => setMarketDescription(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 placeholder-slate-600 transition"
          />
        </div>

        {/* Expiration Date & Time */}
        <div>
          <label className="block text-slate-300 text-sm font-medium mb-2">Market Settlement Date & Time</label>
          <input
            type="datetime-local"
            value={selectedDateFromForm}
            onChange={(e) => setSelectedDateFromForm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 transition"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-semibold py-3 rounded-xl transition shadow-lg shadow-blue-500/20"
        >
          Propose Market
        </button>

        {/* Dynamic Tx Status Output */}
        {txStatus && (
          <div className="mt-4 p-3 bg-slate-950 border border-slate-800 rounded-xl text-center">
            <p className="text-blue-400 text-xs font-medium animate-pulse">{txStatus}</p>
          </div>
        )}
      </form>
    </div>
  );
}