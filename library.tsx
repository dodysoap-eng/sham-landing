import { useMemo, useState } from "react";
import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppHeader, AppScreen, Button, Card, Notice, Pill } from "@/components/sham-ui";
import { IngredientPicker, type PickedMaterial } from "@/components/ingredient-picker";
import { IngredientEditor } from "@/components/ingredient-editor";
import { Brand } from "@/constants/brand";
import { useAuth } from "@/hooks/use-auth";
import { useShamWorkspace } from "@/lib/sham-workspace-context";
import { CATALOG_ENTRIES, CATALOG_REFERENCE_DATE, CATALOG_SOURCE_URL, SOURCE_FORMULA_NOTES, SOURCE_FORMULAS, SOURCE_FORMULA_PROVENANCE, searchCatalog, type SourceFormula } from "@/lib/sham-catalog";
import { createId, normalizeSearch, type WorkspaceIngredient } from "@/lib/sham-domain";
import { confirmAction, showMessage } from "@/lib/ui-notify";

type LibraryTab = "catalog" | "recipes" | "mine";
export default function LibraryScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const { workspace, syncStatus, addIngredient, removeIngredient } = useShamWorkspace();
  const [tab, setTab] = useState<LibraryTab>("catalog");
  const [query, setQuery] = useState("");
  const [pickerVisible, setPickerVisible] = useState(false);
  const [editorVisible, setEditorVisible] = useState(false);
  const [editing, setEditing] = useState<WorkspaceIngredient | null>(null);
  const [expandedFormula, setExpandedFormula] = useState<string | null>(null);
  const filteredMine = useMemo(() => {
    const q = normalizeSearch(query);
    return workspace.ingredients.filter((item) => !q || normalizeSearch([item.name, item.englishName ?? "", item.cas ?? "", item.supplier ?? "", item.notes ?? ""].join(" ")).includes(q));
  }, [query, workspace.ingredients]);
  const catalogResults = useMemo(() => searchCatalog(query, 60), [query]);
  const recipeResults = useMemo(() => {
    const q = normalizeSearch(query);
    return SOURCE_FORMULAS.filter((item) => !q || normalizeSearch([item.title, item.type ?? "", item.source ?? "", item.note ?? "", ...(item.ingredients ?? []).flatMap((row) => [row.name ?? "", row.cas ?? ""])].join(" ")).includes(q));
  }, [query]);
  const editPickedIngredient = (picked: PickedMaterial) => {
    const ingredient: WorkspaceIngredient = {
      id: createId("ingredient"),
      name: picked.name,
      cas: picked.cas,
      type: "aroma",
      notes: "",
      ifraStatus: "unknown",
      ifraMaxPercent: null,
      source: picked.source,
      regionalLimits: [],
    };
    setEditing(ingredient);
    setEditorVisible(true);
  };
  const saveEditedIngredient = async (ingredient: WorkspaceIngredient) => {
    await addIngredient(ingredient);
    setEditorVisible(false);
    setEditing(null);
    showMessage("حُفظ المكوّن", "أُضيف إلى مكتبتك الخاصة. راجع المصادر؛ لا تُستنتج الحدود تلقائيًا.");
  };
  const editIngredient = (ingredient: WorkspaceIngredient) => { setEditing(ingredient); setEditorVisible(true); };
  const deleteIngredient = async (ingredient: WorkspaceIngredient) => {
    const yes = await confirmAction("حذف مكوّن من المكتبة؟", `سيُزال «${ingredient.name}» من مكتبتك فقط؛ لا تُحذف نسخه الموجودة داخل التركيبات المحفوظة.`);
    if (yes) { await removeIngredient(ingredient.id); showMessage("حُذف المكوّن", "بقيت أي نسخة منه محفوظة داخل تركيبة سابقة."); }
  };
  const tabLabels: { value: LibraryTab; label: string }[] = [
    { value: "catalog", label: `الكتالوج ${CATALOG_ENTRIES.length.toLocaleString("ar-EG")}` },
    { value: "recipes", label: `صيغ منشورة ${SOURCE_FORMULAS.length.toLocaleString("ar-EG")}` },
    { value: "mine", label: `مكوّناتي ${workspace.ingredients.length.toLocaleString("ar-EG")}` },
  ];

  return (
    <AppScreen>
      <AppHeader title="المكتبة" subtitle="مراجع ومكوّناتك الخاصة" onProfile={() => router.push("/account")} syncStatus={syncStatus} />
      <View style={styles.intro}><View style={{ flex: 1 }}><Text style={styles.eyebrow}>مراجع التركيب</Text><Text style={styles.pageTitle}>ابحث، ثم تحقّق من المصدر.</Text></View><View style={styles.introIcon}><Ionicons name="library-outline" size={21} color={Brand.colors.forest} /></View></View>
      <View style={styles.searchBox}><Ionicons name="search-outline" size={18} color={Brand.colors.muted} /><TextInput value={query} onChangeText={setQuery} placeholder={tab === "recipes" ? "اسم التركيبة أو مادة فيها…" : "اسم، مرادف، CAS أو مورد…"} placeholderTextColor={Brand.colors.muted} style={styles.search} textAlign="right" autoCapitalize="none" /></View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {tabLabels.map((item) => <Pressable key={item.value} onPress={() => setTab(item.value)} style={[styles.tab, tab === item.value && styles.tabActive]}><Text style={[styles.tabText, tab === item.value && styles.tabTextActive]}>{item.label}</Text></Pressable>)}
      </ScrollView>
      {tab === "catalog" ? <>
        <Notice title={`لقطة تاريخية · ${CATALOG_REFERENCE_DATE}`} body="كتالوج المكونات المرفق يحوي سجلات PERFUMING من CosIng. الاسم أو CAS لا يثبت هوية درجة المورد أو السلامة أو الحالة القانونية الراهنة." tone="warning" />
        <Text style={styles.resultCount}>{query ? `${catalogResults.length} نتيجة من أصل ${CATALOG_ENTRIES.length.toLocaleString("ar-EG")}` : `${CATALOG_ENTRIES.length.toLocaleString("ar-EG")} سجل مرجعي`}</Text>
        {catalogResults.map((entry) => <Card key={entry.ref} style={styles.entryCard}>
          <View style={styles.entryHead}><View style={{ flex: 1 }}><Text style={styles.entryName}>{entry.commonName || entry.name}</Text><Text style={styles.entryEnglish}>{entry.name}</Text></View><Pressable onPress={() => editPickedIngredient({ id: createId("material"), ref: entry.ref, name: entry.commonName || entry.name, cas: entry.cas, source: entry.identitySource || `CosIng · ${CATALOG_REFERENCE_DATE} · ref ${entry.ref}`, ifraStatus: "unknown" })} style={styles.addIcon}><Ionicons name="add" size={19} color={Brand.colors.forest} /></Pressable></View>
          {entry.description ? <Text style={styles.description}>{entry.description}</Text> : null}
          <View style={styles.metaRow}>{entry.cas ? <Pill label={`CAS ${entry.cas}`} tone="gold" /> : null}{entry.ec ? <Text style={styles.metaText}>EC {entry.ec}</Text> : null}{entry.typeHint ? <Text style={styles.metaText}>{entry.typeHint}</Text> : null}</View>
          {entry.aliases.length ? <Text style={styles.aliases}>مرادفات: {entry.aliases.slice(0, 5).join(" · ")}</Text> : null}
          {entry.identitySource ? <Text style={styles.source}>{entry.identitySource}</Text> : null}
        </Card>)}
        <Text style={styles.sourceLink}>المصدر: {CATALOG_SOURCE_URL}</Text>
      </> : null}
      {tab === "recipes" ? <>
        <Notice title="المقادير كما وردت في المصدر" body="بعض الصيغ التاريخية تستخدم الباينت أو الأونصة أو grain أو نسبًا بلا أوزان. لم تُحوّل الوحدات إلى غرامات أو نسب مئوية، ولم تُستنتج تركيزات غير مذكورة." tone="info" />
        <Text style={styles.resultCount}>{recipeResults.length} صيغة منشورة</Text>
        {recipeResults.map((formula) => <SourceFormulaCard key={formula.id} formula={formula} expanded={expandedFormula === formula.id} onToggle={() => setExpandedFormula(expandedFormula === formula.id ? null : formula.id)} />)}
        <Card><Text style={styles.source}>{SOURCE_FORMULA_PROVENANCE}</Text>{SOURCE_FORMULA_NOTES.map((note) => <Text key={note} style={styles.source}>{note}</Text>)}</Card>
      </> : null}
      {tab === "mine" ? <>
        <View style={styles.mineHeader}><View style={{ flex: 1 }}><Text style={styles.mineTitle}>{user?.name || "مكتبتك الخاصة"}</Text><Text style={styles.mineSub}>هذه المواد مرتبطة بحسابك. حدود السلامة لا تُستنتج من الاسم أو CAS.</Text></View><Button label="أضف" icon="add" onPress={() => setPickerVisible(true)} style={styles.mineButton} /></View>
        {filteredMine.length ? filteredMine.map((item) => <Card key={item.id} style={styles.entryCard}><View style={styles.entryHead}><View style={{ flex: 1 }}><Text style={styles.entryName}>{item.name}</Text><Text style={styles.entryEnglish}>{item.englishName || item.supplier || item.source || "مكوّن محفوظ"}</Text></View><Pill label="في مكتبتك" tone="green" /></View><View style={styles.metaRow}>{item.cas ? <Pill label={`CAS ${item.cas}`} tone="gold" /> : null}<Pill label={item.ifraStatus === "documented" ? `IFRA · ${item.ifraMaxPercent ?? "—"}%` : "IFRA غير مُقيّم"} tone={item.ifraStatus === "documented" ? "green" : "warning"} />{item.costPerKg != null ? <Pill label={`${item.costPerKg} ${item.currency ?? ""}/كغ`} tone="gold" /> : null}</View>{item.ifraSource ? <Text style={styles.source}>مصدر IFRA: {item.ifraSource}</Text> : null}{item.allergens?.length ? <Text style={styles.description}>حساسية مدخلة: {item.allergens.join(" · ")} · {item.allergenReviewed ? "مراجعة موثّقة" : "غير مراجعة"}</Text> : null}{item.regionalLimits?.length ? <Text style={styles.source}>{item.regionalLimits.length} سجل/سجلات لحدود سوق أدخلها المستخدم</Text> : null}{item.notes ? <Text style={styles.description}>{item.notes}</Text> : null}<View style={{ flexDirection: "row-reverse", gap: 7 }}><Button label="تعديل" icon="create-outline" variant="secondary" style={{ flex: 1 }} onPress={() => editIngredient(item)} /><Button label="حذف" icon="trash-outline" variant="quiet" style={{ flex: 1 }} onPress={() => void deleteIngredient(item)} /></View></Card>) : <Card style={styles.empty}><Ionicons name="flask-outline" size={25} color={Brand.colors.forest} /><Text style={styles.emptyTitle}>مكتبتك تبدأ بما تستخدمه.</Text><Text style={styles.description}>أضف مكوّنًا من الكتالوج أو أدخل اسمًا يدويًا.</Text><Button label="أضف مكوّنًا" icon="add" variant="secondary" onPress={() => setPickerVisible(true)} /></Card>}
      </> : null}
      <IngredientPicker visible={pickerVisible} onClose={() => setPickerVisible(false)} onSelect={editPickedIngredient} />
      <IngredientEditor visible={editorVisible} initial={editing} onClose={() => { setEditorVisible(false); setEditing(null); }} onSave={saveEditedIngredient} />
    </AppScreen>
  );
}

