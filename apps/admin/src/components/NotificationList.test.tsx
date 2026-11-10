import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { NotificationList } from './NotificationList';

const notification = {
  id: 'notification-1',
  title: 'New order',
  message: 'Order received.',
  type: 'ORDER_PLACED',
  relatedEntityType: 'ORDER',
  relatedEntityId: 'order-1',
  isRead: false,
  readAt: null,
  createdAt: new Date().toISOString(),
};

describe('NotificationList', () => {
  it('renders unread notifications and exposes a read action', async () => {
    const onRead = vi.fn();
    render(<NotificationList notifications={[notification]} onRead={onRead} />);
    expect(screen.getByText('New order')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark read' })).toBeInTheDocument();
  });

  it('renders an empty state', () => {
    render(<NotificationList notifications={[]} onRead={vi.fn()} />);
    expect(screen.getByText('No notifications.')).toBeInTheDocument();
  });
});
