/**
 * Institutional Notification Store & Real-time State Service
 * 
 * Provides persistent notification management across Borrower and Staff roles,
 * with real-time DOM broadcast events for instant badge synchronization.
 */

import { NotificationItem } from '../types';
import { safeLocalStorageSet } from '../utils/storageGuard';

export const NOTIFICATIONS_STORAGE_KEY = 'jam_notifications_v1';
export const NOTIFICATIONS_UPDATE_EVENT = 'jam_notifications_updated';

// Format relative time helper (handles ISO dates gracefully)
export function formatRelativeTime(dateInput: string): string {
  if (!dateInput) return 'Just now';
  
  // If it's already a relative string (e.g., "10 mins ago", "Yesterday"), return as is
  if (dateInput.includes('ago') || dateInput.includes('Yesterday') || dateInput.includes('Just now')) {
    return dateInput;
  }

  const date = new Date(dateInput);
  if (isNaN(date.getTime())) {
    return dateInput;
  }

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay === 1) return 'Yesterday';
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

// Seed notifications tailored for borrower and credit officer/administrator
const SEED_NOTIFICATIONS: NotificationItem[] = [
  // 1. Borrower Overdue Notice (Cycle #5)
  {
    id: 'notif-bor-overdue-5',
    title: 'Overdue Installment Notice (Cycle #5)',
    message: 'Cycle #5 of facility LN-2026-0001 is 50 days overdue ($532.50). Settle promptly via Bakong Dynamic KHQR to prevent NBC credit penalties.',
    category: 'OVERDUE',
    timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString(), // 18m ago
    isRead: false,
    linkId: '/repayments',
  },
  // 2. Borrower Upcoming Installment (Cycle #7)
  {
    id: 'notif-bor-upcoming-7',
    title: 'Upcoming Due Reminder (Cycle #7)',
    message: 'Installment #7 of $532.50 is due on Nov 15, 2026 (in 11 days). Instant KHQR settlement and auto-debit available.',
    category: 'PAYMENT_DUE',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2.5).toISOString(), // 2.5h ago
    isRead: false,
    linkId: '/repayments',
  },
  // 3. Borrower KYC Verified
  {
    id: 'notif-bor-kyc-ok',
    title: 'KYC Identity Documents Approved',
    message: 'Your Cambodian National ID Smartcard (Front & Back) and Proof of Residence scans have been verified by Underwriting.',
    category: 'APPROVAL',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 22).toISOString(), // 22h ago
    isRead: false,
    linkId: '/my-loans',
  },
  // 4. Staff/Admin Underwriting Review
  {
    id: 'notif-adm-app-14',
    title: 'New Credit Intake: APP-2026-0014',
    message: 'Johnathan Doe submitted application for $3,100.00. National ID front/back and income contracts uploaded to vault.',
    category: 'APPROVAL',
    timestamp: new Date(Date.now() - 1000 * 60 * 45).toISOString(), // 45m ago
    isRead: false,
    linkId: '/admin/applications',
  },
  // 5. Staff/Admin PAR Delinquency Alert
  {
    id: 'notif-adm-overdue-12',
    title: 'Portfolio PAR 30+ Delinquency Alert',
    message: 'Dara Pich (LN-2026-0012) is 38 days past due ($1,240.00). Automated follow-up dispatch dispatched.',
    category: 'OVERDUE',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(), // 4h ago
    isRead: false,
    linkId: '/admin/overdue',
  },
  // 6. Disbursement Confirmation
  {
    id: 'notif-disbursed-0001',
    title: 'Disbursement Credited via Bakong',
    message: 'Facility LN-2026-0001 principal $6,000.00 was disbursed to ACLEDA Bank account (**** 2025). Fast-track clearing confirmed.',
    category: 'DISBURSEMENT',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2d ago
    isRead: true,
    linkId: '/my-loans',
  },
  // 7. Payment Received
  {
    id: 'notif-pmt-settled-4',
    title: 'Bakong Dynamic KHQR Settlement Reconciled',
    message: 'Sokha Chan paid $532.50 for installment Cycle #4 on LN-2026-0042. Automated settlement completed.',
    category: 'PAYMENT_DUE',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), // 3d ago
    isRead: true,
    linkId: '/repayments',
  },
];

