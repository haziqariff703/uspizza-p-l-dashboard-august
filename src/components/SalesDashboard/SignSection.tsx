import React from 'react';
import { Building, ShieldCheck } from 'iconoir-react';
import { UsPizzaLogo } from '../common/UsPizzaLogo';
import { AuthForm } from './AuthForm';

/**
 * Standalone sign-in landing page. Renders the full auth form inline and owns
 * the entire viewport — it replaces the whole app (TopBar, content, footer)
 * whenever the user is signed out.
 */
export const SignSection: React.FC = () => {
  return (
    <section
      aria-labelledby="sign-section-heading"
      className="flex min-h-screen w-full items-center justify-center bg-slate-100/70 px-4 py-10"
    >
      <div className="w-full max-w-3xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
        <div className="grid sm:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
          {/* Brand panel */}
          <div className="relative flex flex-col justify-between gap-10 bg-[#0B192C] px-7 py-8 text-white sm:px-8 sm:py-10">
            <div className="flex items-center gap-3">
              <UsPizzaLogo variant="mark" size="lg" />
              <div className="flex flex-col leading-none">
                <span className="text-[15px] font-black uppercase tracking-[-0.03em]">
                  US <span className="text-[#FF5C73]">PIZZA</span>
                </span>
                <span className="mt-1 text-[9px] font-bold uppercase tracking-[0.16em] text-slate-400">
                  Finance
                </span>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">
                Corporate Outlets · Operations & Audit
              </p>
              <p className="text-sm font-medium leading-6 text-slate-300">
                P&amp;L reconciliation across 44 trading outlets, five sales channels, and two entities — secured behind your team account.
              </p>
            </div>

            <ul className="space-y-2.5 border-t border-white/10 pt-5 text-xs font-semibold text-slate-300">
              <li className="flex items-center gap-2.5">
                <Building className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                <span>46 corporate outlets · MY US Pizza &amp; Sabah</span>
              </li>
              <li className="flex items-center gap-2.5">
                <ShieldCheck className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                <span>Reviewed imports · role-based approvals</span>
              </li>
            </ul>
          </div>

          {/* Action panel */}
          <div className="flex flex-col justify-center px-7 py-10 sm:px-10 sm:py-14">
            <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-[#C8102E]">
              Sign-in required
            </span>

            <h1
              id="sign-section-heading"
              className="mt-4 text-2xl font-black tracking-tight text-slate-900 sm:text-3xl"
            >
              US PIZZA Finance &amp; Audit Hub
            </h1>

            <p className="mt-3 text-sm leading-6 text-slate-600">
              This dashboard contains confidential outlet financials. Sign in with your work account to view sales, purchases, and reconciliation figures.
            </p>

            <div className="mt-7">
              <AuthForm />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
