import React, { useState } from 'react';
import { LoanProduct, Currency, UserRole, RepaymentFrequency } from '../../types';
import { Badge } from '../common/Badge';
import { MoneyText } from '../common/MoneyText';
import {
  Plus,
  Calculator,
  Sliders,
  CheckCircle2,
  X,
  Layers,
  Calendar,
  DollarSign
} from 'lucide-react';

export interface LoanProductsCatalogProps {
  products: LoanProduct[];
  currency: Currency;
  currentUserRole: UserRole;
  onAddProduct?: (product: LoanProduct) => void;
  onApplyProduct?: (productId: string) => void;
}

export const LoanProductsCatalog: React.FC<LoanProductsCatalogProps> = ({
  products,
  currency,
  currentUserRole,
  onAddProduct,
  onApplyProduct
}) => {
  const [activeSimulatorProduct, setActiveSimulatorProduct] = useState<LoanProduct | null>(null);
  const [showAddProductModal, setShowAddProductModal] = useState(false);

  // Simulator Modal State
  const [simAmount, setSimAmount] = useState<number>(5000);
  const [simTerm, setSimTerm] = useState<number>(12);

  // New Product Form State
  const [newName, setNewName] = useState('');
  const [newCategory, setNewCategory] = useState<'Personal' | 'Business' | 'Agriculture' | 'Vehicle' | 'Emergency'>('Personal');
  const [newMinAmount, setNewMinAmount] = useState(1000);
  const [newMaxAmount, setNewMaxAmount] = useState(20000);
  const [newRate, setNewRate] = useState(10.5);
  const [newMinTerm, setNewMinTerm] = useState(6);
  const [newMaxTerm, setNewMaxTerm] = useState(36);
  const [newDesc, setNewDesc] = useState('');

  const openSimulator = (prod: LoanProduct) => {
    setActiveSimulatorProduct(prod);
    setSimAmount(Math.round((prod.minAmount + prod.maxAmount) / 2));
    setSimTerm(prod.minTerm);
  };

  // Live Simulator Calculations
  const simInterest = activeSimulatorProduct
    ? (simAmount * (activeSimulatorProduct.interestRate / 100) * (simTerm / 12))
    : 0;
  const simTotal = simAmount + simInterest;
  const simMonthly = simTerm > 0 ? simTotal / simTerm : 0;

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    const created: LoanProduct = {
      id: `PROD-00${products.length + 1}`,
      name: newName,
      category: newCategory,
      minAmount: newMinAmount,
      maxAmount: newMaxAmount,
      interestRate: newRate,
      minTerm: newMinTerm,
      maxTerm: newMaxTerm,
      frequency: 'MONTHLY',
      description: newDesc || 'Institutional lending product configured by credit administration.',
      activeCount: 0,
    };
    onAddProduct?.(created);
    setShowAddProductModal(false);
    alert(`Product "${newName}" registered in core catalog.`);
  };

  const isManagerOrAdmin = currentUserRole === 'MANAGER';

  return (
    <div className="space-y-6">
      {/* 1. Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Loan Products Catalog
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-mono font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
              {products.length} Active Offerings
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Institutional interest rate structures, amortization constraints, and credit simulators.
          </p>
        </div>

        {isManagerOrAdmin && (
          <button
            onClick={() => setShowAddProductModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add New Product</span>
          </button>
        )}
      </div>

      {/* 2. Grid of Product Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {products.map((prod) => (
          <div
            key={prod.id}
            className="bg-white border border-slate-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.03)] rounded-xl p-5 space-y-4 hover:border-slate-300 transition-colors flex flex-col justify-between"
          >
            <div className="space-y-3">
              {/* Header: Product Name + Active Status Pill */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {prod.category} Credit
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">{prod.name}</h3>
                </div>
                <Badge variant="active" dot size="xs">
                  Active
                </Badge>
              </div>

              {/* Annual Interest Rate (prominent text) */}
              <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl flex items-baseline justify-between">
                <span className="text-xs text-slate-500 font-medium">Annual Interest Rate</span>
                <span className="text-xl font-mono tabular-nums font-black text-indigo-600">
                  {prod.interestRate}% p.a.
                </span>
              </div>

              <p className="text-xs text-slate-500 line-clamp-2">{prod.description}</p>

              {/* Min-Max Amount range & Term limits */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                    Amount Limits
                  </span>
                  <span className="font-mono text-xs font-semibold text-slate-800">
                    <MoneyText amount={prod.minAmount} currency={currency} /> – <MoneyText amount={prod.maxAmount} currency={currency} />
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                    Term Limits
                  </span>
                  <span className="font-mono text-xs font-semibold text-slate-800">
                    {prod.minTerm} – {prod.maxTerm} Months
                  </span>
                </div>
              </div>

              {/* Repayment Frequency Badge */}
              <div className="flex items-center justify-between pt-2 text-xs">
                <span className="text-slate-500">Frequency:</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md font-mono text-xs font-medium bg-slate-100 text-slate-700">
                  {prod.frequency || 'Monthly'}
                </span>
              </div>
            </div>

            {/* Interactive "Try Calculator" Button */}
            <div className="pt-4 border-t border-slate-100 flex items-center gap-2">
              <button
                onClick={() => openSimulator(prod)}
                className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 text-xs font-semibold text-indigo-600 hover:text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100/70 rounded-lg transition-colors"
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>Try Calculator</span>
              </button>

              {onApplyProduct && (
                <button
                  onClick={() => onApplyProduct(prod.id)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                >
                  Apply
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 3. Pre-filled Simulator Modal */}
      {activeSimulatorProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Calculator className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {activeSimulatorProduct.name} Simulator
                  </h3>
                  <p className="text-xs text-slate-500">
                    Pre-filled financial model at {activeSimulatorProduct.interestRate}% p.a.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveSimulatorProduct(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Amount Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between font-semibold">
                  <span className="text-slate-700">Simulated Principal</span>
                  <MoneyText amount={simAmount} currency={currency} className="text-base font-bold text-slate-900" />
                </div>
                <input
                  type="range"
                  min={activeSimulatorProduct.minAmount}
                  max={activeSimulatorProduct.maxAmount}
                  step={100}
                  value={simAmount}
                  onChange={(e) => setSimAmount(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>

              {/* Term Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between font-semibold">
                  <span className="text-slate-700">Repayment Term</span>
                  <span className="font-mono text-base font-bold text-slate-900">{simTerm} Months</span>
                </div>
                <input
                  type="range"
                  min={activeSimulatorProduct.minTerm}
                  max={activeSimulatorProduct.maxTerm}
                  step={1}
                  value={simTerm}
                  onChange={(e) => setSimTerm(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>

              {/* Calculation Output Box */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2 font-mono">
                <div className="flex justify-between text-slate-600">
                  <span>Total Accrued Interest:</span>
                  <MoneyText amount={simInterest} currency={currency} className="font-semibold text-slate-900" />
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Total Repayment Commitment:</span>
                  <MoneyText amount={simTotal} currency={currency} className="font-semibold text-slate-900" />
                </div>
                <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t border-slate-200">
                  <span>Estimated Monthly Due:</span>
                  <MoneyText amount={simMonthly} currency={currency} className="text-indigo-600 text-base" />
                </div>
              </div>

              <button
                onClick={() => {
                  const prodId = activeSimulatorProduct.id;
                  setActiveSimulatorProduct(null);
                  onApplyProduct?.(prodId);
                }}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold transition-colors shadow-xs"
              >
                Apply with These Simulated Terms
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Add New Product Modal */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Configure New Loan Product</h3>
                  <p className="text-xs text-slate-500">Core credit policy parameter definitions</p>
                </div>
              </div>
              <button
                onClick={() => setShowAddProductModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Product Name</label>
                  <input
                    type="text"
                    required
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Solar Green Energy Loan"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  >
                    <option value="Personal">Personal</option>
                    <option value="Business">Business</option>
                    <option value="Agriculture">Agriculture</option>
                    <option value="Vehicle">Vehicle</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Annual APR (%)</label>
                  <input
                    type="number"
                    step={0.1}
                    required
                    value={newRate}
                    onChange={(e) => setNewRate(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Min Amount ($)</label>
                  <input
                    type="number"
                    step={100}
                    required
                    value={newMinAmount}
                    onChange={(e) => setNewMinAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Max Amount ($)</label>
                  <input
                    type="number"
                    step={100}
                    required
                    value={newMaxAmount}
                    onChange={(e) => setNewMaxAmount(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Min Term (Months)</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newMinTerm}
                    onChange={(e) => setNewMinTerm(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Max Term (Months)</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={newMaxTerm}
                    onChange={(e) => setNewMaxTerm(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Product Description</label>
                <textarea
                  rows={2}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Target demographic, allowable purpose, and loan security terms..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold shadow-xs"
                >
                  Save Product Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
