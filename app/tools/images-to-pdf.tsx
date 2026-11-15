import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Image, ArrowLeft, Clock } from 'lucide-react-native';

export default function ImagesToPdfScreen(): React.JSX.Element {
  const router = useRouter();

  return (
    <View className="flex-1 bg-slate-950 items-center justify-center p-6">
      <View className="w-16 h-16 rounded-2xl bg-indigo-950/70 border border-indigo-700/40 items-center justify-center mb-4 shadow-lg shadow-indigo-950/50">
        <Image size={32} color="#818cf8" />
      </View>

      <Text className="text-white text-xl font-bold tracking-tight text-center">
        Images to PDF
      </Text>
      <Text className="text-slate-400 text-xs text-center mt-1.5 max-w-[280px]">
        Convert photos, gallery pictures, or scans into a clean PDF document.
      </Text>

      <View className="flex-row items-center gap-1.5 bg-indigo-950/50 border border-indigo-600/30 px-3 py-1.5 rounded-full mt-4 mb-6">
        <Clock size={12} color="#818cf8" />
        <Text className="text-indigo-300 text-xs font-medium">
          Ready for implementation
        </Text>
      </View>

      <Pressable
        onPress={() => router.back()}
        className="flex-row items-center gap-2 bg-slate-900 border border-slate-800 px-5 py-3 rounded-xl active:bg-slate-800"
      >
        <ArrowLeft size={16} color="#94a3b8" />
        <Text className="text-slate-200 text-xs font-semibold">
          Back to Home
        </Text>
      </Pressable>
    </View>
  );
}
