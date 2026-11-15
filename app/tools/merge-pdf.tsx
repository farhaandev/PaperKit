import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Layers, ArrowLeft, Clock } from 'lucide-react-native';

export default function MergePdfScreen(): React.JSX.Element {
  const router = useRouter();

  return (
    <View className="flex-1 bg-slate-950 items-center justify-center p-6">
      <View className="w-16 h-16 rounded-2xl bg-emerald-950/70 border border-emerald-700/40 items-center justify-center mb-4 shadow-lg shadow-emerald-950/50">
        <Layers size={32} color="#34d399" />
      </View>

      <Text className="text-white text-xl font-bold tracking-tight text-center">
        Merge PDFs
      </Text>
      <Text className="text-slate-400 text-xs text-center mt-1.5 max-w-[280px]">
        Combine multiple PDF files into one neatly organized document.
      </Text>

      <View className="flex-row items-center gap-1.5 bg-emerald-950/50 border border-emerald-600/30 px-3 py-1.5 rounded-full mt-4 mb-6">
        <Clock size={12} color="#34d399" />
        <Text className="text-emerald-300 text-xs font-medium">
          Ready for implementation
        </Text>
      </View>

      <Pressable
        onPress={() => router.back()}
        style={({ pressed }) => [{ opacity: pressed ? 0.75 : 1 }]}
        className="flex-row items-center gap-2 bg-slate-900 border border-slate-800 px-5 py-3 rounded-xl"
      >
        <ArrowLeft size={16} color="#94a3b8" />
        <Text className="text-slate-200 text-xs font-semibold">
          Back to Home
        </Text>
      </Pressable>
    </View>
  );
}