class NotificationStorageService {
  /**
   * Retrieve all notifications from localStorage with fallback to default seed items.
   */
  public getNotifications(isBorrower?: boolean): NotificationItem[] {
    if (typeof window === 'undefined') return SEED_NOTIFICATIONS;

    try {
      const raw = localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
      let items: NotificationItem[] = [];

      if (raw) {
        items = JSON.parse(raw);
      } else {
        items = SEED_NOTIFICATIONS;
        this.saveNotifications(items);
      }

      if (!Array.isArray(items) || items.length === 0) {
        items = SEED_NOTIFICATIONS;
        this.saveNotifications(items);
      }

      // Filter by role if requested
      if (typeof isBorrower === 'boolean') {
        if (isBorrower) {
          // Borrower sees borrower alerts and disbursement notices
          return items.filter(
            n =>
              n.id.startsWith('notif-bor') ||
              n.id.startsWith('notif-disbursed') ||
              n.category === 'OVERDUE' ||
              n.category === 'PAYMENT_DUE' ||
              n.category === 'APPROVAL' ||
              n.category === 'DISBURSEMENT'
          );
        } else {
          // Staff sees all notifications or staff specific
          return items;
        }
      }

      return items;
    } catch (e) {
      console.warn('[NotificationStorageService] Error reading notifications:', e);
      return SEED_NOTIFICATIONS;
    }
  }

  /**
   * Save notifications to localStorage and dispatch update event
   */
  public saveNotifications(notifications: NotificationItem[]): void {
    if (typeof window === 'undefined') return;
    try {
      safeLocalStorageSet(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications));
      window.dispatchEvent(new CustomEvent(NOTIFICATIONS_UPDATE_EVENT, { detail: notifications }));
    } catch (e) {
      console.warn('[NotificationStorageService] Error saving notifications:', e);
    }
  }

  /**
   * Mark a single notification as read
   */
  public markAsRead(id: string): NotificationItem[] {
    const list = this.getNotifications();
    const updated = list.map(n => (n.id === id ? { ...n, isRead: true } : n));
    this.saveNotifications(updated);
    return updated;
  }

  /**
   * Mark all notifications as read
   */
  public markAllAsRead(): NotificationItem[] {
    const list = this.getNotifications();
    const updated = list.map(n => ({ ...n, isRead: true }));
    this.saveNotifications(updated);
    return updated;
  }

  /**
   * Delete a single notification
   */
  public deleteNotification(id: string): NotificationItem[] {
    const list = this.getNotifications();
    const updated = list.filter(n => n.id !== id);
    this.saveNotifications(updated);
    return updated;
  }

  /**
   * Clear all notifications
   */
  public clearAll(): NotificationItem[] {
    const empty: NotificationItem[] = [];
    this.saveNotifications(empty);
    return empty;
  }

  /**
   * Add a new notification
   */
  public addNotification(notification: Omit<NotificationItem, 'id' | 'timestamp' | 'isRead'> & { id?: string; timestamp?: string; isRead?: boolean }): NotificationItem {
    const list = this.getNotifications();
    const newItem: NotificationItem = {
      id: notification.id || `notif-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: notification.title,
      message: notification.message,
      category: notification.category,
      timestamp: notification.timestamp || new Date().toISOString(),
      isRead: notification.isRead ?? false,
      linkId: notification.linkId,
    };
    const updated = [newItem, ...list];
    this.saveNotifications(updated);
    return newItem;
  }

  /**
   * Get unread notifications count
   */
  public getUnreadCount(isBorrower?: boolean): number {
    const list = this.getNotifications(isBorrower);
    return list.filter(n => !n.isRead).length;
  }

  /**
   * Subscribe to real-time notification changes
   */
  public subscribe(callback: (notifications: NotificationItem[]) => void): () => void {
    if (typeof window === 'undefined') return () => {};

    const handler = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail) {
        callback(customEvent.detail);
      } else {
        callback(this.getNotifications());
      }
    };

    window.addEventListener(NOTIFICATIONS_UPDATE_EVENT, handler);
    return () => {
      window.removeEventListener(NOTIFICATIONS_UPDATE_EVENT, handler);
    };
  }
}

export const notificationStorageService = new NotificationStorageService();

