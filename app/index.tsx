import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  Pressable,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import {
  FileText,
  ShieldCheck,
  Image,
  Layers,
  Minimize2,
  PenTool,
  Search,
  X,
  FileBox,
} from 'lucide-react-native';
import { RecentFile } from '@/constants/types';
import { getRecentFiles } from '@/db';
import {
  ToolCard,
  RecentFileItem,
  EmptyRecentState,
  AdBannerPlaceholder,
} from '@/components';

export default function HomeScreen(): React.JSX.Element {
  const router = useRouter();
  const [files, setFiles] = useState<RecentFile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const loadFiles = useCallback(async (): Promise<void> => {
    try {
      const recentList = await getRecentFiles(20);
      setFiles(recentList);
    } catch (error) {
      console.warn('[HomeScreen] Failed to load recent files:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      const fetchOnFocus = async (): Promise<void> => {
        try {
          const recentList = await getRecentFiles(20);
          if (isMounted) {
            setFiles(recentList);
            setLoading(false);
          }
        } catch (error) {
          console.warn('[HomeScreen] Focus load error:', error);
          if (isMounted) {
            setLoading(false);
          }
        }
      };

      void fetchOnFocus();

      return () => {
        isMounted = false;
      };
    }, [])
  );

  const filteredFiles = searchQuery.trim()
    ? files.filter((f) =>
        f.title.toLowerCase().includes(searchQuery.trim().toLowerCase())
      )
    : files;

  return (
    <SafeAreaView edges={['top']} className="flex-1 bg-slate-950">
      <ScrollView
        className="flex-1 px-4"
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Brand Header */}
        <View className="flex-row items-center justify-between mb-5">
          <View className="flex-row items-center gap-3">
            <View className="w-11 h-11 rounded-2xl bg-sky-500/10 border border-sky-400/30 items-center justify-center shadow-sm">
              <FileText size={24} color="#38bdf8" />
            </View>
            <View>
              <Text className="text-white text-2xl font-extrabold tracking-tight">
                PaperKit
              </Text>
              <View className="flex-row items-center gap-1.5 mt-0.5">
                <ShieldCheck size={13} color="#10b981" />
                <Text className="text-emerald-400 text-xs font-medium">
                  100% Offline • Private
                </Text>
              </View>
            </View>
          </View>

          {/* Total Files Pill */}
          <View className="bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full flex-row items-center gap-1.5">
            <FileBox size={14} color="#94a3b8" />
            <Text className="text-slate-300 text-xs font-semibold">
              {files.length} {files.length === 1 ? 'doc' : 'docs'}
            </Text>
          </View>
        </View>

        {/* 2x2 Tools Grid Section */}
        <View className="mb-6">
          <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3">
            Tools
          </Text>

          {/* Row 1 */}
          <View className="flex-row gap-3 mb-3">
            <ToolCard
              title="Images to PDF"
              subtitle="Photos or camera to PDF"
              icon={<Image size={22} color="#818cf8" />}
              badgeBgColor="bg-indigo-950/70"
              badgeBorderColor="border-indigo-600/40"
              accentBarColor="bg-indigo-500"
              onPress={() => router.push('/tools/images-to-pdf')}
            />

            <ToolCard
              title="Merge PDFs"
              subtitle="Combine multiple PDFs"
              icon={<Layers size={22} color="#34d399" />}
              badgeBgColor="bg-emerald-950/70"
              badgeBorderColor="border-emerald-600/40"
              accentBarColor="bg-emerald-500"
              onPress={() => router.push('/tools/merge-pdf')}
            />
          </View>

          {/* Row 2 */}
          <View className="flex-row gap-3">
            <ToolCard
              title="Compress File"
              subtitle="Shrink under 200KB"
              icon={<Minimize2 size={22} color="#fbbf24" />}
              badgeBgColor="bg-amber-950/70"
              badgeBorderColor="border-amber-600/40"
              accentBarColor="bg-amber-500"
              onPress={() => router.push('/tools/compress')}
            />

            <ToolCard
              title="E-Sign PDF"
              subtitle="Draw & stamp signature"
              icon={<PenTool size={22} color="#fb7185" />}
              badgeBgColor="bg-rose-950/70"
              badgeBorderColor="border-rose-600/40"
              accentBarColor="bg-rose-500"
              onPress={() => router.push('/tools/e-sign')}
            />
          </View>
        </View>

        {/* Recent Documents Section */}
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-slate-400 text-xs font-bold uppercase tracking-wider">
            Recent Documents
          </Text>
          {files.length > 0 && (
            <Text className="text-slate-500 text-xs font-medium">
              Showing {filteredFiles.length} of {files.length}
            </Text>
          )}
        </View>

        {/* Search bar when more than 3 files */}
        {files.length > 3 && (
          <View className="mb-3 flex-row items-center bg-slate-900 border border-slate-800 rounded-xl px-3 h-11">
            <Search size={16} color="#64748b" />
            <TextInput
              placeholder="Search documents..."
              placeholderTextColor="#64748b"
              value={searchQuery}
              onChangeText={setSearchQuery}
              className="flex-1 text-white text-xs px-2.5 h-full"
            />
            {searchQuery.length > 0 && (
              <Pressable
                onPress={() => setSearchQuery('')}
                hitSlop={8}
                className="p-1 rounded-full active:bg-slate-800"
              >
                <X size={14} color="#94a3b8" />
              </Pressable>
            )}
          </View>
        )}

        {/* List Content */}
        {loading ? (
          <View className="py-12 items-center justify-center">
            <ActivityIndicator size="small" color="#38bdf8" />
          </View>
        ) : files.length === 0 ? (
          <EmptyRecentState />
        ) : filteredFiles.length === 0 ? (
          <View className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 items-center justify-center my-2">
            <Search size={28} color="#64748b" />
            <Text className="text-slate-300 text-xs font-semibold mt-2 text-center">
              No matching documents
            </Text>
            <Text className="text-slate-500 text-[11px] mt-0.5 text-center">
              No files found matching &quot;{searchQuery}&quot;
            </Text>
          </View>
        ) : (
          <View className="mt-1">
            {filteredFiles.map((file) => (
              <RecentFileItem
                key={file.id}
                file={file}
                onDeleted={() => void loadFiles()}
              />
            ))}
          </View>
        )}
      </ScrollView>

      {/* Persistent Bottom Ad Placeholder */}
      <AdBannerPlaceholder />
    </SafeAreaView>
  );
}
