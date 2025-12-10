import type messaging from '@react-native-firebase/messaging';
import {navigate} from '../navigation/navigationRef';

// Map an FCM message into navigation to NewJobRequestScreen.
// Expected data payload from backend (can be adjusted as needed):
// {
//   type: 'NEW_JOB',
//   jobId: string,
//   vehicleNumber: string,
//   tagNumber?: string,
//   pickupPoint?: string
// }

export function handleJobNotification(
  remoteMessage: messaging.FirebaseMessagingTypes.RemoteMessage,
) {
  const data = remoteMessage.data || {};
  if (!data) {
    return;
  }

  if (data.type !== 'NEW_JOB') {
    return;
  }

  const jobId = data.jobId;
  const vehicleNumber = data.vehicleNumber;
  const tagNumber = data.tagNumber;
  const pickupPoint = data.pickupPoint;

  if (!jobId || !vehicleNumber) {
    return;
  }

  navigate('NewJobRequest', {
    jobId,
    vehicleNumber,
    tagNumber: tagNumber || undefined,
    pickupPoint: pickupPoint || undefined,
  });
}
