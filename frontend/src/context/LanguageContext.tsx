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

  // Navigation Items
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

  // Section Headers
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
  btn_save_changes: { km: 'រក្សាទុកការផ្លាស់ប្តូរ', en: 'Save Changes' },
  btn_change_password: { km: 'ប្តូរពាក្យសម្ងាត់', en: 'Change Password' },

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
  view_text: { km: 'មើល', en: 'View' },

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

  // Wizard Steps & Labels
  step_product: { km: 'ផលិតផលកម្ចី', en: 'Product' },
  step_terms: { km: 'លក្ខខណ្ឌ & គណនា', en: 'Terms & Calculator' },
  step_documents: { km: 'ឯកសារភ្ជាប់', en: 'Documents' },
  step_review: { km: 'ពិនិត្យឡើងវិញ', en: 'Review' },
  wizard_apply_title: { km: 'ស្នើសុំឥណទានថ្មី', en: 'Apply for Loan' },
  wizard_select_applicant: { km: 'ជ្រើសរើសអ្នកខ្ចី / អ្នកស្នើសុំ', en: 'Select Borrower / Applicant' },
  wizard_loan_facility: { km: 'ជ្រើសរើសប្រភេទឥណទាន', en: 'Select Loan Facility' },
  wizard_requested_amount: { km: 'ចំនួនទឹកប្រាក់កម្ចីស្នើសុំ', en: 'Requested Principal Amount' },
  wizard_tenure: { km: 'រយៈពេលសងកម្ចី', en: 'Repayment Tenure' },
  wizard_frequency: { km: 'ភាពញឹកញាប់នៃការបង់ប្រាក់', en: 'Repayment Frequency' },
  wizard_freq_monthly: { km: 'ប្រចាំខែ', en: 'Monthly' },
  wizard_freq_biweekly: { km: 'រៀងរាល់ពីរសប្តាហ៍', en: 'Bi-Weekly' },
  wizard_freq_weekly: { km: 'ប្រចាំសប្តាហ៍', en: 'Weekly' },
  wizard_purpose: { km: 'គោលបំណងនៃការខ្ចីប្រាក់', en: 'Purpose of Loan' },
  wizard_live_summary: { km: 'ការគណនាប្រាក់បង់ប៉ាន់ស្មាន', en: 'Live Payment Summary' },
  wizard_monthly_payment: { km: 'ប្រាក់បង់ប្រចាំខែ', en: 'Monthly Payment' },
  wizard_total_interest: { km: 'ការប្រាក់សរុប', en: 'Total Interest' },
  wizard_total_repayment: { km: 'ទឹកប្រាក់សងសរុប', en: 'Total Repayment' },
  wizard_upload_id: { km: 'អត្តសញ្ញាណប័ណ្ណ / លិខិតឆ្លងដែន', en: 'National ID / Passport' },
  wizard_upload_income: { km: 'ភស្តុតាងប្រាក់ចំណូល / ប្រាក់ខែ', en: 'Proof of Income' },
  wizard_upload_collateral: { km: 'ឯកសារទ្រព្យបញ្ចាំ / ធានា', en: 'Collateral / Guarantee' },
  wizard_dropzone_text: { km: 'អូសទម្លាក់ឯកសារ ឬចុចដើម្បីផ្ទុកឡើង (PDF, PNG, JPG)', en: 'Drag & drop or click to upload (PDF, PNG, JPG)' },
  wizard_submit_btn: { km: 'ដាក់ពាក្យស្នើសុំឥណទាន', en: 'Submit Application' },
  wizard_save_draft_btn: { km: 'រក្សាទុកជាព្រាង', en: 'Save as Draft' },
  wizard_next_btn: { km: 'បន្តទៅមុខ', en: 'Continue' },
  wizard_prev_btn: { km: 'ត្រឡប់ក្រោយ', en: 'Back' },

  // User Settings Tabs
  tab_profile: { km: 'ព័ត៌មានផ្ទាល់ខ្លួន & អត្តសញ្ញាណ', en: 'Profile & Identity' },
  tab_security: { km: 'សុវត្ថិភាព & ឧបករណ៍', en: 'Security & Devices' },
  tab_notifications: { km: 'ការជូនដំណឹង & សាររំលឹក', en: 'Notifications & Alerts' },
  tab_preferences: { km: 'ការកំណត់ & ភាសា', en: 'Preferences & Language' },
  tab_banking: { km: 'គណនីធនាគារ & បើកផ្តល់', en: 'Bank & Payouts' },
  tab_privacy: { km: 'ទិន្នន័យ & ឯកជនភាព', en: 'Data & Privacy' },

  // User Settings Fields & Descriptions
  settings_title: { km: 'ការកំណត់គណនី & ចំណូលចិត្ត', en: 'Account Settings' },
  settings_subtitle: { km: 'គ្រប់គ្រងព័ត៌មានផ្ទាល់ខ្លួន ឧបករណ៍សុវត្ថិភាព ការជូនដំណឹង និងរូបិយប័ណ្ណ។', en: 'Manage your credentials, notification channels, security controls, and operational preferences.' },
  personal_info_title: { km: 'ព័ត៌មានផ្ទាល់ខ្លួន & ទំនាក់ទំនង', en: 'Personal & Contact Information' },
  personal_info_desc: { km: 'ព័ត៌មានផ្លូវការប្រើប្រាស់សម្រាប់ដំណើរការកម្ចី និងការផ្ទៀងផ្ទាត់ CBC។', en: 'Official credentials utilized for loan underwriting, National Bank of Cambodia reporting, and credit evaluation.' },
  full_legal_name: { km: 'ឈ្មោះពេញតាមផ្លូវច្បាប់', en: 'Full Legal Name' },
  registered_email: { km: 'អាសយដ្ឋានអ៊ីមែលដែលបានចុះឈ្មោះ', en: 'Registered Email Address' },
  mobile_phone: { km: 'លេខទូរស័ព្ទទំនាក់ទំនង', en: 'Mobile Phone Number' },
  national_id_number: { km: 'លេខអត្តសញ្ញាណប័ណ្ណ / លិខិតឆ្លងដែន', en: 'National ID / Passport Number' },
  operating_branch: { km: 'សាខាប្រតិបត្តិការ / បរិវេណសាលា', en: 'Operating Bank Branch / Campus' },
  occupation_dept: { km: 'មុខរបរចម្បង / ផ្នែក', en: 'Primary Occupation / Department' },
  password_credentials: { km: 'ពាក្យសម្ងាត់ & អត្តសញ្ញាណសម្ងាត់', en: 'Password & Credentials' },
  password_desc: { km: 'សូមប្រាកដថាគណនីរបស់អ្នកប្រើប្រាស់ពាក្យសម្ងាត់រឹងមាំ និងមានសុវត្ថិភាព។', en: 'Ensure your account uses a strong, complex password updated periodically.' },
  account_password: { km: 'ពាក្យសម្ងាត់គណនី', en: 'Account Access Password' },
  two_factor_auth: { km: 'ការផ្ទៀងផ្ទាត់ពីរជំហាន & គោលការណ៍ចូលប្រព័ន្ធ', en: 'Two-Factor Authentication & Login Policy' },
  two_factor_desc: { km: 'កំណត់ពេលណាដែលត្រូវទាមទារលេខកូដ OTP សម្រាប់ការចូលប្រព័ន្ធលើកក្រោយ។', en: 'Configure when verification one-time passwords (OTP) are enforced on subsequent logins.' },
  bypass_otp_trusted: { km: 'រំលង OTP លើឧបករណ៍ដែលធ្លាប់ចូលរួច', en: 'Bypass OTP on Recognized Devices' },
  bypass_otp_desc: { km: 'អ្នកប្រើប្រាស់ដែលធ្លាប់បានចូលរួចហើយ នឹងចូលដោយផ្ទាល់ជាមួយពាក្យសម្ងាត់ដោយមិនបាច់រង់ចាំ OTP។', en: 'Users who have previously logged in and verified will directly enter their password without waiting for an OTP.' },
  enforce_otp_actions: { km: 'តម្រូវឱ្យមាន OTP សម្រាប់ប្រតិបត្តិការហិរញ្ញវត្ថុ', en: 'Enforce OTP on Sensitive Financial Actions' },
  enforce_otp_actions_desc: { km: 'តម្រូវឱ្យផ្ញើ OTP ទៅកាន់អ៊ីមែលមុនពេលផ្លាស់ប្តូរគណនីធនាគារបើកផ្តល់ប្រាក់កម្ចី។', en: 'Require an OTP dispatch to your email before authorizing loan disbursement account changes or large transfers.' },
  session_auto_lock: { km: 'ចាក់សោស្វ័យប្រវត្តិនាពេលអសកម្ម', en: 'Inactivity Session Auto-Lock' },
  session_auto_lock_desc: { km: 'ចាកចេញពីប្រព័ន្ធដោយស្វ័យប្រវត្តិនាពេលអសកម្ម ដើម្បីសុវត្ថិភាពគណនីធនាគារ។', en: 'Automatically terminate active browser tokens if idle to comply with banking session safety.' },
  active_sessions_title: { km: 'ឧបករណ៍ & សម័យប្រជុំកំពុងដំណើរការ', en: 'Active Devices & Sessions' },
  active_sessions_desc: { km: 'គ្រប់គ្រងឧបករណ៍ និងកម្មវិធីរុករកគេហទំព័រដែលមានសិទ្ធិចូលប្រើគណនីរបស់អ្នក។', en: 'Manage web browsers and devices that have active token credentials for your profile.' },
  sign_out_other_devices: { km: 'ចាកចេញពីឧបករណ៍ផ្សេងទៀតទាំងអស់', en: 'Sign Out Other Devices' },
  this_device: { km: 'ឧបករណ៍នេះ', en: 'This Device' },
  revoke: { km: 'លុបចោល', en: 'Revoke' },
  repayment_notices: { km: 'ការជូនដំណឹងអំពីកាលបរិច្ឆេទដល់កំណត់បង់', en: 'Repayment Due Date Notices' },
  repayment_notices_desc: { km: 'ជួយឱ្យអ្នកមិនខកខានការបង់ប្រាក់ និងជៀសវាងការផាកពិន័យ។', en: 'Ensure you never miss installment payments or incur delinquency penalties.' },
  upcoming_due_alert: { km: 'ការជូនដំណឹងអំពីការបង់ប្រាក់ជិតដល់កំណត់', en: 'Upcoming Payment Due Notification' },
  reminder_lead_time: { km: 'ពេលវេលារំលឹកជាមុន', en: 'Reminder Lead Time' },
  same_day_alert: { km: 'ការជូនដំណឹងនៅថ្ងៃដល់កំណត់ (ម៉ោង ៨:០០ ព្រឹក)', en: 'Same-Day Due Alert (8:00 AM)' },
  overdue_escalation: { km: 'ការជូនដំណឹងអំពីកម្ចីហួសកាលកំណត់ & ការផាកពិន័យ', en: 'Overdue Delinquency Escalation Notice' },
  disbursement_alerts: { km: 'ការជូនដំណឹងអំពីការបើកផ្តល់ប្រាក់កម្ចី', en: 'Loan Disbursement Alerts' },
  payment_receipts_notif: { km: 'បង្កាន់ដៃបង់ប្រាក់ផ្លូវការស្វ័យប្រវត្តិ', en: 'Automated Official Payment Receipts' },
  monthly_statement_notif: { km: 'របាយការណ៍កម្ចីប្រចាំខែ', en: 'Monthly Consolidated Loan Statement' },
  delivery_channels: { km: 'បណ្តាញទទួលសារ & ការជូនដំណឹង', en: 'Delivery Communication Channels' },
  email_channel: { km: 'បណ្តាញអ៊ីមែល', en: 'Email Notification Channel' },
  sms_channel: { km: 'បណ្តាញសារបន្ទាន់ SMS', en: 'SMS Urgent Dispatch' },
  ledger_currency_title: { km: 'រូបិយប័ណ្ណគោលក្នុងបញ្ជី', en: 'Ledger Base Currency' },
  ledger_currency_desc: { km: 'ជ្រើសរើសរូបិយប័ណ្ណដែលអ្នកពេញចិត្តរវាងប្រាក់ដុល្លារអាមេរិក ($) និងប្រាក់រៀលខ្មែរ (៛)។', en: 'Select your preferred reporting and transaction ledger currency between United States Dollars and Khmer Riel.' },
  interface_language_title: { km: 'ភាសាប្រព័ន្ធ (Interface Language)', en: 'Interface Language' },
  interface_language_desc: { km: 'ផ្លាស់ប្តូរយ៉ាងរលូនរវាងភាសាខ្មែរ (ជាមួយពុម្ពអក្សរសួស្តី Suwannaphum) និងភាសាអង់គ្លេស។', en: 'Switch seamlessly between Khmer (with Suwannaphum font rendering) and English.' },
  appearance_theme_title: { km: 'រចនាប័ទ្មពណ៌', en: 'Appearance Theme' },
  regional_formats_title: { km: 'ស្តង់ដារកាលបរិច្ឆេទ & ទម្រង់លេខ', en: 'Regional Date & Format Standards' },
  linked_banks_title: { km: 'គណនីធនាគារដែលបានភ្ជាប់សម្រាប់បើកផ្តល់ប្រាក់កម្ចី', en: 'Linked Bank Accounts for Disbursement' },
  linked_banks_desc: { km: 'ស្ថាប័នធនាគារកម្ពុជាដែលបានផ្ទៀងផ្ទាត់ភ្ជាប់ជាមួយគណនីរបស់អ្នកសម្រាប់ទទួលប្រាក់កម្ចី។', en: 'Verified Cambodian banking institutions linked with your profile for loan disbursement and auto-debit servicing.' },
  link_new_bank: { km: 'ភ្ជាប់គណនីធនាគារថ្មី', en: 'Link New Bank Account' },
  primary_disbursement: { km: 'គណនីចម្បង', en: 'PRIMARY DISBURSEMENT' },
  make_primary: { km: 'កំណត់ជាចម្បង', en: 'Make Primary' },
  account_statements_export: { km: 'របាយការណ៍គណនី & ការទាញយកទិន្នន័យ', en: 'Account Statements & Data Export' },
  download_statement_pdf: { km: 'ទាញយករបាយការណ៍ (PDF)', en: 'Download Statement (PDF)' },
  export_transactions_csv: { km: 'ទាញយកកំណត់ត្រាប្រតិបត្តិការ (CSV)', en: 'Export Transactions (CSV)' },
  danger_zone_title: { km: 'ការគ្រប់គ្រងគណនី & តំបន់ប្រុងប្រយ័ត្ន', en: 'Account Controls & Danger Zone' },
  temp_account_freeze: { km: 'ផ្អាកគណនីបណ្តោះអាសន្ន', en: 'Temporary Account Freeze' },
  request_freeze: { km: 'ស្នើសុំផ្អាកគណនី', en: 'Request Freeze' },

  // Currency & Languages
  lang_km: { km: 'ភាសាខ្មែរ', en: 'Khmer' },
  lang_en: { km: 'អង់គ្លេស', en: 'English' },
  currency_usd: { km: 'ដុល្លារ ($)', en: 'USD ($)' },
  currency_khr: { km: 'រៀល (៛)', en: 'KHR (៛)' },
};

