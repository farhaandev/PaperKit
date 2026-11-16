import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import {
  Layers,
  FilePlus2,
  ArrowUp,
  ArrowDown,
  X,
  FileText,
  Sparkles,
  Info,
  Plus,
} from 'lucide-react-native';
import {
  inspectPdfMetadata,
  mergePdfDocuments,
  prepareLocalPdfUri,
  formatBytes,
  getFileSizeBytes,
} from '@/utils';

interface QueuedPdfItem {
  id: string;
  uri: string;
  name: string;
  sizeBytes: number;
  pageCount: number;
}

function getDefaultFilename(): string {
  const now = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `Merged_${months[now.getMonth()]}${now.getDate()}`;
}

export default function MergePdfScreen(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 24) + 8;

  const [queuedPdfs, setQueuedPdfs] = useState<QueuedPdfItem[]>([]);
  const [outputTitle, setOutputTitle] = useState<string>(getDefaultFilename());
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [isMerging, setIsMerging] = useState<boolean>(false);

  // Pick PDF files from device storage
  const handlePickPdfs = async (): Promise<void> => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/pdf',
        multiple: true,
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      setIsValidating(true);

      const validItems: QueuedPdfItem[] = [];
      const encryptedFiles: string[] = [];
      const corruptedFiles: string[] = [];

      for (const asset of result.assets) {
        try {
          // Normalize content:// or external URI to a local cached file:// URI
          const localUri = await prepareLocalPdfUri(asset.uri, asset.name);
          const meta = await inspectPdfMetadata(localUri);

          if (meta.isEncrypted) {
            encryptedFiles.push(asset.name || 'Protected PDF');
          } else if (meta.pageCount > 0) {
            let size = typeof asset.size === 'number' && asset.size > 0 ? asset.size : 0;
            if (size === 0) {
              size = await getFileSizeBytes(localUri);
            }

            validItems.push({
              id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
              uri: localUri,
              name: asset.name || 'document.pdf',
              sizeBytes: size,
              pageCount: meta.pageCount,
            });
          } else {
            corruptedFiles.push(asset.name || 'Invalid PDF');
          }
        } catch (err) {
          console.warn('[MergePdfScreen] File inspection failed:', asset.name, err);
          corruptedFiles.push(asset.name || 'Unreadable PDF');
        }
      }

      // Alert about any skipped files
      if (encryptedFiles.length > 0 && corruptedFiles.length > 0) {
        Alert.alert(
          'Some Files Skipped',
          `The following files could not be added because they are password-protected or unreadable:\n\n• ${[
            ...encryptedFiles,
            ...corruptedFiles,
          ].join('\n• ')}`
        );
      } else if (encryptedFiles.length > 0) {
        Alert.alert(
          'Password-Protected Files Skipped',
          `Password-protected PDFs cannot be merged:\n\n• ${encryptedFiles.join('\n• ')}`
        );
      } else if (corruptedFiles.length > 0) {
        Alert.alert(
          'Corrupted Files Skipped',
          `The following files could not be parsed:\n\n• ${corruptedFiles.join('\n• ')}`
        );
      }

      if (validItems.length > 0) {
        setQueuedPdfs((prev) => [...prev, ...validItems]);
      }
    } catch (error) {
      console.warn('[MergePdfScreen] File pick error:', error);
      Alert.alert('Error', 'Unable to pick PDF documents.');
    } finally {
      setIsValidating(false);
    }
  };

  // Reordering handlers
  const handleMoveUp = (index: number): void => {
    if (index <= 0) return;
    setQueuedPdfs((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index - 1];
      next[index - 1] = temp;
      return next;
    });
  };

  const handleMoveDown = (index: number): void => {
    if (index >= queuedPdfs.length - 1) return;
    setQueuedPdfs((prev) => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index + 1];
      next[index + 1] = temp;
      return next;
    });
  };

  const handleRemove = (id: string): void => {
    setQueuedPdfs((prev) => prev.filter((item) => item.id !== id));
  };

  // Merge execution
  const handleMerge = async (): Promise<void> => {
    if (queuedPdfs.length < 2 || isMerging) return;

    setIsMerging(true);
    try {
      const recentFile = await mergePdfDocuments({
        pdfUris: queuedPdfs.map((item) => item.uri),
        outputTitle: outputTitle.trim() || getDefaultFilename(),
      });

      router.replace({
        pathname: '/export-success',
        params: {
          id: recentFile.id.toString(),
          title: recentFile.title,
          file_uri: recentFile.file_uri,
          size_bytes: recentFile.size_bytes.toString(),
          tool_type: recentFile.tool_type,
          mime_type: recentFile.mime_type,
        },
      });
    } catch (error) {
      console.warn('[MergePdfScreen] Merge execution error:', error);
      Alert.alert(
        'Merge Failed',
        'Could not merge the selected PDF documents. Please ensure all documents are valid.'
      );
    } finally {
      setIsMerging(false);
    }
  };

  const totalPages = queuedPdfs.reduce((sum, item) => sum + item.pageCount, 0);
  const totalBytes = queuedPdfs.reduce((sum, item) => sum + item.sizeBytes, 0);

  return (
    <View className="flex-1 bg-slate-950">
      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Empty State / Add PDFs Hero */}
        {queuedPdfs.length === 0 ? (
          <View
            key="merge-empty-picker"
            className="bg-slate-900 border border-dashed border-slate-800 rounded-2xl p-7 items-center mb-5"
          >
            <View className="w-16 h-16 rounded-2xl bg-emerald-950/60 border border-emerald-600/30 items-center justify-center mb-4">
              <Layers size={30} color="#34d399" />
            </View>
            <Text className="text-white text-base font-bold text-center">
              Combine Multiple PDFs
            </Text>
            <Text className="text-slate-400 text-xs text-center mt-1.5 mb-6 max-w-[270px] leading-relaxed">
              Select two or more PDF documents to merge into a single organized document in exact order.
            </Text>

            <Pressable
              onPress={() => void handlePickPdfs()}
              disabled={isValidating}
              style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
              className="w-full py-4 bg-emerald-600 rounded-xl flex-row items-center justify-center gap-2 shadow-lg shadow-emerald-950/50"
            >
              {isValidating ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <FilePlus2 size={18} color="#ffffff" />
                  <Text className="text-white font-bold text-sm">Select PDF Files</Text>
                </>
              )}
            </Pressable>
          </View>
        ) : (
          /* Active Document Queue Section */
          <View key="merge-active-queue" className="mb-4">
            {/* Header with Add More & Clear All buttons */}
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                PDF Queue ({queuedPdfs.length})
              </Text>

              <View className="flex-row items-center gap-2">
                <Pressable
                  onPress={() => void handlePickPdfs()}
                  disabled={isValidating}
                  hitSlop={8}
                  style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                  className="flex-row items-center gap-1 bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-lg"
                >
                  <Plus size={13} color="#34d399" />
                  <Text className="text-emerald-400 text-xs font-semibold">Add More</Text>
                </Pressable>

                <Pressable
                  onPress={() => setQueuedPdfs([])}
                  hitSlop={8}
                  style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                  className="px-2 py-1"
                >
                  <Text className="text-rose-400 text-xs font-medium">Clear</Text>
                </Pressable>
              </View>
            </View>

            {/* Running Total Summary Bar */}
            <View className="bg-slate-900/90 border border-emerald-500/30 rounded-xl p-3 flex-row items-center justify-between mb-3.5">
              <View className="flex-row items-center gap-2">
                <View className="w-2 h-2 rounded-full bg-emerald-400" />
                <Text className="text-slate-300 text-xs font-medium">
                  {queuedPdfs.length} {queuedPdfs.length === 1 ? 'file' : 'files'} • {totalPages}{' '}
                  {totalPages === 1 ? 'page' : 'pages'}
                </Text>
              </View>
              <Text className="text-emerald-400 text-xs font-bold font-mono">
                {formatBytes(totalBytes)}
              </Text>
            </View>

            {/* Ordered Queue List */}
            <View className="gap-2.5 mb-5">
              {queuedPdfs.map((item, index) => {
                const isFirst = index === 0;
                const isLast = index === queuedPdfs.length - 1;

                return (
                  <View
                    key={item.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex-row items-center justify-between shadow-sm"
                  >
                    {/* Badge & Info */}
                    <View className="flex-row items-center gap-3 flex-1 pr-2">
                      <View className="w-9 h-9 rounded-xl bg-emerald-950/70 border border-emerald-600/40 items-center justify-center">
                        <Text className="text-emerald-300 text-xs font-bold font-mono">
                          #{index + 1}
                        </Text>
                      </View>

                      <View className="flex-1">
                        <Text
                          numberOfLines={1}
                          className="text-white text-xs font-semibold tracking-tight"
                        >
                          {item.name}
                        </Text>
                        <View className="flex-row items-center gap-1.5 mt-0.5">
                          <Text className="text-slate-400 text-[10px] font-mono">
                            {formatBytes(item.sizeBytes)}
                          </Text>
                          <Text className="text-slate-600 text-[10px]">•</Text>
                          <View className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                            <Text className="text-emerald-400 text-[10px] font-medium">
                              {item.pageCount} {item.pageCount === 1 ? 'page' : 'pages'}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Actions: Reorder & Remove */}
                    <View className="flex-row items-center gap-1">
                      {/* Move Up */}
                      <Pressable
                        onPress={() => handleMoveUp(index)}
                        disabled={isFirst}
                        hitSlop={6}
                        accessibilityLabel="Move document up"
                        style={({ pressed }) => [
                          { opacity: isFirst ? 0.3 : pressed ? 0.7 : 1 },
                        ]}
                        className="w-9 h-9 rounded-lg items-center justify-center min-w-[36px] min-h-[36px] bg-slate-950/60 border border-slate-800"
                      >
                        <ArrowUp size={15} color="#94a3b8" />
                      </Pressable>

                      {/* Move Down */}
                      <Pressable
                        onPress={() => handleMoveDown(index)}
                        disabled={isLast}
                        hitSlop={6}
                        accessibilityLabel="Move document down"
                        style={({ pressed }) => [
                          { opacity: isLast ? 0.3 : pressed ? 0.7 : 1 },
                        ]}
                        className="w-9 h-9 rounded-lg items-center justify-center min-w-[36px] min-h-[36px] bg-slate-950/60 border border-slate-800"
                      >
                        <ArrowDown size={15} color="#94a3b8" />
                      </Pressable>

                      {/* Remove */}
                      <Pressable
                        onPress={() => handleRemove(item.id)}
                        hitSlop={6}
                        accessibilityLabel="Remove document"
                        style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                        className="w-9 h-9 rounded-lg items-center justify-center bg-rose-950/30 border border-rose-900/40 min-w-[36px] min-h-[36px]"
                      >
                        <X size={15} color="#f87171" />
                      </Pressable>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Output Options Card */}
            <View className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4 shadow-sm">
              <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2.5">
                Output Settings
              </Text>

              <Text className="text-slate-300 text-xs font-medium mb-1.5">
                Merged Filename
              </Text>
              <View className="flex-row items-center bg-slate-950 border border-slate-800 rounded-xl px-3 h-11">
                <FileText size={16} color="#34d399" />
                <TextInput
                  value={outputTitle}
                  onChangeText={setOutputTitle}
                  placeholder="Output filename"
                  placeholderTextColor="#64748b"
                  className="flex-1 text-white text-xs px-2.5 h-full"
                />
                <Text className="text-slate-500 text-xs font-mono">.pdf</Text>
              </View>

              {queuedPdfs.length < 2 && (
                <View className="flex-row items-center gap-1.5 mt-3 pt-2.5 border-t border-slate-800/80">
                  <Info size={12} color="#fbbf24" />
                  <Text className="text-amber-300 text-[11px] leading-tight flex-1">
                    Please add at least 2 PDF files to create a merged document.
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Sticky Bottom Merge Button with Safe Area */}
      <View
        className="bg-slate-950 border-t border-slate-900 px-4 pt-3.5"
        style={{ paddingBottom: bottomPadding }}
      >
        <Pressable
          onPress={() => void handleMerge()}
          disabled={queuedPdfs.length < 2 || isMerging}
          style={({ pressed }) => [
            {
              opacity: queuedPdfs.length < 2 || isMerging ? 0.5 : pressed ? 0.85 : 1,
            },
          ]}
          className={`w-full py-4 rounded-xl flex-row items-center justify-center gap-2 min-h-[50px] shadow-lg ${
            queuedPdfs.length < 2 || isMerging
              ? 'bg-slate-800'
              : 'bg-emerald-600 shadow-emerald-950/60'
          }`}
        >
          {isMerging ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <Sparkles size={18} color="#ffffff" />
              <Text className="text-white font-bold text-sm">
                {queuedPdfs.length < 2
                  ? 'Merge PDFs (Add at least 2)'
                  : `Merge ${queuedPdfs.length} PDFs (${totalPages} pages)`}
              </Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Full Loading Spinner Overlay */}
      {isMerging && (
        <View className="absolute inset-0 bg-slate-950/85 items-center justify-center z-50 p-6">
          <View className="bg-slate-900 border border-slate-800 rounded-2xl p-6 items-center justify-center max-w-xs w-full shadow-2xl">
            <ActivityIndicator size="large" color="#34d399" />
            <Text className="text-white text-base font-bold mt-4 text-center">
              Merging Documents
            </Text>
            <Text className="text-slate-400 text-xs mt-1.5 text-center leading-relaxed">
              Combining {queuedPdfs.length} PDFs ({totalPages} pages) into a single document...
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}
