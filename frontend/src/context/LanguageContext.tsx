import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'km' | 'en';

export interface Translations {
  [key: string]: {
    km: string;
    en: string;
  };
}

export const TRANSLATIONS: Translations = {
  // Brand & Header
  app_name: { km: 'Jam Song Vich', en: 'Jam Song Vich' },
  app_subtitle: { km: 'ប្រព័ន្ធគ្រប់គ្រងឥណទាន', en: 'Loan Management' },
  app_full_title: { km: 'ប្រព័ន្ធគ្រប់គ្រងឥណទាន Jam Song Vich', en: 'Jam Song Vich Loan Management System' },
  
  // Navigation
  nav_dashboard: { km: 'ផ្ទាំងគ្រប់គ្រង', en: 'Dashboard' },
  nav_my_applications: { km: 'ពាក្យស្នើសុំរបស់ខ្ញុំ', en: 'My Applications' },
  nav_my_loans: { km: 'កម្ចីរបស់ខ្ញុំ', en: 'My Loans' },
  nav_repayments: { km: 'កាលវិភាគសងប្រាក់', en: 'Repayment Schedule' },
  nav_payments: { km: 'ការបង់ប្រាក់', en: 'Payments' },
  nav_applications: { km: 'ពាក្យស្នើសុំ', en: 'Applications' },
  nav_loans: { km: 'បញ្ជីកម្ចី', en: 'Loans' },
  nav_borrowers: { km: 'បញ្ជីអ្នកខ្ចី', en: 'Borrowers' },
  nav_products: { km: 'ផលិតផលកម្ចី', en: 'Loan Products' },
  nav_credit_reviews: { km: 'ពិនិត្យឥណទាន', en: 'Credit Reviews' },
  nav_approvals: { km: 'ការអនុម័ត', en: 'Approvals' },
  nav_disbursements: { km: 'បើកផ្តល់ប្រាក់កម្ចី', en: 'Disbursements' },
  nav_overdue: { km: 'កម្ចីហួសកាលកំណត់', en: 'Overdue' },
  nav_reports: { km: 'របាយការណ៍ & វិភាគ', en: 'Reports & Analytics' },
  nav_users: { km: 'គ្រប់គ្រងអ្នកប្រើប្រាស់', en: 'Users' },
  nav_audit_logs: { km: 'កំណត់ហេតុសវនកម្ម', en: 'Audit Logs' },
  nav_notifications: { km: 'ការជូនដំណឹង', en: 'Notifications' },
  nav_settings: { km: 'ការកំណត់', en: 'Settings' },
  nav_profile: { km: 'គណនីរបស់ខ្ញុំ', en: 'My Profile' },
  nav_logout: { km: 'ចាកចេញ', en: 'Sign Out' },
  sec_loan_management: { km: 'ការគ្រប់គ្រងកម្ចី', en: 'LOAN MANAGEMENT' },
  sec_my_loans: { km: 'កម្ចីរបស់ខ្ញុំ', en: 'MY LOANS' },
  sec_management: { km: 'ការគ្រប់គ្រង', en: 'MANAGEMENT' },
  sec_system: { km: 'ប្រព័ន្ធ', en: 'SYSTEM' },
  sec_account: { km: 'គណនី', en: 'ACCOUNT' },

  // Common Actions & Buttons
  btn_pay_now: { km: 'បង់ប្រាក់ឥឡូវនេះ', en: 'Pay Now' },
  btn_make_payment: { km: 'បង់ប្រាក់កម្ចី', en: 'Make Payment' },
  btn_collect_payment: { km: 'ប្រមូលប្រាក់បង់', en: 'Collect Payment' },
  btn_apply_loan: { km: 'ស្នើសុំកម្ចីថ្មី', en: 'Apply for Loan' },
  btn_back: { km: 'ត្រឡប់ក្រោយ', en: 'Back' },
  btn_back_loans: { km: 'ត្រឡប់ទៅបញ្ជីកម្ចីសកម្ម', en: 'Back to Active Loans' },
  btn_cancel: { km: 'បោះបង់', en: 'Cancel' },
  btn_continue: { km: 'បន្ត', en: 'Continue' },
  btn_confirm: { km: 'បញ្ជាក់', en: 'Confirm' },
  btn_confirm_payment: { km: 'បញ្ជាក់ការបង់ប្រាក់', en: 'Confirm Payment' },
  btn_view_receipt: { km: 'មើលបង្កាន់ដៃផ្លូវការ', en: 'View Official Receipt' },
  btn_receipt: { km: 'បង្កាន់ដៃ', en: 'Receipt' },
  btn_pay: { km: 'បង់ប្រាក់', en: 'Pay' },
  btn_collect: { km: 'ប្រមូល', en: 'Collect' },
  btn_edit: { km: 'កែសម្រួល', en: 'Edit' },
  btn_close: { km: 'បិទ', en: 'Close' },
  btn_print: { km: 'បោះពុម្ព', en: 'Print' },
  btn_download: { km: 'ទាញយក', en: 'Download' },
  btn_filter: { km: 'ចម្រោះ', en: 'Filter' },
  btn_search: { km: 'ស្វែងរក', en: 'Search' },

  // Dashboard Stats & Text
  welcome_back: { km: 'សូមស្វាគមន៍មកកាន់ប្រព័ន្ធ', en: 'Welcome back' },
  verified_account: { km: 'គណនីបានផ្ទៀងផ្ទាត់', en: 'Verified User Account' },
  user_dashboard_desc: { km: 'គ្រប់គ្រងកម្ចីរបស់អ្នក តាមដានការអនុម័ត និងពិនិត្យកាលវិភាគសងប្រាក់។', en: 'Manage your loans, track approvals, and review scheduled repayments.' },
  stat_active_loans: { km: 'កម្ចីសកម្ម', en: 'Active Loans' },
  stat_active_loans_sub: { km: 'កំពុងដំណើរការសង', en: 'Currently servicing' },
  stat_pending_apps: { km: 'ពាក្យស្នើកំពុងរង់ចាំ', en: 'Pending Applications' },
  stat_pending_apps_sub: { km: 'កំពុងពិនិត្យដោយគណៈកម្មការ', en: 'In committee review' },
  stat_approved_loans: { km: 'កម្ចីបានអនុម័ត', en: 'Approved Loans' },
  stat_approved_loans_sub: { km: 'បានអនុម័ត និងរួចរាល់', en: 'Sanctioned & ready' },
  stat_outstanding_balance: { km: 'សមតុល្យនៅសល់សរុប', en: 'Outstanding Balance' },
  stat_outstanding_balance_sub: { km: 'ចំនួនទឹកប្រាក់ជំពាក់សរុប', en: 'Total remaining amount' },
  next_payment_due: { km: 'ការបង់ប្រាក់បន្ទាប់', en: 'Next Payment Due' },
  amount_due: { km: 'ចំនួនទឹកប្រាក់ត្រូវបង់', en: 'Amount Due' },
  payment_history: { km: 'ប្រវត្តិបង់ប្រាក់', en: 'Payment History' },
  payment_history_sub: { km: 'ប្រតិបត្តិការបង់ប្រាក់ និងបង្កាន់ដៃដែលបានផ្ទៀងផ្ទាត់', en: 'Recent verified installment receipts & payments' },
  full_schedule: { km: 'កាលវិភាគពេញលេញ', en: 'Full Schedule' },

  // Loan Detail & Repayment Table
  loan_information: { km: 'ព័ត៌មានលម្អិតអំពីកម្ចី', en: 'LOAN INFORMATION' },
  loan_id: { km: 'លេខសម្គាល់កម្ចី', en: 'Loan ID' },
  borrower: { km: 'អ្នកខ្ចី', en: 'Borrower' },
  loan_product: { km: 'ផលិតផលកម្ចី', en: 'Loan Product' },
  principal: { km: 'ប្រាក់ដើម', en: 'Principal' },
  interest_rate: { km: 'អត្រាការប្រាក់', en: 'Interest Rate' },
  term: { km: 'រយៈពេល', en: 'Term' },
  months: { km: 'ខែ', en: 'months' },
  monthly_installment: { km: 'ប្រាក់បង់ប្រចាំខែ', en: 'Monthly Installment' },
  disbursed_date: { km: 'កាលបរិច្ឆេទបើកផ្តល់', en: 'Disbursement Date' },
  maturity_date: { km: 'កាលបរិច្ឆេទផុតកំណត់កម្ចី', en: 'Maturity Date' },
  due_date: { km: 'កាលបរិច្ឆេទផុតកំណត់', en: 'Due Date' },
  status: { km: 'ស្ថានភាព', en: 'Status' },
  principal_settled: { km: 'ប្រាក់ដើមបានសងរួច', en: 'Principal Settled' },
  accrued_interest: { km: 'ការប្រាក់បង្គរ', en: 'Total Accrued Interest' },
  amortization_schedule: { km: 'តារាងកាលវិភាគសងប្រាក់', en: 'Amortization Schedule' },
  installment_breakdown: { km: 'ព័ត៌មានលម្អិតតាមដំណាក់កាល', en: 'Installment Breakdown' },
  col_installment_no: { km: 'ដំណាក់កាល #', en: 'Installment #' },
  col_due_date: { km: 'កាលបរិច្ឆេទ', en: 'Due Date' },
  col_principal: { km: 'ប្រាក់ដើម', en: 'Principal' },
  col_interest: { km: 'ការប្រាក់', en: 'Interest' },
  col_installment: { km: 'សរុបត្រូវបង់', en: 'Installment' },
  col_paid: { km: 'បានបង់', en: 'Paid' },
  col_remaining: { km: 'នៅសល់', en: 'Remaining' },
  col_status: { km: 'ស្ថានភាព', en: 'Status' },
  col_action: { km: 'សកម្មភាព', en: 'Action' },
  col_receipt_no: { km: 'បង្កាន់ដៃ #', en: 'Receipt #' },
  col_date_time: { km: 'កាលបរិច្ឆេទ', en: 'Date & Time' },
  col_method: { km: 'វិធីសាស្ត្រ', en: 'Method' },
  col_amount_paid: { km: 'ចំនួនបានបង់', en: 'Amount Paid' },
  col_reference: { km: 'លេខយោង', en: 'Reference' },
  col_loan_number: { km: 'លេខកម្ចី', en: 'Loan Number' },
  col_borrower: { km: 'អ្នកខ្ចី', en: 'Borrower' },
  col_product_name: { km: 'ឈ្មោះផលិតផល', en: 'Product Name' },
  col_disbursed_principal: { km: 'ប្រាក់ដើមបើកផ្តល់', en: 'Disbursed Principal' },
  col_outstanding_balance: { km: 'សមតុល្យនៅសល់', en: 'Outstanding Balance' },
  col_progress: { km: 'វឌ្ឍនភាព', en: 'Progress' },

  // Loan Directory & Ledger
  ledger_my_loans: { km: 'កម្ចីរបស់ខ្ញុំ', en: 'My Loans' },
  ledger_active_loans: { km: 'បញ្ជីកម្ចីសកម្ម', en: 'Active Loans Ledger' },
  facilities_count: { km: 'កម្ចី / ឥណទាន', en: 'Facilities' },
  search_loans_placeholder: { km: 'ស្វែងរកតាមលេខកម្ចី, ឈ្មោះអ្នកខ្ចី, ផលិតផល...', en: 'Search by Loan #, Borrower, Product...' },
  tab_all_accounts: { km: 'គណនីទាំងអស់', en: 'All Accounts' },
  tab_active: { km: 'សកម្ម', en: 'Active' },
  tab_overdue: { km: 'ហួសកាលកំណត់', en: 'Overdue' },
  tab_completed: { km: 'បានបញ្ចប់', en: 'Completed' },
  no_loans_found: { km: 'រកមិនឃើញគណនីកម្ចីទេ', en: 'No loan accounts found' },
  adjust_search_filters: { km: 'សូមកែសម្រួលការស្វែងរករបស់អ្នកដើម្បីមើលកម្ចី។', en: 'Adjust your search filters to view active loans.' },
  user_loans_subtitle: { km: 'បញ្ជីឥណទានសកម្ម កាលវិភាគសងប្រាក់ដើម និងកំណត់ត្រាការទូទាត់សងរបស់អ្នក។', en: 'Your active credit facilities, principal amortization schedules, and repayment records.' },
  admin_loans_subtitle: { km: 'បញ្ជីឥណទានសកម្ម កាលវិភាគសងប្រាក់ដើម និងស្ថានភាពផលប័ត្រឥណទានពាណិជ្ជកម្ម។', en: 'Active credit facilities, principal amortization schedules, and commercial portfolio repayment status.' },
  btn_schedule: { km: 'កាលវិភាគ', en: 'Schedule' },
  matures_on: { km: 'ផុតកំណត់:', en: 'Matures:' },

  // Repayment View Specifics
  repayments_title: { km: 'កាលវិភាគសងប្រាក់', en: 'Repayment Schedule' },
  repayments_subtitle: { km: 'ពិនិត្យកាលវិភាគរំលស់ប្រាក់ដើម កាលបរិច្ឆេទផុតកំណត់ ការបែងចែកប្រាក់ដើម/ការប្រាក់ និងប្រវត្តិបង់ប្រាក់។', en: 'View full amortization breakdown, due dates, principal/interest allocation, and payment history.' },
  select_facility: { km: 'ជ្រើសរើសឥណទាន:', en: 'Select Facility:' },
  total_repaid: { km: 'បានសងរួចសរុប', en: 'Total Repaid' },
  installments_settled: { km: 'ដំណាក់កាលបានសងរួច', en: 'installments settled' },
  col_received_by: { km: 'ទទួលដោយ', en: 'Received By' },
  col_amount_settled: { km: 'ចំនួនទឹកប្រាក់ទូទាត់', en: 'Amount Settled' },
  no_receipts_yet: { km: 'មិនទាន់មានបង្កាន់ដៃបង់ប្រាក់សម្រាប់កម្ចីនេះនៅឡើយទេ។', en: 'No payment receipts generated for this loan account yet.' },
  overdue_account_alert: { km: 'កម្ចីហួសកាលកំណត់:', en: 'Overdue Account:' },
  days_past_due: { km: 'ថ្ងៃហួសកំណត់', en: 'Days Past Due' },
  installment_amount_due: { km: 'ចំនួនទឹកប្រាក់ត្រូវបង់:', en: 'Installment Amount Due:' },
  late_fee_label: { km: 'ប្រាក់ពិន័យយឺត', en: 'Late Fee' },
  tab_amortization_schedule: { km: 'តារាងកាលវិភាគសងប្រាក់', en: 'Amortization Schedule' },
  tab_payment_history: { km: 'ប្រវត្តិបង់ប្រាក់', en: 'Payment History' },
  installments_label: { km: 'ដំណាក់កាល', en: 'Installments' },
  simulate_past_due: { km: 'សាកល្បងហួសកាលកំណត់', en: 'Simulate Past Due' },
  simulating: { km: 'កំពុងដំណើរការ...', en: 'Simulating...' },
  of_installments: { km: 'នៃ', en: 'of' },
  next_due_date: { km: 'កាលបរិច្ឆេទផុតកំណត់បន្ទាប់', en: 'Next Due Date' },
  next_installment: { km: 'ដំណាក់កាលបន្ទាប់', en: 'Next Installment' },
  matured_settled: { km: 'ផុតកំណត់ / បានបញ្ចប់សព្វគ្រប់', en: 'Matured / Settled' },
  original_amount: { km: 'ដើម:', en: 'Original:' },
  no_schedules_title: { km: 'មិនមានកាលវិភាគសងប្រាក់សកម្មទេ', en: 'No Active Amortization Schedules' },
  no_schedules_desc: { km: 'បច្ចុប្បន្នអ្នកមិនទាន់មានកម្ចីដែលបានបើកផ្តល់ និងមានកាលវិភាគសងប្រាក់នៅឡើយទេ។', en: 'You currently have no disbursed facilities with scheduled installments.' },
  facility_label: { km: 'ឥណទាន:', en: 'Facility:' },
  due_on_date: { km: 'ផុតកំណត់នៅ', en: 'Due on' },
  installment_label: { km: 'ដំណាក់កាល', en: 'Installment' },
  view_text: { km: 'មើល', en: 'View' },
  apr_rate: { km: 'អត្រាការប្រាក់ប្រចាំឆ្នាំ (APR)', en: 'APR' },

  // Status Labels
  status_active: { km: 'សកម្ម', en: 'ACTIVE' },
  status_paid: { km: 'បានបង់រួច', en: 'PAID' },
  status_overdue: { km: 'ហួសកាលកំណត់', en: 'OVERDUE' },
  status_partial: { km: 'បង់បានខ្លះ', en: 'PARTIAL' },
  status_unpaid: { km: 'មិនទាន់បង់', en: 'UNPAID' },
  status_upcoming: { km: 'ជិតមកដល់', en: 'UPCOMING' },
  status_completed: { km: 'បានបញ្ចប់', en: 'COMPLETED' },
  status_pending: { km: 'កំពុងរង់ចាំ', en: 'PENDING' },
  status_approved: { km: 'បានអនុម័ត', en: 'APPROVED' },
  status_rejected: { km: 'បានបដិសេធ', en: 'REJECTED' },

  // Borrower Payment Modal (Sections 1, 5, 17, 24)
  modal_payment_title: { km: 'បង់ប្រាក់កម្ចី', en: 'Make Payment' },
  modal_confirm_title: { km: 'ផ្ទៀងផ្ទាត់ការបង់ប្រាក់', en: 'Confirm Payment' },
  modal_success_title: { km: 'ការបង់ប្រាក់បានជោគជ័យ ✓', en: 'Payment Successful ✓' },
  modal_installment_info: { km: 'ព័ត៌មានដំណាក់កាលត្រូវបង់', en: 'Installment Due Info' },
  modal_already_paid: { km: 'បានបង់រួច', en: 'Already Paid' },
  modal_remaining: { km: 'នៅសល់ត្រូវបង់', en: 'Remaining' },
  modal_total_outstanding: { km: 'សមតុល្យកម្ចីនៅសល់សរុប:', en: 'Total Loan Outstanding:' },
  modal_payment_amount: { km: 'ចំនួនទឹកប្រាក់ត្រូវបង់', en: 'Payment Amount' },
  modal_waterfall_note: { km: 'គាំទ្រការបង់ខ្លះ ឬផ្ដាច់ទាំងស្រុង ដោយបែងចែកតាមលំដាប់កាលវិភាគដោយស្វ័យប្រវត្តិ។', en: 'Supports partial settlement or full payoff with automatic waterfall allocation.' },
  modal_payment_method: { km: 'វិធីសាស្ត្របង់ប្រាក់', en: 'Payment Method' },
  modal_ref_number: { km: 'លេខយោង / លេខប្រតិបត្តិការ', en: 'Reference / Transaction Number' },
  modal_ref_help: { km: 'លេខកូដយោងបង្កើតដោយស្វ័យប្រវត្តិ ឬបញ្ចូលលេខកូដបង្កាន់ដៃធនាគារ។', en: 'Unique reference generated automatically or enter bank slip code.' },
  modal_btn_installment: { km: 'ដំណាក់កាលនេះ', en: 'Installment' },
  modal_btn_payoff: { km: 'បង់ផ្ដាច់', en: 'Pay Off' },
  modal_confirm_desc: { km: 'សូមពិនិត្យព័ត៌មានបង់ប្រាក់របស់អ្នកមុនពេលបញ្ជាក់។ ប្រព័ន្ធនឹងធ្វើការកាត់កងភ្លាមៗក្នុងបញ្ជីគណនេយ្យ PostgreSQL។', en: 'Please review your payment information before submission. Once confirmed, the amount will be immediately processed by the backend ledger.' },
  modal_loan_account: { km: 'គណនីកម្ចី:', en: 'Loan Account:' },
  modal_amount_label: { km: 'ចំនួនទឹកប្រាក់:', en: 'Payment Amount:' },
  modal_method_label: { km: 'វិធីសាស្ត្របង់ប្រាក់:', en: 'Payment Method:' },
  modal_ref_label: { km: 'លេខយោងប្រតិបត្តិការ:', en: 'Transaction Reference:' },
  modal_est_balance_after: { km: 'សមតុល្យនៅសល់ប៉ាន់ស្មាន:', en: 'Estimated Balance After:' },
  modal_waterfall_rule: { km: 'ការបង់ប្រាក់នឹងកាត់កងតាមលំដាប់កាលបរិច្ឆេទចាស់ជាងគេមុន។', en: 'Payments are settled in chronological waterfall order, clearing oldest overdue installments first.' },
  modal_processing: { km: 'កំពុងដំណើរការបង់ប្រាក់...', en: 'Processing Payment...' },
  modal_success_desc: { km: 'ការបង់ប្រាក់របស់អ្នកត្រូវបានកត់ត្រាដោយជោគជ័យក្នុងបញ្ជីគណនេយ្យ PostgreSQL។', en: 'Your payment has been successfully recorded in the PostgreSQL ledger.' },
  modal_paid_amount: { km: 'ចំនួនទឹកប្រាក់បានបង់', en: 'Amount Paid' },
  modal_remaining_balance: { km: 'សមតុល្យនៅសល់', en: 'Remaining Balance' },
  modal_receipt_number: { km: 'លេខបង្កាន់ដៃ', en: 'Receipt No' },
  modal_fully_completed: { km: '🎉 កម្ចីនេះត្រូវបានទូទាត់សងគ្រប់ចំនួន និងបានបញ្ចប់ជាស្ថាពរ!', en: '🎉 Facility Fully Paid & Completed!' },

  // Payment Methods
  method_bank_transfer: { km: 'ផ្ទេរប្រាក់តាមធនាគារ', en: 'Bank Transfer' },
  method_qr_payment: { km: 'ស្កេនទូទាត់ KHQR / QR', en: 'QR Code / KHQR' },
  method_card: { km: 'កាតឥណទាន / ឥណពន្ធ', en: 'Debit / Card' },
  method_cash: { km: 'សាច់ប្រាក់នៅសាខា', en: 'Cash at Branch' },

  // Official Receipt Thermal Slip
  slip_title: { km: 'បង្កាន់ដៃបង់ប្រាក់ផ្លូវការ', en: 'OFFICIAL PAYMENT RECEIPT' },
  slip_loan_number: { km: 'លេខកម្ចី', en: 'Loan Number' },
  slip_client: { km: 'អតិថិជន', en: 'Client Borrower' },
  slip_payment_date: { km: 'កាលបរិច្ឆេទបង់', en: 'Payment Date' },
  slip_cashier: { km: 'បុគ្គលិក / បញ្ជរ', en: 'Cashier / Terminal' },
  slip_principal_settled: { km: 'ប្រាក់ដើមកាត់កង', en: 'Principal Settled' },
  slip_interest_settled: { km: 'ការប្រាក់កាត់កង', en: 'Interest Settled' },
  slip_late_fee: { km: 'ប្រាក់ពិន័យយឺត', en: 'Late Fee / Penalties' },
  slip_balance_after: { km: 'សមតុល្យនៅសល់', en: 'Remaining Balance' },
  slip_thank_you: { km: 'សូមអរគុណចំពោះការទូទាត់ប្រាក់ទាន់ពេលវេលារបស់លោកអ្នក!', en: 'Thank you for your prompt repayment!' },

  // Currency & Languages
  lang_km: { km: 'ភាសាខ្មែរ', en: 'Khmer' },
  lang_en: { km: 'អង់គ្លេស', en: 'English' },
  currency_usd: { km: 'ដុល្លារ ($)', en: 'USD ($)' },
  currency_khr: { km: 'រៀល (៛)', en: 'KHR (៛)' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Default language is Khmer ('km') as requested
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('apex_language');
    if (saved === 'en' || saved === 'km') return saved;
    return 'km';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('apex_language', lang);
    document.documentElement.lang = lang;
  };

  const toggleLanguage = () => {
    setLanguage(language === 'km' ? 'en' : 'km');
  };

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = (key: string, fallback?: string): string => {
    const item = TRANSLATIONS[key];
    if (item && item[language]) {
      return item[language];
    }
    if (fallback !== undefined) {
      return fallback;
    }
    if (item && item.en) {
      return item.en;
    }
    return key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};

export default LanguageContext;
