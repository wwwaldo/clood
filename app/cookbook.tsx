import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { theme } from "../src/lib/theme";
import {
  getAllDayPlans,
  getTodayMealPlan,
  getAllAvailableMeals,
  setMealSlot,
  saveCustomMeal,
  GROCERY_STORES,
  type DayPlan,
  type Meal,
  type MealSlot,
  type GroceryStore,
} from "../src/lib/mealPlan";

const MEAL_TYPES: MealSlot[] = ["breakfast", "lunch", "dinner", "snack"];
const MEAL_ICONS: Record<string, string> = {
  breakfast: "sunny-outline",
  lunch: "restaurant-outline",
  dinner: "moon-outline",
  snack: "cafe-outline",
};

// --- Meal Card ---

function MealCard({
  meal,
  type,
  index,
  onSwap,
}: {
  meal: Meal;
  type: string;
  index: number;
  onSwap?: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Animated.View entering={FadeInDown.delay(index * 60).duration(300)}>
      <TouchableOpacity
        style={styles.mealCard}
        onPress={() => setExpanded(!expanded)}
        activeOpacity={0.7}
      >
        <View style={styles.mealHeader}>
          <View style={styles.mealTitleRow}>
            <Ionicons
              name={MEAL_ICONS[type] as any}
              size={18}
              color={theme.colors.accent}
            />
            <Text style={styles.mealType}>
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            {onSwap && (
              <TouchableOpacity
                onPress={(e) => {
                  e.stopPropagation();
                  onSwap();
                }}
                hitSlop={8}
              >
                <Ionicons
                  name="swap-horizontal-outline"
                  size={18}
                  color={theme.colors.textMuted}
                />
              </TouchableOpacity>
            )}
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={18}
              color={theme.colors.textMuted}
            />
          </View>
        </View>
        <Text style={styles.mealName}>{meal.name}</Text>
        <Text style={styles.mealDesc}>{meal.description}</Text>
        <View style={styles.mealMacros}>
          <Text style={styles.macroText}>{meal.calories} cal</Text>
          <View style={styles.macroDot} />
          <Text style={styles.macroText}>{meal.protein}g protein</Text>
          <View style={styles.macroDot} />
          <View style={styles.storeBadge}>
            <Ionicons name="cart-outline" size={11} color={theme.colors.textMuted} />
            <Text style={styles.storeText}>{meal.store}</Text>
          </View>
        </View>

        {expanded && (
          <View style={styles.recipeSection}>
            <Text style={styles.recipeSectionTitle}>Ingredients</Text>
            {meal.ingredients.map((ing, i) => (
              <View key={i} style={styles.ingredientRow}>
                <View style={styles.bullet} />
                <Text style={styles.ingredientText}>{ing}</Text>
              </View>
            ))}
            <Text style={[styles.recipeSectionTitle, { marginTop: 16 }]}>Steps</Text>
            {meal.steps.map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <Text style={styles.stepNumber}>{i + 1}</Text>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// --- Day Section ---

function DaySection({
  plan,
  isToday,
  dayIndex,
  onSwapMeal,
}: {
  plan: DayPlan;
  isToday: boolean;
  dayIndex: number;
  onSwapMeal: (slot: MealSlot) => void;
}) {
  const totalCal = MEAL_TYPES.reduce((sum, t) => sum + plan.meals[t].calories, 0);
  const totalProtein = MEAL_TYPES.reduce((sum, t) => sum + plan.meals[t].protein, 0);

  return (
    <View style={styles.daySection}>
      <View style={styles.dayHeader}>
        <View style={styles.dayLabelRow}>
          <Text style={styles.dayLabel}>{plan.label}</Text>
          {isToday && (
            <View style={styles.todayBadge}>
              <Text style={styles.todayText}>Today</Text>
            </View>
          )}
        </View>
        <Text style={styles.dayMacros}>{totalCal} cal | {totalProtein}g protein</Text>
      </View>
      {MEAL_TYPES.map((type, i) => (
        <MealCard
          key={type}
          meal={plan.meals[type]}
          type={type}
          index={dayIndex * 4 + i}
          onSwap={() => onSwapMeal(type)}
        />
      ))}
    </View>
  );
}

// --- Swap Modal ---

function SwapModal({
  visible,
  slot,
  dayLabel,
  onSelect,
  onClose,
}: {
  visible: boolean;
  slot: MealSlot;
  dayLabel: string;
  onSelect: (mealId: string) => void;
  onClose: () => void;
}) {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formCal, setFormCal] = useState("");
  const [formProtein, setFormProtein] = useState("");
  const [formStore, setFormStore] = useState<GroceryStore>("Loblaws");

  useEffect(() => {
    if (visible) {
      getAllAvailableMeals().then(setMeals);
      setSearch("");
      setShowForm(false);
    }
  }, [visible]);

  const filtered = search.trim()
    ? meals.filter(
        (m) =>
          m.name.toLowerCase().includes(search.toLowerCase()) ||
          m.description.toLowerCase().includes(search.toLowerCase())
      )
    : meals;

  const handleCreateMeal = async () => {
    if (!formName.trim()) return;
    const meal = await saveCustomMeal({
      name: formName.trim(),
      description: formDesc.trim(),
      calories: parseInt(formCal) || 0,
      protein: parseInt(formProtein) || 0,
      ingredients: [],
      steps: [],
      store: formStore,
    });
    onSelect(meal.id);
    setShowForm(false);
    setFormName("");
    setFormDesc("");
    setFormCal("");
    setFormProtein("");
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.swapBackdrop} onPress={onClose}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.swapSheetWrap}
        >
          <Pressable style={styles.swapSheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.swapHeader}>
              <Text style={styles.swapTitle}>
                {showForm ? "New meal" : `Swap ${slot} — ${dayLabel}`}
              </Text>
              <TouchableOpacity onPress={showForm ? () => setShowForm(false) : onClose}>
                <Ionicons
                  name={showForm ? "arrow-back" : "close"}
                  size={22}
                  color={theme.colors.textDim}
                />
              </TouchableOpacity>
            </View>

            {showForm ? (
              <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
                <TextInput
                  style={styles.formInput}
                  placeholder="Meal name"
                  placeholderTextColor={theme.colors.textMuted}
                  value={formName}
                  onChangeText={setFormName}
                />
                <TextInput
                  style={styles.formInput}
                  placeholder="Description"
                  placeholderTextColor={theme.colors.textMuted}
                  value={formDesc}
                  onChangeText={setFormDesc}
                />
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <TextInput
                    style={[styles.formInput, { flex: 1 }]}
                    placeholder="Calories"
                    placeholderTextColor={theme.colors.textMuted}
                    value={formCal}
                    onChangeText={setFormCal}
                    keyboardType="numeric"
                  />
                  <TextInput
                    style={[styles.formInput, { flex: 1 }]}
                    placeholder="Protein (g)"
                    placeholderTextColor={theme.colors.textMuted}
                    value={formProtein}
                    onChangeText={setFormProtein}
                    keyboardType="numeric"
                  />
                </View>
                <View style={styles.storeRow}>
                  {GROCERY_STORES.map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.storePill,
                        formStore === s && styles.storePillActive,
                      ]}
                      onPress={() => setFormStore(s)}
                    >
                      <Text
                        style={[
                          styles.storePillText,
                          formStore === s && styles.storePillTextActive,
                        ]}
                      >
                        {s}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <TouchableOpacity
                  style={[styles.createBtn, !formName.trim() && { opacity: 0.4 }]}
                  onPress={handleCreateMeal}
                  disabled={!formName.trim()}
                >
                  <Text style={styles.createBtnText}>Create & assign</Text>
                </TouchableOpacity>
              </ScrollView>
            ) : (
              <>
                <View style={styles.swapSearchWrap}>
                  <Ionicons name="search-outline" size={16} color={theme.colors.textMuted} />
                  <TextInput
                    style={styles.swapSearchInput}
                    placeholder="Search meals..."
                    placeholderTextColor={theme.colors.textMuted}
                    value={search}
                    onChangeText={setSearch}
                  />
                </View>
                <TouchableOpacity
                  style={styles.addMealBtn}
                  onPress={() => setShowForm(true)}
                >
                  <Ionicons name="add-circle-outline" size={18} color={theme.colors.accent} />
                  <Text style={styles.addMealText}>Create custom meal</Text>
                </TouchableOpacity>
                <FlatList
                  data={filtered}
                  keyExtractor={(item) => item.id}
                  style={{ maxHeight: 350 }}
                  showsVerticalScrollIndicator={false}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.swapItem}
                      onPress={() => onSelect(item.id)}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.swapItemName}>
                          {item.name}
                          {item.id.startsWith("custom-") ? " *" : ""}
                        </Text>
                        <Text style={styles.swapItemMeta}>
                          {item.calories} cal · {item.protein}g protein · {item.store}
                        </Text>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color={theme.colors.textMuted} />
                    </TouchableOpacity>
                  )}
                />
              </>
            )}
          </Pressable>
        </KeyboardAvoidingView>
      </Pressable>
    </Modal>
  );
}

