import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  TextInput,
  Image as RNImage,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import {
  ImagePlus,
  Camera,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Sliders,
  Target,
  HardDrive,
  FileText,
  Check,
  CheckCircle2,
  Info,
} from 'lucide-react-native';
import {
  compressImageToTarget,
  saveCompressedImage,
  CompressImageResult,
  formatBytes,
  getFileSizeBytes,
} from '@/utils';
import { getDefaultCompressionKb, setDefaultCompressionKb } from '@/db';

const TARGET_PRESETS = [50, 100, 200, 500];

const QUALITY_PRESETS = [
  { label: '90%', value: 0.9 },
  { label: '75%', value: 0.75 },
  { label: '50%', value: 0.5 },
  { label: '30%', value: 0.3 },
  { label: '15%', value: 0.15 },
];

const RESOLUTION_PRESETS: { label: string; value: number | undefined }[] = [
  { label: 'Original', value: undefined },
  { label: '1600px', value: 1600 },
  { label: '1080px', value: 1080 },
  { label: '720px', value: 720 },
];

function getDefaultFilename(): string {
  const now = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `Compressed_${months[now.getMonth()]}${now.getDate()}`;
}

export default function CompressScreen(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 24) + 8;

  // Source image state
  const [sourceUri, setSourceUri] = useState<string | null>(null);
  const [originalSize, setOriginalSize] = useState<number>(0);
  const [originalWidth, setOriginalWidth] = useState<number>(0);
  const [originalHeight, setOriginalHeight] = useState<number>(0);

  // Mode and settings
  const [activeTab, setActiveTab] = useState<'target' | 'manual'>('target');
  const [targetKb, setTargetKb] = useState<number>(200);
  const [customKbInput, setCustomKbInput] = useState<string>('200');
  const [manualQuality, setManualQuality] = useState<number>(0.75);
  const [maxWidth, setMaxWidth] = useState<number | undefined>(undefined);

  // Output options
  const [outputTitle, setOutputTitle] = useState<string>(getDefaultFilename());
  const [outputFormat, setOutputFormat] = useState<'jpg' | 'pdf'>('jpg');

  // Preview compression state
  const [compressedResult, setCompressedResult] = useState<CompressImageResult | null>(null);
  const [isCompressing, setIsCompressing] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Debounce ref for live compression
  const compressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load saved default compression KB on mount
  useEffect(() => {
    void (async () => {
      const savedKb = await getDefaultCompressionKb();
      if (savedKb && savedKb > 0) {
        setTargetKb(savedKb);
        setCustomKbInput(savedKb.toString());
      }
    })();
  }, []);

  // Run live compression whenever settings or source image change
  const runCompression = useCallback(
    async (uri: string, tab: 'target' | 'manual', kb: number, quality: number, widthLimit?: number) => {
      setIsCompressing(true);
      try {
        if (tab === 'target') {
          const result = await compressImageToTarget({
            sourceUri: uri,
            targetKb: kb,
          });
          setCompressedResult(result);
        } else {
          const result = await compressImageToTarget({
            sourceUri: uri,
            manualQuality: quality,
            maxWidth: widthLimit,
          });
          setCompressedResult(result);
        }
      } catch (err) {
        console.warn('[CompressScreen] Live compression error:', err);
      } finally {
        setIsCompressing(false);
      }
    },
    []
  );

  // Debounce live compression trigger
  useEffect(() => {
    if (!sourceUri) return;

    if (compressTimerRef.current) {
      clearTimeout(compressTimerRef.current);
    }

    compressTimerRef.current = setTimeout(() => {
      void runCompression(sourceUri, activeTab, targetKb, manualQuality, maxWidth);
    }, 250);

    return () => {
      if (compressTimerRef.current) {
        clearTimeout(compressTimerRef.current);
      }
    };
  }, [sourceUri, activeTab, targetKb, manualQuality, maxWidth, runCompression]);

  // Gallery picker
  const handlePickFromGallery = async (): Promise<void> => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const sizeBytes = await getFileSizeBytes(asset.uri);
        setSourceUri(asset.uri);
        setOriginalSize(sizeBytes > 0 ? sizeBytes : (asset.fileSize ?? 0));
        setOriginalWidth(asset.width);
        setOriginalHeight(asset.height);
      }
    } catch (error) {
      console.warn('[CompressScreen] Gallery pick failed:', error);
      Alert.alert('Error', 'Unable to pick photo from gallery.');
    }
  };

  // Camera capture
  const handleTakePhoto = async (): Promise<void> => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          'Camera Permission Needed',
          'Please allow camera permissions to capture photos for compression.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 1,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const sizeBytes = await getFileSizeBytes(asset.uri);
        setSourceUri(asset.uri);
        setOriginalSize(sizeBytes > 0 ? sizeBytes : (asset.fileSize ?? 0));
        setOriginalWidth(asset.width);
        setOriginalHeight(asset.height);
      }
    } catch (error) {
      console.warn('[CompressScreen] Camera capture failed:', error);
      Alert.alert('Error', 'Unable to capture photo with camera.');
    }
  };

  // Preset chip selected
  const handleSelectTargetPreset = (preset: number): void => {
    setTargetKb(preset);
    setCustomKbInput(preset.toString());
    void setDefaultCompressionKb(preset);
  };

  // Custom KB text input
  const handleCustomKbChange = (text: string): void => {
    const clean = text.replace(/[^0-9]/g, '');
    setCustomKbInput(clean);
    const parsed = parseInt(clean, 10);
    if (!isNaN(parsed) && parsed > 0) {
      setTargetKb(parsed);
      void setDefaultCompressionKb(parsed);
    }
  };

  // Save CTA
  const handleSave = async (): Promise<void> => {
    if (!compressedResult || isSaving) return;

    setIsSaving(true);
    try {
      const recentFile = await saveCompressedImage({
        compressedUri: compressedResult.uri,
        outputTitle: outputTitle.trim() || getDefaultFilename(),
        exportAsPdf: outputFormat === 'pdf',
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
      console.warn('[CompressScreen] Save error:', error);
      Alert.alert('Error', 'Failed to save compressed file. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const percentageSaved =
    originalSize > 0 && compressedResult && compressedResult.sizeBytes < originalSize
      ? Math.round(((originalSize - compressedResult.sizeBytes) / originalSize) * 100)
      : 0;

  return (
    <View className="flex-1 bg-slate-950">
      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Source Picker (Empty State or Replace button) */}
        {!sourceUri ? (
          <View
            key="compress-picker-empty"
            className="bg-slate-900 border border-dashed border-slate-800 rounded-2xl p-6 items-center mb-5"
          >
            <View className="w-14 h-14 rounded-2xl bg-amber-950/60 border border-amber-600/30 items-center justify-center mb-3.5">
              <Sparkles size={26} color="#fbbf24" />
            </View>
            <Text className="text-white text-base font-bold text-center">
              Select Image to Compress
            </Text>
            <Text className="text-slate-400 text-xs text-center mt-1 mb-5 max-w-[260px] leading-relaxed">
              Pick high-resolution camera photos or scans to shrink under 200KB for portals & emails.
            </Text>

            <View className="flex-row items-center gap-3 w-full">
              <Pressable
                onPress={() => void handlePickFromGallery()}
                style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
                className="flex-1 py-3.5 bg-amber-600 rounded-xl flex-row items-center justify-center gap-2"
              >
                <ImagePlus size={18} color="#ffffff" />
                <Text className="text-white font-bold text-xs">Gallery</Text>
              </Pressable>

              <Pressable
                onPress={() => void handleTakePhoto()}
                style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
                className="flex-1 py-3.5 bg-slate-800 border border-slate-700/80 rounded-xl flex-row items-center justify-center gap-2"
              >
                <Camera size={18} color="#e2e8f0" />
                <Text className="text-white font-bold text-xs">Take Photo</Text>
              </Pressable>
            </View>
          </View>
        ) : (
          /* Before / After Comparison Card */
          <View
            key="compress-preview-card"
            className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-5 shadow-sm"
          >
            <View className="flex-row items-center justify-between mb-3 pb-2.5 border-b border-slate-800/80">
              <Text className="text-slate-400 text-[11px] font-medium uppercase tracking-wider">
                Compression Preview
              </Text>
              <Pressable
                onPress={() => void handlePickFromGallery()}
                hitSlop={8}
                style={({ pressed }) => [{ opacity: pressed ? 0.7 : 1 }]}
                className="flex-row items-center gap-1"
              >
                <RefreshCw size={12} color="#fbbf24" />
                <Text className="text-amber-400 text-xs font-semibold">Change Image</Text>
              </Pressable>
            </View>

            <View className="flex-row items-center gap-3">
              {/* Preview Thumbnail */}
              <View className="relative">
                <RNImage
                  source={{ uri: compressedResult?.uri || sourceUri }}
                  className="w-20 h-20 rounded-xl bg-slate-950 border border-slate-800"
                  resizeMode="cover"
                />
                {isCompressing && (
                  <View className="absolute inset-0 bg-slate-950/70 rounded-xl items-center justify-center">
                    <ActivityIndicator size="small" color="#fbbf24" />
                  </View>
                )}
              </View>

              {/* Sizes comparison stats */}
              <View className="flex-1 justify-center">
                <View className="flex-row items-center gap-2 mb-1">
                  <View>
                    <Text className="text-slate-500 text-[10px] font-medium">Original</Text>
                    <Text className="text-slate-400 text-xs font-mono">
                      {formatBytes(originalSize)}
                    </Text>
                    {originalWidth > 0 && originalHeight > 0 && (
                      <Text className="text-slate-500 text-[10px] font-mono">
                        {originalWidth}×{originalHeight}
                      </Text>
                    )}
                  </View>

                  <ArrowRight size={14} color="#64748b" />

                  <View>
                    <Text className="text-slate-500 text-[10px] font-medium">Compressed</Text>
                    <Text className="text-emerald-400 text-sm font-bold font-mono">
                      {compressedResult ? formatBytes(compressedResult.sizeBytes) : '...'}
                    </Text>
                  </View>
                </View>

                {/* Savings Pill */}
                <View className="flex-row items-center gap-2 mt-1">
                  {percentageSaved > 0 && (
                    <View className="bg-emerald-950/70 border border-emerald-500/40 px-2 py-0.5 rounded-md">
                      <Text className="text-emerald-300 text-[10px] font-bold">
                        -{percentageSaved}% Saved
                      </Text>
                    </View>
                  )}

                  {compressedResult && (
                    <Text className="text-slate-500 text-[10px] font-mono">
                      {compressedResult.width}×{compressedResult.height}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Compression Mode Tabs */}
        {sourceUri && (
          <>
            <View className="bg-slate-900 border border-slate-800 rounded-2xl p-1 flex-row mb-4">
              <Pressable
                onPress={() => setActiveTab('target')}
                style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                className={`flex-1 py-2.5 rounded-xl flex-row items-center justify-center gap-1.5 ${
                  activeTab === 'target' ? 'bg-amber-600 shadow-sm' : 'bg-transparent'
                }`}
              >
                <Target
                  size={15}
                  color={activeTab === 'target' ? '#ffffff' : '#94a3b8'}
                />
                <Text
                  className={`text-xs font-bold ${
                    activeTab === 'target' ? 'text-white' : 'text-slate-400'
                  }`}
                >
                  Target Size (Portal)
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setActiveTab('manual')}
                style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
                className={`flex-1 py-2.5 rounded-xl flex-row items-center justify-center gap-1.5 ${
                  activeTab === 'manual' ? 'bg-amber-600 shadow-sm' : 'bg-transparent'
                }`}
              >
                <Sliders
                  size={15}
                  color={activeTab === 'manual' ? '#ffffff' : '#94a3b8'}
                />
                <Text
                  className={`text-xs font-bold ${
                    activeTab === 'manual' ? 'text-white' : 'text-slate-400'
                  }`}
                >
                  Manual Quality
                </Text>
              </Pressable>
            </View>

            {/* Tab 1: Target Size Mode */}
            {activeTab === 'target' ? (
              <View key="tab-target-panel" className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
                <View className="flex-row items-center justify-between mb-2">
                  <Text className="text-slate-400 text-xs font-medium">
                    Target Max File Size
                  </Text>
                  <Text className="text-amber-400 text-xs font-bold font-mono">
                    Under {targetKb} KB
                  </Text>
                </View>

                {/* Preset Chips */}
                <View className="flex-row items-center gap-2 mb-3">
                  {TARGET_PRESETS.map((preset) => {
                    const isSelected = targetKb === preset;
                    return (
                      <Pressable
                        key={preset}
                        onPress={() => handleSelectTargetPreset(preset)}
                        style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
                        className={`flex-1 py-2 rounded-xl items-center border ${
                          isSelected
                            ? 'bg-amber-950/80 border-amber-500'
                            : 'bg-slate-950 border-slate-800'
                        }`}
                      >
                        <Text
                          className={`text-xs font-bold ${
                            isSelected ? 'text-amber-300' : 'text-slate-300'
                          }`}
                        >
                          {preset} KB
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Custom numeric KB input */}
                <View className="flex-row items-center bg-slate-950 border border-slate-800 rounded-xl px-3 h-11">
                  <HardDrive size={15} color="#94a3b8" />
                  <Text className="text-slate-400 text-xs ml-2 mr-1">Custom Target:</Text>
                  <TextInput
                    value={customKbInput}
                    onChangeText={handleCustomKbChange}
                    keyboardType="numeric"
                    placeholder="e.g. 150"
                    placeholderTextColor="#64748b"
                    className="flex-1 text-white text-xs font-bold font-mono"
                  />
                  <Text className="text-slate-400 text-xs font-bold">KB</Text>
                </View>

                {/* Help tip */}
                <View className="flex-row items-center gap-1.5 mt-3 pt-2.5 border-t border-slate-800/80">
                  <Info size={12} color="#fbbf24" />
                  <Text className="text-slate-400 text-[11px] leading-tight flex-1">
                    Ideal for government, bank, and exam portals requiring files strictly under 100KB or 200KB.
                  </Text>
                </View>
              </View>
            ) : (
              /* Tab 2: Manual Quality Mode */
              <View key="tab-manual-panel" className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
                {/* Quality Presets */}
                <Text className="text-slate-400 text-xs font-medium mb-2">
                  JPEG Quality
                </Text>
                <View className="flex-row items-center gap-2 mb-4">
                  {QUALITY_PRESETS.map((q) => {
                    const isSelected = manualQuality === q.value;
                    return (
                      <Pressable
                        key={q.value}
                        onPress={() => setManualQuality(q.value)}
                        style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
                        className={`flex-1 py-2 rounded-xl items-center border ${
                          isSelected
                            ? 'bg-amber-950/80 border-amber-500'
                            : 'bg-slate-950 border-slate-800'
                        }`}
                      >
                        <Text
                          className={`text-xs font-bold ${
                            isSelected ? 'text-amber-300' : 'text-slate-300'
                          }`}
                        >
                          {q.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Max Resolution Presets */}
                <Text className="text-slate-400 text-xs font-medium mb-2">
                  Max Resolution Limit
                </Text>
                <View className="flex-row items-center gap-2">
                  {RESOLUTION_PRESETS.map((res) => {
                    const isSelected = maxWidth === res.value;
                    return (
                      <Pressable
                        key={res.label}
                        onPress={() => setMaxWidth(res.value)}
                        style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
                        className={`flex-1 py-2 rounded-xl items-center border ${
                          isSelected
                            ? 'bg-amber-950/80 border-amber-500'
                            : 'bg-slate-950 border-slate-800'
                        }`}
                      >
                        <Text
                          className={`text-xs font-bold ${
                            isSelected ? 'text-amber-300' : 'text-slate-300'
                          }`}
                        >
                          {res.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Output Options: Filename & Format Toggle */}
            <View className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-4">
              <Text className="text-slate-400 text-xs font-medium mb-2">
                Output Filename
              </Text>
              <View className="flex-row items-center bg-slate-950 border border-slate-800 rounded-xl px-3 h-11 mb-4">
                <FileText size={16} color="#fbbf24" />
                <TextInput
                  value={outputTitle}
                  onChangeText={setOutputTitle}
                  placeholder="Output filename"
                  placeholderTextColor="#64748b"
                  className="flex-1 text-white text-xs px-2.5 h-full"
                />
                <Text className="text-slate-500 text-xs font-mono">
                  .{outputFormat}
                </Text>
              </View>

              <Text className="text-slate-400 text-xs font-medium mb-2">
                Export Format
              </Text>
              <View className="flex-row items-center gap-2">
                <Pressable
                  onPress={() => setOutputFormat('jpg')}
                  style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
                  className={`flex-1 py-2.5 rounded-xl items-center border flex-row justify-center gap-1.5 ${
                    outputFormat === 'jpg'
                      ? 'bg-amber-950/80 border-amber-500'
                      : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  {outputFormat === 'jpg' && <Check size={14} color="#fbbf24" />}
                  <Text
                    className={`text-xs font-bold ${
                      outputFormat === 'jpg' ? 'text-amber-300' : 'text-slate-400'
                    }`}
                  >
                    Save as JPG
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setOutputFormat('pdf')}
                  style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
                  className={`flex-1 py-2.5 rounded-xl items-center border flex-row justify-center gap-1.5 ${
                    outputFormat === 'pdf'
                      ? 'bg-rose-950/80 border-rose-500'
                      : 'bg-slate-950 border-slate-800'
                  }`}
                >
                  {outputFormat === 'pdf' && <Check size={14} color="#fb7185" />}
                  <Text
                    className={`text-xs font-bold ${
                      outputFormat === 'pdf' ? 'text-rose-300' : 'text-slate-400'
                    }`}
                  >
                    Save as PDF
                  </Text>
                </Pressable>
              </View>
              {outputFormat === 'pdf' && (
                <Text className="text-slate-500 text-[11px] mt-2">
                  Embeds the compressed image directly into a single-page PDF under target size.
                </Text>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Sticky Bottom Save CTA with SafeArea */}
      <View
        className="bg-slate-950 border-t border-slate-900 px-4 pt-3.5"
        style={{ paddingBottom: bottomPadding }}
      >
        <Pressable
          onPress={() => void handleSave()}
          disabled={!sourceUri || !compressedResult || isCompressing || isSaving}
          style={({ pressed }) => [
            {
              opacity:
                !sourceUri || !compressedResult || isCompressing || isSaving
                  ? 0.5
                  : pressed
                  ? 0.85
                  : 1,
            },
          ]}
          className={`w-full py-4 rounded-xl flex-row items-center justify-center gap-2 min-h-[50px] shadow-lg ${
            !sourceUri || !compressedResult || isCompressing || isSaving
              ? 'bg-slate-800'
              : 'bg-amber-600 shadow-amber-950/60'
          }`}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <>
              <CheckCircle2 size={18} color="#ffffff" />
              <Text className="text-white font-bold text-sm">
                Save Compressed {outputFormat.toUpperCase()}
                {compressedResult ? ` (${formatBytes(compressedResult.sizeBytes)})` : ''}
              </Text>
            </>
          )}
        </Pressable>
      </View>
    </View>
  );
}
