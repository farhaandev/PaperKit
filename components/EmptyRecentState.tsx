import React from 'react';
import { View, Text } from 'react-native';
import { Inbox, Sparkles } from 'lucide-react-native';

export function EmptyRecentState(): React.JSX.Element {
  return (
    <View className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 items-center justify-center my-2">
      <View className="w-16 h-16 rounded-2xl bg-slate-800/60 border border-slate-700/50 items-center justify-center mb-3.5 relative">
        <Inbox size={30} color="#64748b" />
        <View className="absolute -top-1 -right-1 bg-sky-500/20 border border-sky-400/30 rounded-full p-1">
          <Sparkles size={10} color="#38bdf8" />
        </View>
      </View>

      <Text className="text-white text-sm font-semibold text-center">
        No documents yet
      </Text>
      <Text className="text-slate-400 text-xs text-center mt-1 max-w-[240px] leading-relaxed">
        Pick a tool above to create, merge, compress, or sign your first PDF.
      </Text>
    </View>
  );
}
