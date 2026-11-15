import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Minimize2, ArrowLeft, Clock } from 'lucide-react-native';

export default function CompressScreen(): React.JSX.Element {
  const router = useRouter();

  return (
    <View className="flex-1 bg-slate-950 items-center justify-center p-6">
      <View className="w-16 h-16 rounded-2xl bg-amber-950/70 border border-amber-700/40 items-center justify-center mb-4 shadow-lg shadow-amber-950/50">
        <Minimize2 size={32} color="#fbbf24" />
      </View>

      <Text className="text-white text-xl font-bold tracking-tight text-center">
        Compress File
      </Text>
      <Text className="text-slate-400 text-xs text-center mt-1.5 max-w-[280px]">
        Reduce document and PDF size under 200KB for government forms and emails.
      </Text>

      <View className="flex-row items-center gap-1.5 bg-amber-950/50 border border-amber-600/30 px-3 py-1.5 rounded-full mt-4 mb-6">
        <Clock size={12} color="#fbbf24" />
        <Text className="text-amber-300 text-xs font-medium">
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
