/**
 * Admin Notification Helper
 * Creates notifications in the shared admin_notifications MongoDB collection.
 * Used by employee-portal APIs to alert admins of important events.
 */
import { getDb } from '@/lib/db';
import { v4 as uuid } from 'uuid';

/**
 * Push a notification to all admins.
 * @param {Object} opts
 * @param {'info'|'success'|'warning'|'error'} opts.type
 * @param {string} opts.title - Short title
 * @param {string} opts.message - Detail message
 * @param {string} [opts.link] - Optional link path (e.g. '/dashboard/leaves')
 */
export async function notifyAdmins({ type, title, message, link }) {
  try {
    const db = await getDb();
    await db.collection('admin_notifications').insertOne({
      id: uuid(),
      recipientId: null,
      recipientRole: 'all',
      type: type || 'info',
      title,
      message,
      link: link || null,
      read: false,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    // Non-fatal — never crash the main request
    console.error('[NOTIFY] Failed to create admin notification:', err.message);
  }
}
