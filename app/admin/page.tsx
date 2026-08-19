import { AdminPanel } from '@/components/admin/panel';

/**
 * Nothing here is prerendered and nothing is cached: every figure on this
 * screen is either a live count or something the person looking at it is about
 * to change.
 */
export const dynamic = 'force-dynamic';

export default function AdminPage() {
  return <AdminPanel />;
}
