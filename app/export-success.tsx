import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import {
  CheckCircle2,
  Download,
  Share2,
  Home,
  Edit3,
  Check,
  FileText,
  HardDrive,
  Sparkles,
} from 'lucide-react-native';
import { ToolType } from '@/constants/types';
import { formatBytes, EXPORTS_DIRECTORY } from '@/utils';
import { renameRecentFile, getRecentFileById } from '@/db';
import { AdBannerPlaceholder } from '@/components';

function getToolDisplay(toolType?: string): {
  label: string;
  badgeBg: string;
  badgeBorder: string;
  textColor: string;
} {
  switch (toolType as ToolType) {
    case 'images-to-pdf':
      return {
        label: 'Images to PDF',
        badgeBg: 'bg-indigo-950/60',
        badgeBorder: 'border-indigo-600/30',
        textColor: 'text-indigo-400',
      };
    case 'merge-pdf':
      return {
        label: 'Merge PDFs',
        badgeBg: 'bg-emerald-950/60',
        badgeBorder: 'border-emerald-600/30',
        textColor: 'text-emerald-400',
      };
    case 'compress':
      return {
        label: 'Compressed File',
        badgeBg: 'bg-amber-950/60',
        badgeBorder: 'border-amber-600/30',
        textColor: 'text-amber-400',
      };
    case 'e-sign':
      return {
        label: 'E-Signed PDF',
        badgeBg: 'bg-rose-950/60',
        badgeBorder: 'border-rose-600/30',
        textColor: 'text-rose-400',
      };
    default:
      return {
        label: 'Exported Document',
        badgeBg: 'bg-sky-950/60',
        badgeBorder: 'border-sky-600/30',
        textColor: 'text-sky-400',
      };
  }
}

/**
 * Resolves a valid and readable file URI, correcting any encoding issues
 * introduced by Expo Router param serialization in Expo Go on Android.
 */
async function resolveValidFileUri(
  rawUri: string,
  fileId?: number
): Promise<string> {
  // Strategy 1: Check raw URI directly
  if (rawUri) {
    try {
      const info = await FileSystem.getInfoAsync(rawUri);
      if (info.exists) {
        return rawUri;
      }
    } catch {}
  }

  // Strategy 2: If we have fileId, query SQLite record
  if (fileId && fileId > 0) {
    try {
      const record = await getRecentFileById(fileId);
      if (record?.file_uri) {
        const info = await FileSystem.getInfoAsync(record.file_uri);
        if (info.exists) {
          return record.file_uri;
        }
      }
    } catch {}
  }

  // Strategy 3: Reconstruct via EXPORTS_DIRECTORY using filename
  if (rawUri) {
    const filename = rawUri.split('/').pop();
    if (filename) {
      const reconstructedUri = `${EXPORTS_DIRECTORY}${filename}`;
      try {
        const info = await FileSystem.getInfoAsync(reconstructedUri);
        if (info.exists) {
          return reconstructedUri;
        }
      } catch {}
    }
  }

  // Strategy 4: Fix Expo Router URL decoding of '%25' in Expo Go ExperienceData path
  if (rawUri && rawUri.includes('/%40anonymous%2F')) {
    const fixedUri = rawUri.replace('/%40anonymous%2F', '/%2540anonymous%252F');
    try {
      const info = await FileSystem.getInfoAsync(fixedUri);
      if (info.exists) {
        return fixedUri;
      }
    } catch {}
  }

  return rawUri;
}

/**
 * Reads local file content as Base64, with fallback to XMLHttpRequest blob reader
 * if native readAsStringAsync fails.
 */
async function readLocalFileAsBase64(uri: string): Promise<string> {
  // 1. Try native FileSystem readAsStringAsync
  try {
    return await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
  } catch (fsErr) {
    console.warn('[readLocalFileAsBase64] readAsStringAsync failed, falling back to XHR:', fsErr);
  }

  // 2. Fallback using XMLHttpRequest to get Blob -> FileReader to get base64
  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('GET', uri, true);
    xhr.responseType = 'blob';
    xhr.onload = () => {
      const blob = xhr.response as Blob;
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = (reader.result as string) || '';
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('FileReader failed to encode blob'));
      reader.readAsDataURL(blob);
    };
    xhr.onerror = (e) => reject(new Error(`XHR failed to read local file: ${JSON.stringify(e)}`));
    xhr.send();
  });
}

