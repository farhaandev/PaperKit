import React, { useState } from 'react';
import { View, Text, Pressable, Alert, ActivityIndicator } from 'react-native';
import {
  Image,
  Layers,
  Minimize2,
  PenTool,
  FileText,
  Share2,
  Trash2,
} from 'lucide-react-native';
import * as Sharing from 'expo-sharing';
import { RecentFile, ToolType } from '@/constants/types';
import { formatBytes } from '@/utils';
import { deleteRecentFile } from '@/db';

export interface RecentFileItemProps {
  file: RecentFile;
  onDeleted: () => void;
  onPress?: () => void;
}

function getToolBadge(type: ToolType): {
  icon: React.ReactNode;
  label: string;
  badgeBg: string;
  badgeBorder: string;
  textColor: string;
} {
  switch (type) {
    case 'images-to-pdf':
      return {
        icon: <Image size={16} color="#818cf8" />,
        label: 'Photos',
        badgeBg: 'bg-indigo-950/60',
        badgeBorder: 'border-indigo-800/40',
        textColor: 'text-indigo-400',
      };
    case 'merge-pdf':
      return {
        icon: <Layers size={16} color="#34d399" />,
        label: 'Merge',
        badgeBg: 'bg-emerald-950/60',
        badgeBorder: 'border-emerald-800/40',
        textColor: 'text-emerald-400',
      };
    case 'compress':
      return {
        icon: <Minimize2 size={16} color="#fbbf24" />,
        label: 'Compress',
        badgeBg: 'bg-amber-950/60',
        badgeBorder: 'border-amber-800/40',
        textColor: 'text-amber-400',
      };
    case 'e-sign':
      return {
        icon: <PenTool size={16} color="#fb7185" />,
        label: 'E-Sign',
        badgeBg: 'bg-rose-950/60',
        badgeBorder: 'border-rose-800/40',
        textColor: 'text-rose-400',
      };
    default:
      return {
        icon: <FileText size={16} color="#38bdf8" />,
        label: 'PDF',
        badgeBg: 'bg-sky-950/60',
        badgeBorder: 'border-sky-800/40',
        textColor: 'text-sky-400',
      };
  }
}

function formatRelativeDate(timestamp: number): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  if (isToday) {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `Today, ${hours}:${minutes}`;
  }

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
}

export function RecentFileItem({
  file,
  onDeleted,
  onPress,
}: RecentFileItemProps): React.JSX.Element {
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isSharing, setIsSharing] = useState<boolean>(false);

  const badge = getToolBadge(file.tool_type);

  const handleShare = async (): Promise<void> => {
    if (isSharing) return;
    setIsSharing(true);
    try {
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Sharing Unavailable', 'Native file sharing is not supported on this device.');
        return;
      }

      await Sharing.shareAsync(file.file_uri, {
        mimeType: file.mime_type || 'application/pdf',
        dialogTitle: `Share ${file.title}`,
        UTI: 'com.adobe.pdf',
      });
    } catch (error) {
      console.warn('[RecentFileItem] Failed to share file:', error);
      Alert.alert('Error', 'Unable to share this document.');
    } finally {
      setIsSharing(false);
    }
  };

  const handleDelete = (): void => {
    Alert.alert(
      'Delete Document',
      `Are you sure you want to permanently delete "${file.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              await deleteRecentFile(file.id);
              onDeleted();
            } catch (error) {
              console.warn('[RecentFileItem] Failed to delete file:', error);
              Alert.alert('Error', 'Could not delete the document.');
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <Pressable
      onPress={onPress ?? handleShare}
      style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}
      className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex-row items-center justify-between mb-2.5"
    >
      {/* Icon Badge */}
      <View
        className={`w-11 h-11 rounded-xl items-center justify-center border mr-3 ${badge.badgeBg} ${badge.badgeBorder}`}
      >
        {badge.icon}
      </View>

      {/* Title & Metadata */}
      <View className="flex-1 mr-2">
        <Text
          numberOfLines={1}
          className="text-white text-xs font-semibold tracking-tight"
        >
          {file.title}
        </Text>
        <View className="flex-row items-center gap-1.5 mt-1">
          <Text className="text-slate-400 text-[10px]">
            {formatBytes(file.size_bytes)}
          </Text>
          <Text className="text-slate-600 text-[10px]">•</Text>
          <Text className="text-slate-400 text-[10px]">
            {formatRelativeDate(file.created_at)}
          </Text>
          <Text className="text-slate-600 text-[10px]">•</Text>
          <Text className={`text-[10px] font-medium ${badge.textColor}`}>
            {badge.label}
          </Text>
        </View>
      </View>

      {/* Action Buttons (min 44x44 touch targets) */}
      <View className="flex-row items-center gap-1">
        <Pressable
          onPress={() => void handleShare()}
          disabled={isSharing || isDeleting}
          hitSlop={6}
          accessibilityLabel="Share file"
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          className="w-10 h-10 rounded-lg items-center justify-center min-h-[44px] min-w-[44px]"
        >
          {isSharing ? (
            <ActivityIndicator size="small" color="#38bdf8" />
          ) : (
            <Share2 size={16} color="#94a3b8" />
          )}
        </Pressable>

        <Pressable
          onPress={handleDelete}
          disabled={isSharing || isDeleting}
          hitSlop={6}
          accessibilityLabel="Delete file"
          style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
          className="w-10 h-10 rounded-lg items-center justify-center min-h-[44px] min-w-[44px]"
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color="#f87171" />
          ) : (
            <Trash2 size={16} color="#ef4444" />
          )}
        </Pressable>
      </View>
    </Pressable>
  );
}
