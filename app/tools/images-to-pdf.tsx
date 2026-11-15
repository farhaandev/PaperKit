import React, { useState } from 'react';
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
import * as ImagePicker from 'expo-image-picker';
import {
  ImagePlus,
  Camera,
  ArrowUp,
  ArrowDown,
  RotateCw,
  X,
  Sparkles,
  FileText,
  Check,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import { buildPdfFromImages } from '@/utils';

interface PageItem {
  id: string;
  uri: string;
}

function getDefaultFilename(): string {
  const now = new Date();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `Scan_${months[now.getMonth()]}${now.getDate()}`;
}

export default function ImagesToPdfScreen(): React.JSX.Element {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomPadding = Math.max(insets.bottom, 24) + 8;

  const [pages, setPages] = useState<PageItem[]>([]);
  const [outputTitle, setOutputTitle] = useState<string>(getDefaultFilename());
  const [pageSize, setPageSize] = useState<'A4' | 'fit'>('A4');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isRotatingId, setIsRotatingId] = useState<string | null>(null);

  // Gallery Picker
  const handlePickGallery = async (): Promise<void> => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsMultipleSelection: true,
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const timestamp = Date.now();
        const newPages: PageItem[] = result.assets.map((asset, i) => ({
          id: `img_${timestamp}_${i}_${Math.random().toString(36).substring(2, 7)}`,
          uri: asset.uri,
        }));
        setPages((prev) => [...prev, ...newPages]);
      }
    } catch (error) {
      console.warn('[images-to-pdf] Gallery picker error:', error);
      Alert.alert('Error', 'Could not open image gallery.');
    }
  };

  // Camera Capture
  const handleTakePhoto = async (): Promise<void> => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission Required',
          'Camera access is required to take document photos.'
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.9,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const timestamp = Date.now();
        const newPages: PageItem[] = result.assets.map((asset, i) => ({
          id: `cam_${timestamp}_${i}_${Math.random().toString(36).substring(2, 7)}`,
          uri: asset.uri,
        }));
        setPages((prev) => [...prev, ...newPages]);
      }
    } catch (error) {
      console.warn('[images-to-pdf] Camera launch error:', error);
      Alert.alert('Error', 'Could not launch camera.');
    }
  };

  // Rotate 90 degrees
  const handleRotate = async (id: string, currentUri: string): Promise<void> => {
    if (isRotatingId) return;
    setIsRotatingId(id);
    try {
      const manip = await manipulateAsync(
        currentUri,
        [{ rotate: 90 }],
        { format: SaveFormat.JPEG, compress: 0.92 }
      );
      setPages((prev) =>
        prev.map((p) => (p.id === id ? { ...p, uri: manip.uri } : p))
      );
    } catch (err) {
      console.warn('[images-to-pdf] Rotate failed:', err);
      Alert.alert('Error', 'Could not rotate image.');
    } finally {
      setIsRotatingId(null);
    }
  };

  // Move Up
  const handleMoveUp = (index: number): void => {
    if (index <= 0) return;
    setPages((prev) => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[index - 1];
      updated[index - 1] = temp;
      return updated;
    });
  };

  // Move Down
  const handleMoveDown = (index: number): void => {
    if (index >= pages.length - 1) return;
    setPages((prev) => {
      const updated = [...prev];
      const temp = updated[index];
      updated[index] = updated[index + 1];
      updated[index + 1] = temp;
      return updated;
    });
  };

  // Remove single page
  const handleRemove = (id: string): void => {
    setPages((prev) => prev.filter((p) => p.id !== id));
  };

  // Generate Multi-page PDF
  const handleGenerate = async (): Promise<void> => {
    if (pages.length === 0 || isGenerating) return;

    setIsGenerating(true);
    try {
      const title = outputTitle.trim() || 'Scan_Document';
      const recentFile = await buildPdfFromImages({
        imageUris: pages.map((p) => p.uri),
        pageSize,
        margin: pageSize === 'A4' ? 20 : 0,
        outputTitle: title,
      });

      router.replace({
        pathname: '/export-success',
        params: {
          id: recentFile.id.toString(),
          title: recentFile.title,
          file_uri: recentFile.file_uri,
          size_bytes: recentFile.size_bytes.toString(),
          tool_type: recentFile.tool_type,
        },
      });
    } catch (error) {
      console.warn('[images-to-pdf] PDF generation error:', error);
      Alert.alert(
        'Generation Failed',
        error instanceof Error ? error.message : 'An unknown error occurred while creating the PDF.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <View className="flex-1 bg-slate-950">
      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingTop: 14, paddingBottom: 20 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Action Buttons Bar: Gallery & Camera */}
        <View className="flex-row gap-3 mb-5">
          <Pressable
            onPress={() => void handlePickGallery()}
            disabled={isGenerating}
            className="flex-1 flex-row items-center justify-center gap-2 bg-indigo-600 active:opacity-85 py-3.5 px-4 rounded-xl min-h-[44px] shadow-sm"
          >
            <ImagePlus size={18} color="#ffffff" />
            <Text className="text-white text-xs font-semibold">
              Pick from Gallery
            </Text>
          </Pressable>

          <Pressable
            onPress={() => void handleTakePhoto()}
            disabled={isGenerating}
            className="flex-1 flex-row items-center justify-center gap-2 bg-slate-900 border border-slate-800 active:bg-slate-800 py-3.5 px-4 rounded-xl min-h-[44px]"
          >
            <Camera size={18} color="#818cf8" />
            <Text className="text-slate-200 text-xs font-semibold">
              Take Photo
            </Text>
          </Pressable>
        </View>

        {/* Export Options Card */}
        <View className="bg-slate-900 border border-slate-800 rounded-2xl p-4 mb-5 shadow-sm">
          <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3">
            PDF Settings
          </Text>

          {/* Filename Input */}
          <View className="mb-4">
            <Text className="text-slate-300 text-xs font-medium mb-1.5">
              Output Filename
            </Text>
            <View className="flex-row items-center bg-slate-950 border border-slate-800 rounded-xl px-3 h-11">
              <FileText size={16} color="#64748b" />
              <TextInput
                value={outputTitle}
                onChangeText={setOutputTitle}
                placeholder="Document name"
                placeholderTextColor="#64748b"
                className="flex-1 text-white text-xs px-2.5 h-full"
              />
              <Text className="text-slate-500 text-xs font-mono">.pdf</Text>
            </View>
          </View>

          {/* Page Size Toggle Pill */}
          <View>
            <Text className="text-slate-300 text-xs font-medium mb-1.5">
              Page Layout
            </Text>
            <View className="flex-row bg-slate-950 p-1 rounded-xl border border-slate-800">
              <Pressable
                onPress={() => setPageSize('A4')}
                className={`flex-1 py-2 rounded-lg items-center justify-center flex-row gap-1.5 active:opacity-80 ${
                  pageSize === 'A4'
                    ? 'bg-indigo-600 shadow-sm'
                    : 'bg-transparent'
                }`}
              >
                {pageSize === 'A4' && <Check size={14} color="#ffffff" />}
                <Text
                  className={`text-xs font-semibold ${
                    pageSize === 'A4' ? 'text-white' : 'text-slate-400'
                  }`}
                >
                  A4 Standard
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setPageSize('fit')}
                className={`flex-1 py-2 rounded-lg items-center justify-center flex-row gap-1.5 active:opacity-80 ${
                  pageSize === 'fit'
                    ? 'bg-indigo-600 shadow-sm'
                    : 'bg-transparent'
                }`}
              >
                {pageSize === 'fit' && <Check size={14} color="#ffffff" />}
                <Text
                  className={`text-xs font-semibold ${
                    pageSize === 'fit' ? 'text-white' : 'text-slate-400'
                  }`}
                >
                  Fit to Image
                </Text>
              </Pressable>
            </View>
          </View>
        </View>

        {/* Selected Pages Section */}
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider">
            Selected Pages ({pages.length})
          </Text>
          {pages.length > 0 && (
            <Pressable
              onPress={() => setPages([])}
              hitSlop={8}
              className="active:opacity-70"
            >
              <Text className="text-rose-400 text-xs font-medium">Clear All</Text>
            </Pressable>
          )}
        </View>

        {pages.length === 0 ? (
          <View className="bg-slate-900/40 border border-dashed border-slate-800 rounded-2xl p-8 items-center justify-center my-2">
            <ImagePlus size={32} color="#475569" />
            <Text className="text-slate-300 text-sm font-semibold mt-3 text-center">
              No images selected
            </Text>
            <Text className="text-slate-500 text-xs text-center mt-1 max-w-[240px] leading-relaxed">
              Pick photos from your gallery or take new camera shots to assemble a PDF.
            </Text>
          </View>
        ) : (
          <View className="gap-2.5">
            {pages.map((item, index) => {
              const isFirst = index === 0;
              const isLast = index === pages.length - 1;
              const isRotating = isRotatingId === item.id;

              return (
                <View
                  key={item.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-3 flex-row items-center justify-between shadow-sm"
                >
                  {/* Thumbnail & Page Badge */}
                  <View className="flex-row items-center gap-3 flex-1 pr-2">
                    <View className="relative">
                      <RNImage
                        source={{ uri: item.uri }}
                        className="w-16 h-20 rounded-xl bg-slate-800 border border-slate-700/60"
                        resizeMode="cover"
                      />
                      <View className="absolute top-1 left-1 bg-slate-950/80 border border-slate-700/60 px-1.5 py-0.5 rounded-md">
                        <Text className="text-white text-[10px] font-bold">
                          #{index + 1}
                        </Text>
                      </View>
                    </View>

                    <View className="flex-1">
                      <Text className="text-white text-xs font-semibold">
                        Page {index + 1}
                      </Text>
                      <Text
                        numberOfLines={1}
                        className="text-slate-500 text-[10px] mt-0.5 font-mono"
                      >
                        {item.uri.split('/').pop() || 'image.jpg'}
                      </Text>
                    </View>
                  </View>

                  {/* Actions: Reorder, Rotate, Remove */}
                  <View className="flex-row items-center gap-1">
                    {/* Move Up */}
                    <Pressable
                      onPress={() => handleMoveUp(index)}
                      disabled={isFirst}
                      hitSlop={6}
                      accessibilityLabel="Move page up"
                      className={`w-9 h-9 rounded-lg items-center justify-center min-w-[36px] min-h-[36px] bg-slate-950/60 border border-slate-800 active:bg-slate-800 ${
                        isFirst ? 'opacity-30' : 'opacity-100'
                      }`}
                    >
                      <ArrowUp size={15} color="#94a3b8" />
                    </Pressable>

                    {/* Move Down */}
                    <Pressable
                      onPress={() => handleMoveDown(index)}
                      disabled={isLast}
                      hitSlop={6}
                      accessibilityLabel="Move page down"
                      className={`w-9 h-9 rounded-lg items-center justify-center min-w-[36px] min-h-[36px] bg-slate-950/60 border border-slate-800 active:bg-slate-800 ${
                        isLast ? 'opacity-30' : 'opacity-100'
                      }`}
                    >
                      <ArrowDown size={15} color="#94a3b8" />
                    </Pressable>

                    {/* Rotate */}
                    <Pressable
                      onPress={() => void handleRotate(item.id, item.uri)}
                      disabled={isRotating}
                      hitSlop={6}
                      accessibilityLabel="Rotate page 90 degrees"
                      className="w-9 h-9 rounded-lg items-center justify-center bg-slate-950/60 border border-slate-800 active:bg-slate-800 min-w-[36px] min-h-[36px]"
                    >
                      {isRotating ? (
                        <ActivityIndicator size="small" color="#818cf8" />
                      ) : (
                        <RotateCw size={15} color="#818cf8" />
                      )}
                    </Pressable>

                    {/* Remove */}
                    <Pressable
                      onPress={() => handleRemove(item.id)}
                      hitSlop={6}
                      accessibilityLabel="Remove page"
                      className="w-9 h-9 rounded-lg items-center justify-center bg-rose-950/30 border border-rose-900/40 active:bg-rose-950/70 min-w-[36px] min-h-[36px]"
                    >
                      <X size={15} color="#f87171" />
                    </Pressable>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Sticky Bottom Generate Button with guaranteed space for Android navigation bar */}
      <View
        className="bg-slate-950 border-t border-slate-900 px-4 pt-3.5"
        style={{ paddingBottom: bottomPadding }}
      >
        <Pressable
          onPress={() => void handleGenerate()}
          disabled={pages.length === 0 || isGenerating}
          className={`w-full py-4 rounded-xl flex-row items-center justify-center gap-2 min-h-[50px] bg-indigo-600 active:opacity-85 shadow-lg shadow-indigo-950/60 ${
            pages.length === 0 || isGenerating
              ? 'opacity-50'
              : 'opacity-100'
          }`}
        >
          <Sparkles size={18} color={pages.length === 0 ? '#6366f1' : '#ffffff'} />
          <Text
            className={`font-bold text-sm ${
              pages.length === 0 ? 'text-indigo-400/80' : 'text-white'
            }`}
          >
            Create PDF ({pages.length} {pages.length === 1 ? 'page' : 'pages'})
          </Text>
        </Pressable>
      </View>

      {/* Full Loading Spinner Overlay */}
      {isGenerating && (
        <View className="absolute inset-0 bg-slate-950/85 items-center justify-center z-50 p-6">
          <View className="bg-slate-900 border border-slate-800 rounded-2xl p-6 items-center justify-center max-w-xs w-full shadow-2xl">
            <ActivityIndicator size="large" color="#818cf8" />
            <Text className="text-white text-base font-bold mt-4 text-center">
              Generating PDF
            </Text>
            <Text className="text-slate-400 text-xs mt-1.5 text-center leading-relaxed">
              Converting and optimizing {pages.length}{' '}
              {pages.length === 1 ? 'page' : 'pages'}...
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}
