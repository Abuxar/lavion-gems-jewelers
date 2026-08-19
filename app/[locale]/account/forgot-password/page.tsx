import type { Metadata } from 'next';
import { ForgotPasswordForm } from '@/components/auth/password-forms';

export const metadata: Metadata = { title: 'Reset your password' };

export default function Page() {
  return <ForgotPasswordForm />;
}
