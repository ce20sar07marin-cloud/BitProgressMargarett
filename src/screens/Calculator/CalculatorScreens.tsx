import { useState } from "react";

import { StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import Card from "@/components/Card";
import ScreenBackground from "@/components/ScreenBackground";
import { font, spacing } from "@/constants/theme";
import { useColors } from "@/hooks/useColors";

import BinaryDisplay from "./ComponentsCalculator/BinaryDisplay";
import CalculatorButton from "./ComponentsCalculator/CalculatorButton";
import ModeSelector from "./ComponentsCalculator/ModeSelector";
import NumberInput from "./ComponentsCalculator/NumberInput";
import ResultCard from "./ComponentsCalculator/ResultCard";

export default function CalculatorScreen() {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState<"binary" | "decimal">("binary");
  const [value, setValue] = useState("");
  const [result, setResult] = useState("");
  const colors = useColors();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const convert = () => {
    if (!value) return;

    if (mode === "binary") {
      if (!/^[01]+$/.test(value)) return;
      const decimal = parseInt(value, 2);
      setResult(decimal.toString());
    } else {
      const num = Number(value);
      if (num < 0 || num > 255 || !Number.isInteger(num)) return;
      const binary = num.toString(2).padStart(8, "0");
      setResult(binary);
    }
  };

  return (
    <ScreenBackground
      style={[
        styles.container,
        { paddingTop: insets.top + spacing.xxl },
        isDesktop && styles.containerDesktop,
      ]}
    >
      <Text style={[styles.title, { color: colors.textMain }]}>
        Calculadora
      </Text>
      <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
        Conversor Binario - Decimal
      </Text>

      <Card style={isDesktop && styles.calculatorCard}>
        <View
          style={[
            isDesktop && styles.calculatorColumnsDesktop,
          ]}
        >
          <View style={isDesktop && styles.inputColumn}>
            <ModeSelector mode={mode} setMode={setMode} />
            <NumberInput value={value} onChange={setValue} mode={mode} />
            <CalculatorButton title="CONVERTIR" onPress={convert} />
          </View>
          <View style={isDesktop && styles.resultColumn}>
            <ResultCard result={result} />
            {mode === "decimal" && <BinaryDisplay binary={result} />}
          </View>
        </View>
      </Card>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  containerDesktop: {
    paddingTop: spacing.xxl,
    paddingHorizontal: spacing.xxl,
  },
  calculatorCard: {
    width: "100%",
    maxWidth: 1080,
    alignSelf: "center",
    padding: spacing.xl,
  },
  calculatorColumnsDesktop: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xxl,
  },
  inputColumn: {
    flex: 1,
    gap: spacing.md,
  },
  resultColumn: {
    flex: 1,
    gap: spacing.md,
  },
  title: {
    fontSize: font.size.title,
    fontWeight: font.weight.bold,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: font.size.md,
    marginBottom: spacing.lg,
  },
});
