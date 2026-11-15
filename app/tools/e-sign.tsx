import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { PenTool, ArrowLeft, Clock } from 'lucide-react-native';

export default function ESignScreen(): React.JSX.Element {
  const router = useRouter();

  return (
    <View className="flex-1 bg-slate-950 items-center justify-center p-6">
      <View className="w-16 h-16 rounded-2xl bg-rose-950/70 border border-rose-700/40 items-center justify-center mb-4 shadow-lg shadow-rose-950/50">
        <PenTool size={32} color="#fb7185" />
      </View>

      <Text className="text-white text-xl font-bold tracking-tight text-center">
        E-Sign Document
      </Text>
      <Text className="text-slate-400 text-xs text-center mt-1.5 max-w-[280px]">
        Draw your signature, save it locally, and stamp it onto PDF documents.
      </Text>

      <View className="flex-row items-center gap-1.5 bg-rose-950/50 border border-rose-600/30 px-3 py-1.5 rounded-full mt-4 mb-6">
        <Clock size={12} color="#fb7185" />
        <Text className="text-rose-300 text-xs font-medium">
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
