import { CropReminder } from './CropReminder';
import { DiseaseDetectionAlert } from './DiseaseDetectionAlert';
import { MarketInsight } from './MarketInsight';
import { PestAlert } from './PestAlert';
import { SoilUpdate } from './SoilUpdate';
import { SystemNotice } from './SystemNotice';
import type { NotificationCardItem, NotificationCardProps } from './types';
import { WeatherAlert } from './WeatherAlert';
import {
  getNotificationTargetPath as resolveNotificationTargetPath,
  getNotificationVisualKind as resolveNotificationVisualKind,
} from '../../utils/notificationClassifier';

export function getNotificationVisualKind(item: NotificationCardItem) {
  return resolveNotificationVisualKind(item);
}

export function getNotificationTargetPath(item: NotificationCardItem) {
  return resolveNotificationTargetPath(item);
}

export function NotificationRenderer(props: NotificationCardProps) {
  const kind = getNotificationVisualKind(props.item);

  if (kind === 'weather') {
    return <WeatherAlert {...props} />;
  }

  if (kind === 'soil') {
    return <SoilUpdate {...props} />;
  }

  if (kind === 'market') {
    return <MarketInsight {...props} />;
  }

  if (kind === 'pest') {
    return <PestAlert {...props} />;
  }

  if (kind === 'disease') {
    return <DiseaseDetectionAlert {...props} />;
  }

  if (kind === 'system') {
    return <SystemNotice {...props} />;
  }

  return <CropReminder {...props} />;
}
