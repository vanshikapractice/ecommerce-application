import { Button, Paper, Stack, Typography } from '@mui/material';
import type { Notification } from '../api';

type Props = {
  notifications: Notification[];
  onRead: (id: string) => void;
};

export function NotificationList({ notifications, onRead }: Props) {
  if (!notifications.length) {
    return <Typography color="text.secondary">No notifications.</Typography>;
  }

  return (
    <Stack spacing={2}>
      {notifications.map((notification) => (
        <Paper
          key={notification.id}
          sx={{
            p: 2,
            borderLeft: notification.isRead ? undefined : '4px solid',
            borderColor: 'primary.main',
          }}
        >
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
            <div>
              <Typography fontWeight={notification.isRead ? 'normal' : 'bold'}>
                {notification.title}
              </Typography>
              <Typography color="text.secondary">{notification.message}</Typography>
            </div>
            {!notification.isRead && <Button onClick={() => onRead(notification.id)}>Mark read</Button>}
          </Stack>
        </Paper>
      ))}
    </Stack>
  );
}
