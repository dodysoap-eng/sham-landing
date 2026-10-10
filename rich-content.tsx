import { createElement } from "react";
import { Image, Platform, ScrollView, StyleSheet, Text, View, type TextStyle } from "react-native";
import { Brand } from "@/constants/brand";

type Props = { content: string; user?: boolean; textStyle?: TextStyle };
type Block = { type: "text" | "table" | "image" | "video"; value: string; alt?: string; rows?: string[][] };

const imagePattern = /^!?\[([^\]]*)\]\((https?:\/\/[^\s)]+\.(?:png|jpe?g|gif|webp)(?:\?[^\s)]*)?)\)$/i;
const videoPattern = /^\[([^\]]*)\]\((https?:\/\/[^\s)]+\.(?:mp4|webm|mov|m4v)(?:\?[^\s)]*)?)\)$/i;
const rawImagePattern = /^(https?:\/\/[^\s]+\.(?:png|jpe?g|gif|webp)(?:\?[^\s]*)?)$/i;
const rawVideoPattern = /^(https?:\/\/[^\s]+\.(?:mp4|webm|mov|m4v)(?:\?[^\s]*)?)$/i;

function isTableRow(line: string) {
  return line.trim().startsWith("|") && line.trim().endsWith("|") && line.split("|").length >= 3;
}

function isSeparator(line: string) {
  return isTableRow(line) && /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(line.trim());
}

function tableRows(lines: string[]) {
  return lines.map((line) => line.trim().replace(/^\|/, "").replace(/\|$/, "").split("|").map((cell) => cell.trim()));
}

function blocks(content: string): Block[] {
  const lines = content.replace(/\r/g, "").split("\n");
  const result: Block[] = [];
  for (let index = 0; index < lines.length;) {
    const line = lines[index].trim();
    if (!line) { index += 1; continue; }
    if (isTableRow(line) && index + 1 < lines.length && isSeparator(lines[index + 1])) {
      const table: string[] = [line, lines[index + 1]];
      index += 2;
      while (index < lines.length && isTableRow(lines[index])) { table.push(lines[index]); index += 1; }
      result.push({ type: "table", value: "", rows: tableRows(table).filter((_, rowIndex) => rowIndex !== 1) });
      continue;
    }
    const image = line.match(imagePattern) || line.match(rawImagePattern);
    if (image) { result.push({ type: "image", value: image[2] || image[1], alt: image[1] || "" }); index += 1; continue; }
    const video = line.match(videoPattern) || line.match(rawVideoPattern);
    if (video) { result.push({ type: "video", value: video[2] || video[1], alt: video[1] || "فيديو" }); index += 1; continue; }
    const paragraph = [line];
    index += 1;
    while (index < lines.length && lines[index].trim() && !isTableRow(lines[index].trim()) && !imagePattern.test(lines[index].trim()) && !videoPattern.test(lines[index].trim()) && !rawImagePattern.test(lines[index].trim()) && !rawVideoPattern.test(lines[index].trim())) {
      paragraph.push(lines[index].trim()); index += 1;
    }
    result.push({ type: "text", value: paragraph.join("\n") });
  }
  return result;
}

export function RichContent({ content, user = false, textStyle }: Props) {
  return <View style={styles.root}>{blocks(content).map((block, index) => {
    if (block.type === "table") return <ScrollView horizontal key={`table-${index}`} contentContainerStyle={styles.tableScroll}><View style={styles.table}>{block.rows?.map((row, rowIndex) => <View key={`row-${rowIndex}`} style={[styles.tableRow, rowIndex === 0 && styles.tableHeader]}>{row.map((cell, cellIndex) => <Text key={`cell-${rowIndex}-${cellIndex}`} style={[styles.tableCell, rowIndex === 0 && styles.tableHeaderText, user && styles.userText]}>{cell}</Text>)}</View>)}</View></ScrollView>;
    if (block.type === "image") return <View key={`image-${index}`} style={styles.mediaBlock}><Image accessibilityLabel={block.alt} source={{ uri: block.value }} style={styles.image} resizeMode="cover" /><Text style={[styles.mediaCaption, user && styles.userText]}>{block.alt}</Text></View>;
    if (block.type === "video") return <View key={`video-${index}`} style={styles.mediaBlock}>{Platform.OS === "web" ? createElement("video", { src: block.value, controls: true, playsInline: true, style: styles.video }) : <Text style={[styles.mediaCaption, user && styles.userText]}>رابط الفيديو: {block.value}</Text>}</View>;
    return <Text key={`text-${index}`} style={[styles.text, textStyle, user && styles.userText]}>{block.value}</Text>;
  })}</View>;
}

const styles = StyleSheet.create({
  root: { gap: 8, maxWidth: "100%" },
  text: { color: Brand.colors.ink, fontSize: 12, lineHeight: 19, textAlign: "right" },
  userText: { color: Brand.colors.paper },
  tableScroll: { maxWidth: "100%" },
  table: { minWidth: 300, borderWidth: 1, borderColor: Brand.colors.line, borderRadius: 10, overflow: "hidden", backgroundColor: Brand.colors.paper },
  tableRow: { flexDirection: "row-reverse", borderBottomWidth: 1, borderBottomColor: Brand.colors.line },
  tableHeader: { backgroundColor: Brand.colors.mint },
  tableCell: { minWidth: 90, flex: 1, paddingHorizontal: 8, paddingVertical: 7, color: Brand.colors.ink, fontSize: 10, lineHeight: 14, textAlign: "right", borderLeftWidth: 1, borderLeftColor: Brand.colors.line },
  tableHeaderText: { fontWeight: "800", color: Brand.colors.forestDeep },
  mediaBlock: { alignItems: "flex-end", gap: 4 },
  image: { width: 240, height: 150, borderRadius: 13, backgroundColor: Brand.colors.mint },
  video: { width: 260, height: 150, borderRadius: 13, backgroundColor: "#111" },
  mediaCaption: { color: Brand.colors.muted, fontSize: 9, textAlign: "right" },
});