export default function ExportSuccessScreen(): React.JSX.Element {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id?: string;
    title?: string;
    file_uri?: string;
    size_bytes?: string;
    tool_type?: string;
    mime_type?: string;
  }>();

  const fileId = params.id ? parseInt(params.id, 10) : 0;
  const initialTitle = params.title || 'Document.pdf';
  const fileUri = params.file_uri || '';
  const sizeBytes = params.size_bytes ? parseInt(params.size_bytes, 10) : 0;
  const toolType = params.tool_type || 'images-to-pdf';

  const initialIsImage =
    params.mime_type === 'image/jpeg' ||
    params.title?.toLowerCase().endsWith('.jpg') ||
    params.title?.toLowerCase().endsWith('.jpeg');

  const [title, setTitle] = useState<string>(initialTitle);
  const [mimeType, setMimeType] = useState<string>(
    params.mime_type || (initialIsImage ? 'image/jpeg' : 'application/pdf')
  );
  const [resolvedUri, setResolvedUri] = useState<string>(fileUri);
  const [editingTitle, setEditingTitle] = useState<boolean>(false);
  const [tempTitle, setTempTitle] = useState<string>(initialTitle);
  const [isSharing, setIsSharing] = useState<boolean>(false);
  const [isDownloading, setIsDownloading] = useState<boolean>(false);
  const [hasDownloaded, setHasDownloaded] = useState<boolean>(false);
  const [isSavingName, setIsSavingName] = useState<boolean>(false);

  const isImage = mimeType === 'image/jpeg' || title.toLowerCase().endsWith('.jpg') || title.toLowerCase().endsWith('.jpeg');
  const toolDisplay = getToolDisplay(toolType);

  // Automatically resolve true local URI on mount
  useEffect(() => {
    void (async () => {
      const valid = await resolveValidFileUri(fileUri, fileId);
      setResolvedUri(valid);
      if (fileId > 0) {
        const record = await getRecentFileById(fileId);
        if (record) {
          if (record.title) setTitle(record.title);
          if (record.mime_type) setMimeType(record.mime_type);
        }
      }
    })();
  }, [fileUri, fileId]);

  const handleSaveTitle = async (): Promise<void> => {
    const trimmed = tempTitle.trim();
    if (!trimmed) {
      Alert.alert('Invalid Name', 'Filename cannot be blank.');
      return;
    }
    const extension = isImage ? '.jpg' : '.pdf';
    const cleanBase = trimmed.replace(/\.(pdf|jpg|jpeg|png)$/i, '');
    const finalName = `${cleanBase}${extension}`;

    setIsSavingName(true);
    try {
      if (fileId > 0) {
        await renameRecentFile(fileId, finalName);
      }
      setTitle(finalName);
      setEditingTitle(false);
    } catch (error) {
      console.warn('[ExportSuccess] Rename error:', error);
      Alert.alert('Error', 'Could not rename the file in the database.');
    } finally {
      setIsSavingName(false);
    }
  };

  const handleDownload = async (): Promise<void> => {
    if (isDownloading) return;

    setIsDownloading(true);
    try {
      const targetUri = await resolveValidFileUri(resolvedUri || fileUri, fileId);
      const destinationMime = isImage ? 'image/jpeg' : 'application/pdf';

      if (Platform.OS === 'android') {
        // Read the local file as base64
        const fileData = await readLocalFileAsBase64(targetUri);

        // Request directory permission (user picks Downloads or any desired folder)
        const permissions =
          await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();

        if (!permissions.granted) {
          setIsDownloading(false);
          return;
        }

        // Clean name without extension for createFileAsync
        const cleanName = title.replace(/\.(pdf|jpg|jpeg|png)$/i, '');

        // Create the file in the user-selected folder
        const destinationUri = await FileSystem.StorageAccessFramework.createFileAsync(
          permissions.directoryUri,
          cleanName,
          destinationMime
        );

        // Write the base64 content into the destination file
        await FileSystem.writeAsStringAsync(destinationUri, fileData, {
          encoding: FileSystem.EncodingType.Base64,
        });

        setHasDownloaded(true);
        Alert.alert(
          'Saved to Device! 🎉',
          `"${title}" has been saved to your selected folder.`,
          [{ text: 'OK' }]
        );
      } else {
        // iOS fallback: native Share sheet with "Save to Files"
        await Sharing.shareAsync(targetUri, {
          UTI: isImage ? 'public.jpeg' : 'com.adobe.pdf',
          mimeType: destinationMime,
          dialogTitle: `Save ${title}`,
        });
        setHasDownloaded(true);
      }
    } catch (error) {
      console.warn('[ExportSuccess] Download error:', error);
      Alert.alert(
        'Save Incomplete',
        'Could not save file to the selected folder. You can also use the Share button to save or send.'
      );
    } finally {
      setIsDownloading(false);
    }
  };

  const handleShare = async (): Promise<void> => {
    if (isSharing) return;

    setIsSharing(true);
    try {
      const targetUri = await resolveValidFileUri(resolvedUri || fileUri, fileId);
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert('Sharing Unavailable', 'Native sharing is not supported on this device.');
        return;
      }

      const shareMime = isImage ? 'image/jpeg' : 'application/pdf';
      await Sharing.shareAsync(targetUri, {
        mimeType: shareMime,
        dialogTitle: `Share ${title}`,
        UTI: isImage ? 'public.jpeg' : 'com.adobe.pdf',
      });
    } catch (error) {
      console.warn('[ExportSuccess] Sharing failed:', error);
      Alert.alert('Error', 'Could not complete sharing.');
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <View className="flex-1 bg-slate-950">
      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{
          paddingTop: 24,
          paddingBottom: 24,
          alignItems: 'center',
        }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Animated Checkmark Badge */}
        <View className="w-20 h-20 rounded-3xl bg-emerald-950/70 border-2 border-emerald-500/40 items-center justify-center mb-4 shadow-2xl shadow-emerald-950">
          <CheckCircle2 size={44} color="#34d399" strokeWidth={2.2} />
        </View>

        <Text className="text-white text-2xl font-extrabold tracking-tight text-center">
          Document Ready!
        </Text>
        <Text className="text-slate-400 text-xs text-center mt-1 max-w-[280px]">
          Saved locally and encrypted in private app storage.
        </Text>

        {/* Badges: Tool Type & Format */}
        <View className="flex-row items-center gap-2 mt-3 mb-5">
          <View
            className={`flex-row items-center gap-1.5 px-3 py-1 rounded-full border ${toolDisplay.badgeBg} ${toolDisplay.badgeBorder}`}
          >
            <Sparkles size={12} color="#38bdf8" />
            <Text className={`text-xs font-semibold ${toolDisplay.textColor}`}>
              {toolDisplay.label}
            </Text>
          </View>

          <View
            className={`px-2.5 py-1 rounded-full border ${
              isImage
                ? 'bg-amber-950/60 border-amber-600/30'
                : 'bg-rose-950/60 border-rose-600/30'
            }`}
          >
            <Text
              className={`text-xs font-bold ${
                isImage ? 'text-amber-400' : 'text-rose-400'
              }`}
            >
              {isImage ? 'JPG Image' : 'PDF Document'}
            </Text>
          </View>
        </View>

        {/* File Details Card */}
        <View className="bg-slate-900 border border-slate-800 rounded-2xl p-4 w-full max-w-sm mb-5 shadow-sm">
          {/* Filename with inline edit trigger */}
          <View className="mb-3.5 pb-3 border-b border-slate-800/80">
            <View className="flex-row items-center justify-between mb-1.5">
              <Text className="text-slate-400 text-[11px] font-medium uppercase tracking-wider">
                File Name
              </Text>
              {!editingTitle ? (
                <Pressable
                  onPress={() => {
                    setTempTitle(title);
                    setEditingTitle(true);
                  }}
                  hitSlop={8}
                  className="flex-row items-center gap-1 active:opacity-70"
                >
                  <Edit3 size={12} color="#38bdf8" />
                  <Text className="text-sky-400 text-xs font-semibold">
                    Rename
                  </Text>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => void handleSaveTitle()}
                  disabled={isSavingName}
                  hitSlop={8}
                  className="flex-row items-center gap-1 active:opacity-70"
                >
                  {isSavingName ? (
                    <ActivityIndicator size="small" color="#38bdf8" />
                  ) : (
                    <>
                      <Check size={13} color="#34d399" />
                      <Text className="text-emerald-400 text-xs font-semibold">
                        Save
                      </Text>
                    </>
                  )}
                </Pressable>
              )}
            </View>

            {editingTitle ? (
              <View className="flex-row items-center bg-slate-950 border border-sky-500/50 rounded-xl px-3 h-11">
                <FileText size={16} color="#38bdf8" />
                <TextInput
                  value={tempTitle}
                  onChangeText={setTempTitle}
                  placeholder="New file name"
                  placeholderTextColor="#64748b"
                  autoFocus
                  className="flex-1 text-white text-xs px-2.5 h-full"
                />
              </View>
            ) : (
              <View className="flex-row items-center gap-2">
                <FileText size={18} color="#38bdf8" />
                <Text
                  numberOfLines={1}
                  className="text-white text-sm font-semibold flex-1"
                >
                  {title}
                </Text>
              </View>
            )}
          </View>

          {/* Size & Format rows */}
          <View className="flex-row items-center justify-between mb-2">
            <View className="flex-row items-center gap-2">
              <HardDrive size={15} color="#94a3b8" />
              <Text className="text-slate-400 text-xs">File Size</Text>
            </View>
            <Text className="text-white text-xs font-bold font-mono">
              {formatBytes(sizeBytes)}
            </Text>
          </View>

          <View className="flex-row items-center justify-between pt-2 border-t border-slate-800/80">
            <Text className="text-slate-400 text-xs">File Format</Text>
            <Text className="text-slate-200 text-xs font-semibold">
              {isImage ? 'JPEG Image (.jpg)' : 'PDF Document (.pdf)'}
            </Text>
          </View>
        </View>

        {/* Action Buttons Stack */}
        <View className="w-full max-w-sm gap-2.5">
          {/* Download / Save to Device (Primary Action) */}
          <Pressable
            onPress={() => void handleDownload()}
            disabled={isDownloading}
            className={`w-full py-4 rounded-xl flex-row items-center justify-center gap-2 min-h-[50px] shadow-lg active:opacity-85 ${
              hasDownloaded
                ? 'bg-emerald-950/80 border border-emerald-500/50 shadow-emerald-950/40'
                : 'bg-emerald-600 shadow-emerald-950/60'
            }`}
          >
            {isDownloading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : hasDownloaded ? (
              <>
                <Check size={20} color="#34d399" />
                <Text className="text-emerald-300 font-bold text-sm">
                  Saved to Device ✓
                </Text>
              </>
            ) : (
              <>
                <Download size={20} color="#ffffff" />
                <Text className="text-white font-bold text-sm">
                  Save to Downloads / Device
                </Text>
              </>
            )}
          </Pressable>

          {/* Share File (Secondary Action) */}
          <Pressable
            onPress={() => void handleShare()}
            disabled={isSharing}
            className="w-full py-3.5 rounded-xl flex-row items-center justify-center gap-2 bg-sky-600 active:opacity-85 min-h-[48px] shadow-md shadow-sky-950/50"
          >
            {isSharing ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Share2 size={18} color="#ffffff" />
                <Text className="text-white font-semibold text-sm">
                  Share File
                </Text>
              </>
            )}
          </Pressable>

          {/* Done / Back to Home (Tertiary Action) */}
          <Pressable
            onPress={() => router.replace('/')}
            className="w-full py-3.5 rounded-xl flex-row items-center justify-center gap-2 bg-slate-900 border border-slate-800 active:bg-slate-800 min-h-[48px] mt-1"
          >
            <Home size={17} color="#94a3b8" />
            <Text className="text-slate-300 font-medium text-xs">
              Done / Back to Home
            </Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* Persistent Ad Banner */}
      <AdBannerPlaceholder />
    </View>
  );
}
