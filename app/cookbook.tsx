import { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { theme } from "../src/lib/theme";
import {
  getAllDayPlans,
  getTodayMealPlan,
  type DayPlan,
  type Meal,
} from "../src/lib/mealPlan";

const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
const MEAL_ICONS: Record<string, string> = {
  breakfast: "sunny-outline",
  lunch: "restaurant-outline",
  dinner: "moon-outline",
  snack: "cafe-outline",
};

function MealCard({
  meal,
  type,
  index,
}: {
  meal: Meal;
  type: string;
  index: number;
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
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={18}
            color={theme.colors.textMuted}
          />
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

            <Text style={[styles.recipeSectionTitle, { marginTop: 16 }]}>
              Steps
            </Text>
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

function DaySection({
  plan,
  isToday,
  dayIndex,
}: {
  plan: DayPlan;
  isToday: boolean;
  dayIndex: number;
}) {
  const totalCal = MEAL_TYPES.reduce(
    (sum, t) => sum + plan.meals[t].calories,
    0
  );
  const totalProtein = MEAL_TYPES.reduce(
    (sum, t) => sum + plan.meals[t].protein,
    0
  );

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
        <Text style={styles.dayMacros}>
          {totalCal} cal | {totalProtein}g protein
        </Text>
      </View>

      {MEAL_TYPES.map((type, i) => (
        <MealCard
          key={type}
          meal={plan.meals[type]}
          type={type}
          index={dayIndex * 4 + i}
        />
      ))}
    </View>
  );
}

export default function CookbookScreen() {
  const insets = useSafeAreaInsets();
  const plans = getAllDayPlans();
  const todayPlan = getTodayMealPlan();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={theme.colors.text}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cookbook</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.subtitle}>7-day meal plan with recipes</Text>

        {plans.map((plan, i) => (
          <DaySection
            key={plan.label}
            plan={plan}
            isToday={plan.label === todayPlan.label}
            dayIndex={i}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.bg,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: theme.font.size.lg,
    fontWeight: "700",
    color: theme.colors.text,
  },
  content: {
    padding: theme.spacing.md,
  },
  subtitle: {
    fontSize: theme.font.size.sm,
    color: theme.colors.textDim,
    textAlign: "center",
    marginBottom: theme.spacing.lg,
  },
  daySection: {
    marginBottom: theme.spacing.xl,
  },
  dayHeader: {
    marginBottom: theme.spacing.md,
  },
  dayLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm,
    marginBottom: 4,
  },
  dayLabel: {
    fontSize: theme.font.size.xl,
    fontWeight: "700",
    color: theme.colors.text,
  },
  todayBadge: {
    backgroundColor: theme.colors.accentGlow,
    borderWidth: 1,
    borderColor: theme.colors.accent,
    borderRadius: theme.radius.full,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  todayText: {
    fontSize: theme.font.size.xs,
    fontWeight: "700",
    color: theme.colors.accent,
  },
  dayMacros: {
    fontSize: theme.font.size.sm,
    color: theme.colors.textMuted,
  },
  mealCard: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
  },
  mealHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  mealTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  mealType: {
    fontSize: theme.font.size.xs,
    fontWeight: "600",
    color: theme.colors.accent,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  mealName: {
    fontSize: theme.font.size.md,
    fontWeight: "700",
    color: theme.colors.text,
    marginBottom: 4,
  },
  mealDesc: {
    fontSize: theme.font.size.sm,
    color: theme.colors.textDim,
    lineHeight: 20,
    marginBottom: 8,
  },
  mealMacros: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  macroText: {
    fontSize: theme.font.size.xs,
    color: theme.colors.textMuted,
    fontWeight: "600",
  },
  macroDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: theme.colors.textMuted,
  },
  storeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  storeText: {
    fontSize: theme.font.size.xs,
    color: theme.colors.textMuted,
    fontWeight: "600",
  },
  recipeSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
  },
  recipeSectionTitle: {
    fontSize: theme.font.size.sm,
    fontWeight: "700",
    color: theme.colors.accent,
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 6,
  },
  bullet: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: theme.colors.textDim,
    marginTop: 7,
  },
  ingredientText: {
    fontSize: theme.font.size.sm,
    color: theme.colors.textDim,
    lineHeight: 20,
    flex: 1,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 10,
  },
  stepNumber: {
    fontSize: theme.font.size.sm,
    fontWeight: "700",
    color: theme.colors.accent,
    width: 18,
    textAlign: "center",
  },
  stepText: {
    fontSize: theme.font.size.sm,
    color: theme.colors.textDim,
    lineHeight: 20,
    flex: 1,
  },
});
