import Marker, {
  ImageFormat,
  Position,
  TextBackgroundType,
} from 'react-native-image-marker';

const watermarkLogo = require('../assets/icons/white_logo.png');

function normalizeImageUri(uri: string) {
  if (!uri) {
    return uri;
  }
  if (
    uri.startsWith('file://') ||
    uri.startsWith('content://') ||
    uri.startsWith('http://') ||
    uri.startsWith('https://')
  ) {
    return uri;
  }
  if (uri.startsWith('/')) {
    return `file://${uri}`;
  }
  return uri;
}

function formatTimestamp(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = date.getFullYear();
  const mm = pad(date.getMonth() + 1);
  const dd = pad(date.getDate());
  const hh = pad(date.getHours());
  const min = pad(date.getMinutes());
  const ss = pad(date.getSeconds());
  return `${yyyy}-${mm}-${dd} ${hh}:${min}:${ss}`;
}

export async function stampImageWithWatermarkAndTimestamp(uri: string) {
  try {
    console.log('[ImageStamp] Starting stamping process for:', uri);
    const normalizedInputUri = normalizeImageUri(uri);
    console.log('[ImageStamp] Normalized input URI:', normalizedInputUri);
    
    const stampedWithLogo = await Marker.markImage({
      backgroundImage: {
        src: {uri: normalizedInputUri},
        scale: 1,
      },
      watermarkImages: [
        {
          src: watermarkLogo,
          scale: 0.35,
          alpha: 0.85,
          position: {position: Position.topRight},
        },
      ],
      quality: 100,
      filename: `watermark_${Date.now()}`,
      saveFormat: ImageFormat.png,
    });
    console.log('[ImageStamp] Watermark applied:', stampedWithLogo);

    const timestamp = formatTimestamp(new Date());
    const normalizedStampedWithLogo = normalizeImageUri(stampedWithLogo);
    console.log('[ImageStamp] Adding timestamp:', timestamp);

    const stampedWithTimestamp = await Marker.markText({
      backgroundImage: {
        src: {uri: normalizedStampedWithLogo},
        scale: 1,
      },
      watermarkTexts: [
        {
          text: timestamp,
          positionOptions: {position: Position.topLeft},
          style: {
            color: '#FFFFFF',
            fontSize: 28,
            fontName: 'Arial',
            shadowStyle: {
              dx: 1,
              dy: 1,
              radius: 2,
              color: '#000000',
            },
            textBackgroundStyle: {
              paddingX: 12,
              paddingY: 8,
              type: TextBackgroundType.stretchX,
              color: '#00000066',
            },
          },
        },
      ],
      quality: 100,
      filename: `timestamp_${Date.now()}`,
      saveFormat: ImageFormat.png,
    });

    const finalUri = normalizeImageUri(stampedWithTimestamp);
    console.log('[ImageStamp] Stamping complete:', finalUri);
    return finalUri;
  } catch (error) {
    console.error('[ImageStamp] Error during stamping:', error);
    console.error('[ImageStamp] Returning original URI:', uri);
    return uri;
  }
}
