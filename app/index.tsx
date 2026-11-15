import React from "react";
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { FileText } from "lucide-react-native";

export default function IndexScreen(): React.JSX.Element {
  return (
    <SafeAreaView className="flex-1 bg-slate-950 items-center justify-center p-6">
      <View className="bg-slate-900 rounded-2xl p-6 items-center justify-center border border-slate-800 shadow-2xl w-full max-w-sm">
        <View className="w-16 h-16 rounded-full bg-slate-800/80 items-center justify-center mb-4 border border-slate-700/50">
          <FileText size={32} color="#38bdf8" strokeWidth={2} />
        </View>

        <Text className="text-white text-xl font-bold tracking-tight text-center">
          PaperKit — Step 1 Ready
        </Text>

        <Text className="text-slate-400 text-sm text-center mt-2 leading-relaxed">
          NativeWind v4 & Expo Go Android environment verified.
        </Text>
      </View>
    </SafeAreaView>
  );
}

