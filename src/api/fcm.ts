import {apiPost} from './client';

export async function registerFCMToken(fcmToken: string): Promise<void> {
  await apiPost(
    '/api/fcm/register',
    {
      fcm_token: fcmToken,
    },
    true, // requires authentication
  );
}