/**
 * Universal phrase dictionary to ensure 100% translation coverage throughout the entire application.
 */
export const PHRASE_TRANSLATIONS: { [phrase: string]: { km: string; en: string } } = {
  // Breadcrumbs & Titles
  'Executive Dashboard': { km: 'ផ្ទាំងគ្រប់គ្រងប្រតិបត្តិ', en: 'Executive Dashboard' },
  'Operational Overview': { km: 'ទិដ្ឋភាពទូទៅនៃប្រតិបត្តិការ', en: 'Operational Overview' },
  'User Portal': { km: 'ច្រកទ្វារអតិថិជន', en: 'User Portal' },
  'My Dashboard': { km: 'ផ្ទាំងគ្រប់គ្រងរបស់ខ្ញុំ', en: 'My Dashboard' },
  'Institutional Registry': { km: 'បញ្ជីស្ថាប័ន', en: 'Institutional Registry' },
  'Borrowers Directory': { km: 'បញ្ជីព័ត៌មានអ្នកខ្ចី', en: 'Borrowers Directory' },
  'Loan Origination': { km: 'ការចាប់ផ្តើមកម្ចី', en: 'Loan Origination' },
  'Pipeline Stages': { km: 'ដំណាក់កាលដំណើរការ', en: 'Pipeline Stages' },
  'New Loan Wizard': { km: 'ទម្រង់ស្នើសុំកម្ចីថ្មី', en: 'New Loan Wizard' },
  'Underwriting': { km: 'ការពិនិត្យឥណទាន', en: 'Underwriting' },
  'Credit Review Queue': { km: 'ជួរពិនិត្យឥណទាន', en: 'Credit Review Queue' },
  'Credit Committee': { km: 'គណៈកម្មការឥណទាន', en: 'Credit Committee' },
  'Executive Approvals Queue': { km: 'ជួរអនុម័តថ្នាក់ដឹកនាំ', en: 'Executive Approvals Queue' },
  'Treasury & Cashier': { km: 'រតនាគារ & បេឡា', en: 'Treasury & Cashier' },
  'Disbursements Queue': { km: 'ជួរបើកផ្តល់ប្រាក់កម្ចី', en: 'Disbursements Queue' },
  'Core Banking': { km: 'ធនាគារស្នូល', en: 'Core Banking' },
  'Active Facilities Directory': { km: 'បញ្ជីកម្ចីសកម្ម', en: 'Active Facilities Directory' },
  'Borrower Facilities': { km: 'កម្ចីរបស់អ្នកខ្ចី', en: 'Borrower Facilities' },
  'Cashier Desk': { km: 'បញ្ជរបេឡា', en: 'Cashier Desk' },
  'Payment Collection Terminal': { km: 'ស្ថានីយប្រមូលប្រាក់បង់', en: 'Payment Collection Terminal' },
  'Risk Management': { km: 'ការគ្រប់គ្រងហានិភ័យ', en: 'Risk Management' },
  'Overdue Delinquency Watchlist': { km: 'បញ្ជីតាមដានកម្ចីហួសកាលកំណត់', en: 'Overdue Delinquency Watchlist' },
  'Product Administration': { km: 'ការគ្រប់គ្រងផលិតផល', en: 'Product Administration' },
  'Loan Products Catalog': { km: 'កាតាឡុកផលិតផលកម្ចី', en: 'Loan Products Catalog' },
  'Business Intelligence': { km: 'ព័ត៌មាន & វិភាគពាណិជ្ជកម្ម', en: 'Business Intelligence' },
  'Portfolio Reports Studio': { km: 'ស្ទូឌីយោរបាយការណ៍ផលប័ត្រ', en: 'Portfolio Reports Studio' },
  'Communication': { km: 'ការទំនាក់ទំនង', en: 'Communication' },
  'Notification Center': { km: 'មជ្ឈមណ្ឌលជូនដំណឹង', en: 'Notification Center' },
  'System Governance': { km: 'អភិបាលកិច្ចប្រព័ន្ធ', en: 'System Governance' },
  'Immutable Audit Trail': { km: 'កំណត់ហេតុសវនកម្មប្រព័ន្ធ', en: 'Immutable Audit Trail' },
  'Administration': { km: 'រដ្ឋបាល', en: 'Administration' },
  'User Roles & Access Control': { km: 'តួនាទីអ្នកប្រើប្រាស់ & សិទ្ធិចូលដំណើរការ', en: 'User Roles & Access Control' },
  'System Settings & Lending Policies': { km: 'ការកំណត់ប្រព័ន្ធ & គោលនយោបាយកម្ចី', en: 'System Settings & Lending Policies' },
  'User Profile': { km: 'គណនីអ្នកប្រើប្រាស់', en: 'User Profile' },
  'Account Settings': { km: 'ការកំណត់គណនី', en: 'Account Settings' },
  'Account Security': { km: 'សុវត្ថិភាពគណនី', en: 'Account Security' },
  'Change Password': { km: 'ប្តូរពាក្យសម្ងាត់', en: 'Change Password' },
  'Dashboard': { km: 'ផ្ទាំងគ្រប់គ្រង', en: 'Dashboard' },
  'My Applications': { km: 'ពាក្យស្នើសុំរបស់ខ្ញុំ', en: 'My Applications' },
  'My Loans': { km: 'កម្ចីរបស់ខ្ញុំ', en: 'My Loans' },
  'Repayment Schedule': { km: 'កាលវិភាគសងប្រាក់', en: 'Repayment Schedule' },
  'Payments': { km: 'ការបង់ប្រាក់', en: 'Payments' },
  'Applications': { km: 'ពាក្យស្នើសុំ', en: 'Applications' },
  'Loans': { km: 'បញ្ជីកម្ចី', en: 'Loans' },
  'Borrowers': { km: 'បញ្ជីអ្នកខ្ចី', en: 'Borrowers' },
  'Loan Products': { km: 'ផលិតផលកម្ចី', en: 'Loan Products' },
  'Credit Reviews': { km: 'ពិនិត្យឥណទាន', en: 'Credit Reviews' },
  'Approvals': { km: 'ការអនុម័ត', en: 'Approvals' },
  'Disbursements': { km: 'បើកផ្តល់ប្រាក់កម្ចី', en: 'Disbursements' },
  'Overdue': { km: 'កម្ចីហួសកាលកំណត់', en: 'Overdue' },
  'Reports & Analytics': { km: 'របាយការណ៍ & វិភាគ', en: 'Reports & Analytics' },
  'Users': { km: 'គ្រប់គ្រងអ្នកប្រើប្រាស់', en: 'Users' },
  'Audit Logs': { km: 'កំណត់ហេតុសវនកម្ម', en: 'Audit Logs' },
  'Notifications': { km: 'ការជូនដំណឹង', en: 'Notifications' },
  'Settings': { km: 'ការកំណត់', en: 'Settings' },
  'Profile': { km: 'គណនីរបស់ខ្ញុំ', en: 'Profile' },
  'Sign Out': { km: 'ចាកចេញ', en: 'Sign Out' },
  'Apply for Loan': { km: 'ស្នើសុំកម្ចីថ្មី', en: 'Apply for Loan' },
  'Make Payment': { km: 'បង់ប្រាក់កម្ចី', en: 'Make Payment' },
  'Pay Now': { km: 'បង់ប្រាក់ឥឡូវនេះ', en: 'Pay Now' },
  'Save Changes': { km: 'រក្សាទុកការផ្លាស់ប្តូរ', en: 'Save Changes' },
  'Back': { km: 'ត្រឡប់ក្រោយ', en: 'Back' },
  'Continue': { km: 'បន្ត', en: 'Continue' },
  'Cancel': { km: 'បោះបង់', en: 'Cancel' },
  'Confirm': { km: 'បញ្ជាក់', en: 'Confirm' },
  'Close': { km: 'បិទ', en: 'Close' },
  'View': { km: 'មើល', en: 'View' },
  'Search': { km: 'ស្វែងរក', en: 'Search' },
  'Filter': { km: 'ចម្រោះ', en: 'Filter' },
  'Download': { km: 'ទាញយក', en: 'Download' },
  'Print': { km: 'បោះពុម្ព', en: 'Print' },
  'All Accounts': { km: 'គណនីទាំងអស់', en: 'All Accounts' },
  'Active': { km: 'សកម្ម', en: 'Active' },
  'Completed': { km: 'បានបញ្ចប់', en: 'Completed' },
  'Pending': { km: 'កំពុងរង់ចាំ', en: 'Pending' },
  'Approved': { km: 'បានអនុម័ត', en: 'Approved' },
  'Rejected': { km: 'បានបដិសេធ', en: 'Rejected' },
  'Product': { km: 'ផលិតផលកម្ចី', en: 'Product' },
  'Terms & Calculator': { km: 'លក្ខខណ្ឌ & គណនា', en: 'Terms & Calculator' },
  'Documents': { km: 'ឯកសារភ្ជាប់', en: 'Documents' },
  'Review': { km: 'ពិនិត្យឡើងវិញ', en: 'Review' },
  'Monthly': { km: 'ប្រចាំខែ', en: 'Monthly' },
  'Bi-Weekly': { km: 'រៀងរាល់ពីរសប្តាហ៍', en: 'Bi-Weekly' },
  'Weekly': { km: 'ប្រចាំសប្តាហ៍', en: 'Weekly' },
  'Submit Application': { km: 'ដាក់ពាក្យស្នើសុំឥណទាន', en: 'Submit Application' },
  'Save as Draft': { km: 'រក្សាទុកជាព្រាង', en: 'Save as Draft' },

  // Authentication & Registration
  'Create your account': { km: 'បង្កើតគណនីរបស់អ្នក', en: 'Create your account' },
  'Fast, simple registration. We will send a 6-digit verification code to your email.': {
    km: 'ចុះឈ្មោះរហ័ស និងងាយស្រួល។ យើងនឹងផ្ញើលេខកូដផ្ទៀងផ្ទាត់ ៦ ខ្ទង់ទៅកាន់អ៊ីមែលរបស់អ្នក។',
    en: 'Fast, simple registration. We will send a 6-digit verification code to your email.'
  },
  'Full Name': { km: 'ឈ្មោះពេញ', en: 'Full Name' },
  'Username': { km: 'ឈ្មោះអ្នកប្រើប្រាស់', en: 'Username' },
  'Customize': { km: 'កែសម្រួល', en: 'Customize' },
  'Reset auto': { km: 'កំណត់ស្វ័យប្រវត្តឡើងវិញ', en: 'Reset auto' },
  'Enter custom username': { km: 'បញ្ចូលឈ្មោះអ្នកប្រើប្រាស់', en: 'Enter custom username' },
  'Letters, numbers, dots, and underscores only.': {
    km: 'អក្សរ លេខ សញ្ញាចុច និងសញ្ញា _ ប៉ុណ្ណោះ',
    en: 'Letters, numbers, dots, and underscores only.'
  },
  'Email Address': { km: 'អាសយដ្ឋានអ៊ីមែល', en: 'Email Address' },
  'Registered Email Address': { km: 'អាសយដ្ឋានអ៊ីមែលដែលបានចុះឈ្មោះ', en: 'Registered Email Address' },
  'OTP sent here': { km: 'ផ្ញើ OTP មកកាន់ទីនេះ', en: 'OTP sent here' },
  'Enter your email (Gmail, Yahoo, Outlook, etc.) to receive your 6-digit verification code.': {
    km: 'បញ្ចូលអ៊ីមែលរបស់អ្នកដើម្បីទទួលលេខកូដផ្ទៀងផ្ទាត់ ៦ ខ្ទង់។',
    en: 'Enter your email (Gmail, Yahoo, Outlook, etc.) to receive your 6-digit verification code.'
  },
  'Phone Number': { km: 'លេខទូរស័ព្ទ', en: 'Phone Number' },
  'Password': { km: 'ពាក្យសម្ងាត់', en: 'Password' },
  'Confirm Password': { km: 'បញ្ជាក់ពាក្យសម្ងាត់', en: 'Confirm Password' },
  'Repeat your password': { km: 'បញ្ចូលពាក្យសម្ងាត់ម្តងទៀត', en: 'Repeat your password' },
  'Strength:': { km: 'កម្រិតសុវត្ថិភាព:', en: 'Strength:' },
  'Weak': { km: 'ខ្សោយ', en: 'Weak' },
  'Fair': { km: 'មធ្យម', en: 'Fair' },
  'Good': { km: 'ល្អ', en: 'Good' },
  'Strong': { km: 'រឹងមាំ', en: 'Strong' },
  'Matches': { km: 'ត្រូវគ្នា', en: 'Matches' },
  'Does not match': { km: 'មិនត្រូវគ្នា', en: 'Does not match' },
  'At least 8 characters': { km: 'យ៉ាងតិច ៨ តួអក្សរ', en: 'At least 8 characters' },
  'Use 8+ characters combining uppercase, lowercase, numbers & symbols.': {
    km: 'ប្រើ ៨+ តួអក្សររួមបញ្ចូលគ្នានូវអក្សរធំ អក្សរតូច លេខ និងនិមិត្តសញ្ញា។',
    en: 'Use 8+ characters combining uppercase, lowercase, numbers & symbols.'
  },
  'Create Account & Continue': { km: 'បង្កើតគណនី & បន្ត', en: 'Create Account & Continue' },
  'Sending verification code...': { km: 'កំពុងផ្ញើលេខកូដផ្ទៀងផ្ទាត់...', en: 'Sending verification code...' },
  'Already have an account?': { km: 'មានគណនីរួចហើយ?', en: 'Already have an account?' },
  'Sign in': { km: 'ចូលគណនី', en: 'Sign in' },
  'Bank-grade 256-bit encryption • Your privacy is protected': {
    km: 'ការអ៊ិនគ្រីបកម្រិតធនាគារ ២៥៦ ប៊ីត • ភាពឯកជនរបស់អ្នកត្រូវបានការពារ',
    en: 'Bank-grade 256-bit encryption • Your privacy is protected'
  },
  'Compliant with National Bank of Cambodia Standards': {
    km: 'អនុលោមតាមស្តង់ដារធនាគារជាតិនៃកម្ពុជា',
    en: 'Compliant with National Bank of Cambodia Standards'
  },

  // Password Recovery & OTP
  'Password Recovery': { km: 'ស្តារពាក្យសម្ងាត់', en: 'Password Recovery' },
  'Enter your registered email address to receive a 6-digit verification code.': {
    km: 'បញ្ចូលអាសយដ្ឋានអ៊ីមែលដែលបានចុះឈ្មោះដើម្បីទទួលលេខកូដផ្ទៀងផ្ទាត់ ៦ ខ្ទង់។',
    en: 'Enter your registered email address to receive a 6-digit verification code.'
  },
  'Send Reset Code': { km: 'ផ្ញើលេខកូដកំណត់ឡើងវិញ', en: 'Send Reset Code' },
  'Sending code...': { km: 'កំពុងផ្ញើលេខកូដ...', en: 'Sending code...' },
  'Back to Sign in': { km: 'ត្រឡប់ទៅចូលគណនី', en: 'Back to Sign in' },
  'Verification Code': { km: 'លេខកូដផ្ទៀងផ្ទាត់', en: 'Verification Code' },
  'Security Verification': { km: 'ការផ្ទៀងផ្ទាត់សុវត្ថិភាព', en: 'Security Verification' },
  'Resend Code': { km: 'ផ្ញើលេខកូដម្តងទៀត', en: 'Resend Code' },
  'Resend in': { km: 'ផ្ញើម្តងទៀតក្នុងរយៈពេល', en: 'Resend in' },
  'Verify & Continue': { km: 'ផ្ទៀងផ្ទាត់ & បន្ត', en: 'Verify & Continue' },
  'Verifying code...': { km: 'កំពុងផ្ទៀងផ្ទាត់លេខកូដ...', en: 'Verifying code...' },
  'Set New Password': { km: 'កំណត់ពាក្យសម្ងាត់ថ្មី', en: 'Set New Password' },
  'Create a new, strong password for your account.': {
    km: 'បង្កើតពាក្យសម្ងាត់ថ្មី និងរឹងមាំសម្រាប់គណនីរបស់អ្នក។',
    en: 'Create a new, strong password for your account.'
  },
  'Reset Password & Continue': { km: 'កំណត់ពាក្យសម្ងាត់ឡើងវិញ & បន្ត', en: 'Reset Password & Continue' },
  'Resetting password...': { km: 'កំពុងកំណត់ពាក្យសម្ងាត់ឡើងវិញ...', en: 'Resetting password...' },
  'Current Password': { km: 'ពាក្យសម្ងាត់បច្ចុប្បន្ន', en: 'Current Password' },
  'New Password': { km: 'ពាក្យសម្ងាត់ថ្មី', en: 'New Password' },
  'Confirm New Password': { km: 'បញ្ជាក់ពាក្យសម្ងាត់ថ្មី', en: 'Confirm New Password' },
  'Update Password': { km: 'ធ្វើបច្ចុប្បន្នភាពពាក្យសម្ងាត់', en: 'Update Password' },
  'Updating password...': { km: 'កំពុងធ្វើបច្ចុប្បន្នភាពពាក្យសម្ងាត់...', en: 'Updating password...' },

  // Profile & User Info
  'Personal & Account Details': { km: 'ព័ត៌មានផ្ទាល់ខ្លួន & គណនី', en: 'Personal & Account Details' },
  'Edit Information': { km: 'កែសម្រួលព័ត៌មាន', en: 'Edit Information' },
  'Edit Profile': { km: 'កែសម្រួលព័ត៌មានផ្ទាល់ខ្លួន', en: 'Edit Profile' },
  'Close Editor': { km: 'បិទការកែសម្រួល', en: 'Close Editor' },
  'Overview': { km: 'ទិដ្ឋភាពទូទៅ', en: 'Overview' },
  'Password & Security': { km: 'ពាក្យសម្ងាត់ & សុវត្ថិភាព', en: 'Password & Security' },
  'Security': { km: 'សុវត្ថិភាព', en: 'Security' },
  'System Administrator': { km: 'អ្នកគ្រប់គ្រងប្រព័ន្ធ', en: 'System Administrator' },
  'Client Borrower': { km: 'អតិថិជនអ្នកខ្ចី', en: 'Client Borrower' },
  'Borrower User': { km: 'អ្នកប្រើប្រាស់កម្ចី', en: 'Borrower User' },
  'Administrator': { km: 'អ្នកគ្រប់គ្រង', en: 'Administrator' },
  'Admin': { km: 'អ្នកគ្រប់គ្រង', en: 'Admin' },
  'User': { km: 'អ្នកប្រើប្រាស់', en: 'User' },

  // Pipelines & Stages
  'Loan Applications Pipeline': { km: 'ដំណាក់កាលពាក្យស្នើសុំកម្ចី', en: 'Loan Applications Pipeline' },
  'New Application': { km: 'ពាក្យស្នើសុំថ្មី', en: 'New Application' },
  'All': { km: 'ទាំងអស់', en: 'All' },
  'Draft': { km: 'ព្រាង', en: 'Draft' },
  'Submitted': { km: 'បានដាក់ស្នើ', en: 'Submitted' },
  'Under Review': { km: 'កំពុងពិនិត្យ', en: 'Under Review' },
  'Application ID': { km: 'លេខសម្គាល់ពាក្យស្នើ', en: 'Application ID' },
  'Applicant Borrower': { km: 'អ្នកស្នើសុំខ្ចី', en: 'Applicant Borrower' },
  'Credit Product': { km: 'ផលិតផលឥណទាន', en: 'Credit Product' },
  'Requested Capital': { km: 'ទំហំដើមទុនស្នើសុំ', en: 'Requested Capital' },
  'Tenure': { km: 'រយៈពេល', en: 'Tenure' },
  'Underwriting Status': { km: 'ស្ថានភាពពិនិត្យឥណទាន', en: 'Underwriting Status' },
  'Action': { km: 'សកម្មភាព', en: 'Action' },
  'Files': { km: 'ឯកសារ', en: 'Files' },
  'No applications found': { km: 'មិនមានពាក្យស្នើសុំទេ', en: 'No applications found' },
  'Try adjusting your search criteria or create a new loan application.': {
    km: 'សូមសាកល្បងផ្លាស់ប្តូរលក្ខខណ្ឌស្វែងរក ឬបង្កើតពាក្យស្នើសុំថ្មី។',
    en: 'Try adjusting your search criteria or create a new loan application.'
  },
  'Search by ID, borrower, product...': {
    km: 'ស្វែងរកតាមលេខសម្គាល់ អ្នកខ្ចី ផលិតផល...',
    en: 'Search by ID, borrower, product...'
  },

  // Notifications
  'Mark all as read': { km: 'សម្គាល់ថាបានអានទាំងអស់', en: 'Mark all as read' },
  'unread': { km: 'មិនទាន់អាន', en: 'unread' },
  'Unread': { km: 'មិនទាន់អាន', en: 'Unread' },
  'Payment Due': { km: 'ដល់កំណត់បង់', en: 'Payment Due' },
  'Approval': { km: 'ការអនុម័ត', en: 'Approval' },
  'Alert': { km: 'ការដាស់តឿន', en: 'Alert' },
  'No notifications': { km: 'គ្មានការជូនដំណឹងទេ', en: 'No notifications' },
  'System notices, repayment schedules, approval alerts, and institutional dispatches.': {
    km: 'ការជូនដំណឹងប្រព័ន្ធ កាលវិភាគសងប្រាក់ ការអនុម័ត និងសារស្ថាប័ន។',
    en: 'System notices, repayment schedules, approval alerts, and institutional dispatches.'
  },

  // Zero states & common notices
  'No Active Loan Facilities': { km: 'គ្មានកម្ចីសកម្មនៅឡើយទេ', en: 'No Active Loan Facilities' },
  'You currently do not have any active loans. Submit an application to get approved for our low-rate loan products.': {
    km: 'បច្ចុប្បន្នអ្នកមិនទាន់មានកម្ចីសកម្មណាមួយឡើយ។ សូមដាក់ពាក្យស្នើសុំឥណទានដើម្បីទទួលបានការអនុម័តអត្រាការប្រាក់ទាប។',
    en: 'You currently do not have any active loans. Submit an application to get approved for our low-rate loan products.'
  },
  'No payment receipts found yet. Once payments are recorded, your official receipts will be listed here.': {
    km: 'មិនទាន់មានបង្កាន់ដៃបង់ប្រាក់នៅឡើយទេ។ នៅពេលការបង់ប្រាក់ត្រូវបានកត់ត្រា បង្កាន់ដៃផ្លូវការរបស់អ្នកនឹងបង្ហាញនៅទីនេះ។',
    en: 'No payment receipts found yet. Once payments are recorded, your official receipts will be listed here.'
  },

  // Admin Dashboard & Operations
  'Good morning, Admin': { km: 'អរុណសួស្តី អ្នកគ្រប់គ្រង', en: 'Good morning, Admin' },
  'Approvals Queue': { km: 'ជួរការអនុម័ត', en: 'Approvals Queue' },
  'TOTAL BORROWERS': { km: 'អ្នកខ្ចីសរុប', en: 'TOTAL BORROWERS' },
  'Total Borrowers': { km: 'អ្នកខ្ចីសរុប', en: 'Total Borrowers' },
  'ACTIVE LOANS': { km: 'កម្ចីសកម្ម', en: 'ACTIVE LOANS' },
  'Active Loans': { km: 'កម្ចីសកម្ម', en: 'Active Loans' },
  'PENDING APPLICATIONS': { km: 'ពាក្យស្នើសុំរង់ចាំ', en: 'PENDING APPLICATIONS' },
  'Pending Applications': { km: 'ពាក្យស្នើសុំរង់ចាំ', en: 'Pending Applications' },
  'OUTSTANDING BALANCE': { km: 'សមតុល្យនៅសល់', en: 'OUTSTANDING BALANCE' },
  'Outstanding Balance': { km: 'សមតុល្យនៅសល់', en: 'Outstanding Balance' },
  'Registered dossiers': { km: 'បញ្ជីឈ្មោះបានចុះឈ្មោះ', en: 'Registered dossiers' },
  'Currently servicing': { km: 'កំពុងដំណើរការសង', en: 'Currently servicing' },
  'Under review': { km: 'កំពុងត្រួតពិនិត្យ', en: 'Under review' },
  'Active book portfolio': { km: 'ផលប័ត្រកម្ចីសកម្ម', en: 'Active book portfolio' },
  'Approved Loans': { km: 'កម្ចីបានអនុម័ត', en: 'Approved Loans' },
  'Rejected Loans': { km: 'កម្ចីបានបដិសេធ', en: 'Rejected Loans' },
  'Overdue Loans': { km: 'កម្ចីហួសកាលកំណត់', en: 'Overdue Loans' },
  'Total Disbursed': { km: 'បានបើកផ្តល់សរុប', en: 'Total Disbursed' },
  'Total Collected': { km: 'បានប្រមូលសរុប', en: 'Total Collected' },
  'Completed Loans': { km: 'កម្ចីបានបញ្ចប់', en: 'Completed Loans' },
  'Loan Application Overview': { km: 'ទិដ្ឋភាពទូទៅនៃពាក្យស្នើសុំកម្ចី', en: 'Loan Application Overview' },
  'Origination pipeline and committee disposition': { km: 'ដំណើរការស្នើសុំ និងការសម្រេចរបស់គណៈកម្មការ', en: 'Origination pipeline and committee disposition' },
  'All Applications': { km: 'ពាក្យស្នើសុំទាំងអស់', en: 'All Applications' },
  'Stage 1 & 2 KYC': { km: 'ដំណាក់កាលទី ១ & ២ KYC', en: 'Stage 1 & 2 KYC' },
  'Sanctioned': { km: 'បានអនុម័តផ្ដល់', en: 'Sanctioned' },
  'Ready for release': { km: 'រួចរាល់សម្រាប់បើកផ្តល់', en: 'Ready for release' },
  'Declined': { km: 'បានបដិសេធ', en: 'Declined' },
  'DTI limit exceeded': { km: 'លើសកម្រិត DTI', en: 'DTI limit exceeded' },
  'Payment Overview': { km: 'ទិដ្ឋភាពទូទៅនៃការទូទាត់', en: 'Payment Overview' },
  'Portfolio recovery performance & collection rates': { km: 'ប្រសិទ្ធភាពនៃការប្រមូលប្រាក់ និងអត្រាសងត្រឡប់', en: 'Portfolio recovery performance & collection rates' },
  'Cashier Terminal': { km: 'ស្ថានីយបេឡា', en: 'Cashier Terminal' },
  'Recovery Rate': { km: 'អត្រាប្រមូលត្រឡប់មកវិញ', en: 'Recovery Rate' },
  'On-time installment': { km: 'ការបង់ប្រាក់ទាន់ពេល', en: 'On-time installment' },
  'Collections Total': { km: 'ប្រមូលសរុប', en: 'Collections Total' },
  'vouchers': { km: 'បង្កាន់ដៃ', en: 'vouchers' },
  'Overdue Rate': { km: 'អត្រាហួសកាលកំណត់', en: 'Overdue Rate' },
  'delinquent': { km: 'ហួសកំណត់', en: 'delinquent' },
  'Recent Loan Applications': { km: 'ពាក្យស្នើសុំកម្ចីថ្មីៗ', en: 'Recent Loan Applications' },
  'New origination submissions requiring risk evaluation': { km: 'ពាក្យស្នើសុំថ្មីដែលត្រូវវាយតម្លៃហានិភ័យ', en: 'New origination submissions requiring risk evaluation' },
  'View All': { km: 'មើលទាំងអស់', en: 'View All' },
  'App #': { km: 'លេខពាក្យ #', en: 'App #' },
  'Borrower': { km: 'អ្នកខ្ចី', en: 'Borrower' },
  'Requested': { km: 'ស្នើសុំ', en: 'Requested' },
  'Overdue Loans Watchlist': { km: 'បញ្ជីតាមដានកម្ចីហួសកាលកំណត់', en: 'Overdue Loans Watchlist' },
  'Accounts exceeding scheduled due dates requiring collection follow-up': { km: 'គណនីហួសកាលកំណត់ដែលតម្រូវឱ្យតាមដានការប្រមូលប្រាក់', en: 'Accounts exceeding scheduled due dates requiring collection follow-up' },
  'Delinquency Desk': { km: 'ផ្នែកតាមដានបំណុលហួសកំណត់', en: 'Delinquency Desk' },
  'Loan #': { km: 'លេខកម្ចី #', en: 'Loan #' },
  'Days Overdue': { km: 'ចំនួនថ្ងៃហួសកំណត់', en: 'Days Overdue' },
  'Amount Past Due': { km: 'ចំនួនទឹកប្រាក់ហួសកំណត់', en: 'Amount Past Due' },
  'Outstanding': { km: 'សមតុល្យនៅសល់', en: 'Outstanding' },
  'Follow-up': { km: 'តាមដាន', en: 'Follow-up' },
  'days': { km: 'ថ្ងៃ', en: 'days' },
  'mos': { km: 'ខែ', en: 'mos' },
  'OVERDUE': { km: 'ហួសកាលកំណត់', en: 'OVERDUE' },

  // Borrower Directory & Dossier
  'Borrower ID': { km: 'លេខសម្គាល់អ្នកខ្ចី', en: 'Borrower ID' },
  'Contact Details': { km: 'ព័ត៌មានទំនាក់ទំនង', en: 'Contact Details' },
  'KYC Status': { km: 'ស្ថានភាព KYC', en: 'KYC Status' },
  'Actions': { km: 'សកម្មភាព', en: 'Actions' },
  'Register New Borrower': { km: 'ចុះឈ្មោះអ្នកខ្ចីថ្មី', en: 'Register New Borrower' },
  'All Borrowers': { km: 'អ្នកខ្ចីទាំងអស់', en: 'All Borrowers' },
  'Active Accounts': { km: 'គណនីសកម្ម', en: 'Active Accounts' },
  'Delinquent': { km: 'ហួសកាលកំណត់', en: 'Delinquent' },
  'Archived': { km: 'ទុកក្នុងប័ណ្ណសារ', en: 'Archived' },
  'Search by name, national ID, phone...': { km: 'ស្វែងរកតាមឈ្មោះ អត្តសញ្ញាណប័ណ្ណ លេខទូរស័ព្ទ...', en: 'Search by name, national ID, phone...' },
  'No borrower dossiers match the selected filters.': { km: 'មិនមានទិន្នន័យអ្នកខ្ចីត្រូវនឹងតម្រងដែលបានជ្រើសរើសទេ។', en: 'No borrower dossiers match the selected filters.' },
  'Dossiers': { km: 'បញ្ជីព័ត៌មាន', en: 'Dossiers' },
  'Institutional borrower profiles, identification registry, debt-to-income ratings, and commercial loan histories.': {
    km: 'ប្រវត្តិរូបអ្នកខ្ចីស្ថាប័ន បញ្ជីអត្តសញ្ញាណ អត្រាបំណុលធៀបនឹងចំណូល និងប្រវត្តិកម្ចីពាណិជ្ជកម្ម។',
    en: 'Institutional borrower profiles, identification registry, debt-to-income ratings, and commercial loan histories.'
  },
  'Has Overdue': { km: 'មានហួសកាលកំណត់', en: 'Has Overdue' },
  'Overdue Risk': { km: 'ហានិភ័យហួសកំណត់', en: 'Overdue Risk' },
  'Verified Active': { km: 'ផ្ទៀងផ្ទាត់សកម្ម', en: 'Verified Active' },
  'Inactive': { km: 'អសកម្ម', en: 'Inactive' },
  'Loan History': { km: 'ប្រវត្តិកម្ចី', en: 'Loan History' },
  'active': { km: 'សកម្ម', en: 'active' },
  'Edit': { km: 'កែសម្រួល', en: 'Edit' },

  // Access Denied
  'Access Denied': { km: 'មិនមានសិទ្ធិចូលដំណើរការ', en: 'Access Denied' },
  'Access Denied: You do not have administrative authorization. Redirected to User Dashboard.': {
    km: 'មិនមានសិទ្ធិចូលដំណើរការ៖ អ្នកមិនមានសិទ្ធិជាអ្នកគ្រប់គ្រងទេ។ បានបញ្ជូនត្រឡប់ទៅផ្ទាំងគ្រប់គ្រងអ្នកប្រើប្រាស់។',
    en: 'Access Denied: You do not have administrative authorization. Redirected to User Dashboard.'
  },
  'You do not have permission to access this page.': { km: 'អ្នកមិនមានសិទ្ធិចូលមើលទំព័រនេះទេ។', en: 'You do not have permission to access this page.' },
  'Administrative dashboards and management APIs are restricted exclusively to the system administrator account.': {
    km: 'ផ្ទាំងគ្រប់គ្រងរដ្ឋបាល និង API គ្រប់គ្រងត្រូវបានកំណត់សិទ្ធិសម្រាប់តែគណនីអ្នកគ្រប់គ្រងប្រព័ន្ធប៉ុណ្ណោះ។',
    en: 'Administrative dashboards and management APIs are restricted exclusively to the system administrator account.'
  },
  'Back to Dashboard': { km: 'ត្រឡប់ទៅផ្ទាំងគ្រប់គ្រង', en: 'Back to Dashboard' },

  // Cashier Desk & Payments
  'Make a Loan Payment': { km: 'បង់ប្រាក់កម្ចី', en: 'Make a Loan Payment' },
  'Cashier Desk & Payment Terminal': { km: 'បញ្ជរបេឡា & ស្ថានីយទូទាត់ប្រាក់', en: 'Cashier Desk & Payment Terminal' },
  'Payment Gateway Ready': { km: 'ច្រកទូទាត់ប្រាក់រួចរាល់', en: 'Payment Gateway Ready' },
  'Terminal Active': { km: 'ស្ថានីយដំណើរការ', en: 'Terminal Active' },
  'Quick Account Lookup': { km: 'ស្វែងរកគណនីរហ័ស', en: 'Quick Account Lookup' },
  'Select Your Loan Facility': { km: 'ជ្រើសរើសកម្ចីរបស់អ្នក', en: 'Select Your Loan Facility' },
  'Payment Amount': { km: 'ចំនួនទឹកប្រាក់ត្រូវបង់', en: 'Payment Amount' },
  'Payment Method': { km: 'វិធីសាស្ត្រទូទាត់', en: 'Payment Method' },
  'Record Payment': { km: 'កត់ត្រាការបង់ប្រាក់', en: 'Record Payment' },
  'Recent Payment Receipts': { km: 'បង្កាន់ដៃបង់ប្រាក់ថ្មីៗ', en: 'Recent Payment Receipts' },
  'No payments recorded yet': { km: 'មិនទាន់មានការបង់ប្រាក់នៅឡើយទេ', en: 'No payments recorded yet' },
  'Exact Installment': { km: 'បង់មួយវគ្គធម្មតា', en: 'Exact Installment' },
  'Pay 2 Installments': { km: 'បង់ពីរវគ្គ', en: 'Pay 2 Installments' },
  'Full Payoff': { km: 'ទូទាត់ផ្តាច់ទាំងអស់', en: 'Full Payoff' },
  'Payment Collection & Settlement': { km: 'ការប្រមូលប្រាក់ & ទូទាត់សង', en: 'Payment Collection & Settlement' },
  'Process Payment & Emit Receipt': { km: 'ដំណើរការទូទាត់ & បោះពុម្ពបង្កាន់ដៃ', en: 'Process Payment & Emit Receipt' },
  'Confirm & Print Receipt': { km: 'បញ្ជាក់ & បោះពុម្ពបង្កាន់ដៃ', en: 'Confirm & Print Receipt' },
  'Payment History & Collections Ledger': { km: 'ប្រវត្តិទូទាត់ & បញ្ជីកត់ត្រាការប្រមូលប្រាក់', en: 'Payment History & Collections Ledger' },
  'Payment ID': { km: 'លេខសម្គាល់ការបង់ប្រាក់', en: 'Payment ID' },
  'Loan ID': { km: 'លេខសម្គាល់កម្ចី', en: 'Loan ID' },
  'Payment Date': { km: 'កាលបរិច្ឆេទបង់ប្រាក់', en: 'Payment Date' },
  'All Methods': { km: 'វិធីសាស្ត្រទាំងអស់', en: 'All Methods' },
  'Bank Transfer': { km: 'ផ្ទេរតាមធនាគារ', en: 'Bank Transfer' },
  'Cash': { km: 'សាច់ប្រាក់សុទ្ធ', en: 'Cash' },
  'Card': { km: 'កាតធនាគារ', en: 'Card' },
  'Amount': { km: 'ចំនួនទឹកប្រាក់', en: 'Amount' },
  'Annual Interest Rate': { km: 'អត្រាការប្រាក់ប្រចាំឆ្នាំ', en: 'Annual Interest Rate' },
  'Principal Range': { km: 'ទំហំប្រាក់ដើម', en: 'Principal Range' },
  'Tenure Range': { km: 'រយៈពេលកម្ចី', en: 'Tenure Range' },
  'Simulate': { km: 'គណនាសាកល្បង', en: 'Simulate' },
  'Apply Facility': { km: 'ដាក់ពាក្យស្នើសុំ', en: 'Apply Facility' },
  'Offerings': { km: 'ប្រភេទកម្ចី', en: 'Offerings' },
  'Add New Product': { km: 'បន្ថែមផលិតផលថ្មី', en: 'Add New Product' },
  'Loan Simulator': { km: 'ម៉ាស៊ីនគណនាកម្ចី', en: 'Loan Simulator' },
  'Credit Committee Approvals Queue': { km: 'ជួរអនុម័តរបស់គណៈកម្មការឥណទាន', en: 'Credit Committee Approvals Queue' },
  'Borrower Name': { km: 'ឈ្មោះអ្នកខ្ចី', en: 'Borrower Name' },
  'Interest Rate': { km: 'អត្រាការប្រាក់', en: 'Interest Rate' },
  'Reviewer Assessment': { km: 'ការវាយតម្លៃរបស់អ្នកត្រួតពិនិត្យ', en: 'Reviewer Assessment' },
  'Committee Decision': { km: 'ការសម្រេចរបស់គណៈកម្មការ', en: 'Committee Decision' },
  'Approve': { km: 'អនុម័ត', en: 'Approve' },
  'Reject': { km: 'បដិសេធ', en: 'Reject' },
  'No applications pending approval': { km: 'មិនមានពាក្យស្នើសុំកំពុងរង់ចាំការអនុម័តទេ', en: 'No applications pending approval' },
  'Overdue Watchlist & Delinquency Desk': { km: 'បញ្ជីតាមដានកម្ចីហួសកំណត់ & ផ្នែកដោះស្រាយបំណុល', en: 'Overdue Watchlist & Delinquency Desk' },
  'Run Daily Overdue Audit': { km: 'ដំណើរការសវនកម្មកម្ចីហួសកំណត់ប្រចាំថ្ងៃ', en: 'Run Daily Overdue Audit' },
  'Total Overdue Accounts': { km: 'គណនីហួសកាលកំណត់សរុប', en: 'Total Overdue Accounts' },
  'Portfolio at Risk (PAR 30+)': { km: 'ផលប័ត្រប្រឈមហានិភ័យ (PAR 30+)', en: 'Portfolio at Risk (PAR 30+)' },
  'All Delinquent': { km: 'កម្ចីហួសកំណត់ទាំងអស់', en: 'All Delinquent' },
  '1–15 Days (Early Watch)': { km: '១-១៥ ថ្ងៃ (តាមដានដំបូង)', en: '1–15 Days (Early Watch)' },
  '16–30 Days (Moderate Risk)': { km: '១៦-៣០ ថ្ងៃ (ហានិភ័យមធ្យម)', en: '16–30 Days (Moderate Risk)' },
  '30+ Days (Severe / NPL)': { km: '៣០+ ថ្ងៃ (ហានិភ័យខ្ពស់ / NPL)', en: '30+ Days (Severe / NPL)' },
  'Borrower Name & Phone': { km: 'ឈ្មោះអ្នកខ្ចី & ទូរស័ព្ទ', en: 'Borrower Name & Phone' },
  'Loan # & Product': { km: 'លេខកម្ចី & ផលិតផល', en: 'Loan # & Product' },
  'Installment #': { km: 'វគ្គបង់ប្រាក់ #', en: 'Installment #' },
  'Due Date': { km: 'កាលបរិច្ឆេទដល់កំណត់', en: 'Due Date' },
  'Overdue Amount': { km: 'ចំនួនទឹកប្រាក់ហួសកំណត់', en: 'Overdue Amount' },
  'Accrued Late Fee': { km: 'ប្រាក់ពិន័យបង្គរ', en: 'Accrued Late Fee' },
  'Last Contacted': { km: 'ទាក់ទងចុងក្រោយ', en: 'Last Contacted' },
  'System Audit Trail & Ledger': { km: 'កំណត់ហេតុសវនកម្មប្រព័ន្ធ & បញ្ជីកត់ត្រា', en: 'System Audit Trail & Ledger' },
  'Cryptographically Sequenced': { km: 'លំដាប់សុវត្ថិភាពគ្រីបតូ', en: 'Cryptographically Sequenced' },
  'Search Keywords': { km: 'ពាក្យគន្លឹះស្វែងរក', en: 'Search Keywords' },
  'Actor / Operator': { km: 'អ្នកប្រតិបត្តិការ', en: 'Actor / Operator' },
  'All Actors & Officers': { km: 'អ្នកប្រតិបត្តិការ & មន្ត្រីទាំងអស់', en: 'All Actors & Officers' },
  'Action Category': { km: 'ប្រភេទសកម្មភាព', en: 'Action Category' },
  'All Event Categories': { km: 'ប្រភេទព្រឹត្តិការណ៍ទាំងអស់', en: 'All Event Categories' },
  'Date': { km: 'កាលបរិច្ឆេទ', en: 'Date' },
  'Timestamp': { km: 'ត្រាពេលវេលា', en: 'Timestamp' },
  'Actor / User': { km: 'អ្នកប្រើប្រាស់', en: 'Actor / User' },
  'Action Detail': { km: 'ព័ត៌មានលម្អិតសកម្មភាព', en: 'Action Detail' },
  'Entity Reference': { km: 'លេខយោងអង្គភាព', en: 'Entity Reference' },
  'IP Address': { km: 'អាសយដ្ឋាន IP', en: 'IP Address' },
  'Payload': { km: 'ទិន្នន័យ', en: 'Payload' },
  'Forensic compliance audit trail recording all core transactions, underwriting decisions, and administrative actions.': {
    km: 'កំណត់ហេតុសវនកម្មអនុលោមភាពកត់ត្រារាល់ប្រតិបត្តិការស្នូល ការសម្រេចចិត្តផ្តល់ឥណទាន និងសកម្មភាពរដ្ឋបាល។',
    en: 'Forensic compliance audit trail recording all core transactions, underwriting decisions, and administrative actions.'
  },
  'Entity, IP, action...': { km: 'អង្គភាព, IP, សកម្មភាព...', en: 'Entity, IP, action...' },
  'No system audit records match your filters.': { km: 'មិនមានកំណត់ត្រាសវនកម្មប្រព័ន្ធត្រូវនឹងការចម្រោះរបស់អ្នកទេ។', en: 'No system audit records match your filters.' },
  'Audit Event Payload': { km: 'ទិន្នន័យព្រឹត្តិការណ៍សវនកម្ម', en: 'Audit Event Payload' },
  'Copy JSON': { km: 'ចម្លង JSON', en: 'Copy JSON' },
  'Copied': { km: 'បានចម្លង', en: 'Copied' },
  'Clear': { km: 'សម្អាត', en: 'Clear' },
  'Financial Reports & Portfolio BI': { km: 'របាយការណ៍ហិរញ្ញវត្ថុ & វិភាគផលប័ត្រ BI', en: 'Financial Reports & Portfolio BI' },
  'Audited Core Ledger': { km: 'បញ្ជីកត់ត្រាស្នូលដែលបានសវនកម្ម', en: 'Audited Core Ledger' },
  'Regulatory financial statements, aging portfolio analysis, and collections reconciliation.': {
    km: 'របាយការណ៍ហិរញ្ញវត្ថុបទប្បញ្ញត្តិ ការវិភាគអាយុកាលផលប័ត្រ និងការផ្ទៀងផ្ទាត់ការប្រមូលប្រាក់។',
    en: 'Regulatory financial statements, aging portfolio analysis, and collections reconciliation.'
  },
  'Print Report': { km: 'បោះពុម្ពរបាយការណ៍', en: 'Print Report' },
  'Report Type:': { km: 'ប្រភេទរបាយការណ៍:', en: 'Report Type:' },
  'Active Loan Portfolio Report': { km: 'របាយការណ៍ផលប័ត្រកម្ចីសកម្ម', en: 'Active Loan Portfolio Report' },
  'Loan Application Pipeline Report': { km: 'របាយការណ៍ខ្សែបណ្តាញពាក្យស្នើសុំកម្ចី', en: 'Loan Application Pipeline Report' },
  'Disbursed Loans Report': { km: 'របាយការណ៍កម្ចីដែលបានបើកផ្តល់', en: 'Disbursed Loans Report' },
  'Overdue & NPL Aging Report': { km: 'របាយការណ៍អាយុកាលកម្ចីហួសកំណត់ & NPL', en: 'Overdue & NPL Aging Report' },
  'Daily Cashier Collections Report': { km: 'របាយការណ៍ការប្រមូលប្រាក់បេឡាប្រចាំថ្ងៃ', en: 'Daily Cashier Collections Report' },
  'Range:': { km: 'កាលបរិច្ឆេទ:', en: 'Range:' },
  'Today': { km: 'ថ្ងៃនេះ', en: 'Today' },
  'This Week': { km: 'សប្តាហ៍នេះ', en: 'This Week' },
  'This Month': { km: 'ខែនេះ', en: 'This Month' },
  'Year to Date': { km: 'ដើមឆ្នាំរហូតបច្ចុប្បន្ន', en: 'Year to Date' },
  'Disbursed Total': { km: 'សរុបបើកផ្តល់', en: 'Disbursed Total' },
  'Collected Total': { km: 'សរុបប្រមូលបាន', en: 'Collected Total' },
  'Reference #': { km: 'លេខយោង #', en: 'Reference #' },
  'Branch': { km: 'សាខា', en: 'Branch' },
  'Disbursed': { km: 'បានបើកផ្តល់', en: 'Disbursed' },
  'Repaid': { km: 'បានសង', en: 'Repaid' },
  'Disbursement Date': { km: 'កាលបរិច្ឆេទបើកផ្តល់', en: 'Disbursement Date' },
  'Portfolio Aggregate Total': { km: 'សរុបរួមផលប័ត្រ', en: 'Portfolio Aggregate Total' },
  'System Settings & Credit Policies': { km: 'ការកំណត់ប្រព័ន្ធ & គោលការណ៍ឥណទាន', en: 'System Settings & Credit Policies' },
  'Configure core banking parameters, underwriting ceilings, automated penalty engines, and security thresholds.': {
    km: 'កំណត់ប៉ារ៉ាម៉ែត្រធនាគារស្នូល កម្រិតពិនិត្យឥណទាន ម៉ាស៊ីនពិន័យស្វ័យប្រវត្តិ និងកម្រិតសុវត្ថិភាព។',
    en: 'Configure core banking parameters, underwriting ceilings, automated penalty engines, and security thresholds.'
  },
  'Reset Defaults': { km: 'កំណត់លំនាំដើមឡើងវិញ', en: 'Reset Defaults' },
  'Save Configurations': { km: 'រក្សាទុកការកំណត់', en: 'Save Configurations' },
  'Saving...': { km: 'កំពុងរក្សាទុក...', en: 'Saving...' },
  'Saved': { km: 'បានរក្សាទុក', en: 'Saved' },
  'General & Currency': { km: 'ទូទៅ & រូបិយប័ណ្ណ', en: 'General & Currency' },
  'Lending & Risk Policies': { km: 'គោលការណ៍កម្ចី & ហានិភ័យ', en: 'Lending & Risk Policies' },
  'Security & Access': { km: 'សុវត្ថិភាព & ការចូលប្រើ', en: 'Security & Access' },
  'Alerts & Dispatches': { km: 'ការជូនដំណឹង & ការផ្ញើសារ', en: 'Alerts & Dispatches' },
  'Engine & Infrastructure': { km: 'ម៉ាស៊ីន & ហេដ្ឋារចនាសម្ព័ន្ធ', en: 'Engine & Infrastructure' },
  'Organization Identity': { km: 'អត្តសញ្ញាណស្ថាប័ន', en: 'Organization Identity' },
  'Institution Legal Name': { km: 'ឈ្មោះស្របច្បាប់ស្ថាប័ន', en: 'Institution Legal Name' },
  'Institution Code': { km: 'កូដស្ថាប័ន', en: 'Institution Code' },
  'Operating Branch': { km: 'សាខាប្រតិបត្តិការ', en: 'Operating Branch' },
  'Functional Currency & Exchange': { km: 'រូបិយប័ណ្ណប្រតិបត្តិការ & អត្រាប្តូរប្រាក់', en: 'Functional Currency & Exchange' },
  'Base Operating Currency': { km: 'រូបិយប័ណ្ណប្រតិបត្តិការមូលដ្ឋាន', en: 'Base Operating Currency' },
  'USD / KHR Exchange Rate': { km: 'អត្រាប្តូរប្រាក់ USD / KHR', en: 'USD / KHR Exchange Rate' },
  'Fiscal Year Accounting Start': { km: 'ការចាប់ផ្តើមឆ្នាំសារពើពន្ធគណនេយ្យ', en: 'Fiscal Year Accounting Start' },
  'Underwriting & Debt Ratios': { km: 'ការវាយតម្លៃឥណទាន & សមាមាត្របំណុល', en: 'Underwriting & Debt Ratios' },
  'Maximum Debt-to-Income (DTI)': { km: 'សមាមាត្របំណុលធៀបចំណូលអតិបរមា (DTI)', en: 'Maximum Debt-to-Income (DTI)' },
  'Dual-Signature Approval Ceiling': { km: 'កម្រិតពិដានអនុម័តហត្ថលេខាពីរ', en: 'Dual-Signature Approval Ceiling' },
  'Max Active Loans per Borrower': { km: 'ចំនួនកម្ចីសកម្មអតិបរមាក្នុងម្នាក់', en: 'Max Active Loans per Borrower' },
  'Late Penalties & Delinquency Engine': { km: 'ប្រាក់ពិន័យយឺតយ៉ាវ & ម៉ាស៊ីនគ្រប់គ្រងហួសកំណត់', en: 'Late Penalties & Delinquency Engine' },
  'Daily Late Fee Interest': { km: 'ការប្រាក់ពិន័យប្រចាំថ្ងៃ', en: 'Daily Late Fee Interest' },
  'Grace Period (Days)': { km: 'រយៈពេលអនុគ្រោះ (ថ្ងៃ)', en: 'Grace Period (Days)' },
  'Automated Overdue Cron Scheduler': { km: 'កាលវិភាគស្វ័យប្រវត្តិកំណត់កម្ចីហួសកំណត់', en: 'Automated Overdue Cron Scheduler' },
  'Authentication & Session Security': { km: 'ការផ្ទៀងផ្ទាត់ភាពត្រឹមត្រូវ & សុវត្ថិភាពសម័យ', en: 'Authentication & Session Security' },
  'Access Token Lifetime (Minutes)': { km: 'អាយុកាល Access Token (នាទី)', en: 'Access Token Lifetime (Minutes)' },
  'Refresh Token Lifetime (Days)': { km: 'អាយុកាល Refresh Token (ថ្ងៃ)', en: 'Refresh Token Lifetime (Days)' },
  'Enforce Multi-Factor Authentication (MFA)': { km: 'តម្រូវឱ្យប្រើការផ្ទៀងផ្ទាត់ពហុកត្តា (MFA)', en: 'Enforce Multi-Factor Authentication (MFA)' },
  'Maximum Consecutive Failed Logins': { km: 'ចំនួនចូលមិនបានសម្រេចអតិបរមា', en: 'Maximum Consecutive Failed Logins' },
  'Forensic Audit Retention': { km: 'ការរក្សាទុកកំណត់ហេតុសវនកម្ម', en: 'Forensic Audit Retention' },
  'Audit Ledger Retention Period': { km: 'រយៈពេលរក្សាទុកបញ្ជីកត់ត្រាសវនកម្ម', en: 'Audit Ledger Retention Period' },
  'Customer Payment Reminders': { km: 'ការរំលឹកការបង់ប្រាក់របស់អតិថិជន', en: 'Customer Payment Reminders' },
  'Days Prior to Due Date': { km: 'ចំនួនថ្ងៃមុនកាលបរិច្ឆេទដល់កំណត់', en: 'Days Prior to Due Date' },
  'Instant Overdue Notice (Day 1)': { km: 'ការជូនដំណឹងហួសកំណត់ភ្លាមៗ (ថ្ងៃទី ១)', en: 'Instant Overdue Notice (Day 1)' },
  'Automated Email Receipt': { km: 'ផ្ញើបង្កាន់ដៃតាមអ៊ីមែលដោយស្វ័យប្រវត្តិ', en: 'Automated Email Receipt' },
  'Executive Digest Reports': { km: 'របាយការណ៍សង្ខេបថ្នាក់ដឹកនាំ', en: 'Executive Digest Reports' },
  'Daily Committee Portfolio Digest': { km: 'របាយការណ៍សង្ខេបផលប័ត្រប្រចាំថ្ងៃរបស់គណៈកម្មការ', en: 'Daily Committee Portfolio Digest' },
  'Database Engine & Health': { km: 'ម៉ាស៊ីនមូលដ្ឋានទិន្នន័យ & ស្ថានភាព', en: 'Database Engine & Health' },
  'Automated Nightly Backups': { km: 'ការបម្រុងទុកទិន្នន័យពេលយប់ដោយស្វ័យប្រវត្តិ', en: 'Automated Nightly Backups' },
  'Database Encryption at Rest': { km: 'ការការពារទិន្នន័យដោយការអ៊ីនគ្រីប (Encryption at Rest)', en: 'Database Encryption at Rest' },
  'High Availability Clustering': { km: 'ចង្កោមម៉ាស៊ីនបម្រើការដែលអាចរកបានខ្ពស់ (HA)', en: 'High Availability Clustering' },
  'Active Read Replicas': { km: 'ម៉ាស៊ីនចម្លងអានសកម្ម (Read Replicas)', en: 'Active Read Replicas' },
  'Maintenance Mode': { km: 'របៀបថែទាំប្រព័ន្ធ', en: 'Maintenance Mode' },
  'System Maintenance Lock': { km: 'ចាក់សោប្រព័ន្ធសម្រាប់ការថែទាំ', en: 'System Maintenance Lock' },
  'Credit Officer Recommendation': { km: 'អនុសាសន៍របស់មន្ត្រីឥណទាន', en: 'Credit Officer Recommendation' },
  'Recommend Approval': { km: 'ផ្តល់អនុសាសន៍អនុម័ត', en: 'Recommend Approval' },
  'Recommend Rejection': { km: 'ផ្តល់អនុសាសន៍បដិសេធ', en: 'Recommend Rejection' },
  'Request More Info': { km: 'ស្នើសុំព័ត៌មានបន្ថែម', en: 'Request More Info' },
  'Need More Information': { km: 'ត្រូវការព័ត៌មានបន្ថែម', en: 'Need More Information' },
  'Executive Committee Sanction': { km: 'ការសម្រេចចិត្តរបស់គណៈកម្មការប្រតិបត្តិ', en: 'Executive Committee Sanction' },
  'Approve Application': { km: 'អនុម័តពាក្យស្នើសុំ', en: 'Approve Application' },
  'Reject Application': { km: 'បដិសេធពាក្យស្នើសុំ', en: 'Reject Application' },
  'Counter-Offer / Adjust Terms': { km: 'សំណើជំនួស / កែសម្រួលលក្ខខណ្ឌ', en: 'Counter-Offer / Adjust Terms' },
  'Approved Amount': { km: 'ចំនួនទឹកប្រាក់អនុម័ត', en: 'Approved Amount' },
  'Approved Term': { km: 'រយៈពេលអនុម័ត', en: 'Approved Term' },
  'Approved Interest Rate': { km: 'អត្រាការប្រាក់អនុម័ត', en: 'Approved Interest Rate' },
  'Reason for Rejection': { km: 'មូលហេតុនៃការបដិសេធ', en: 'Reason for Rejection' },
  'Application Progress': { km: 'វឌ្ឍនភាពពាក្យស្នើសុំ', en: 'Application Progress' },
  'Applicant:': { km: 'អ្នកស្នើសុំ:', en: 'Applicant:' },
  'Submitted on': { km: 'បានដាក់ស្នើនៅថ្ងៃ', en: 'Submitted on' },
  'Requested:': { km: 'បានស្នើសុំ:', en: 'Requested:' },
  'Borrower Profile': { km: 'ប្រវត្តិរូបអ្នកខ្ចី', en: 'Borrower Profile' },
  'Active Facilities': { km: 'កម្ចីសកម្ម', en: 'Active Facilities' },
  'KYC & Verification': { km: 'KYC & ការផ្ទៀងផ្ទាត់', en: 'KYC & Verification' },
  'Audit Trail': { km: 'កំណត់ហេតុសវនកម្ម', en: 'Audit Trail' }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  toggleLanguage: () => void;
  t: (key: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
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
    const cleanKey = (key || '').trim();

    // 1. Exact match in TRANSLATIONS dictionary
    const item = TRANSLATIONS[cleanKey];
    if (item) {
      if (language === 'km' && item.km) return item.km;
      if (language === 'en' && item.en) return item.en;
    }

    // 2. Exact match in PHRASE_TRANSLATIONS dictionary
    const phrase = PHRASE_TRANSLATIONS[cleanKey];
    if (phrase) {
      if (language === 'km' && phrase.km) return phrase.km;
      if (language === 'en' && phrase.en) return phrase.en;
    }

    // 3. Fallback evaluation
    if (fallback !== undefined) {
      const cleanFallback = fallback.trim();
      const fallbackPhrase = PHRASE_TRANSLATIONS[cleanFallback];
      if (language === 'km') {
        if (fallbackPhrase && fallbackPhrase.km) return fallbackPhrase.km;
        if (TRANSLATIONS[cleanFallback] && TRANSLATIONS[cleanFallback].km) return TRANSLATIONS[cleanFallback].km;
      }
      if (language === 'en') {
        return fallback;
      }
    }

    // 4. Default return
    if (item && item[language]) return item[language];
    if (fallback !== undefined) return fallback;
    if (item && item.en) return item.en;
    return cleanKey;
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
