import type { Metadata } from 'next';
import { RegisterForm } from '@/components/auth/register-form';

export const metadata: Metadata = { title: 'Create an account' };

export default function Page() {
  return <RegisterForm />;
}