// --- Main Screen ---

export default function CookbookScreen() {
  const insets = useSafeAreaInsets();
  const [plans, setPlans] = useState<DayPlan[]>([]);
  const [todayLabel, setTodayLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [swapVisible, setSwapVisible] = useState(false);
  const [swapDay, setSwapDay] = useState("");
  const [swapSlot, setSwapSlot] = useState<MealSlot>("breakfast");

  const loadPlans = useCallback(async () => {
    const [allPlans, today] = await Promise.all([
      getAllDayPlans(),
      getTodayMealPlan(),
    ]);
    setPlans(allPlans);
    setTodayLabel(today.label);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const handleSwapMeal = useCallback(
    (dayLabel: string, slot: MealSlot) => {
      setSwapDay(dayLabel);
      setSwapSlot(slot);
      setSwapVisible(true);
    },
    []
  );

  const handleSelectMeal = useCallback(
    async (mealId: string) => {
      await setMealSlot(swapDay, swapSlot, mealId);
      setSwapVisible(false);
      await loadPlans();
    },
    [swapDay, swapSlot, loadPlans]
  );

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={theme.colors.accent} size="large" />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cookbook</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>7-day meal plan with recipes</Text>
        {plans.map((plan, i) => (
          <DaySection
            key={plan.label}
            plan={plan}
            isToday={plan.label === todayLabel}
            dayIndex={i}
            onSwapMeal={(slot) => handleSwapMeal(plan.label, slot)}
          />
        ))}
      </ScrollView>

      <SwapModal
        visible={swapVisible}
        slot={swapSlot}
        dayLabel={swapDay}
        onSelect={handleSelectMeal}
        onClose={() => setSwapVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: theme.spacing.md, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: theme.colors.border,
  },
  backButton: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: theme.font.size.lg, fontWeight: "700", color: theme.colors.text },
  content: { padding: theme.spacing.md },
  subtitle: { fontSize: theme.font.size.sm, color: theme.colors.textDim, textAlign: "center", marginBottom: theme.spacing.lg },
  daySection: { marginBottom: theme.spacing.xl },
  dayHeader: { marginBottom: theme.spacing.md },
  dayLabelRow: { flexDirection: "row", alignItems: "center", gap: theme.spacing.sm, marginBottom: 4 },
  dayLabel: { fontSize: theme.font.size.xl, fontWeight: "700", color: theme.colors.text },
  todayBadge: { backgroundColor: theme.colors.accentGlow, borderWidth: 1, borderColor: theme.colors.accent, borderRadius: theme.radius.full, paddingHorizontal: 10, paddingVertical: 2 },
  todayText: { fontSize: theme.font.size.xs, fontWeight: "700", color: theme.colors.accent },
  dayMacros: { fontSize: theme.font.size.sm, color: theme.colors.textMuted },
  mealCard: { backgroundColor: theme.colors.surface, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, padding: theme.spacing.md, marginBottom: theme.spacing.sm },
  mealHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 },
  mealTitleRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  mealType: { fontSize: theme.font.size.xs, fontWeight: "600", color: theme.colors.accent, textTransform: "uppercase", letterSpacing: 0.5 },
  mealName: { fontSize: theme.font.size.md, fontWeight: "700", color: theme.colors.text, marginBottom: 4 },
  mealDesc: { fontSize: theme.font.size.sm, color: theme.colors.textDim, lineHeight: 20, marginBottom: 8 },
  mealMacros: { flexDirection: "row", alignItems: "center", gap: 8 },
  macroText: { fontSize: theme.font.size.xs, color: theme.colors.textMuted, fontWeight: "600" },
  macroDot: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: theme.colors.textMuted },
  storeBadge: { flexDirection: "row", alignItems: "center", gap: 3 },
  storeText: { fontSize: theme.font.size.xs, color: theme.colors.textMuted, fontWeight: "600" },
  recipeSection: { marginTop: 16, paddingTop: 16, borderTopWidth: 1, borderTopColor: theme.colors.border },
  recipeSectionTitle: { fontSize: theme.font.size.sm, fontWeight: "700", color: theme.colors.accent, marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 },
  ingredientRow: { flexDirection: "row", alignItems: "flex-start", gap: 10, marginBottom: 6 },
  bullet: { width: 5, height: 5, borderRadius: 2.5, backgroundColor: theme.colors.textDim, marginTop: 7 },
  ingredientText: { fontSize: theme.font.size.sm, color: theme.colors.textDim, lineHeight: 20, flex: 1 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 10 },
  stepNumber: { fontSize: theme.font.size.sm, fontWeight: "700", color: theme.colors.accent, width: 18, textAlign: "center" },
  stepText: { fontSize: theme.font.size.sm, color: theme.colors.textDim, lineHeight: 20, flex: 1 },
  // Swap modal
  swapBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "flex-end" },
  swapSheetWrap: { justifyContent: "flex-end" },
  swapSheet: { backgroundColor: theme.colors.surface, borderTopLeftRadius: theme.radius.xl, borderTopRightRadius: theme.radius.xl, padding: theme.spacing.lg, paddingBottom: theme.spacing.xl + 16, borderWidth: 1, borderBottomWidth: 0, borderColor: theme.colors.border, maxHeight: "80%" },
  swapHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: theme.spacing.md },
  swapTitle: { fontSize: theme.font.size.lg, fontWeight: "700", color: theme.colors.text },
  swapSearchWrap: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: theme.spacing.md, paddingVertical: 10, backgroundColor: theme.colors.bg, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, marginBottom: theme.spacing.sm },
  swapSearchInput: { flex: 1, fontSize: theme.font.size.sm, color: theme.colors.text, padding: 0 },
  addMealBtn: { flexDirection: "row", alignItems: "center", gap: 8, padding: theme.spacing.md, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.accent + "44", backgroundColor: theme.colors.accentGlow, marginBottom: theme.spacing.sm },
  addMealText: { fontSize: theme.font.size.sm, fontWeight: "600", color: theme.colors.accent },
  swapItem: { flexDirection: "row", alignItems: "center", padding: theme.spacing.md, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.bg, marginBottom: 6 },
  swapItemName: { fontSize: theme.font.size.sm, fontWeight: "600", color: theme.colors.text, marginBottom: 2 },
  swapItemMeta: { fontSize: theme.font.size.xs, color: theme.colors.textMuted },
  // Custom meal form
  formInput: { backgroundColor: theme.colors.bg, borderWidth: 1, borderColor: theme.colors.border, borderRadius: theme.radius.md, padding: theme.spacing.md, fontSize: theme.font.size.sm, color: theme.colors.text, marginBottom: theme.spacing.sm },
  storeRow: { flexDirection: "row", gap: 8, marginBottom: theme.spacing.md },
  storePill: { flex: 1, paddingVertical: 10, borderRadius: theme.radius.md, borderWidth: 1, borderColor: theme.colors.border, alignItems: "center" },
  storePillActive: { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentGlow },
  storePillText: { fontSize: theme.font.size.xs, fontWeight: "600", color: theme.colors.textMuted },
  storePillTextActive: { color: theme.colors.accent },
  createBtn: { backgroundColor: theme.colors.accent, borderRadius: theme.radius.md, paddingVertical: 14, alignItems: "center" },
  createBtnText: { color: theme.colors.bg, fontSize: theme.font.size.md, fontWeight: "700" },
});
