import { UserRole } from '@repair-shop/shared';
import { getCurrentUser } from '@/lib/api/customers';
import { getUsers } from '@/lib/api/team';
import { ChatApp } from './chat-app';

export default async function ChatPage() {
  const [viewer, staff] = await Promise.all([getCurrentUser(), getUsers({ limit: 100 })]);

  return (
    <ChatApp
      viewerId={viewer?.id ?? ''}
      isAdmin={viewer?.role === UserRole.ADMIN}
      staff={staff.data.map((u) => ({ id: u.id, name: u.name }))}
    />
  );
}
