import { useMemo, useState } from "react";

import {
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";

import { Ionicons } from "@expo/vector-icons";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import Card from "@/components/Card";
import ScreenBackground from "@/components/ScreenBackground";
import Badge from "./ComponentsGlossary/Badge";
import SearchBar from "./ComponentsGlossary/SearchBar";

import { glossaryData } from "@/constants/glossaryData";
import { useColors } from "@/hooks/useColors";
import { useDebounce } from "@/hooks/useDebounce";
import { useFavorites } from "@/context/FavoritesContext";
import { font, radius, spacing } from "@/constants/theme";

const allCategories = ["Todos", ...new Set(glossaryData.map((item) => item.category))];

const GlossaryScreens = () => {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("Todos");
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const columns = width >= 1280 ? 3 : 2;
  const colors = useColors();
  const { toggleFavorite, isFavorite } = useFavorites();
  const debouncedSearch = useDebounce(search, 250);

  const filteredGlossary = useMemo(() => {
    const searchLower = debouncedSearch.toLowerCase();
    return glossaryData.filter((item) => {
      const matchesSearch =
        item.term.toLowerCase().includes(searchLower) ||
        item.definition.toLowerCase().includes(searchLower);
      const matchesFavorites = !showFavoritesOnly || isFavorite(item.id);
      const matchesCategory =
        activeCategory === "Todos" || item.category === activeCategory;
      return matchesSearch && matchesFavorites && matchesCategory;
    });
  }, [debouncedSearch, activeCategory, showFavoritesOnly, isFavorite]);

  const categories = showFavoritesOnly
    ? ["Todos", ...new Set(glossaryData.filter((item) => isFavorite(item.id)).map((item) => item.category))]
    : allCategories;

  return (
    <ScreenBackground
      style={[
        styles.container,
        {
          paddingTop: insets.top + spacing.xl,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={[styles.title, { color: colors.textMain }]}>Glosario</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            {filteredGlossary.length} términos
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => {
            setShowFavoritesOnly(!showFavoritesOnly);
            setActiveCategory("Todos");
          }}
          style={[
            styles.favButton,
            { backgroundColor: showFavoritesOnly ? colors.primary : colors.primarySoft },
          ]}
          activeOpacity={0.7}
        >
          <Ionicons
            name={showFavoritesOnly ? "heart" : "heart-outline"}
            size={22}
            color={showFavoritesOnly ? colors.textOnPrimary : colors.primary}
          />
        </TouchableOpacity>
      </View>

      <SearchBar value={search} onChangeText={setSearch} />

      <FlatList
        horizontal
        data={categories}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        style={[styles.categoryList, { backgroundColor: "transparent" }]}
        contentContainerStyle={styles.categoryContent}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => setActiveCategory(item)}
            style={[
              styles.categoryPill,
              {
                backgroundColor:
                  activeCategory === item ? colors.primary : colors.primarySoft,
              },
            ]}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.categoryText,
                { color: activeCategory === item ? colors.textOnPrimary : colors.primary },
              ]}
            >
              {item}
            </Text>
          </TouchableOpacity>
        )}
      />

      <FlatList
        key={isDesktop ? `desktop-glossary-${columns}` : "mobile-glossary"}
        data={filteredGlossary}
        numColumns={isDesktop ? columns : 1}
        columnWrapperStyle={isDesktop ? styles.termRowDesktop : undefined}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        style={{ backgroundColor: "transparent" }}
        contentContainerStyle={{
          backgroundColor: "transparent",
          paddingBottom: spacing.xxl,
        }}
        renderItem={({ item }) => (
          <Card style={isDesktop && styles.termCardDesktop}>
            <View style={styles.termRow}>
              <Text style={[styles.term, { color: colors.textMain }]}>{item.term}</Text>
              <TouchableOpacity onPress={() => toggleFavorite(item.id)} activeOpacity={0.7}>
                <Ionicons
                  name={isFavorite(item.id) ? "heart" : "heart-outline"}
                  size={22}
                  color={isFavorite(item.id) ? "#EF4444" : colors.textSecondary}
                />
              </TouchableOpacity>
            </View>
            <Text style={[styles.definition, { color: colors.textSecondary }]}>{item.definition}</Text>
            <Badge text={item.category} />
          </Card>
        )}
        ListEmptyComponent={
          <Text style={[styles.empty, { color: colors.textSecondary }]}>
            {showFavoritesOnly
              ? "No tienes términos favoritos aún."
              : "No se encontraron términos."}
          </Text>
        }
      />
    </ScreenBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontSize: font.size.title,
    fontWeight: font.weight.bold,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: font.size.md,
    marginTop: 2,
  },
  favButton: {
    width: 42,
    height: 42,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
  },
  categoryList: {
    flexGrow: 0,
    flexShrink: 0,
    marginBottom: spacing.md,
    maxHeight: 56,
  },
  termRowDesktop: {
    gap: spacing.md,
  },
  termCardDesktop: {
    flex: 1,
    minWidth: 0,
  },
  categoryContent: {
    gap: spacing.sm,
    alignItems: "center",
    paddingVertical: 4,
  },
  categoryPill: {
    minHeight: 44,
    minWidth: 48,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
    justifyContent: "center",
    alignItems: "center",
    flexShrink: 0,
  },
  categoryText: {
    fontSize: font.size.sm,
    fontWeight: font.weight.semibold,
  },
  termRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  term: {
    fontSize: font.size.xl,
    fontWeight: font.weight.bold,
    marginBottom: spacing.sm,
    flex: 1,
    marginRight: spacing.sm,
  },
  definition: {
    fontSize: font.size.md,
    marginBottom: spacing.md,
    lineHeight: 22,
  },
  empty: {
    textAlign: "center",
    marginTop: spacing.xxl,
    fontSize: font.size.base,
  },
});

export default GlossaryScreens;