function SourceFormulaCard({ formula, expanded, onToggle }: { formula: SourceFormula; expanded: boolean; onToggle: () => void }) {
  return <Card style={styles.recipeCard}>
    <Pressable onPress={onToggle} style={styles.recipeHead}><View style={styles.recipeChevron}><Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={17} color={Brand.colors.forest} /></View><View style={{ flex: 1 }}><Text style={styles.entryName}>{formula.title}</Text><Text style={styles.entryEnglish}>{formula.type || "صيغة منشورة"} · {formula.unit || "وحدة المصدر"}</Text></View><View style={styles.recipeIcon}><Ionicons name="document-text-outline" size={18} color={Brand.colors.copper} /></View></Pressable>
    <Text style={styles.description}>{formula.description || formula.note || "لا توجد ملاحظة إضافية في البيانات المنقولة."}</Text>
    {expanded ? <View style={styles.ingredientList}>{formula.ingredients?.map((row, index) => <View key={`${formula.id}-${index}`} style={styles.sourceRow}><Text style={styles.sourceQuantity}>{row.parts ?? "—"} {row.unit || formula.unit || ""}</Text><View style={{ flex: 1 }}><Text style={styles.sourceMaterial}>{row.name || "مكوّن غير محدد"}</Text>{row.cas ? <Text style={styles.metaText}>CAS {row.cas}</Text> : null}{row.note ? <Text style={styles.source}>{row.note}</Text> : null}</View></View>)}{formula.ratio ? <Text style={styles.source}>النسبة كما وردت: {JSON.stringify(formula.ratio)}</Text> : null}<Text style={styles.source}>{formula.source || formula.url || "المصدر موضح في سجل التركيبة الأصلي."}</Text></View> : null}
    {formula.source ? <Text style={styles.source} numberOfLines={2}>{formula.source}</Text> : null}
    <View style={styles.recipeFoot}><Pill label={`${formula.ingredients?.length ?? 0} مواد`} /><Pill label="مرجع فقط" tone="gold" /></View>
  </Card>;
}

