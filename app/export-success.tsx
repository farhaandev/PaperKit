import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { CheckCircle2, Home, Share2, Clock } from 'lucide-react-native';

export default function ExportSuccessScreen(): React.JSX.Element {
  const router = useRouter();

  return (
    <View className="flex-1 bg-slate-950 items-center justify-center p-6">
      <View className="w-16 h-16 rounded-full bg-emerald-950/80 border border-emerald-600/40 items-center justify-center mb-4 shadow-lg shadow-emerald-950/50">
        <CheckCircle2 size={36} color="#34d399" />
      </View>

      <Text className="text-white text-xl font-bold tracking-tight text-center">
        File Ready!
      </Text>
      <Text className="text-slate-400 text-xs text-center mt-1.5 max-w-[280px]">
        Your document has been processed and saved securely offline.
      </Text>

      <View className="flex-row items-center gap-1.5 bg-emerald-950/50 border border-emerald-600/30 px-3 py-1.5 rounded-full mt-4 mb-6">
        <Clock size={12} color="#34d399" />
        <Text className="text-emerald-300 text-xs font-medium">
          Ready for implementation
        </Text>
      </View>

      <View className="flex-row gap-3 w-full max-w-xs">
        <Pressable
          onPress={() => router.replace('/')}
          className="flex-1 flex-row items-center justify-center gap-2 bg-slate-900 border border-slate-800 py-3.5 rounded-xl active:bg-slate-800"
        >
          <Home size={16} color="#94a3b8" />
          <Text className="text-slate-200 text-xs font-semibold">
            Home
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.replace('/')}
          className="flex-1 flex-row items-center justify-center gap-2 bg-sky-600 py-3.5 rounded-xl active:opacity-80"
        >
          <Share2 size={16} color="#ffffff" />
          <Text className="text-white text-xs font-semibold">
            Done
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
