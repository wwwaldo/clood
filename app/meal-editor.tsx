import { useCallback, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "../src/lib/theme";
import {
  getMealById,
  saveCustomMeal,
  updateCustomMeal,
  deleteCustomMeal,
  GROCERY_STORES,
  type Meal,
  type MealInput,
  type GroceryStore,
} from "../src/lib/mealPlan";

type FormState = {
  name: string;
  description: string;
  store: GroceryStore;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
  prepMinutes: string;
  cookMinutes: string;
  servings: string;
  ingredients: string[];
  steps: string[];
  tagsText: string;
};

const emptyForm = (): FormState => ({
  name: "",
  description: "",
  store: "Loblaws",
  calories: "",
  protein: "",
  carbs: "",
  fat: "",
  fiber: "",
  prepMinutes: "",
  cookMinutes: "",
  servings: "",
  ingredients: [""],
  steps: [""],
  tagsText: "",
});

function mealToForm(m: Meal): FormState {
  const numStr = (n: number | undefined) => (n === undefined ? "" : String(n));
  return {
    name: m.name,
    description: m.description,
    store: m.store,
    calories: String(m.calories),
    protein: String(m.protein),
    carbs: numStr(m.carbs),
    fat: numStr(m.fat),
    fiber: numStr(m.fiber),
    prepMinutes: numStr(m.prepMinutes),
    cookMinutes: numStr(m.cookMinutes),
    servings: numStr(m.servings),
    ingredients: m.ingredients.length ? m.ingredients : [""],
    steps: m.steps.length ? m.steps : [""],
    tagsText: m.tags?.join(", ") ?? "",
  };
}

function formToInput(f: FormState): MealInput {
  const num = (s: string): number => {
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? n : 0;
  };
  const numOrUndef = (s: string): number | undefined => {
    if (!s.trim()) return undefined;
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? n : undefined;
  };
  const tags = f.tagsText
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  return {
    name: f.name.trim(),
    description: f.description.trim(),
    store: f.store,
    calories: num(f.calories),
    protein: num(f.protein),
    carbs: numOrUndef(f.carbs),
    fat: numOrUndef(f.fat),
    fiber: numOrUndef(f.fiber),
    prepMinutes: numOrUndef(f.prepMinutes),
    cookMinutes: numOrUndef(f.cookMinutes),
    servings: numOrUndef(f.servings),
    ingredients: f.ingredients.map((s) => s.trim()).filter(Boolean),
    steps: f.steps.map((s) => s.trim()).filter(Boolean),
    tags: tags.length ? tags : undefined,
  };
}

export default function MealEditorScreen() {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ id?: string }>();
  const editingId = params.id;
  const isEditing = !!editingId;

  const [form, setForm] = useState<FormState>(emptyForm());
  const [loading, setLoading] = useState(isEditing);
  const [saving, setSaving] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!editingId) return;
    let cancelled = false;
    (async () => {
      const meal = await getMealById(editingId);
      if (cancelled) return;
      if (!meal) {
        setNotFound(true);
      } else if (meal.source !== "custom") {
        Alert.alert("Read-only", "Preset meals can't be edited yet.");
        router.back();
      } else {
        setForm(mealToForm(meal));
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [editingId]);

  const canSave = useMemo(() => form.name.trim().length > 0, [form.name]);

  const update = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const updateListItem = useCallback(
    (key: "ingredients" | "steps", index: number, value: string) => {
      setForm((prev) => {
        const next = [...prev[key]];
        next[index] = value;
        return { ...prev, [key]: next };
      });
    },
    []
  );

  const addListItem = useCallback((key: "ingredients" | "steps") => {
    setForm((prev) => ({ ...prev, [key]: [...prev[key], ""] }));
  }, []);

  const removeListItem = useCallback((key: "ingredients" | "steps", index: number) => {
    setForm((prev) => {
      const next = prev[key].filter((_, i) => i !== index);
      return { ...prev, [key]: next.length ? next : [""] };
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!canSave || saving) return;
    setSaving(true);
    try {
      const input = formToInput(form);
      if (editingId) {
        await updateCustomMeal(editingId, input);
      } else {
        await saveCustomMeal(input);
      }
      router.back();
    } catch (e: any) {
      Alert.alert("Save failed", e?.message ?? "Could not save meal.");
      setSaving(false);
    }
  }, [canSave, saving, form, editingId]);

  const handleDelete = useCallback(() => {
    if (!editingId) return;
    Alert.alert("Delete meal?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          await deleteCustomMeal(editingId);
          router.back();
        },
      },
    ]);
  }, [editingId]);

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator color={theme.colors.accent} size="large" />
      </View>
    );
  }

  if (notFound) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Not found</Text>
          <View style={styles.iconButton} />
        </View>
        <View style={{ padding: theme.spacing.lg }}>
          <Text style={styles.textDim}>That meal no longer exists.</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      style={[styles.container, { paddingTop: insets.top }]}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{isEditing ? "Edit meal" : "New meal"}</Text>
        <TouchableOpacity
          onPress={handleSave}
          style={styles.iconButton}
          disabled={!canSave || saving}
        >
          <Text style={[styles.saveText, (!canSave || saving) && { opacity: 0.4 }]}>
            {saving ? "..." : "Save"}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: theme.spacing.md, paddingBottom: insets.bottom + 48 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <Section title="Basics">
          <LabeledInput
            label="Name"
            value={form.name}
            onChangeText={(v) => update("name", v)}
            placeholder="e.g. Greek yogurt parfait"
          />
          <LabeledInput
            label="Description"
            value={form.description}
            onChangeText={(v) => update("description", v)}
            placeholder="Short one-line description"
            multiline
          />
          <Text style={styles.label}>Primary store</Text>
          <View style={styles.storeRow}>
            {GROCERY_STORES.map((s) => (
              <TouchableOpacity
                key={s}
                style={[styles.storePill, form.store === s && styles.storePillActive]}
                onPress={() => update("store", s)}
              >
                <Text
                  style={[
                    styles.storePillText,
                    form.store === s && styles.storePillTextActive,
                  ]}
                >
                  {s}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Section>

        <Section title="Macros">
          <View style={styles.row}>
            <LabeledInput
              label="Calories"
              value={form.calories}
              onChangeText={(v) => update("calories", v)}
              keyboardType="numeric"
              style={{ flex: 1 }}
            />
            <LabeledInput
              label="Protein (g)"
              value={form.protein}
              onChangeText={(v) => update("protein", v)}
              keyboardType="numeric"
              style={{ flex: 1 }}
            />
          </View>
          <View style={styles.row}>
            <LabeledInput
              label="Carbs (g)"
              value={form.carbs}
              onChangeText={(v) => update("carbs", v)}
              keyboardType="numeric"
              style={{ flex: 1 }}
              placeholder="optional"
            />
            <LabeledInput
              label="Fat (g)"
              value={form.fat}
              onChangeText={(v) => update("fat", v)}
              keyboardType="numeric"
              style={{ flex: 1 }}
              placeholder="optional"
            />
            <LabeledInput
              label="Fiber (g)"
              value={form.fiber}
              onChangeText={(v) => update("fiber", v)}
              keyboardType="numeric"
              style={{ flex: 1 }}
              placeholder="optional"
            />
          </View>
        </Section>

        <Section title="Timing">
          <View style={styles.row}>
            <LabeledInput
              label="Prep (min)"
              value={form.prepMinutes}
              onChangeText={(v) => update("prepMinutes", v)}
              keyboardType="numeric"
              style={{ flex: 1 }}
              placeholder="optional"
            />
            <LabeledInput
              label="Cook (min)"
              value={form.cookMinutes}
              onChangeText={(v) => update("cookMinutes", v)}
              keyboardType="numeric"
              style={{ flex: 1 }}
              placeholder="optional"
            />
            <LabeledInput
              label="Servings"
              value={form.servings}
              onChangeText={(v) => update("servings", v)}
              keyboardType="numeric"
              style={{ flex: 1 }}
              placeholder="optional"
            />
          </View>
        </Section>

        <Section title="Ingredients">
          {form.ingredients.map((ing, i) => (
            <View key={i} style={styles.listRow}>
              <Text style={styles.listMarker}>•</Text>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={ing}
                onChangeText={(v) => updateListItem("ingredients", i, v)}
                placeholder="e.g. 1 cup plain Greek yogurt"
                placeholderTextColor={theme.colors.textMuted}
              />
              <TouchableOpacity
                onPress={() => removeListItem("ingredients", i)}
                hitSlop={8}
                style={styles.listRemove}
              >
                <Ionicons name="close-circle" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={styles.addRow} onPress={() => addListItem("ingredients")}>
            <Ionicons name="add-circle-outline" size={18} color={theme.colors.accent} />
            <Text style={styles.addRowText}>Add ingredient</Text>
          </TouchableOpacity>
        </Section>

        <Section title="Steps">
          {form.steps.map((step, i) => (
            <View key={i} style={styles.listRow}>
              <Text style={styles.stepNumber}>{i + 1}</Text>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={step}
                onChangeText={(v) => updateListItem("steps", i, v)}
                placeholder="Describe one step"
                placeholderTextColor={theme.colors.textMuted}
                multiline
              />
              <TouchableOpacity
                onPress={() => removeListItem("steps", i)}
                hitSlop={8}
                style={styles.listRemove}
              >
                <Ionicons name="close-circle" size={20} color={theme.colors.textMuted} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity style={styles.addRow} onPress={() => addListItem("steps")}>
            <Ionicons name="add-circle-outline" size={18} color={theme.colors.accent} />
            <Text style={styles.addRowText}>Add step</Text>
          </TouchableOpacity>
        </Section>

        <Section title="Tags">
          <LabeledInput
            label="Comma-separated"
            value={form.tagsText}
            onChangeText={(v) => update("tagsText", v)}
            placeholder="e.g. vegetarian, quick, high-protein"
          />
        </Section>

        {isEditing && (
          <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={18} color={theme.colors.danger} />
            <Text style={styles.deleteBtnText}>Delete meal</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// --- Section / Input primitives ---

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function LabeledInput({
  label,
  style,
  multiline,
  ...rest
}: {
  label: string;
  value: string;
  onChangeText: (v: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric";
  multiline?: boolean;
  style?: any;
}) {
  return (
    <View style={[{ marginBottom: theme.spacing.sm }, style]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && { minHeight: 60, textAlignVertical: "top" }]}
        placeholderTextColor={theme.colors.textMuted}
        multiline={multiline}
        {...rest}
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
  iconButton: { minWidth: 56, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: theme.font.size.lg, fontWeight: "700", color: theme.colors.text },
  saveText: { fontSize: theme.font.size.md, fontWeight: "700", color: theme.colors.accent },
  textDim: { fontSize: theme.font.size.sm, color: theme.colors.textDim },
  section: { marginBottom: theme.spacing.lg },
  sectionTitle: {
    fontSize: theme.font.size.xs, fontWeight: "700", color: theme.colors.accent,
    textTransform: "uppercase", letterSpacing: 0.5, marginBottom: theme.spacing.sm,
  },
  label: {
    fontSize: theme.font.size.xs, color: theme.colors.textDim,
    fontWeight: "600", marginBottom: 4,
  },
  input: {
    backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.border,
    borderRadius: theme.radius.md, paddingHorizontal: theme.spacing.md, paddingVertical: 10,
    fontSize: theme.font.size.sm, color: theme.colors.text,
  },
  row: { flexDirection: "row", gap: theme.spacing.sm },
  storeRow: { flexDirection: "row", gap: theme.spacing.sm, marginTop: 4 },
  storePill: {
    flex: 1, paddingVertical: 10, borderRadius: theme.radius.md,
    borderWidth: 1, borderColor: theme.colors.border, alignItems: "center",
  },
  storePillActive: { borderColor: theme.colors.accent, backgroundColor: theme.colors.accentGlow },
  storePillText: { fontSize: theme.font.size.xs, fontWeight: "600", color: theme.colors.textMuted },
  storePillTextActive: { color: theme.colors.accent },
  listRow: {
    flexDirection: "row", alignItems: "flex-start", gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  listMarker: {
    fontSize: theme.font.size.lg, color: theme.colors.textDim,
    width: 20, textAlign: "center", marginTop: 8,
  },
  stepNumber: {
    fontSize: theme.font.size.sm, fontWeight: "700", color: theme.colors.accent,
    width: 20, textAlign: "center", marginTop: 12,
  },
  listRemove: { padding: 4, marginTop: 6 },
  addRow: {
    flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 8,
  },
  addRowText: { fontSize: theme.font.size.sm, fontWeight: "600", color: theme.colors.accent },
  deleteBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    paddingVertical: 14, borderRadius: theme.radius.md,
    borderWidth: 1, borderColor: theme.colors.danger,
    marginTop: theme.spacing.lg,
  },
  deleteBtnText: { fontSize: theme.font.size.md, fontWeight: "700", color: theme.colors.danger },
});