const styles = StyleSheet.create({
  intro: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 10 },
  eyebrow: { color: Brand.colors.copper, fontSize: 11, fontWeight: "800", textAlign: "right" },
  pageTitle: { color: Brand.colors.ink, fontSize: 20, fontWeight: "900", textAlign: "right", marginTop: 4 },
  introIcon: { width: 43, height: 43, borderRadius: 15, backgroundColor: Brand.colors.mint, alignItems: "center", justifyContent: "center" },
  searchBox: { flexDirection: "row-reverse", alignItems: "center", backgroundColor: Brand.colors.paper, borderColor: Brand.colors.line, borderWidth: 1, borderRadius: 15, paddingHorizontal: 12, gap: 8 },
  search: { flex: 1, minHeight: 46, color: Brand.colors.ink, fontSize: 13 },
  tabs: { flexDirection: "row-reverse", gap: 7 },
  tab: { borderRadius: 100, backgroundColor: "#EDEBE4", paddingHorizontal: 13, paddingVertical: 9 },
  tabActive: { backgroundColor: Brand.colors.forest },
  tabText: { color: Brand.colors.muted, fontSize: 10, fontWeight: "700" },
  tabTextActive: { color: Brand.colors.paper },
  resultCount: { textAlign: "right", color: Brand.colors.muted, fontSize: 10, fontWeight: "700" },
  entryCard: { padding: 14, gap: 8 },
  entryHead: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  entryName: { color: Brand.colors.ink, textAlign: "right", fontSize: 12, fontWeight: "800", lineHeight: 18 },
  entryEnglish: { color: Brand.colors.muted, textAlign: "right", fontSize: 10, lineHeight: 16, marginTop: 2 },
  description: { color: Brand.colors.muted, textAlign: "right", fontSize: 11, lineHeight: 17 },
  metaRow: { flexDirection: "row-reverse", alignItems: "center", gap: 7, flexWrap: "wrap" },
  metaText: { color: Brand.colors.muted, fontSize: 9 },
  aliases: { color: Brand.colors.forest, textAlign: "right", fontSize: 10, lineHeight: 16 },
  source: { color: Brand.colors.muted, textAlign: "right", fontSize: 9, lineHeight: 15 },
  sourceLink: { color: Brand.colors.muted, textAlign: "left", fontSize: 9, lineHeight: 14 },
  addIcon: { width: 36, height: 36, borderRadius: 13, backgroundColor: Brand.colors.mint, alignItems: "center", justifyContent: "center" },
  recipeCard: { gap: 9, padding: 14 },
  recipeHead: { flexDirection: "row-reverse", alignItems: "center", gap: 8 },
  recipeChevron: { width: 28, alignItems: "center" },
  recipeIcon: { width: 36, height: 36, borderRadius: 12, backgroundColor: Brand.colors.copperPale, alignItems: "center", justifyContent: "center" },
  ingredientList: { gap: 8, borderTopColor: Brand.colors.line, borderTopWidth: 1, paddingTop: 9 },
  sourceRow: { flexDirection: "row-reverse", alignItems: "flex-start", gap: 9, borderBottomWidth: 1, borderBottomColor: "#EEEAE1", paddingVertical: 6 },
  sourceQuantity: { color: Brand.colors.copper, fontSize: 10, fontWeight: "800", minWidth: 60, textAlign: "right" },
  sourceMaterial: { color: Brand.colors.ink, textAlign: "right", fontSize: 10, fontWeight: "700" },
  recipeFoot: { flexDirection: "row-reverse", gap: 7 },
  mineHeader: { flexDirection: "row-reverse", alignItems: "center", gap: 10 },
  mineTitle: { color: Brand.colors.ink, fontWeight: "800", fontSize: 14, textAlign: "right" },
  mineSub: { color: Brand.colors.muted, fontSize: 10, textAlign: "right", lineHeight: 16, marginTop: 3 },
  mineButton: { minHeight: 40, paddingHorizontal: 12 },
  empty: { alignItems: "center", paddingVertical: 24 },
  emptyTitle: { color: Brand.colors.ink, fontSize: 14, fontWeight: "800", textAlign: "center" },
});
