import React, { useState } from 'react';
import { LoanProduct, Currency, UserRole } from '../../types';
import { Badge } from '../common/Badge';
import { MoneyText } from '../common/MoneyText';
import {
  Plus,
  Calculator,
  X
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
      description: newDesc || 'Standard lending product managed by credit administration.',
      activeCount: 0,
    };
    onAddProduct?.(created);
    setShowAddProductModal(false);
    alert(`Product "${newName}" registered in core catalog.`);
  };

  const isManagerOrAdmin = currentUserRole === 'MANAGER';

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Top Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-2 border-b border-[#CBD5E1]">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight text-[#0F172A]">
              Loan Products Catalog
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] text-xs font-mono font-semibold bg-slate-100 text-[#0F172A] border border-[#CBD5E1]">
              {products.length} Offerings
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5">
            Credit product policy definitions, interest margins, repayment frequencies, and amortization structures.
          </p>
        </div>

        {isManagerOrAdmin && (
          <button
            onClick={() => setShowAddProductModal(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0F172A] hover:bg-[#1E293B] rounded-[6px] transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Add New Product</span>
          </button>
        )}
      </div>

      {/* 2. Grid of Product Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {products.map((prod) => (
          <div
            key={prod.id}
            className="bg-white border border-[#CBD5E1] rounded-[8px] p-5 space-y-4 hover:border-slate-400 transition-colors flex flex-col justify-between"
          >
            <div className="space-y-3">
              {/* Header: Product Name + Active Status Badge */}
              <div className="flex items-start justify-between gap-2 pb-2 border-b border-[#CBD5E1]">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#64748B]">
                    {prod.category} Credit
                  </span>
                  <h3 className="text-base font-bold text-[#0F172A] mt-0.5">{prod.name}</h3>
                </div>
                <Badge variant="active" dot size="xs">
                  Active
                </Badge>
              </div>

              {/* Annual Interest Rate */}
              <div className="p-3 bg-slate-50 border border-[#CBD5E1] rounded-[6px] flex items-baseline justify-between">
                <span className="text-xs text-[#64748B] font-medium">Annual Interest Rate</span>
                <span className="text-xl font-mono tabular-nums font-bold text-[#2563EB]">
                  {prod.interestRate}% p.a.
                </span>
              </div>

              {/* Key Parameters */}
              <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                <div className="p-2.5 bg-slate-50 border border-[#CBD5E1] rounded-[6px]">
                  <span className="text-[11px] text-[#64748B] block font-sans">Principal Range</span>
                  <span className="font-bold text-[#0F172A] block mt-0.5">
                    ${prod.minAmount.toLocaleString()} - ${prod.maxAmount.toLocaleString()}
                  </span>
                </div>

                <div className="p-2.5 bg-slate-50 border border-[#CBD5E1] rounded-[6px]">
                  <span className="text-[11px] text-[#64748B] block font-sans">Tenure Range</span>
                  <span className="font-bold text-[#0F172A] block mt-0.5">
                    {prod.minTerm} - {prod.maxTerm} mos
                  </span>
                </div>
              </div>

              <p className="text-xs text-[#64748B] line-clamp-2">
                {prod.description}
              </p>
            </div>

            {/* Actions Toolbar */}
            <div className="pt-3 border-t border-[#CBD5E1] flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => openSimulator(prod)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[6px] bg-slate-50 hover:bg-slate-100 border border-[#CBD5E1] text-[#0F172A] text-xs font-semibold transition cursor-pointer"
              >
                <Calculator className="w-3.5 h-3.5 text-[#2563EB]" />
                <span>Simulate</span>
              </button>

              <button
                type="button"
                onClick={() => onApplyProduct?.(prod.id)}
                className="px-3.5 py-1.5 rounded-[6px] bg-[#0F172A] hover:bg-[#1E293B] text-white text-xs font-semibold transition cursor-pointer"
              >
                Apply Facility
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* 3. Live Amortization Calculator Modal */}
      {activeSimulatorProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
          <div className="bg-white max-w-lg w-full rounded-[8px] p-6 space-y-5 border border-[#CBD5E1] shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#CBD5E1]">
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">
                  Loan Calculator &amp; Amortization Simulator
                </h3>
                <p className="text-xs text-[#64748B]">
                  Product: <strong className="text-[#0F172A]">{activeSimulatorProduct.name}</strong> ({activeSimulatorProduct.interestRate}% p.a.)
                </p>
              </div>
              <button
                onClick={() => setActiveSimulatorProduct(null)}
                className="p-1 rounded-[4px] text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Amount Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-baseline">
                  <label className="font-semibold text-[#0F172A]">Simulated Principal Amount</label>
                  <span className="font-mono text-base font-bold text-[#2563EB]">
                    ${simAmount.toLocaleString()}
                  </span>
                </div>
                <input
                  type="range"
                  min={activeSimulatorProduct.minAmount}
                  max={activeSimulatorProduct.maxAmount}
                  step={500}
                  value={simAmount}
                  onChange={(e) => setSimAmount(Number(e.target.value))}
                  className="w-full accent-[#2563EB] cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-[#64748B] font-mono">
                  <span>Min: ${activeSimulatorProduct.minAmount.toLocaleString()}</span>
                  <span>Max: ${activeSimulatorProduct.maxAmount.toLocaleString()}</span>
                </div>
              </div>

              {/* Term Slider */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-baseline">
                  <label className="font-semibold text-[#0F172A]">Simulated Tenure (Months)</label>
                  <span className="font-mono text-base font-bold text-[#0F172A]">
                    {simTerm} Months
                  </span>
                </div>
                <input
                  type="range"
                  min={activeSimulatorProduct.minTerm}
                  max={activeSimulatorProduct.maxTerm}
                  step={1}
                  value={simTerm}
                  onChange={(e) => setSimTerm(Number(e.target.value))}
                  className="w-full accent-[#2563EB] cursor-pointer"
                />
                <div className="flex justify-between text-[11px] text-[#64748B] font-mono">
                  <span>Min: {activeSimulatorProduct.minTerm} mos</span>
                  <span>Max: {activeSimulatorProduct.maxTerm} mos</span>
                </div>
              </div>

              {/* Calculated Outputs Summary Panel */}
              <div className="p-4 bg-slate-50 border border-[#CBD5E1] rounded-[6px] space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-[#64748B]">Estimated Monthly Payment:</span>
                  <span className="font-mono font-bold text-[#0F172A] text-sm">
                    ${simMonthly.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-[#64748B]">Total Accrued Interest:</span>
                  <span className="font-mono font-bold text-[#0F172A]">
                    ${simInterest.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-xs pt-2 border-t border-[#CBD5E1]">
                  <span className="font-semibold text-[#0F172A]">Total Outlay (Principal + Interest):</span>
                  <span className="font-mono font-bold text-[#2563EB] text-sm">
                    ${simTotal.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#CBD5E1] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveSimulatorProduct(null)}
                className="px-4 py-2 rounded-[6px] text-xs font-semibold text-[#0F172A] bg-white hover:bg-slate-50 border border-[#CBD5E1]"
              >
                Close Simulator
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveSimulatorProduct(null);
                  onApplyProduct?.(activeSimulatorProduct.id);
                }}
                className="px-4 py-2 rounded-[6px] text-xs font-semibold text-white bg-[#0F172A] hover:bg-[#1E293B]"
              >
                Proceed to Application
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Add Product Modal */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60">
          <div className="bg-white max-w-lg w-full rounded-[8px] p-6 space-y-4 border border-[#CBD5E1] shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#CBD5E1]">
              <h3 className="text-base font-bold text-[#0F172A]">
                Create New Loan Product
              </h3>
              <button
                onClick={() => setShowAddProductModal(false)}
                className="p-1 rounded-[4px] text-[#64748B] hover:text-[#0F172A] hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">Product Name *</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Higher Education Tuition Facility"
                  className="w-full h-10 px-3 bg-white border border-[#CBD5E1] rounded-[6px] text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Category</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full h-10 px-3 bg-white border border-[#CBD5E1] rounded-[6px] text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                  >
                    <option value="Personal">Personal</option>
                    <option value="Business">Business</option>
                    <option value="Agriculture">Agriculture</option>
                    <option value="Vehicle">Vehicle</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Annual Interest Rate (%) *</label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={newRate}
                    onChange={(e) => setNewRate(Number(e.target.value))}
                    className="w-full h-10 px-3 bg-white border border-[#CBD5E1] rounded-[6px] text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Min Principal ($)</label>
                  <input
                    type="number"
                    required
                    value={newMinAmount}
                    onChange={(e) => setNewMinAmount(Number(e.target.value))}
                    className="w-full h-10 px-3 bg-white border border-[#CBD5E1] rounded-[6px] text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Max Principal ($)</label>
                  <input
                    type="number"
                    required
                    value={newMaxAmount}
                    onChange={(e) => setNewMaxAmount(Number(e.target.value))}
                    className="w-full h-10 px-3 bg-white border border-[#CBD5E1] rounded-[6px] text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Min Term (Months)</label>
                  <input
                    type="number"
                    required
                    value={newMinTerm}
                    onChange={(e) => setNewMinTerm(Number(e.target.value))}
                    className="w-full h-10 px-3 bg-white border border-[#CBD5E1] rounded-[6px] text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#0F172A] mb-1">Max Term (Months)</label>
                  <input
                    type="number"
                    required
                    value={newMaxTerm}
                    onChange={(e) => setNewMaxTerm(Number(e.target.value))}
                    className="w-full h-10 px-3 bg-white border border-[#CBD5E1] rounded-[6px] text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-[#0F172A] mb-1">Product Description</label>
                <textarea
                  rows={2}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Outline borrower eligibility, collateral terms, or intended purpose..."
                  className="w-full p-2.5 bg-white border border-[#CBD5E1] rounded-[6px] text-[#0F172A] focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              <div className="pt-3 border-t border-[#CBD5E1] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="px-4 py-2 rounded-[6px] text-xs font-semibold text-[#0F172A] bg-white hover:bg-slate-50 border border-[#CBD5E1]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-[6px] text-xs font-semibold text-white bg-[#0F172A] hover:bg-[#1E293B]"
                >
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoanProductsCatalog;
